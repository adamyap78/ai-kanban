import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { flashMessages } from '../middleware/validation';
import { listService } from '../services/list.service';
import { z } from 'zod';

const router = Router();

// Apply flash messages to all routes
router.use(flashMessages);

// Validation schemas
const createListSchema = z.object({
  name: z.string().min(1, 'List name is required').max(100, 'List name too long'),
  boardId: z.string().min(1, 'Board ID is required'),
});

const updateListSchema = z.object({
  name: z.string().min(1, 'List name is required').max(100, 'List name too long'),
});

const updatePositionSchema = z.object({
  position: z.number().min(0, 'Position must be positive'),
});

// Create new list
router.post('/lists', requireAuth, async (req, res) => {
  try {
    const validatedData = createListSchema.parse(req.body);
    
    const list = await listService.create({
      name: validatedData.name,
      boardId: validatedData.boardId,
      userId: req.user!.id,
    });

    // Get board info for redirect
    const boardInfo = await listService.getBoardInfo(validatedData.boardId);
    if (boardInfo) {
      req.flash('success', 'List created successfully!');
      res.redirect(`/orgs/${boardInfo.organizationSlug}/boards/${validatedData.boardId}`);
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error creating list:', error);
    req.flash('error', error instanceof Error ? error.message : 'Failed to create list');
    res.redirect('/dashboard');
  }
});

// Update list name
router.put('/lists/:listId', requireAuth, async (req, res) => {
  try {
    const validatedData = updateListSchema.parse(req.body);
    
    const listId = req.params.listId;
    if (!listId) {
      return res.status(400).json({ error: 'List ID is required' });
    }
    
    const list = await listService.update(listId, req.user!.id, {
      name: validatedData.name,
    });

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ success: true, list });
    } else {
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error updating list:', error);
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update list' });
    } else {
      return res.redirect('/dashboard');
    }
  }
});

// Update list position (for drag-and-drop)
router.put('/lists/:listId/position', requireAuth, async (req, res) => {
  try {
    const validatedData = updatePositionSchema.parse(req.body);
    
    const listId = req.params.listId;
    if (!listId) {
      return res.status(400).json({ error: 'List ID is required' });
    }
    
    await listService.updatePosition(listId, req.user!.id, validatedData.position);

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating list position:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update list position' });
  }
});

// Delete list
router.delete('/lists/:listId', requireAuth, async (req, res) => {
  try {
    const listId = req.params.listId;
    if (!listId) {
      return res.status(400).json({ error: 'List ID is required' });
    }
    
    await listService.delete(listId, req.user!.id);

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ success: true });
    } else {
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error deleting list:', error);
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete list' });
    } else {
      return res.redirect('/dashboard');
    }
  }
});

export default router;