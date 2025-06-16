
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteTask = async (taskId: number, userId: number): Promise<void> => {
  try {
    // Delete the task only if it belongs to the specified user
    await db.delete(tasksTable)
      .where(and(
        eq(tasksTable.id, taskId),
        eq(tasksTable.user_id, userId)
      ))
      .execute();
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
};
