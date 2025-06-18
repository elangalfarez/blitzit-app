
import { db } from '../db';
import { focusSessionsTable, tasksTable } from '../db/schema';
import { type StartFocusSessionInput, type FocusSession } from '../schema';
import { eq } from 'drizzle-orm';

export const startFocusSession = async (input: StartFocusSessionInput, userId: number): Promise<FocusSession> => {
  try {
    // If task_id is provided, verify the task exists and belongs to the user
    if (input.task_id) {
      const task = await db.select()
        .from(tasksTable)
        .where(eq(tasksTable.id, input.task_id))
        .execute();

      if (task.length === 0) {
        throw new Error('Task not found');
      }

      if (task[0].user_id !== userId) {
        throw new Error('Task does not belong to user');
      }
    }

    // Create the focus session
    const result = await db.insert(focusSessionsTable)
      .values({
        user_id: userId,
        task_id: input.task_id || null,
        duration_minutes: 0, // Initial duration is 0 when starting
        started_at: new Date(),
        ended_at: null // null indicates session is ongoing
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Focus session creation failed:', error);
    throw error;
  }
};
