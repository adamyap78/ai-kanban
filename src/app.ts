import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import expressEjsLayouts from 'express-ejs-layouts';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"], // for htmx and inline scripts
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.DOMAIN || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// View engine setup
app.use(expressEjsLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import organizationRoutes from './routes/organizations';
import boardRoutes from './routes/boards';
import { extractUser } from './middleware/auth';
import { validateReferer } from './middleware/validation';

// Security middleware
app.use(validateReferer);

// Basic request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Extract user from JWT token on every request
app.use(extractUser);

// Make environment variables and user available in templates
app.use((req, res, next) => {
  res.locals.env = process.env.NODE_ENV || 'development';
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/orgs', organizationRoutes);
app.use('/orgs', boardRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.render('pages/index', { 
    title: 'AI Kanban Board',
    hx: false // No htmx needed for landing page
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', { 
    title: 'Page Not Found',
    hx: false
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).render('pages/error', { 
    title: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? error : {},
    hx: false
  });
});

export default app;