import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { flashMessages } from '../middleware/validation';
import { cardService } from '../services/card.service';
import { commentService } from '../services/comment.service';
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
  dueDate: z.union([z.string(), z.null()]).optional().transform((val) => {
    if (!val || val === '') return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }),
});

const moveCardSchema = z.object({
  listId: z.string().min(1, 'List ID is required'),
  position: z.number().min(0, 'Position must be positive'),
});

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment too long'),
});

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment too long'),
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
    } else if (req.headers['hx-request']) {
      // Return add-specific OOB swap for new cards
      return res.render('partials/card-add-oob', { 
        card, 
        layout: false
      });
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

// Get card details or new card form
router.get('/cards/:cardId', requireAuth, async (req, res) => {
  try {
    const cardId = req.params.cardId;
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    
    // Handle special "new" cardId for add card mode
    if (cardId === 'new') {
      const listId = req.query.listId as string;
      if (!listId) {
        return res.status(400).json({ error: 'List ID is required for new cards' });
      }
      
      // Create empty card object for add mode
      const emptyCard = {
        id: null,
        title: '',
        description: '',
        dueDate: null
      };
      
      return res.render('partials/card-form-modal', { 
        card: emptyCard,
        listId,
        layout: false
      });
    }
    
    // Handle existing card edit mode
    const card = await cardService.getById(cardId, req.user!.id);
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ card });
    } else {
      // For HTML request, render unified card form modal
      return res.render('partials/card-form-modal', { 
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
    } else if (req.headers['hx-request']) {
      // Return just the OOB swap for board card (modal will close automatically)
      return res.render('partials/card-update-oob', { 
        card, 
        layout: false
      });
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

// Get comments for a card
router.get('/cards/:cardId/comments', requireAuth, async (req, res) => {
  try {
    const cardId = req.params.cardId;
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    
    const comments = await commentService.getByCardId(cardId, req.user!.id);
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ comments });
    } else {
      // For HTMX, return comments partial
      return res.render('partials/card-comments', { 
        comments, 
        cardId,
        layout: false
      });
    }
  } catch (error) {
    console.error('❌ Error getting comments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get comments';
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: errorMessage });
    } else {
      return res.status(400).send(errorMessage);
    }
  }
});

// Create comment for a card
router.post('/cards/:cardId/comments', requireAuth, async (req, res) => {
  try {
    const cardId = req.params.cardId;
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    
    const validatedData = createCommentSchema.parse(req.body);
    
    const comment = await commentService.create({
      cardId,
      userId: req.user!.id,
      content: validatedData.content,
    });

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ success: true, comment });
    } else if (req.headers['hx-request']) {
      // Return new comment partial
      return res.render('partials/comment-item', { 
        comment, 
        layout: false
      });
    } else {
      req.flash('success', 'Comment added successfully!');
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error creating comment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create comment';
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: errorMessage });
    } else {
      req.flash('error', errorMessage);
      return res.redirect('/dashboard');
    }
  }
});

// Update comment
router.put('/cards/:cardId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { cardId, commentId } = req.params;
    if (!cardId || !commentId) {
      return res.status(400).json({ error: 'Card ID and Comment ID are required' });
    }
    
    const validatedData = updateCommentSchema.parse(req.body);
    
    const comment = await commentService.update(commentId, req.user!.id, validatedData.content);

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ success: true, comment });
    } else if (req.headers['hx-request']) {
      // Return updated comment partial
      return res.render('partials/comment-item', { 
        comment, 
        layout: false
      });
    } else {
      req.flash('success', 'Comment updated successfully!');
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error updating comment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update comment';
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: errorMessage });
    } else {
      req.flash('error', errorMessage);
      return res.redirect('/dashboard');
    }
  }
});

// Delete comment
router.delete('/cards/:cardId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { cardId, commentId } = req.params;
    if (!cardId || !commentId) {
      return res.status(400).json({ error: 'Card ID and Comment ID are required' });
    }
    
    await commentService.delete(commentId, req.user!.id);

    if (req.headers['content-type']?.includes('application/json')) {
      return res.json({ success: true });
    } else if (req.headers['hx-request']) {
      // Return empty response - comment will be removed from DOM
      return res.status(200).send('');
    } else {
      req.flash('success', 'Comment deleted successfully!');
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete comment';
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: errorMessage });
    } else {
      req.flash('error', errorMessage);
      return res.redirect('/dashboard');
    }
  }
});

export default router;