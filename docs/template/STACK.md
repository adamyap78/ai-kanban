# Server-First SaaS Template Stack

## Core Philosophy
Build a server-first MVP SaaS with no SPA. Default to pure HTML; add htmx only where full-page reloads feel clunky. Keep it simple, fast, and hostable on Vercel.

## Technology Stack (Non-Negotiable)

### Backend
- **Framework:** Express.js + TypeScript
- **Template Engine:** EJS for server-rendered HTML
- **Database:** 
  - Local: SQLite + better-sqlite3 (for rapid development)
  - Production: Supabase Postgres
  - ORM: Drizzle (database-agnostic)
- **File Storage:** Supabase Storage
- **Authentication:** 
  - Local: Custom JWT + bcrypt (instant setup, no external deps)
  - Production: Supabase Auth (email verification, password reset, social login)
- **Validation:** Zod schemas for all inputs

### Frontend
- **Styling:** TailwindCSS + @tailwindcss/forms
- **Progressive Enhancement:** htmx (selective use only)
- **Default Approach:** Server-rendered HTML with POST-Redirect-GET
- **Client JS:** Pure JavaScript with FormData for progressive enhancement

### Infrastructure
- **Hosting:** Vercel (serverless functions)
- **Background Jobs:** Vercel Cron
- **Monitoring:** Built-in Express logging + error handling
- **Rate Limiting:** express-rate-limit middleware

## Architecture Constraints

### What We DON'T Use
- ❌ React/Next.js/Vue/SPAs - Use server-rendered HTML
- ❌ Client-side state as source of truth - Server renders everything
- ❌ Complex client-side routing - Use standard HTTP navigation
- ❌ GraphQL - Keep REST API patterns
- ❌ Long-running processes - Use Vercel Cron for background work

### HTML & htmx Guidelines
- **Default:** Full-page POST-Redirect-GET flows
- **Add htmx only for:** Partial updates, inline forms, modals, pagination
- **Progressive Enhancement:** Use fetch() + FormData where htmx isn't needed
- **API Endpoints Return:** Full pages, HTML fragments (for htmx), or JSON
- **htmx Loading:** Include script only on pages that need it: `<% if (locals.hx) { %>`

### TypeScript Everywhere
- Server code, routes, services, database schemas
- Use Zod for input validation before DB/API calls
- Strict TypeScript configuration with no implicit any

## File Structure Template
```
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server entry point
│   ├── routes/                # Route handlers
│   │   ├── index.ts           # Home and public routes
│   │   ├── auth.ts            # Authentication routes
│   │   ├── dashboard.ts       # Main app routes
│   │   ├── api/               # JSON API endpoints
│   │   └── htmx/              # htmx-specific endpoints
│   ├── middleware/            # Express middleware
│   │   ├── auth.ts            # Authentication middleware
│   │   ├── validation.ts      # Zod validation middleware
│   │   └── errors.ts          # Error handling
│   ├── services/              # Business logic
│   ├── types/                 # TypeScript definitions
│   ├── utils/                 # Utility functions
│   │   ├── db.ts             # Database connection
│   │   ├── validation.ts     # Zod schemas
│   │   └── helpers.ts        # General utilities
│   ├── views/                 # EJS templates
│   │   ├── layouts/          # Base layouts
│   │   ├── pages/            # Full page templates
│   │   └── partials/         # Reusable components
│   └── public/               # Static assets
├── drizzle/                  # Database migrations
├── docs/                     # Documentation
│   ├── template/             # Reusable template docs
│   └── project/              # Project-specific docs
├── vercel.json              # Vercel deployment config
└── tailwind.config.js       # Tailwind configuration
```

## Request/Response Patterns

### 1. Standard Form Flows
```typescript
app.post('/resource', validateSchema, async (req, res) => {
  try {
    const result = await service.create(req.body, req.user.id);
    req.flash('success', 'Created successfully');
    res.redirect(`/resource/${result.id}`);
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/dashboard');
  }
});
```

### 2. htmx Enhanced Interactions
```typescript
app.post('/htmx/resource/:id/action', async (req, res) => {
  const result = await service.performAction(req.params.id, req.body);
  res.render('partials/component', { data: result, hx: true });
});
```

### 3. Progressive Enhancement
```javascript
if (typeof htmx !== 'undefined') {
  // Enhanced interactions available
} else {
  // Fallback to standard forms
  document.forms.forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
  });
}
```

## Security Patterns

### Authentication
- bcrypt for password hashing (12+ rounds)
- JWT tokens in httpOnly, secure cookies
- CSRF protection
- Session timeout and refresh logic

### Input Validation
```typescript
const schema = z.object({
  field: z.string().min(1).max(100),
  optional: z.string().optional()
});
```

### Authorization Middleware
```typescript
const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const hasAccess = await authService.checkPermission(
      req.user.id, 
      req.params.resourceId, 
      permission
    );
    if (!hasAccess) return res.status(403).render('error/403');
    next();
  };
};
```

## Performance Guidelines

### Server-Side Rendering
- EJS template caching in production
- Gzip compression middleware
- Static asset caching headers
- Database query optimization with Drizzle

### Progressive Enhancement Strategy
- Core functionality works without JavaScript
- Enhanced UX with htmx where beneficial
- Lazy loading of htmx script when needed
- Minimal client-side JavaScript footprint

## Deployment Configuration

### Vercel Setup
```json
{
  "functions": {
    "src/server.ts": {
      "maxDuration": 30
    }
  },
  "builds": [
    {
      "src": "src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.ts"
    }
  ]
}
```

### Environment Management
- Local: `.env.local` with SQLite database file
- Staging: Vercel preview with separate Supabase project  
- Production: Environment variables in Vercel dashboard with Supabase

### Database Strategy
- **Development:** SQLite file (`./local.db`) for instant setup and fast iteration
- **Production:** Supabase PostgreSQL for scalability and built-in features
- **Migration:** Drizzle handles schema differences between SQLite and PostgreSQL
- **Switching:** Change `DATABASE_URL` and run `npm run db:push` to switch environments

### Authentication Strategy
- **Development:** Custom JWT auth with local user table, bcrypt passwords
  - Instant setup, no API keys or network calls required
  - Simple login/logout flows for rapid feature development
- **Production Migration:** Switch to Supabase Auth when ready to deploy
  - Migrate existing users or require re-registration
  - Gain email verification, password reset, social login features
  - Environment variable toggle: `USE_SUPABASE_AUTH=true`
- **Migration Script:** Automated user migration from local JWT to Supabase Auth

This template can be reused for any server-first SaaS application.