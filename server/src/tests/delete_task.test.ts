
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type DeleteTaskInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  neon_auth_user_id: 'test-neon-auth-id',
  email: 'test@example.com',
  name: 'Test User'
};

const testTask = {
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'medium' as const,
  completed: false
};

const testInput: DeleteTaskInput = {
  id: 1 // Will be set to actual task ID in tests
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a task successfully', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: userId
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Delete the task
    const result = await deleteTask({ id: taskId }, userId);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify task no longer exists in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should return false when task does not exist', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to delete non-existent task
    const result = await deleteTask({ id: 999 }, userId);

    expect(result.success).toBe(false);
  });

  it('should return false when task belongs to different user', async () => {
    // Create first user
    const userResult1 = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId1 = userResult1[0].id;

    // Create second user
    const userResult2 = await db.insert(usersTable)
      .values({
        ...testUser,
        neon_auth_user_id: 'different-neon-auth-id',
        email: 'different@example.com'
      })
      .returning()
      .execute();
    const userId2 = userResult2[0].id;

    // Create task owned by first user
    const taskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: userId1
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Try to delete task as second user
    const result = await deleteTask({ id: taskId }, userId2);

    expect(result.success).toBe(false);

    // Verify task still exists
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(1);
  });

  it('should not affect other tasks when deleting', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple tasks
    const task1Result = await db.insert(tasksTable)
      .values({
        ...testTask,
        title: 'Task 1',
        user_id: userId
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        ...testTask,
        title: 'Task 2',
        user_id: userId
      })
      .returning()
      .execute();

    // Delete first task
    const result = await deleteTask({ id: task1Result[0].id }, userId);

    expect(result.success).toBe(true);

    // Verify first task is deleted
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task1Result[0].id))
      .execute();

    expect(deletedTask).toHaveLength(0);

    // Verify second task still exists
    const remainingTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task2Result[0].id))
      .execute();

    expect(remainingTask).toHaveLength(1);
    expect(remainingTask[0].title).toBe('Task 2');
  });
});
