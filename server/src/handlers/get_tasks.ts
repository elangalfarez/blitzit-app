
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getTasks = async (userId: number): Promise<Task[]> => {
  try {
    const results = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, userId))
      .orderBy(desc(tasksTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get tasks:', error);
    throw error;
  }
};
