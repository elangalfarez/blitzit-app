
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type GetTasksInput, type Task } from '../schema';
import { eq, and } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export const getTasks = async (input: GetTasksInput): Promise<Task[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(tasksTable.user_id, input.user_id));

    // Optionally filter by date if provided
    if (input.date) {
      // Convert date to string for comparison with date column
      const dateString = input.date.toISOString().split('T')[0];
      conditions.push(eq(tasksTable.scheduled_date, dateString));
    }

    // Build and execute query
    const results = await db.select()
      .from(tasksTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(tasksTable.scheduled_date, tasksTable.created_at)
      .execute();

    // Convert database results to Task schema format
    return results.map(task => ({
      id: task.id,
      user_id: task.user_id,
      title: task.title,
      description: task.description,
      estimated_minutes: task.estimated_minutes,
      completed: task.completed,
      completed_at: task.completed_at,
      scheduled_date: new Date(task.scheduled_date + 'T00:00:00.000Z'), // Convert date string to Date object
      created_at: task.created_at,
      updated_at: task.updated_at
    }));
  } catch (error) {
    console.error('Get tasks failed:', error);
    throw error;
  }
};
