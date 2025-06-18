import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteTask = async (taskId: number, userId: number): Promise<void> => {
  try {
    // First check if task exists and belongs to user
    const existingTasks = await db.select()
      .from(tasksTable)
      .where(and(
        eq(tasksTable.id, taskId),
        eq(tasksTable.user_id, userId)
      ))
      .execute();

    if (existingTasks.length === 0) {
      throw new Error('Task not found or access denied');
    }

    // Delete the task
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