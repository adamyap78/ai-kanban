import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { flashMessages } from '../middleware/validation';
import { cardService } from '../services/card.service';
import { z } from 'zod';

const router = Router();

// Apply flash messages to all routes
router.use(flashMessages);

// Validation schemas
const createCardSchema = z.object({
  title: z.string().min(1, 'Card title is required').max(200, 'Card title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  listId: z.string().min(1, 'List ID is required'),
  dueDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
});

const updateCardSchema = z.object({
  title: z.string().min(1, 'Card title is required').max(200, 'Card title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  dueDate: z.string().optional().transform((val) => {
    if (!val) return null;
    if (val === '') return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }),
});

const moveCardSchema = z.object({
  listId: z.string().min(1, 'List ID is required'),
  position: z.number().min(0, 'Position must be positive'),
});

// Create new card
router.post('/cards', requireAuth, async (req, res) => {
  try {
    const validatedData = createCardSchema.parse(req.body);
    
    const card = await cardService.create({
      title: validatedData.title,
      description: validatedData.description || undefined,
      listId: validatedData.listId,
      userId: req.user!.id,
      dueDate: validatedData.dueDate,
    });

    if (req.headers['content-type']?.includes('application/json')) {
      res.json({ success: true, card });
    } else {
      req.flash('success', 'Card created successfully!');
      // Redirect back to the board page
      const listInfo = await cardService.getListInfo(validatedData.listId);
      if (listInfo) {
        res.redirect(`/orgs/${listInfo.organizationSlug}/boards/${listInfo.boardId}`);
      } else {
        res.redirect('/dashboard');
      }
    }
  } catch (error) {
    console.error('❌ Error creating card:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create card';
    
    if (req.headers['content-type']?.includes('application/json')) {
      res.status(400).json({ error: errorMessage });
    } else {
      req.flash('error', errorMessage);
      res.redirect('/dashboard');
    }
  }
});

// Get card details
router.get('/cards/:cardId', requireAuth, async (req, res) => {
  try {
    const cardId = req.params.cardId;
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    
    const card = await cardService.getById(cardId, req.user!.id);
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ card });
    } else {
      // For HTML request, render card detail partial without layout
      return res.render('partials/card-detail', { 
        card, 
        layout: false  // Don't use the main layout for partials
      });
    }
  } catch (error) {
    console.error('❌ Error getting card:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get card';
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: errorMessage });
    } else {
      return res.redirect('/dashboard');
    }
  }
});

// Update card
router.put('/cards/:cardId', requireAuth, async (req, res) => {
  try {
    const validatedData = updateCardSchema.parse(req.body);
    
    const cardId = req.params.cardId;
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    
    const card = await cardService.update(cardId, req.user!.id, validatedData);

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ success: true, card });
    } else {
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error updating card:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update card';
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: errorMessage });
    } else {
      return res.redirect('/dashboard');
    }
  }
});

// Move card (for drag-and-drop)
router.put('/cards/:cardId/move', requireAuth, async (req, res) => {
  try {
    const validatedData = moveCardSchema.parse(req.body);
    
    const cardId = req.params.cardId;
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    
    await cardService.move(cardId, req.user!.id, {
      listId: validatedData.listId,
      position: validatedData.position,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Error moving card:', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to move card' });
  }
});

// Delete card
router.delete('/cards/:cardId', requireAuth, async (req, res) => {
  try {
    const cardId = req.params.cardId;
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    
    await cardService.delete(cardId, req.user!.id);

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ success: true });
    } else {
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error deleting card:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete card';
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: errorMessage });
    } else {
      return res.redirect('/dashboard');
    }
  }
});

export default router;