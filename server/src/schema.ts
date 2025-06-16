
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
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
  estimated_minutes: z.number().int().nullable(),
  completed: z.boolean(),
  completed_at: z.coerce.date().nullable(),
  scheduled_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Focus session schema
export const focusSessionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  task_id: z.number(),
  duration_minutes: z.number().int(),
  started_at: z.coerce.date(),
  ended_at: z.coerce.date().nullable(),
  completed: z.boolean(),
  created_at: z.coerce.date()
});

export type FocusSession = z.infer<typeof focusSessionSchema>;

// Auth input schemas
export const signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1)
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const signInInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type SignInInput = z.infer<typeof signInInputSchema>;

// Task input schemas
export const createTaskInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  estimated_minutes: z.number().int().positive().nullable().optional(),
  scheduled_date: z.coerce.date()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  estimated_minutes: z.number().int().positive().nullable().optional(),
  completed: z.boolean().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const getTasksInputSchema = z.object({
  user_id: z.number(),
  date: z.coerce.date().optional()
});

export type GetTasksInput = z.infer<typeof getTasksInputSchema>;

// Focus session input schemas
export const startFocusSessionInputSchema = z.object({
  user_id: z.number(),
  task_id: z.number(),
  duration_minutes: z.number().int().positive()
});

export type StartFocusSessionInput = z.infer<typeof startFocusSessionInputSchema>;

export const endFocusSessionInputSchema = z.object({
  session_id: z.number(),
  user_id: z.number(),
  completed: z.boolean()
});

export type EndFocusSessionInput = z.infer<typeof endFocusSessionInputSchema>;

export const getUserStatsInputSchema = z.object({
  user_id: z.number(),
  date: z.coerce.date().optional()
});

export type GetUserStatsInput = z.infer<typeof getUserStatsInputSchema>;

// Response schemas
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const userStatsSchema = z.object({
  total_focus_minutes: z.number(),
  completed_tasks_count: z.number(),
  total_tasks_count: z.number(),
  active_session: focusSessionSchema.nullable()
});

export type UserStats = z.infer<typeof userStatsSchema>;
