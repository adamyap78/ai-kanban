import { Router } from 'express';
import OpenAI from 'openai';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to format board context for AI
function formatBoardContext(boardContext: any): string {
  const { board, organization, lists, cards } = boardContext;
  
  let context = `You are an AI assistant helping with a Kanban board. Here's the current context:

BOARD INFORMATION:
- Board: ${board.name} (ID: ${board.id})
- Description: ${board.description || 'No description'}
- Organization: ${organization.name}

LISTS:`;

  lists.forEach((list: any) => {
    context += `\n- List: "${list.name}" (ID: ${list.id}, Position: ${list.position})`;
  });

  context += `\n\nCARDS:`;
  
  Object.entries(cards).forEach(([listId, cardList]) => {
    const list = lists.find((l: any) => l.id === listId);
    const listName = list ? list.name : 'Unknown List';
    context += `\n\nIn list "${listName}" (ID: ${listId}):`;
    
    if (Array.isArray(cardList) && cardList.length > 0) {
      cardList.forEach((card: any) => {
        context += `\n  - "${card.title}" (ID: ${card.id}${card.description ? `, Description: ${card.description}` : ''}${card.dueDate ? `, Due: ${card.dueDate}` : ''})`;
      });
    } else {
      context += `\n  - No cards`;
    }
  });

  context += `\n\nYou can help with tasks like analyzing the board, suggesting improvements, answering questions about cards or lists, and providing insights about the project status.`;
  
  return context;
}

console.log('🤖 API routes loaded');

// Apply auth to all API routes
router.use(requireAuth);

// Chat endpoint - proxy to OpenAI
router.post('/chat', async (req, res) => {
  console.log('💬 Chat request from user:', req.user?.id);
  
  try {
    const { messages, boardContext } = req.body;

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

    // Prepare messages with board context if provided
    let finalMessages = [...messages];
    if (boardContext) {
      const contextMessage = {
        role: 'system',
        content: formatBoardContext(boardContext)
      };
      finalMessages = [contextMessage, ...messages];
    }

    // Call OpenAI API
    console.log('🔄 Calling OpenAI API with', finalMessages.length, 'messages' + (boardContext ? ' (including board context)' : ''));
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: finalMessages,
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

// Chat streaming endpoint - Server-Sent Events
router.get('/chat/stream', async (req, res) => {
  console.log('🌊 Chat stream request from user:', req.user?.id);
  
  try {
    const messagesParam = req.query.messages as string;
    const boardContextParam = req.query.boardContext as string;
    
    // Validate request
    if (!messagesParam) {
      return res.status(400).json({
        error: 'Messages parameter is required'
      });
    }

    let messages;
    let boardContext = null;
    
    try {
      messages = JSON.parse(messagesParam);
      if (boardContextParam) {
        boardContext = JSON.parse(boardContextParam);
      }
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid messages or board context format'
      });
    }

    // Validate message format
    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages must be an array'
      });
    }

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

    // Set up Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Prepare messages with board context if provided
    let finalMessages = [...messages];
    if (boardContext) {
      const contextMessage = {
        role: 'system',
        content: formatBoardContext(boardContext)
      };
      finalMessages = [contextMessage, ...messages];
    }

    console.log('🔄 Starting OpenAI streaming with', finalMessages.length, 'messages' + (boardContext ? ' (including board context)' : ''));

    try {
      // Call OpenAI API with streaming enabled
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: finalMessages,
        max_tokens: 500,
        temperature: 0.7,
        stream: true
      });

      // Stream the response chunks
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          const eventData = {
            type: 'content',
            content: delta.content
          };
          res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        }
      }

      // Send completion signal
      const completeData = {
        type: 'complete'
      };
      res.write(`data: ${JSON.stringify(completeData)}\n\n`);
      
      console.log('✅ OpenAI streaming completed');

    } catch (streamError) {
      console.error('❌ OpenAI streaming error:', streamError);
      
      // Send error through SSE
      const errorData = {
        type: 'error',
        error: 'Failed to process streaming request'
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    }

    // Close the connection
    res.end();
    return;

  } catch (error) {
    console.error('❌ Chat stream error:', error);
    
    // If headers haven't been sent, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to process streaming request'
      });
    }
    
    // Otherwise send error through SSE and close
    const errorData = {
      type: 'error', 
      error: 'Stream processing failed'
    };
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.end();
    return;
  }
});

export default router;