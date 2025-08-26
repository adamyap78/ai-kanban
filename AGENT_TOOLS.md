# AI Agent Tools for Kanban Board

Simple CRUD API tools that allow AI agents to manipulate the Kanban board programmatically.

## API Authentication

All agent API endpoints require an API key in the header:
```
x-agent-api-key: agent-dev-key-123
```

## Base URL

All endpoints are under `/agent/` path:
```
POST /agent/cards
GET /agent/boards/123
```

## Available Tools

### Card Operations

#### Create Card
```http
POST /agent/cards
Content-Type: application/json

{
  "title": "Task title",
  "description": "Optional description",
  "listId": "list-id-here",
  "dueDate": "2024-01-15T10:00:00Z"
}
```

#### Get Card
```http
GET /agent/cards/{cardId}
```

#### Update Card
```http
PUT /agent/cards/{cardId}
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description",
  "dueDate": "2024-01-20T10:00:00Z"
}
```

#### Move Card Between Lists
```http
PUT /agent/cards/{cardId}/move
Content-Type: application/json

{
  "listId": "target-list-id",
  "position": 1
}
```

#### Delete Card
```http
DELETE /agent/cards/{cardId}
```

#### Get All Cards in a List
```http
GET /agent/lists/{listId}/cards
```

### List Operations

#### Create List
```http
POST /agent/lists
Content-Type: application/json

{
  "name": "New List",
  "boardId": "board-id-here"
}
```

#### Update List Name
```http
PUT /agent/lists/{listId}
Content-Type: application/json

{
  "name": "Updated List Name"
}
```

#### Delete List (and all cards)
```http
DELETE /agent/lists/{listId}
```

#### Get All Lists in Board
```http
GET /agent/boards/{boardId}/lists
```

### Board Operations

#### Get Board Overview (with lists and cards)
```http
GET /agent/boards/{boardId}
```

Returns complete board structure:
```json
{
  "success": true,
  "board": {
    "id": "board-id",
    "name": "Board Name", 
    "description": "Board description",
    "lists": [
      {
        "id": "list-id",
        "name": "List Name",
        "position": 1,
        "cards": [
          {
            "id": "card-id",
            "title": "Card Title",
            "description": "Card description",
            "dueDate": "2024-01-15T10:00:00Z",
            "position": 1
          }
        ]
      }
    ]
  }
}
```

## Response Format

All responses follow this format:
```json
{
  "success": true|false,
  "data": {...}, // On success
  "error": "Error message" // On failure
}
```

## Usage Notes

- The agent automatically uses the first user in the database for all operations
- No authentication/authorization checks are performed (development only)
- Page refresh might be needed to see changes in the UI
- All operations happen in the backend only
- Simple, minimal code for basic CRUD operations