import { Router } from 'express';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../utils/validation';
import { validateBody, flashMessages } from '../middleware/validation';
import { redirectIfAuthenticated } from '../middleware/auth';

const router = Router();

// Apply flash messages to all auth routes
router.use(flashMessages);

console.log('🔗 Auth routes loaded');

// GET /auth/register
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('pages/auth/register', {
    title: 'Create Account',
    hx: false,
    errors: res.locals.validationErrors || [],
    oldInput: res.locals.oldInput || {},
  });
});

// POST /auth/register
router.post('/register', 
  redirectIfAuthenticated,
  validateBody(registerSchema),
  async (req, res) => {
    console.log('🔄 Registration attempt:', { 
      name: req.body.name, 
      email: req.body.email,
      passwordLength: req.body.password?.length 
    });
    
    try {
      const { user, token } = await authService.register({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
      });

      console.log('✅ User registered successfully:', user.id, user.email);

      // Set HTTP-only cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const redirectTo = req.query.redirect as string || '/dashboard';
      console.log('📍 Redirecting to:', redirectTo);
      res.redirect(redirectTo + '?success=Account created successfully');
    } catch (error) {
      console.error('❌ Registration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      res.redirect('/auth/register?error=' + encodeURIComponent(errorMessage));
    }
  }
);

// GET /auth/login
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('pages/auth/login', {
    title: 'Sign In',
    hx: false,
    errors: res.locals.validationErrors || [],
    oldInput: res.locals.oldInput || {},
    redirectTo: req.query.redirect as string || '/dashboard',
  });
});

// POST /auth/login
router.post('/login',
  redirectIfAuthenticated,
  validateBody(loginSchema),
  async (req, res) => {
    try {
      const { user, token } = await authService.login(req.body.email, req.body.password);

      // Set HTTP-only cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const redirectTo = req.query.redirect as string || '/dashboard';
      res.redirect(redirectTo + '?success=Signed in successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      res.redirect('/auth/login?error=' + encodeURIComponent(errorMessage));
    }
  }
);

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.redirect('/?success=Signed out successfully');
});

// GET /auth/logout (for convenience links)
router.get('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.redirect('/?success=Signed out successfully');
});

export default router;