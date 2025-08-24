import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

// Users table for local authentication
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Organizations for multi-tenancy
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// User-Organization relationships with roles
export const userOrganizations = sqliteTable('user_organizations', {
  userId: text('user_id').notNull().references(() => users.id),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  role: text('role', { enum: ['owner', 'admin', 'member', 'viewer'] }).notNull(),
  invitedBy: text('invited_by').references(() => users.id),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Boards
export const boards = sqliteTable('boards', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull().references(() => users.id),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Lists (columns in Kanban board)
export const lists = sqliteTable('lists', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  boardId: text('board_id').notNull().references(() => boards.id),
  name: text('name').notNull(),
  position: real('position').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Cards (tasks in Kanban board)
export const cards = sqliteTable('cards', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  listId: text('list_id').notNull().references(() => lists.id),
  title: text('title').notNull(),
  description: text('description'),
  position: real('position').notNull(),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Card labels
export const cardLabels = sqliteTable('card_labels', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  cardId: text('card_id').notNull().references(() => cards.id),
  name: text('name').notNull(),
  color: text('color').notNull(), // hex color code
});

// Card assignees
export const cardAssignees = sqliteTable('card_assignees', {
  cardId: text('card_id').notNull().references(() => cards.id),
  userId: text('user_id').notNull().references(() => users.id),
  assignedBy: text('assigned_by').notNull().references(() => users.id),
  assignedAt: integer('assigned_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Card comments
export const cardComments = sqliteTable('card_comments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  cardId: text('card_id').notNull().references(() => cards.id),
  userId: text('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Card attachments
export const cardAttachments = sqliteTable('card_attachments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  cardId: text('card_id').notNull().references(() => cards.id),
  filename: text('filename').notNull(),
  fileUrl: text('file_url').notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// AI suggestions for cards
export const aiSuggestions = sqliteTable('ai_suggestions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  cardId: text('card_id').notNull().references(() => cards.id),
  suggestionType: text('suggestion_type', { 
    enum: ['description', 'labels', 'due_date', 'category'] 
  }).notNull(),
  content: text('content').notNull(), // JSON string
  applied: integer('applied', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});