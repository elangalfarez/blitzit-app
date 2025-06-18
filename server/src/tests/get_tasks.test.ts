
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all tasks for a specific user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          neon_auth_user_id: 'auth-user-1',
          email: 'user1@example.com',
          name: 'User One'
        },
        {
          neon_auth_user_id: 'auth-user-2',
          email: 'user2@example.com',
          name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create test tasks for both users
    await db.insert(tasksTable)
      .values([
        {
          user_id: user1Id,
          title: 'Task 1 for User 1',
          description: 'First task',
          priority: 'high',
          completed: false
        },
        {
          user_id: user1Id,
          title: 'Task 2 for User 1',
          description: 'Second task',
          priority: 'medium',
          completed: true
        },
        {
          user_id: user2Id,
          title: 'Task 1 for User 2',
          description: 'User 2 task',
          priority: 'low',
          completed: false
        }
      ])
      .execute();

    const user1Tasks = await getTasks(user1Id);

    // Should return only tasks for user 1
    expect(user1Tasks).toHaveLength(2);
    user1Tasks.forEach(task => {
      expect(task.user_id).toEqual(user1Id);
    });

    // Check task details
    const taskTitles = user1Tasks.map(task => task.title);
    expect(taskTitles).toContain('Task 1 for User 1');
    expect(taskTitles).toContain('Task 2 for User 1');
    expect(taskTitles).not.toContain('Task 1 for User 2');
  });

  it('should return tasks ordered by creation date (newest first)', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'auth-user-1',
        email: 'user@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Create tasks with slight delay to ensure different timestamps
    await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'First Task',
        description: 'Created first',
        priority: 'medium',
        completed: false
      })
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Second Task',
        description: 'Created second',
        priority: 'high',
        completed: false
      })
      .execute();

    const tasks = await getTasks(userId);

    expect(tasks).toHaveLength(2);
    // Tasks should be ordered by created_at desc (newest first)
    expect(tasks[0].title).toEqual('Second Task');
    expect(tasks[1].title).toEqual('First Task');
    expect(tasks[0].created_at >= tasks[1].created_at).toBe(true);
  });

  it('should return empty array for user with no tasks', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'auth-user-1',
        email: 'user@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    const tasks = await getTasks(userId);

    expect(tasks).toHaveLength(0);
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('should return tasks with all expected fields', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'auth-user-1',
        email: 'user@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Create test task
    await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Complete Task',
        description: 'Task description',
        priority: 'high',
        completed: true
      })
      .execute();

    const tasks = await getTasks(userId);

    expect(tasks).toHaveLength(1);
    const task = tasks[0];

    // Verify all required fields are present
    expect(task.id).toBeDefined();
    expect(task.user_id).toEqual(userId);
    expect(task.title).toEqual('Complete Task');
    expect(task.description).toEqual('Task description');
    expect(task.priority).toEqual('high');
    expect(task.completed).toBe(true);
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });

  it('should handle tasks with null description', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'auth-user-1',
        email: 'user@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Create task without description
    await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Task without description',
        priority: 'low',
        completed: false
      })
      .execute();

    const tasks = await getTasks(userId);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Task without description');
    expect(tasks[0].description).toBeNull();
  });
});
