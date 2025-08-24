import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { flashMessages } from '../middleware/validation';
import { organizationService } from '../services/organization.service';

const router = Router();

// Apply auth and flash messages to all dashboard routes
router.use(requireAuth);
router.use(flashMessages);

// GET /dashboard
router.get('/', async (req, res) => {
  try {
    // Get user's organizations
    const organizations = await organizationService.getUserOrganizations(req.user!.id);
    
    res.render('pages/dashboard', {
      title: 'Dashboard',
      hx: false,
      user: req.user,
      organizations,
    });
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    res.status(500).render('pages/error', { 
      title: 'Error',
      error: process.env.NODE_ENV === 'development' ? error : {},
      hx: false 
    });
  }
});

export default router;