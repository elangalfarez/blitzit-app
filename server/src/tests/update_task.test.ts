import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
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

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update task title', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Original Title',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    const input: UpdateTaskInput = {
      id: task.id,
      user_id: user.id,
      title: 'Updated Title'
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(task.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.user_id).toEqual(user.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > task.updated_at).toBe(true);
  });

  it('should update task completion status', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Task to Complete',
        completed: false,
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    const input: UpdateTaskInput = {
      id: task.id,
      user_id: user.id,
      completed: true
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(task.id);
    expect(result.completed).toBe(true);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.title).toEqual('Task to Complete'); // Should not change
  });

  it('should update multiple fields', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Multi Update Task',
        description: 'Original description',
        estimated_minutes: 30,
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    const input: UpdateTaskInput = {
      id: task.id,
      user_id: user.id,
      title: 'Updated Multi Task',
      description: 'New description',
      estimated_minutes: 45,
      completed: true
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(task.id);
    expect(result.title).toEqual('Updated Multi Task');
    expect(result.description).toEqual('New description');
    expect(result.estimated_minutes).toEqual(45);
    expect(result.completed).toBe(true);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated task to database', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Database Update Task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    const input: UpdateTaskInput = {
      id: task.id,
      user_id: user.id,
      title: 'Updated Database Task',
      description: 'New database description'
    };

    await updateTask(input);

    // Verify it was saved to database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Updated Database Task');
    expect(tasks[0].description).toEqual('New database description');
    expect(tasks[0].updated_at > task.updated_at).toBe(true);
  });

  it('should throw error when task not found', async () => {
    // Create a test user first
    const user = await createTestUser();

    const input: UpdateTaskInput = {
      id: 999,
      user_id: user.id,
      title: 'Non-existent Task'
    };

    await expect(updateTask(input)).rejects.toThrow(/not found/i);
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

    // Try to update with user2 (should fail)
    const input: UpdateTaskInput = {
      id: task.id,
      user_id: user2.id,
      title: 'Unauthorized Update'
    };

    await expect(updateTask(input)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task with all fields
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Complete Task',
        description: 'Full description',
        estimated_minutes: 60,
        completed: false,
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Update only estimated_minutes
    const input: UpdateTaskInput = {
      id: task.id,
      user_id: user.id,
      estimated_minutes: 90
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(task.id);
    expect(result.title).toEqual('Complete Task'); // Should not change
    expect(result.description).toEqual('Full description'); // Should not change
    expect(result.estimated_minutes).toEqual(90); // Should change
    expect(result.completed).toBe(false); // Should not change
  });

  it('should handle nullable field updates', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task with nullable fields
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Nullable Task',
        description: 'Some description',
        estimated_minutes: 30,
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Update to null values
    const input: UpdateTaskInput = {
      id: task.id,
      user_id: user.id,
      description: null,
      estimated_minutes: null
    };

    const result = await updateTask(input);

    expect(result.id).toEqual(task.id);
    expect(result.description).toBeNull();
    expect(result.estimated_minutes).toBeNull();
    expect(result.title).toEqual('Nullable Task'); // Should not change
  });
});