
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { deleteTask } from '../handlers/delete_task';
import { eq, and } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a task that belongs to the user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Test Task',
        description: 'A task to be deleted',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Delete the task
    await deleteTask(taskId, userId);

    // Verify task is deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should not delete a task that belongs to a different user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User 1'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User 2'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create task for user1
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user1Id,
        title: 'User 1 Task',
        description: 'Task belonging to user 1',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Try to delete task using user2's ID
    await deleteTask(taskId, user2Id);

    // Verify task still exists
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].user_id).toEqual(user1Id);
  });

  it('should handle deleting non-existent task gracefully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to delete non-existent task
    const nonExistentTaskId = 99999;
    
    // Should not throw an error
    await expect(deleteTask(nonExistentTaskId, userId)).resolves.toBeUndefined();
  });

  it('should delete the correct task when multiple tasks exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple test tasks
    const task1Result = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Task 1',
        description: 'First task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();
    const task1Id = task1Result[0].id;

    const task2Result = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Task 2',
        description: 'Second task',
        scheduled_date: '2024-01-16'
      })
      .returning()
      .execute();
    const task2Id = task2Result[0].id;

    // Delete only task1
    await deleteTask(task1Id, userId);

    // Verify only task1 is deleted
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, userId))
      .execute();

    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].id).toEqual(task2Id);
    expect(remainingTasks[0].title).toEqual('Task 2');
  });
});
