import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import * as dotenv from 'dotenv';
import { ConfluenceRAGService } from './ragService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize RAG service
const ragService = new ConfluenceRAGService();
let isInitialized = false;
let initializationError: string | null = null;

// Initialize on startup
(async () => {
  try {
    console.log('Starting server initialization...');
    await ragService.initialize();
    isInitialized = true;
    console.log('Server ready!');
  } catch (error: any) {
    console.error('Failed to initialize RAG service:', error.message);
    initializationError = error.message;
  }
})();

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: isInitialized ? 'ready' : 'initializing',
    error: initializationError
  });
});

// Chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    if (!isInitialized) {
      return res.status(503).json({
        error: 'Service is still initializing. Please wait...',
        initError: initializationError
      });
    }

    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Received question: ${message}`);
    const result = await ragService.query(message);

    res.json({
      answer: result.answer,
      sources: result.sources
    });
  } catch (error: any) {
    console.error('Error processing chat request:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Clear chat history endpoint
app.post('/api/clear', (req: Request, res: Response) => {
  try {
    ragService.clearHistory();
    res.json({ message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Serve the frontend
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Confluence RAG Chatbot initializing...`);
});
