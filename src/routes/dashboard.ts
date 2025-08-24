import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { flashMessages } from '../middleware/validation';

const router = Router();

// Apply auth and flash messages to all dashboard routes
router.use(requireAuth);
router.use(flashMessages);

// GET /dashboard
router.get('/', (req, res) => {
  res.render('pages/dashboard', {
    title: 'Dashboard',
    hx: false,
    user: req.user,
  });
});

export default router;