import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type GetTasksInput } from '../schema';
import { getTasks } from '../handlers/get_tasks';
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

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get tasks for a user', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create some tasks
    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Task 1',
          scheduled_date: '2024-01-15'
        },
        {
          user_id: user.id,
          title: 'Task 2',
          scheduled_date: '2024-01-15'
        }
      ])
      .execute();

    const input: GetTasksInput = {
      user_id: user.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Task 1');
    expect(result[1].title).toEqual('Task 2');
    expect(result[0].user_id).toEqual(user.id);
    expect(result[1].user_id).toEqual(user.id);
  });

  it('should get tasks for specific date', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create tasks for different dates
    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Today Task',
          scheduled_date: '2024-01-15'
        },
        {
          user_id: user.id,
          title: 'Tomorrow Task',
          scheduled_date: '2024-01-16'
        }
      ])
      .execute();

    const input: GetTasksInput = {
      user_id: user.id,
      date: new Date('2024-01-15')
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Today Task');
    expect(result[0].scheduled_date).toBeInstanceOf(Date);
  });

  it('should return empty array when no tasks found', async () => {
    // Create a test user first
    const user = await createTestUser();

    const input: GetTasksInput = {
      user_id: user.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(0);
  });

  it('should not return tasks from other users', async () => {
    // Create two test users
    const user1 = await createTestUser('user1@example.com', 'User One');
    const user2 = await createTestUser('user2@example.com', 'User Two');

    // Create tasks for both users
    await db.insert(tasksTable)
      .values([
        {
          user_id: user1.id,
          title: 'User1 Task',
          scheduled_date: '2024-01-15'
        },
        {
          user_id: user2.id,
          title: 'User2 Task',
          scheduled_date: '2024-01-15'
        }
      ])
      .execute();

    const input: GetTasksInput = {
      user_id: user1.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User1 Task');
    expect(result[0].user_id).toEqual(user1.id);
  });

  it('should return tasks with all fields', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task with all fields
    await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Complete Task',
        description: 'Full description',
        estimated_minutes: 60,
        completed: true,
        completed_at: new Date(),
        scheduled_date: '2024-01-15'
      })
      .execute();

    const input: GetTasksInput = {
      user_id: user.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Complete Task');
    expect(result[0].description).toEqual('Full description');
    expect(result[0].estimated_minutes).toEqual(60);
    expect(result[0].completed).toBe(true);
    expect(result[0].completed_at).toBeInstanceOf(Date);
    expect(result[0].scheduled_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle date filtering correctly', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create tasks across multiple dates
    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Past Task',
          scheduled_date: '2024-01-10'
        },
        {
          user_id: user.id,
          title: 'Current Task',
          scheduled_date: '2024-01-15'
        },
        {
          user_id: user.id,
          title: 'Future Task',
          scheduled_date: '2024-01-20'
        }
      ])
      .execute();

    const input: GetTasksInput = {
      user_id: user.id,
      date: new Date('2024-01-15')
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Current Task');
  });

  it('should handle tasks with null optional fields', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a minimal task
    await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Minimal Task',
        scheduled_date: '2024-01-15'
      })
      .execute();

    const input: GetTasksInput = {
      user_id: user.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Minimal Task');
    expect(result[0].description).toBeNull();
    expect(result[0].estimated_minutes).toBeNull();
    expect(result[0].completed_at).toBeNull();
    expect(result[0].completed).toBe(false);
  });
});