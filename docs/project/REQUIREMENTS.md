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

## Design Philosophy & Implementation Patterns

### UI/UX Design Principles
- **One-Click Direct Actions:** Users should be able to edit cards with a single click, no separate "view" and "edit" modes
- **Immediate Feedback:** Modal closes and UI updates happen instantly, not after waiting for server responses
- **Progressive Disclosure:** Show essential information upfront, details on demand
- **Minimal Cognitive Load:** Reduce the number of steps and decisions required for common actions

### HTMX Implementation Standards
- **Simplicity First:** Prefer simple HTMX patterns over complex JavaScript state management
- **Direct Element Targeting:** Use explicit IDs and direct targeting rather than complex DOM traversal
- **Immediate UI Response:** Trigger UI changes immediately on user actions, let server updates happen in background
- **Out-of-Band (OOB) Swaps:** Use `hx-swap-oob` for updating multiple parts of the page from single server response
- **Form-to-Modal Pattern:** 
  ```html
  <!-- Click card opens edit modal directly -->
  <div hx-get="/cards/123" hx-target="#modalContent" onclick="showModal()">
  
  <!-- Save triggers request + immediate modal close -->
  <button hx-put="/cards/123" hx-include="closest form" 
          onclick="document.getElementById('modal').close()">
  ```

### Code Architecture Patterns
- **Server-Side Templates:** Use EJS partials for reusable components (card-item.ejs, card-edit-modal.ejs)
- **Response Templates:** Separate templates for different response types:
  - `card-edit-modal.ejs` - Initial modal content
  - `card-update-oob.ejs` - OOB swap responses for board updates
  - `card-item.ejs` - Reusable card display component
- **Route Simplicity:** Routes should have single responsibilities:
  - GET `/cards/:id` → Returns edit modal template
  - PUT `/cards/:id` → Updates card + returns OOB swap template
  - DELETE `/cards/:id` → Deletes card + returns empty OOB swap
- **Error Handling:** Graceful degradation with meaningful error messages and fallback behaviors

### Modal Interaction Patterns
- **Edit-Only Modals:** Cards open directly in edit mode, no separate view/edit toggle
- **Immediate Close:** Modal closes as soon as user takes action (save/delete/cancel)
- **Background Sync:** Server operations complete in background while user continues working
- **Context Preservation:** Show card metadata (created date, author) as read-only context in edit modal

### Database & State Management
- **Optimistic UI:** UI updates immediately, server sync happens asynchronously
- **Single Source of Truth:** Database as the authoritative state, UI reflects database changes via OOB swaps
- **Minimal Client State:** Avoid complex client-side state management, let server drive UI updates

## AI Chatbot Feature

### Architecture Overview
**Client-Side with Server Proxy Pattern**
- All chat history stored in browser memory (JavaScript arrays)
- Chat state resets on page refresh (intentional for v1 simplicity)
- Server proxy endpoint protects OpenAI API key while maintaining security
- Zero database schema changes required for initial implementation

### Technical Implementation

#### 1. Server-Side Proxy Endpoint
- **Route**: `POST /api/chat`
- **Input**: `{messages: [{role: 'user'|'assistant', content: string}]}`
- **Processing**: Forwards request to OpenAI API with server-stored API key
- **Output**: Returns OpenAI response directly to client
- **Model**: `gpt-4o-mini` (cost-effective, fast response times)

#### 2. Client-Side Architecture
```javascript
// In-memory chat storage (resets on page refresh)
let chatMessages = [];

// Simple API call to our proxy endpoint
async function sendMessage(userMessage) {
  chatMessages.push({role: 'user', content: userMessage});
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({messages: chatMessages})
  });
  
  const data = await response.json();
  const aiMessage = data.choices[0].message;
  chatMessages.push(aiMessage);
  
  displayMessage(aiMessage);
}
```

