# AI Kanban Board - Claude Context

## Project Overview
Server-first Trello-style Kanban board application with multi-tenant support and AI-powered features.

## Important Documentation Locations
- **Requirements & Design Philosophy**: `docs/project/REQUIREMENTS.md` - Complete feature specifications, database schema, and implementation patterns
  - See "Design Philosophy & Implementation Patterns" section for HTMX patterns and UI/UX principles
  - Contains modal interaction patterns, code architecture standards, and direct-edit design principles
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
**Phase 2.5 COMPLETED**: Modal system redesign with direct-edit pattern

### Recent Updates
- ✅ Complete Kanban board interface with working lists and cards
- ✅ Card CRUD operations with direct-edit modals (no view/edit toggle)
- ✅ Immediate UI feedback with background server sync
- ✅ Simplified HTMX patterns with OOB swaps
- ✅ List management with inline editing
- ✅ Fixed CSP configuration to allow inline event handlers
- 🚀 Server running on http://localhost:3000

### Design Pattern Achievements
- ✅ **One-Click Edit**: Cards open directly in edit mode
- ✅ **Immediate Feedback**: Modal closes instantly on save/delete
- ✅ **Background Sync**: Server updates happen asynchronously via OOB swaps
- ✅ **Simple HTMX**: Direct element targeting, no complex JavaScript state

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
- Don't add Emojis to interfaces in the app with being expressly told to
- After building a feature or significant functionality, please update the requirements.md and todo list