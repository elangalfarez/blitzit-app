
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type DeleteTaskInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteTask = async (input: DeleteTaskInput, userId: number): Promise<{ success: boolean }> => {
  try {
    // Delete the task, ensuring it belongs to the user
    const result = await db.delete(tasksTable)
      .where(and(
        eq(tasksTable.id, input.id),
        eq(tasksTable.user_id, userId)
      ))
      .returning()
      .execute();

    // Return success based on whether a task was actually deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
};
