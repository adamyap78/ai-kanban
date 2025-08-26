import { Router } from 'express';
import { agentTools } from '../services/agent.tools';
import { z } from 'zod';

const router = Router();

// Simple API key check (for development only)
const AGENT_API_KEY = 'agent-dev-key-123';

function checkAgentAuth(req: any, res: any, next: any) {
  const apiKey = req.headers['x-agent-api-key'];
  if (apiKey !== AGENT_API_KEY) {
    return res.status(401).json({ error: 'Invalid agent API key' });
  }
  next();
}

// Apply auth to all agent routes
router.use(checkAgentAuth);

// === CARD OPERATIONS ===

// Create card
router.post('/cards', async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      listId: z.string(),
      dueDate: z.string().optional(),
    });
    
    const parsed = schema.parse(req.body);
    const data = {
      title: parsed.title,
      listId: parsed.listId,
      ...(parsed.description && { description: parsed.description }),
      ...(parsed.dueDate && { dueDate: parsed.dueDate }),
    };
    const result = await agentTools.createCard(data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid request' 
    });
  }
});

// Get card
router.get('/cards/:cardId', async (req, res) => {
  try {
    const result = await agentTools.getCard(req.params.cardId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    });
  }
});

// Update card
router.put('/cards/:cardId', async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      dueDate: z.string().nullable().optional(),
    });
    
    const parsed = schema.parse(req.body);
    const data = {
      ...(parsed.title && { title: parsed.title }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.dueDate !== undefined && { dueDate: parsed.dueDate }),
    };
    const result = await agentTools.updateCard(req.params.cardId, data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid request' 
    });
  }
});

// Move card
router.put('/cards/:cardId/move', async (req, res) => {
  try {
    const schema = z.object({
      listId: z.string(),
      position: z.number().optional(),
    });
    
    const parsed = schema.parse(req.body);
    const data = {
      listId: parsed.listId,
      ...(parsed.position !== undefined && { position: parsed.position }),
    };
    const result = await agentTools.moveCard(req.params.cardId, data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid request' 
    });
  }
});

// Delete card
router.delete('/cards/:cardId', async (req, res) => {
  try {
    const result = await agentTools.deleteCard(req.params.cardId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    });
  }
});

// Get cards by list
router.get('/lists/:listId/cards', async (req, res) => {
  try {
    const result = await agentTools.getCardsByList(req.params.listId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    });
  }
});

// === LIST OPERATIONS ===

// Create list
router.post('/lists', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      boardId: z.string(),
    });
    
    const data = schema.parse(req.body);
    const result = await agentTools.createList(data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid request' 
    });
  }
});

// Update list
router.put('/lists/:listId', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
    });
    
    const data = schema.parse(req.body);
    const result = await agentTools.updateList(req.params.listId, data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid request' 
    });
  }
});

// Delete list
router.delete('/lists/:listId', async (req, res) => {
  try {
    const result = await agentTools.deleteList(req.params.listId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    });
  }
});

// Get lists by board
router.get('/boards/:boardId/lists', async (req, res) => {
  try {
    const result = await agentTools.getListsByBoard(req.params.boardId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    });
  }
});

// === BOARD OPERATIONS ===

// Get board overview (board + lists + cards)
router.get('/boards/:boardId', async (req, res) => {
  try {
    const result = await agentTools.getBoardOverview(req.params.boardId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    });
  }
});

export default router;