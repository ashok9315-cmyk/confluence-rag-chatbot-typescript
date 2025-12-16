import axios from 'axios';
import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from '@langchain/openai';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import * as dotenv from 'dotenv';

dotenv.config();

export class ConfluenceRAGService {
  private vectorStore: MemoryVectorStore | null = null;
  private chain: ConversationalRetrievalQAChain | null = null;
  private chatHistory: Array<{ role: string; content: string }> = [];

  constructor() {}

  /**
   * Fetch all pages from Confluence space
   */
  private async fetchConfluencePages(): Promise<Document[]> {
    const { CONFLUENCE_URL, CONFLUENCE_USERNAME, CONFLUENCE_API_TOKEN, CONFLUENCE_SPACE_KEY } = process.env;

    if (!CONFLUENCE_URL || !CONFLUENCE_USERNAME || !CONFLUENCE_API_TOKEN || !CONFLUENCE_SPACE_KEY) {
      throw new Error('Missing Confluence configuration');
    }

    const auth = Buffer.from(`${CONFLUENCE_USERNAME}:${CONFLUENCE_API_TOKEN}`).toString('base64');
    const documents: Document[] = [];

    try {
      console.log(`Fetching pages from Confluence space: ${CONFLUENCE_SPACE_KEY}`);
      
      // Fetch all pages from the space
      const response = await axios.get(
        `${CONFLUENCE_URL}/rest/api/content`,
        {
          params: {
            spaceKey: CONFLUENCE_SPACE_KEY,
            expand: 'body.storage,version,space',
            limit: 100
          },
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json'
          }
        }
      );

      const pages = response.data.results;
      console.log(`Found ${pages.length} pages`);

      for (const page of pages) {
        // Extract text content from HTML
        const htmlContent = page.body?.storage?.value || '';
        const textContent = this.stripHtml(htmlContent);

        const doc = new Document({
          pageContent: textContent,
          metadata: {
            id: page.id,
            title: page.title,
            url: `${CONFLUENCE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${page.id}`,
            version: page.version?.number,
            space: page.space?.name
          }
        });

        documents.push(doc);
      }

      console.log(`Successfully loaded ${documents.length} documents`);
      return documents;
    } catch (error: any) {
      console.error('Error fetching Confluence pages:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Initialize the RAG system
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Confluence RAG system...');

      // Fetch documents from Confluence
      const documents = await this.fetchConfluencePages();

      if (documents.length === 0) {
        throw new Error('No documents found in Confluence space');
      }

      // Create embeddings
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY
      });

      // Create vector store
      console.log('Creating vector store...');
      this.vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

      // Create LLM
      const llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-3.5-turbo',
        temperature: 0.7
      });

      // Create conversational retrieval chain
      this.chain = ConversationalRetrievalQAChain.fromLLM(
        llm,
        this.vectorStore.asRetriever(4),
        {
          returnSourceDocuments: true,
          verbose: false
        }
      );

      console.log('RAG system initialized successfully!');
    } catch (error) {
      console.error('Error initializing RAG system:', error);
      throw error;
    }
  }

  /**
   * Query the chatbot
   */
  async query(question: string): Promise<{ answer: string; sources: any[] }> {
    if (!this.chain) {
      throw new Error('RAG system not initialized. Call initialize() first.');
    }

    try {
      // Format chat history for LangChain
      const formattedHistory = this.chatHistory.map((msg, idx) => {
        if (idx % 2 === 0) {
          return [msg.content, ''];
        } else {
          return ['', msg.content];
        }
      }).filter(pair => pair[0] !== '');

      const result = await this.chain.call({
        question,
        chat_history: formattedHistory
      });

      // Update chat history
      this.chatHistory.push({ role: 'user', content: question });
      this.chatHistory.push({ role: 'assistant', content: result.text });

      // Keep only last 10 messages
      if (this.chatHistory.length > 10) {
        this.chatHistory = this.chatHistory.slice(-10);
      }

      return {
        answer: result.text,
        sources: result.sourceDocuments?.map((doc: any) => ({
          title: doc.metadata.title,
          url: doc.metadata.url,
          excerpt: doc.pageContent.substring(0, 200) + '...'
        })) || []
      };
    } catch (error) {
      console.error('Error querying RAG system:', error);
      throw error;
    }
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.chatHistory = [];
  }
}
