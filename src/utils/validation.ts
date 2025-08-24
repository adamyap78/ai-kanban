import { z } from 'zod';

// Auth validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Organization validation schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(50, 'Name too long'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(30, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .transform((slug) => slug.toLowerCase()),
});

// Board validation schemas
export const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(100, 'Board name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  organizationId: z.string().min(1, 'Organization is required'),
});

// List validation schemas
export const createListSchema = z.object({
  name: z.string().min(1, 'List name is required').max(50, 'List name too long'),
  boardId: z.string().min(1, 'Board ID is required'),
});

// Card validation schemas
export const createCardSchema = z.object({
  title: z.string().min(1, 'Card title is required').max(100, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  listId: z.string().min(1, 'List ID is required'),
  dueDate: z.string().datetime().optional(),
});