#### 3. UI Integration
- **Location**: Chat modal/sidebar integrated into existing board view
- **Access**: Toggle button in board header for unobtrusive access
- **Styling**: Leverages existing DaisyUI components (modal, chat bubbles, input fields)
- **JavaScript**: Vanilla JS implementation, no HTMX required for chat functionality
- **UX**: Non-intrusive interface that doesn't disrupt existing Kanban workflow

#### 4. Security & Environment
- OpenAI API key stored in server-side `.env` file only
- API key never exposed to client-side code
- Server can implement rate limiting and authentication checks
- All requests authenticated through existing user session system

#### 5. Streaming Architecture (Phase 1.5 Enhancement)
**Server-Sent Events Implementation:**
```javascript
// Server endpoint: GET /api/chat/stream
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: messages,
  stream: true // Enable OpenAI streaming
});

// Stream chunks to client via SSE
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta;
  if (delta?.content) {
    res.write(`data: ${JSON.stringify({
      type: 'content', 
      content: delta.content
    })}\n\n`);
  }
}
```

**Client-Side Progressive Display:**
```javascript
const eventSource = new EventSource(`/api/chat/stream?messages=${messagesParam}`);

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'content') {
    streamedContent += data.content;
    updateStreamingMessage(messageId, streamedContent);
  }
};
```

**Fallback Strategy:**
- Primary: Server-Sent Events for real-time streaming
- Fallback: Regular POST request if SSE fails
- Automatic detection and graceful degradation
- Same authentication and error handling for both methods

### Implementation Files
1. **API Routes**: `src/routes/api.ts` - Both `/chat` and `/chat/stream` endpoints
2. **UI Updates**: `src/views/pages/boards/show.ejs` - Chat interface with streaming support
3. **Client JavaScript**: Enhanced chat functionality with EventSource integration
4. **Environment**: `OPENAI_API_KEY` in `.env` configuration

### Iterative Development Phases

#### Phase 1 (v1): Basic Chatbot ✅ COMPLETED
- ✅ Simple chat interface with no board context
- ✅ Generic AI assistant responses  
- ✅ In-memory conversation history
- ✅ Basic error handling and loading states
- ✅ **ENHANCEMENT**: Real-time streaming responses with SSE

#### Phase 1.5 (v1.5): Streaming Implementation ✅ COMPLETED
- ✅ Server-Sent Events (SSE) for real-time message streaming
- ✅ Progressive character-by-character message display
- ✅ Live typing cursor effect during streaming
- ✅ Graceful fallback to regular POST requests on SSE failure
- ✅ Enhanced loading states and error handling
- ✅ 30-second timeout protection for streaming requests

#### Phase 2 (v2): Board Context Integration 🔄 NEXT
- Include board data (name, description, lists, cards) as AI context
- AI responses aware of current board state
- Context-aware suggestions and insights

#### Phase 3 (v3): Enhanced Persistence
- Optional: Add database storage for chat history
- Cross-session conversation continuity
- User preference settings for chat behavior

#### Phase 4 (v4): Advanced Features
- File/image upload support in chat
- Integration with card creation/editing through chat
- Advanced AI capabilities (task analysis, project insights)

### Security Benefits
- API key protection through server proxy pattern
- Integration with existing authentication and authorization system
- Server-side request logging and monitoring capabilities
- Rate limiting and abuse prevention at application level
- Easy to add additional security layers in future iterations

### Development Philosophy
- **Minimal Start**: Begin with simplest possible implementation
- **Iterative Enhancement**: Add features incrementally based on user feedback
- **Existing Pattern Compliance**: Follows established codebase patterns and conventions
- **Security First**: Maintains security best practices from initial implementation

## Success Metrics
- User registration to first board creation: < 5 minutes
- Daily active users engaging with AI features: > 30%
- Average cards per board: 20-50 (indicates healthy usage)
- User retention after 30 days: > 60%
- Card edit completion time: < 10 seconds (thanks to direct-edit pattern)
- Modal interaction abandonment rate: < 5% (immediate feedback reduces friction)