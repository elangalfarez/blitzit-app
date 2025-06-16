
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTask = async (input: UpdateTaskInput): Promise<Task> => {
  try {
    // Build update values - only include fields that are provided
    const updateValues: Partial<typeof tasksTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateValues.title = input.title;
    }

    if (input.description !== undefined) {
      updateValues.description = input.description;
    }

    if (input.estimated_minutes !== undefined) {
      updateValues.estimated_minutes = input.estimated_minutes;
    }

    if (input.completed !== undefined) {
      updateValues.completed = input.completed;
      // Set completed_at timestamp when marking as completed
      updateValues.completed_at = input.completed ? new Date() : null;
    }

    // Update the task
    const result = await db.update(tasksTable)
      .set(updateValues)
      .where(and(
        eq(tasksTable.id, input.id),
        eq(tasksTable.user_id, input.user_id)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Task not found or access denied');
    }

    const task = result[0];
    
    // Convert scheduled_date string to Date to match Zod schema
    return {
      ...task,
      scheduled_date: new Date(task.scheduled_date)
    };
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
};
