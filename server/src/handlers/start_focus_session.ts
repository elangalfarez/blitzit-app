
import { db } from '../db';
import { focusSessionsTable, tasksTable, usersTable } from '../db/schema';
import { type StartFocusSessionInput, type FocusSession } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const startFocusSession = async (input: StartFocusSessionInput): Promise<FocusSession> => {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Verify task exists and belongs to the user
    const tasks = await db.select()
      .from(tasksTable)
      .where(and(
        eq(tasksTable.id, input.task_id),
        eq(tasksTable.user_id, input.user_id)
      ))
      .execute();

    if (tasks.length === 0) {
      throw new Error('Task not found or does not belong to user');
    }

    // Check for any active sessions for this user
    const activeSessions = await db.select()
      .from(focusSessionsTable)
      .where(and(
        eq(focusSessionsTable.user_id, input.user_id),
        isNull(focusSessionsTable.ended_at)
      ))
      .execute();

    if (activeSessions.length > 0) {
      throw new Error('User already has an active focus session');
    }

    // Create new focus session
    const result = await db.insert(focusSessionsTable)
      .values({
        user_id: input.user_id,
        task_id: input.task_id,
        duration_minutes: input.duration_minutes,
        completed: false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Focus session creation failed:', error);
    throw error;
  }
};
