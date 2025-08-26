import { Router } from 'express';
import OpenAI from 'openai';
import { requireAuth } from '../middleware/auth';
import { agentTools } from '../services/agent.tools';

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define available tools for AI
const tools = [
  {
    type: "function" as const,
    function: {
      name: "create_card",
      description: "Create a new card in a Kanban list",
      parameters: {
        type: "object",
        properties: {
          title: { 
            type: "string", 
            description: "Card title" 
          },
          listId: { 
            type: "string", 
            description: "ID of the list to add the card to" 
          },
          description: { 
            type: "string", 
            description: "Optional card description" 
          }
        },
        required: ["title", "listId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "move_card",
      description: "Move a card from one list to another",
      parameters: {
        type: "object",
        properties: {
          cardId: { 
            type: "string", 
            description: "ID of the card to move" 
          },
          listId: { 
            type: "string", 
            description: "ID of the destination list" 
          },
          position: { 
            type: "number", 
            description: "Optional position in the destination list (defaults to end)" 
          }
        },
        required: ["cardId", "listId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "update_card",
      description: "Update fields on an existing card",
      parameters: {
        type: "object",
        properties: {
          cardId: {
            type: "string",
            description: "ID of the card to update"
          },
          title: {
            type: "string",
            description: "New title for the card"
          },
          description: {
            type: "string",
            description: "New description for the card"
          },
          dueDate: {
            type: ["string", "null"],
            description: "ISO date string to set due date, or null to clear"
          }
        },
        required: ["cardId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "delete_card",
      description: "Delete a card by ID",
      parameters: {
        type: "object",
        properties: {
          cardId: {
            type: "string",
            description: "ID of the card to delete"
          }
        },
        required: ["cardId"]
      }
    }
  }
];

// Execute tool calls
async function executeToolCall(toolCall: any) {
  if (toolCall.type !== 'function') {
    return { success: false, error: 'Unsupported tool call type' };
  }
  
  const { name, arguments: args } = toolCall.function;
  
  try {
    const parsedArgs = JSON.parse(args);
    
    switch (name) {
      case 'create_card':
        return await agentTools.createCard(parsedArgs);
      case 'move_card':
        return await agentTools.moveCard(parsedArgs.cardId, {
          listId: parsedArgs.listId,
          position: parsedArgs.position,
        });
      case 'update_card':
        return await agentTools.updateCard(parsedArgs.cardId, {
          title: parsedArgs.title,
          description: parsedArgs.description,
          dueDate: parsedArgs.dueDate,
        });
      case 'delete_card':
        return await agentTools.deleteCard(parsedArgs.cardId);
      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Tool execution failed' 
    };
  }
}

// Helper function to format board context for AI
function formatBoardContext(boardContext: any): string {
  const { board, organization, lists, cards } = boardContext;
  
  let context = `You are an AI assistant helping with a Kanban board. Here's the current state of the Kanban board. This state may change, depending on the actions you perform.

When creating cards, if you are given discretion in naming the card, start the title of the card with an appropriate emoji.

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

  context += `\n\nYou can help with tasks like analyzing the board, suggesting improvements, answering questions about cards or lists, providing insights about the project status, and creating new cards when requested. When creating cards, use the exact list IDs shown above.`;
  
  return context;
}

console.log('🤖 API routes loaded');

// Apply auth to all API routes (temporarily disabled for testing)
// router.use(requireAuth);

// Chat endpoint - proxy to OpenAI
router.post('/chat', async (req, res) => {
  console.log('💬 Chat request from user:', req.user?.id || 'anonymous');
  
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

    // Call OpenAI API with tools
    console.log('🔄 Calling OpenAI API with', finalMessages.length, 'messages' + (boardContext ? ' (including board context)' : ''));
    let completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: finalMessages,
      tools: tools,
      tool_choice: 'auto',
      max_tokens: 500,
      temperature: 0.7,
    });

    // Handle tool calls if present
    const message = completion.choices[0]?.message;
    if (message?.tool_calls && message.tool_calls.length > 0) {
      console.log('🔧 AI requested tool calls:', message.tool_calls.length);
      
      // Add the assistant's message with tool calls to the conversation
      finalMessages.push(message);
      
      // Execute each tool call
      for (const toolCall of message.tool_calls) {
        console.log('🔧 Executing tool:', toolCall.type === 'function' ? toolCall.function.name : toolCall.type);
        const toolResult = await executeToolCall(toolCall);
        
        // Add tool result to conversation
        finalMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }
      
      // Get final response from AI after tool execution
      console.log('🔄 Getting final AI response after tool execution');
      completion = await openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: finalMessages,
        max_tokens: 1000,
        temperature: 0.7,
      });
    }

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
  console.log('🌊 Chat stream request from user:', req.user?.id || 'anonymous');
  
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
      // Call OpenAI API with streaming enabled and tools
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: finalMessages,
        tools: tools,
        tool_choice: 'auto',
        max_tokens: 500,
        temperature: 0.7,
        stream: true
      });

      let toolCalls: any[] = [];
      let isToolCall = false;

      // Stream the response chunks
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        // Handle tool calls in streaming
        if (delta?.tool_calls) {
          isToolCall = true;
          
          // Build up tool calls from deltas
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index!;
            
            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: toolCallDelta.id,
                type: 'function',
                function: { name: '', arguments: '' }
              };
            }
            
            if (toolCallDelta.function?.name) {
              toolCalls[index].function.name += toolCallDelta.function.name;
            }
            
            if (toolCallDelta.function?.arguments) {
              toolCalls[index].function.arguments += toolCallDelta.function.arguments;
            }
          }
        }
        
        // Handle regular content
        if (delta?.content && !isToolCall) {
          const eventData = {
            type: 'content',
            content: delta.content
          };
          res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        }
      }

      // If tool calls were made, execute them and get final response
      if (isToolCall && toolCalls.length > 0) {
        console.log('🔧 AI requested tool calls in streaming:', toolCalls.length);
        
        // Send tool execution status
        const toolData = {
          type: 'content',
          content: '\n\n*Executing action...*\n\n'
        };
        res.write(`data: ${JSON.stringify(toolData)}\n\n`);
        
        // Add the assistant's message with tool calls to conversation
        finalMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: toolCalls
        });
        
        // Execute each tool call
        for (const toolCall of toolCalls) {
          console.log('🔧 Executing tool:', toolCall.function?.name || toolCall.type);
          const toolResult = await executeToolCall(toolCall);
          
          // Add tool result to conversation
          finalMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }
        
        // Get final response from AI and stream it
        console.log('🔄 Getting final AI response after tool execution');
        const finalStream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: finalMessages,
          max_tokens: 500,
          temperature: 0.7,
          stream: true
        });
        
        // Stream the final response
        for await (const chunk of finalStream) {
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) {
            const eventData = {
              type: 'content',
              content: delta.content
            };
            res.write(`data: ${JSON.stringify(eventData)}\n\n`);
          }
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