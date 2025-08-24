# AI Kanban Board - Claude Context

## Project Overview
Server-first Trello-style Kanban board application with multi-tenant support and AI-powered features.

## Important Documentation Locations
- **Requirements**: `docs/project/REQUIREMENTS.md` - Complete feature specifications and database schema
- **Tech Stack**: `docs/template/STACK.md` - Architecture decisions and constraints
- **Package Info**: `package.json` - Dependencies and available scripts

## Key Commands
```bash
# Development
npm run dev                 # Start development server
npm run css:watch          # Watch CSS changes
npm run db:studio          # Open database studio
npm run type-check         # TypeScript validation

# Database
npm run db:push            # Push schema changes
npm run db:generate        # Generate migrations
```

## Project Structure
```
src/
├── routes/                # HTTP route handlers
│   ├── auth.ts           # Authentication routes
│   ├── boards.ts         # Board management
│   ├── organizations.ts  # Organization management  
│   ├── dashboard.ts      # Main dashboard
│   ├── api/              # JSON API endpoints
│   └── htmx/             # htmx partial updates
├── services/             # Business logic layer
├── views/                # EJS templates
│   ├── layouts/          # Base layouts
│   ├── pages/            # Full page templates
│   └── partials/         # Reusable components
├── db/schema.ts          # Database schema (Drizzle)
└── middleware/           # Express middleware
```

## Database
- **Local**: SQLite (`local.db`) with Drizzle ORM
- **Production**: Supabase PostgreSQL (planned)
- **Studio**: Access via `npm run db:studio`

## Authentication
- **Current**: Custom JWT + bcrypt (development)
- **Planned**: Supabase Auth (production)

## Tech Stack
- **Backend**: Express.js + TypeScript + EJS
- **Frontend**: TailwindCSS v4 + DaisyUI v5 + selective htmx
- **Database**: SQLite (dev) → Supabase (prod)
- **Deployment**: Vercel serverless

## Current Status
**Phase 2 COMPLETED**: Full Kanban board functionality with lists and cards

### Recent Updates
- ✅ Complete Kanban board interface with working lists and cards
- ✅ Card CRUD operations with modals and forms
- ✅ List management with inline editing
- ✅ Fixed CSP configuration to allow inline event handlers
- 🚀 Server running on http://localhost:3000

## Missing Features (From Requirements)
- Card management with drag-and-drop
- List management within boards
- Real-time collaboration
- AI-powered features
- User permissions and roles
- Comment system
- File attachments
- Activity feeds

## Git Repository
- **Main branch**: `main`
- **Status**: Clean working tree
- **Recent progress**: Views converted to DaisyUI components