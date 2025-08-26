import { Router } from 'express';
import OpenAI from 'openai';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('🤖 API routes loaded');

// Apply auth to all API routes
router.use(requireAuth);

// Chat endpoint - proxy to OpenAI
router.post('/chat', async (req, res) => {
  console.log('💬 Chat request from user:', req.user?.id);
  
  try {
    const { messages } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required'
      });
    }

    // Validate message format
    const isValidMessages = messages.every(msg => 
      msg && 
      typeof msg.role === 'string' && 
      (msg.role === 'user' || msg.role === 'assistant') &&
      typeof msg.content === 'string'
    );

    if (!isValidMessages) {
      return res.status(400).json({
        error: 'Invalid message format. Each message must have role (user|assistant) and content (string)'
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return res.status(500).json({
        error: 'AI service not configured'
      });
    }

    // Call OpenAI API
    console.log('🔄 Calling OpenAI API with', messages.length, 'messages');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    console.log('✅ OpenAI API response received');
    
    // Return the response
    return res.json(completion);

  } catch (error) {
    console.error('❌ Chat API error:', error);
    
    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('API key')) {
        return res.status(401).json({
          error: 'Invalid API key configuration'
        });
      }
      
      if (error.message.includes('rate limit')) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again later.'
        });
      }
      
      if (error.message.includes('quota')) {
        return res.status(429).json({
          error: 'API quota exceeded. Please contact support.'
        });
      }
    }

    // Generic error response
    return res.status(500).json({
      error: 'Failed to process chat request'
    });
  }
});

export default router;