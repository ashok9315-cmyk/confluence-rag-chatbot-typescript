# Confluence RAG Chatbot

A Retrieval-Augmented Generation (RAG) chatbot that reads Confluence pages and provides intelligent answers through a web interface. Built with LangChain, OpenAI, and TypeScript.

## Features

- 🤖 **Intelligent Q&A**: Ask questions about your Confluence documentation
- 📚 **Source Citations**: See which Confluence pages were used to answer your questions
- 💬 **Conversational Memory**: Maintains context across multiple questions
- 🎨 **Modern UI**: Beautiful, responsive web interface
- ⚡ **Fast Retrieval**: Uses vector embeddings for quick and accurate information retrieval

## Prerequisites

- Node.js 18+ and npm
- Confluence account with API access
- OpenAI API key

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd confluence-rag-chatbot-typescript
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   
   Create or edit the `.env` file with your credentials:
   
   ```env
   CONFLUENCE_URL=https://your-domain.atlassian.net/wiki
   CONFLUENCE_USERNAME=your-email@example.com
   CONFLUENCE_API_TOKEN=your_confluence_api_token_here
   CONFLUENCE_SPACE_KEY=your_space_key
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

## Usage

### Development Mode

Run with TypeScript directly (hot reload):

```bash
npm run dev
```

### Production Mode

1. Build the TypeScript code:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## How It Works

1. **Initialization**: On startup, the application:
   - Fetches all pages from your Confluence space
   - Converts them to embeddings using OpenAI
   - Creates a vector store for fast retrieval

2. **Query Processing**: When you ask a question:
   - The question is converted to an embedding
   - Similar content is retrieved from the vector store
   - OpenAI generates an answer based on the retrieved context
   - Source documents are provided for transparency

3. **Conversational Context**: The chatbot maintains conversation history for contextual follow-up questions.

## Project Structure

```
confluence-rag-chatbot-typescript/
├── src/
│   ├── ragService.ts      # Core RAG logic with LangChain
│   └── server.ts          # Express server
├── public/
│   ├── index.html         # Web UI
│   ├── styles.css         # Styling
│   └── app.js             # Frontend JavaScript
├── .env                   # Environment configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## API Endpoints

### `GET /api/health`
Check if the service is ready.

**Response**:
```json
{
  "status": "ready",
  "error": null
}
```

### `POST /api/chat`
Send a question to the chatbot.

**Request**:
```json
{
  "message": "What is the project about?"
}
```

**Response**:
```json
{
  "answer": "Based on the documentation...",
  "sources": [
    {
      "title": "Project Overview",
      "url": "https://...",
      "excerpt": "..."
    }
  ]
}
```

### `POST /api/clear`
Clear the conversation history.

## Configuration

### Confluence Setup

1. Get your Confluence API token from: https://id.atlassian.com/manage-profile/security/api-tokens
2. Find your space key in Confluence (visible in the URL)
3. Use your Atlassian account email as the username

### OpenAI Setup

1. Get your API key from: https://platform.openai.com/api-keys
2. The application uses `gpt-3.5-turbo` by default
3. To use GPT-4, edit `src/ragService.ts` and change the `modelName`

## Troubleshooting

### "Service is still initializing"
- Wait a few moments for the application to fetch and process Confluence pages
- Check the server logs for errors
- Verify your Confluence credentials are correct

### "No documents found"
- Ensure your Confluence space has pages
- Verify the `CONFLUENCE_SPACE_KEY` is correct
- Check that your API token has read permissions

### Connection Errors
- Verify your Confluence URL is correct
- Ensure your network can access Confluence
- Check that the API token is valid

## Customization

### Change the AI Model
Edit [src/ragService.ts](src/ragService.ts#L106-L110):
```typescript
const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4', // Change to gpt-4 or other models
  temperature: 0.7
});
```

### Adjust Retrieval Settings
Edit [src/ragService.ts](src/ragService.ts#L113-L114):
```typescript
this.vectorStore.asRetriever(4), // Change number of documents retrieved
```

### Modify UI Theme
Edit [public/styles.css](public/styles.css) to customize colors and styling.

## Security Notes

⚠️ **Important**: 
- Never commit the `.env` file to version control
- Keep your API keys secure
- Consider using environment-specific configurations for production
- The `.gitignore` file is configured to exclude sensitive files

## License

ISC

## Support

For issues or questions:
1. Check the server logs in the terminal
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed with `npm install`

---

Built with ❤️ using LangChain, OpenAI, and TypeScript
