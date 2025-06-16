
import { db } from '../db';
import { focusSessionsTable, tasksTable } from '../db/schema';
import { type EndFocusSessionInput, type FocusSession } from '../schema';
import { eq, and } from 'drizzle-orm';

export const endFocusSession = async (input: EndFocusSessionInput): Promise<FocusSession> => {
  try {
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

    if (result.length === 0) {
      throw new Error('Focus session not found or not owned by user');
    }

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
