import { Router } from 'express';
import { boardService } from '../services/board.service';
import { organizationService } from '../services/organization.service';
import { listService } from '../services/list.service';
import { cardService } from '../services/card.service';
import { createBoardSchema } from '../utils/validation';
import { validateBody, flashMessages } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply auth and flash messages to all board routes
router.use(requireAuth);
router.use(flashMessages);

console.log('🔗 Board routes loaded');

// GET /orgs/:orgSlug/boards/new - Create board form
router.get('/:orgSlug/boards/new', async (req, res) => {
  try {
    const orgSlug = req.params.orgSlug;
    if (!orgSlug) {
      return res.status(400).render('pages/error', { 
        title: 'Bad Request',
        error: { message: 'Organization slug is required' },
        hx: false 
      });
    }

    const organization = await organizationService.getBySlug(orgSlug, req.user!.id);
    
    if (!organization) {
      return res.status(404).render('pages/404', { 
        title: 'Organization Not Found',
        hx: false 
      });
    }

    res.render('pages/boards/new', {
      title: 'Create Board',
      hx: false,
      organization,
      errors: res.locals.validationErrors || [],
      oldInput: res.locals.oldInput || {},
    });
  } catch (error) {
    console.error('❌ Error loading new board form:', error);
    res.status(500).render('pages/error', { 
      title: 'Error',
      error: process.env.NODE_ENV === 'development' ? error : {},
      hx: false 
    });
  }
});

// POST /orgs/:orgSlug/boards - Create board
router.post('/:orgSlug/boards',
  validateBody(createBoardSchema),
  async (req, res) => {
    console.log('🔄 Creating board:', req.body);
    
    try {
      const orgSlug = req.params.orgSlug;
      if (!orgSlug) {
        return res.status(400).render('pages/error', { 
          title: 'Bad Request',
          error: { message: 'Organization slug is required' },
          hx: false 
        });
      }

      const organization = await organizationService.getBySlug(orgSlug, req.user!.id);
      
      if (!organization) {
        return res.status(404).render('pages/404', { 
          title: 'Organization Not Found',
          hx: false 
        });
      }

      const board = await boardService.create({
        name: req.body.name,
        description: req.body.description,
        organizationId: organization.id,
        userId: req.user!.id,
      });

      console.log('✅ Board created successfully:', board.id);
      res.redirect(`/orgs/${orgSlug}/boards/${board.id}?success=Board created successfully`);
    } catch (error) {
      console.error('❌ Board creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create board';
      const fallbackSlug = req.params.orgSlug || 'unknown';
      res.redirect(`/orgs/${fallbackSlug}/boards/new?error=` + encodeURIComponent(errorMessage));
    }
  }
);

// GET /orgs/:orgSlug/boards/:boardId - Board view
router.get('/:orgSlug/boards/:boardId', async (req, res) => {
  console.log('🎯 Loading board:', req.params.boardId);
  
  try {
    const { orgSlug, boardId } = req.params;
    
    if (!orgSlug || !boardId) {
      return res.status(400).render('pages/error', { 
        title: 'Bad Request',
        error: { message: 'Organization slug and board ID are required' },
        hx: false 
      });
    }

    const organization = await organizationService.getBySlug(orgSlug, req.user!.id);
    
    if (!organization) {
      return res.status(404).render('pages/404', { 
        title: 'Organization Not Found',
        hx: false 
      });
    }

    const board = await boardService.getById(boardId, req.user!.id);
    
    if (!board) {
      return res.status(404).render('pages/404', { 
        title: 'Board Not Found',
        hx: false 
      });
    }

    // Load lists and cards for the board
    const lists = await listService.getByBoard(boardId, req.user!.id);
    const cardsByList = await cardService.getByBoard(boardId, req.user!.id);

    // Check if this is an AJAX request for refresh
    const isAjaxRefresh = req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isAjaxRefresh) {
      // Return just the board content for refresh
      return res.render('partials/board-content', {
        lists,
        cardsByList,
        layout: false
      });
    }

    // Return full page for initial load
    res.render('pages/boards/show', {
      title: board.name,
      hx: true, // Enable htmx for drag-and-drop functionality
      organization,
      board,
      lists,
      cardsByList,
    });
  } catch (error) {
    console.error('❌ Error loading board:', error);
    res.status(500).render('pages/error', { 
      title: 'Error',
      error: process.env.NODE_ENV === 'development' ? error : {},
      hx: false 
    });
  }
});

