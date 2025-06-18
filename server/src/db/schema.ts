
import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Priority enum for tasks
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// Users table with Neon Auth integration
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  neon_auth_user_id: text('neon_auth_user_id').notNull().unique(), // Links to Neon Auth's internal user ID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  completed: boolean('completed').notNull().default(false),
  priority: priorityEnum('priority').notNull().default('medium'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Focus sessions table
export const focusSessionsTable = pgTable('focus_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  task_id: integer('task_id').references(() => tasksTable.id), // Nullable - can focus without specific task
  duration_minutes: integer('duration_minutes').notNull(),
  started_at: timestamp('started_at').defaultNow().notNull(),
  ended_at: timestamp('ended_at'), // Nullable - null means session is ongoing
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  tasks: many(tasksTable),
  focusSessions: many(focusSessionsTable)
}));

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [tasksTable.user_id],
    references: [usersTable.id]
  }),
  focusSessions: many(focusSessionsTable)
}));

export const focusSessionsRelations = relations(focusSessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [focusSessionsTable.user_id],
    references: [usersTable.id]
  }),
  task: one(tasksTable, {
    fields: [focusSessionsTable.task_id],
    references: [tasksTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
export type FocusSession = typeof focusSessionsTable.$inferSelect;
export type NewFocusSession = typeof focusSessionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  tasks: tasksTable,
  focusSessions: focusSessionsTable
};
