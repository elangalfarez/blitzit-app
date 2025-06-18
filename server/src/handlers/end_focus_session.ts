
import { db } from '../db';
import { focusSessionsTable } from '../db/schema';
import { type EndFocusSessionInput, type FocusSession } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const endFocusSession = async (input: EndFocusSessionInput, userId: number): Promise<FocusSession> => {
  try {
    // Update the focus session with duration and end time
    const result = await db.update(focusSessionsTable)
      .set({
        duration_minutes: input.duration_minutes,
        ended_at: new Date()
      })
      .where(
        and(
          eq(focusSessionsTable.id, input.id),
          eq(focusSessionsTable.user_id, userId),
          isNull(focusSessionsTable.ended_at) // Only update sessions that haven't ended yet
        )
      )
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Focus session not found or already ended');
    }

    return result[0];
  } catch (error) {
    console.error('Focus session ending failed:', error);
    throw error;
  }
};
