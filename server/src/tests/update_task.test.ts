
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  neon_auth_user_id: 'test-neon-user-123',
  email: 'test@example.com',
  name: 'Test User'
};

const testTask = {
  title: 'Original Task',
  description: 'Original description',
  completed: false,
  priority: 'medium' as const
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update task title', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        ...testTask
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Update task
    const updateInput: UpdateTaskInput = {
      id: taskId,
      title: 'Updated Task Title'
    };

    const result = await updateTask(updateInput, userId);

    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Original description');
    expect(result.completed).toEqual(false);
    expect(result.priority).toEqual('medium');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task completion status', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        ...testTask
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Update task completion
    const updateInput: UpdateTaskInput = {
      id: taskId,
      completed: true
    };

    const result = await updateTask(updateInput, userId);

    expect(result.completed).toEqual(true);
    expect(result.title).toEqual('Original Task');
    expect(result.description).toEqual('Original description');
    expect(result.priority).toEqual('medium');
  });

  it('should update multiple fields at once', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        ...testTask
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Update multiple fields
    const updateInput: UpdateTaskInput = {
      id: taskId,
      title: 'Updated Title',
      description: 'Updated description',
      completed: true,
      priority: 'high'
    };

    const result = await updateTask(updateInput, userId);

    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Updated description');
    expect(result.completed).toEqual(true);
    expect(result.priority).toEqual('high');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update description to null', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        ...testTask
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Update description to null
    const updateInput: UpdateTaskInput = {
      id: taskId,
      description: null
    };

    const result = await updateTask(updateInput, userId);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Original Task');
    expect(result.completed).toEqual(false);
    expect(result.priority).toEqual('medium');
  });

  it('should save changes to database', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        ...testTask
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Update task
    const updateInput: UpdateTaskInput = {
      id: taskId,
      title: 'Database Updated Title',
      completed: true
    };

    await updateTask(updateInput, userId);

    // Verify changes in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Updated Title');
    expect(tasks[0].completed).toEqual(true);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when task does not exist', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const updateInput: UpdateTaskInput = {
      id: 999, // Non-existent task ID
      title: 'Updated Title'
    };

    expect(updateTask(updateInput, userId)).rejects.toThrow(/Task not found/i);
  });

  it('should throw error when task belongs to different user', async () => {
    // Create first user
    const userResult1 = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId1 = userResult1[0].id;

    // Create second user
    const userResult2 = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-neon-user-456',
        email: 'test2@example.com',
        name: 'Test User 2'
      })
      .returning()
      .execute();
    const userId2 = userResult2[0].id;

    // Create task for first user
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId1,
        ...testTask
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Try to update task as second user
    const updateInput: UpdateTaskInput = {
      id: taskId,
      title: 'Unauthorized Update'
    };

    expect(updateTask(updateInput, userId2)).rejects.toThrow(/Task not found/i);
  });
});
