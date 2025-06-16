
import { serial, text, pgTable, timestamp, integer, boolean, varchar, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  estimated_minutes: integer('estimated_minutes'),
  completed: boolean('completed').default(false).notNull(),
  completed_at: timestamp('completed_at'),
  scheduled_date: date('scheduled_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const focusSessionsTable = pgTable('focus_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  task_id: integer('task_id').notNull().references(() => tasksTable.id, { onDelete: 'cascade' }),
  duration_minutes: integer('duration_minutes').notNull(),
  started_at: timestamp('started_at').defaultNow().notNull(),
  ended_at: timestamp('ended_at'),
  completed: boolean('completed').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  tasks: many(tasksTable),
  focusSessions: many(focusSessionsTable),
}));

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [tasksTable.user_id],
    references: [usersTable.id],
  }),
  focusSessions: many(focusSessionsTable),
}));

export const focusSessionsRelations = relations(focusSessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [focusSessionsTable.user_id],
    references: [usersTable.id],
  }),
  task: one(tasksTable, {
    fields: [focusSessionsTable.task_id],
    references: [tasksTable.id],
  }),
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
  focusSessions: focusSessionsTable,
};
