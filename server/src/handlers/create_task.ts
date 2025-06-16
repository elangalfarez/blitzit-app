
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // Insert task record
    const result = await db.insert(tasksTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        description: input.description || null,
        estimated_minutes: input.estimated_minutes || null,
        scheduled_date: input.scheduled_date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string for date column
      })
      .returning()
      .execute();

    // Convert the result to match the Task schema
    const task = result[0];
    return {
      ...task,
      scheduled_date: new Date(task.scheduled_date), // Convert string back to Date
      completed_at: task.completed_at ? new Date(task.completed_at) : null,
      created_at: new Date(task.created_at),
      updated_at: new Date(task.updated_at)
    };
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};