// GET /orgs/:orgSlug/boards/:boardId/settings - Board settings
router.get('/:orgSlug/boards/:boardId/settings', async (req, res) => {
  try {
    const { orgSlug, boardId } = req.params;
    
    if (!orgSlug || !boardId) {
      return res.status(400).render('pages/error', { 
        title: 'Bad Request',
        error: { message: 'Organization slug and board ID are required' },
        hx: false 
      });
    }

    const organization = await organizationService.getBySlug(orgSlug, req.user!.id);
    
    if (!organization) {
      return res.status(404).render('pages/404', { 
        title: 'Organization Not Found',
        hx: false 
      });
    }

    const board = await boardService.getById(boardId, req.user!.id);
    
    if (!board) {
      return res.status(404).render('pages/404', { 
        title: 'Board Not Found',
        hx: false 
      });
    }

    res.render('pages/boards/settings', {
      title: `${board.name} - Settings`,
      hx: false,
      organization,
      board,
      errors: res.locals.validationErrors || [],
      oldInput: res.locals.oldInput || {},
    });
  } catch (error) {
    console.error('❌ Error loading board settings:', error);
    res.status(500).render('pages/error', { 
      title: 'Error',
      error: process.env.NODE_ENV === 'development' ? error : {},
      hx: false 
    });
  }
});

// POST /orgs/:orgSlug/boards/:boardId/settings - Update board
router.post('/:orgSlug/boards/:boardId/settings', async (req, res) => {
  const { orgSlug, boardId } = req.params;
  console.log('📝 Updating board:', boardId);
  
  try {
    if (!orgSlug || !boardId) {
      return res.status(400).render('pages/error', { 
        title: 'Bad Request',
        error: { message: 'Organization slug and board ID are required' },
        hx: false 
      });
    }

    const board = await boardService.update(boardId, req.user!.id, {
      name: req.body.name,
      description: req.body.description,
    });

    console.log('✅ Board updated successfully');
    res.redirect(`/orgs/${orgSlug}/boards/${board.id}?success=Board updated successfully`);
  } catch (error) {
    console.error('❌ Board update failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update board';
    const fallbackSlug = req.params.orgSlug || 'unknown';
    const fallbackBoardId = req.params.boardId || 'unknown';
    res.redirect(`/orgs/${fallbackSlug}/boards/${fallbackBoardId}/settings?error=` + encodeURIComponent(errorMessage));
  }
});

// POST /orgs/:orgSlug/boards/:boardId/archive - Archive board
router.post('/:orgSlug/boards/:boardId/archive', async (req, res) => {
  const { orgSlug, boardId } = req.params;
  console.log('🗄️ Archiving board:', boardId);
  
  try {
    if (!orgSlug || !boardId) {
      return res.status(400).render('pages/error', { 
        title: 'Bad Request',
        error: { message: 'Organization slug and board ID are required' },
        hx: false 
      });
    }

    await boardService.archive(boardId, req.user!.id);

    console.log('✅ Board archived successfully');
    res.redirect(`/orgs/${orgSlug}?success=Board archived successfully`);
  } catch (error) {
    console.error('❌ Board archive failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to archive board';
    const fallbackSlug = req.params.orgSlug || 'unknown';
    const fallbackBoardId = req.params.boardId || 'unknown';
    res.redirect(`/orgs/${fallbackSlug}/boards/${fallbackBoardId}?error=` + encodeURIComponent(errorMessage));
  }
});

export default router;