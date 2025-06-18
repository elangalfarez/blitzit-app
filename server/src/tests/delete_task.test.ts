import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

// Helper function to create a test user with Neon Auth ID
async function createTestUser(email: string = 'test@example.com', name: string = 'Test User') {
  const result = await db.insert(usersTable)
    .values({
      neon_auth_user_id: `neon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name
    })
    .returning()
    .execute();
  return result[0];
}

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a task successfully', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Task to Delete',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Delete the task
    await deleteTask(task.id, user.id);

    // Verify it was deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should throw error when task not found', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Try to delete non-existent task
    await expect(deleteTask(999, user.id)).rejects.toThrow(/not found|access denied/i);
  });

  it('should throw error when user does not own the task', async () => {
    // Create two test users
    const user1 = await createTestUser('user1@example.com', 'User One');
    const user2 = await createTestUser('user2@example.com', 'User Two');

    // Create a task owned by user1
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user1.id,
        title: 'User1 Task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Try to delete with user2 (should fail)
    await expect(deleteTask(task.id, user2.id)).rejects.toThrow(/not found|access denied/i);
  });

  it('should not affect other tasks', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create multiple tasks
    const task1Result = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Task 1',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Task 2',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task1 = task1Result[0];
    const task2 = task2Result[0];

    // Delete only task1
    await deleteTask(task1.id, user.id);

    // Verify task1 is deleted but task2 remains
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, user.id))
      .execute();

    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].id).toEqual(task2.id);
    expect(remainingTasks[0].title).toEqual('Task 2');
  });

  it('should handle cascade deletion when user is deleted', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Task to be cascaded',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Delete the user (should cascade to tasks)
    await db.delete(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    // Verify task was also deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });
});