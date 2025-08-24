# AI Kanban Board - Project Requirements

## Application Overview
A Trello-style Kanban board application with multi-user support, multiple boards, and AI-powered functionality for task management and productivity insights.

## Core Features

### 1. Multi-Tenant Structure
```
Organization -> Multiple Boards -> Multiple Lists -> Multiple Cards
Users can belong to multiple Organizations with role-based permissions
```

### 2. User Management
- **Registration/Login:** Email/password authentication
- **Organizations:** Users can create and join multiple organizations
- **Roles:** Owner, Admin, Member, Viewer per organization
- **Invitations:** Email-based invitation system with role assignment

### 3. Board Management
- **Multiple Boards:** Each organization can have unlimited boards
- **Board Settings:** Name, description, visibility (private/organization)
- **Templates:** Pre-configured board templates for common workflows
- **Archives:** Soft-delete boards with restoration capability

### 4. Kanban Functionality
- **Lists:** Customizable workflow stages (To Do, In Progress, Done, etc.)
- **Cards:** Tasks with title, description, due dates, labels, assignees
- **Drag & Drop:** Reorder cards within lists and between lists
- **Card Details:** Comments, attachments, checklists, activity history
- **Labels:** Color-coded labels with custom names

### 5. Collaboration Features
- **Real-time Updates:** See changes made by other users (via htmx polling)
- **Comments:** Threaded discussions on cards
- **Mentions:** @mention users in comments with notifications
- **Activity Feed:** Timeline of all board activities
- **Notifications:** Email notifications for assignments, mentions, due dates

### 6. AI-Powered Features
- **Smart Card Creation:** AI suggests card details from brief descriptions
  - Input: "Need to fix login bug"
  - Output: Suggests title, description, acceptance criteria, labels
- **Content Generation:** Auto-generate detailed task descriptions
- **Intelligent Categorization:** Auto-assign cards to appropriate lists based on content
- **Progress Insights:** AI analysis of project health and bottlenecks
- **Smart Search:** Semantic search across all boards and cards
- **Due Date Suggestions:** AI recommends realistic due dates based on card complexity

## Database Schema

### Core Tables
```sql
-- Users and Authentication
users (id, email, password_hash, name, avatar_url, created_at, updated_at)
user_sessions (id, user_id, token, expires_at)

-- Multi-tenant Structure
organizations (id, name, slug, created_by, created_at, updated_at)
user_organizations (user_id, organization_id, role, invited_by, joined_at)

-- Board Structure  
boards (id, organization_id, name, description, created_by, archived_at, created_at, updated_at)
lists (id, board_id, name, position, created_at, updated_at)
cards (id, list_id, title, description, position, due_date, created_by, created_at, updated_at)

-- Card Details
card_labels (id, card_id, name, color)
card_assignees (card_id, user_id, assigned_by, assigned_at)
card_comments (id, card_id, user_id, content, created_at, updated_at)
card_attachments (id, card_id, filename, file_url, uploaded_by, uploaded_at)

-- AI Features
ai_suggestions (id, card_id, suggestion_type, content, applied, created_at)
```

### Key Relationships
- Users ↔ Organizations (many-to-many with roles)
- Organizations → Boards (one-to-many)
- Boards → Lists (one-to-many with ordering)
- Lists → Cards (one-to-many with ordering)
- Cards → Labels, Comments, Attachments (one-to-many)

## User Flows

### 1. Onboarding Flow
1. User signs up with email/password
2. Creates their first organization
3. Invited to choose from board templates or create blank board
4. Quick tutorial overlay highlighting key features

### 2. Daily Usage Flow
1. User logs in and sees dashboard with all accessible boards
2. Clicks on a board to enter Kanban view
3. Can create cards, move them between lists, add details
4. AI suggestions appear automatically for new cards
5. Real-time updates show other users' changes

### 3. Collaboration Flow
1. Organization owner invites new members via email
2. New members receive invitation email with role assignment
3. Members can access organization boards based on permissions
4. Comments and mentions trigger email notifications

## AI Integration Specifications

### 1. Smart Card Creation
- **Trigger:** User creates card with minimal title
- **Process:** Background AI analysis via Vercel Cron
- **Output:** Suggested description, labels, due date
- **UI:** Show suggestions with accept/reject options

### 2. Progress Insights
- **Trigger:** Weekly automated analysis
- **Data:** Card completion rates, bottlenecks, team velocity
- **Output:** Dashboard widget with actionable insights
- **Delivery:** Email summary to organization owners

### 3. Semantic Search
- **Implementation:** OpenAI embeddings stored in Supabase vector extension
- **Scope:** Search across card titles, descriptions, comments
- **UI:** Enhanced search bar with AI-powered results ranking

## Technical Requirements

### Performance
- Page load time < 2 seconds
- Card drag/drop operations < 200ms response
- Support 100+ cards per board without performance degradation

### Security
- All passwords hashed with bcrypt (12+ rounds)
- JWT tokens in httpOnly cookies with CSRF protection
- Row-level security for multi-tenant data isolation
- Rate limiting on authentication and AI endpoints

### Scalability
- Database optimized for multi-tenant queries
- AI operations processed in background jobs
- Static assets served via CDN
- Horizontal scaling via Vercel serverless functions

## Success Metrics
- User registration to first board creation: < 5 minutes
- Daily active users engaging with AI features: > 30%
- Average cards per board: 20-50 (indicates healthy usage)
- User retention after 30 days: > 60%