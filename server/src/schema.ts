
import { z } from 'zod';

// User schema with Neon Auth integration
export const userSchema = z.object({
  id: z.number(),
  neon_auth_user_id: z.string(), // Links to Neon Auth's internal user ID
  email: z.string().email(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  priority: z.enum(['low', 'medium', 'high']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Focus session schema
export const focusSessionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  task_id: z.number().nullable(),
  duration_minutes: z.number().int(),
  started_at: z.coerce.date(),
  ended_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type FocusSession = z.infer<typeof focusSessionSchema>;

// Auth input schemas
export const signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const signInInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type SignInInput = z.infer<typeof signInInputSchema>;

// Task input schemas
export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const deleteTaskInputSchema = z.object({
  id: z.number()
});

export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;

// Focus session input schemas
export const endFocusSessionInputSchema = z.object({
  id: z.number(),
  duration_minutes: z.number().int().positive()
});

export type EndFocusSessionInput = z.infer<typeof endFocusSessionInputSchema>;

export const startFocusSessionInputSchema = z.object({
  task_id: z.number().nullable().optional()
});

export type StartFocusSessionInput = z.infer<typeof startFocusSessionInputSchema>;

// Auth response schemas
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string().optional()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// User stats schema
export const userStatsSchema = z.object({
  total_tasks: z.number().int(),
  completed_tasks: z.number().int(),
  total_focus_time: z.number().int(),
  current_streak: z.number().int()
});

export type UserStats = z.infer<typeof userStatsSchema>;
