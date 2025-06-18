import { db } from '../db';
import { focusSessionsTable, tasksTable } from '../db/schema';
import { type EndFocusSessionInput, type FocusSession } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const endFocusSession = async (input: EndFocusSessionInput): Promise<FocusSession> => {
  try {
    // First check if session exists, belongs to user, and is not already ended
    const existingSessions = await db.select()
      .from(focusSessionsTable)
      .where(and(
        eq(focusSessionsTable.id, input.session_id),
        eq(focusSessionsTable.user_id, input.user_id),
        isNull(focusSessionsTable.ended_at)
      ))
      .execute();

    if (existingSessions.length === 0) {
      // Check if it exists but is already ended
      const alreadyEndedSessions = await db.select()
        .from(focusSessionsTable)
        .where(and(
          eq(focusSessionsTable.id, input.session_id),
          eq(focusSessionsTable.user_id, input.user_id)
        ))
        .execute();

      if (alreadyEndedSessions.length > 0) {
        throw new Error('Focus session already ended');
      } else {
        throw new Error('Focus session not found or not owned by user');
      }
    }

    // Update the focus session with end time and completion status
    const result = await db.update(focusSessionsTable)
      .set({
        ended_at: new Date(),
        completed: input.completed
      })
      .where(
        and(
          eq(focusSessionsTable.id, input.session_id),
          eq(focusSessionsTable.user_id, input.user_id)
        )
      )
      .returning()
      .execute();

    const focusSession = result[0];

    // If the session was completed, mark the associated task as completed
    if (input.completed) {
      await db.update(tasksTable)
        .set({
          completed: true,
          completed_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(tasksTable.id, focusSession.task_id))
        .execute();
    }

    return focusSession;
  } catch (error) {
    console.error('End focus session failed:', error);
    throw error;
  }
};