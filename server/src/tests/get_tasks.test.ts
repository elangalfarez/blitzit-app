
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type GetTasksInput } from '../schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all tasks for a user', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create test tasks
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Task 1',
          description: 'First task',
          estimated_minutes: 30,
          scheduled_date: today.toISOString().split('T')[0]
        },
        {
          user_id: user.id,
          title: 'Task 2',
          description: 'Second task',
          estimated_minutes: 45,
          scheduled_date: tomorrow.toISOString().split('T')[0]
        }
      ])
      .execute();

    const input: GetTasksInput = {
      user_id: user.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Task 1');
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].estimated_minutes).toEqual(30);
    expect(result[0].completed).toEqual(false);
    expect(result[0].scheduled_date).toBeInstanceOf(Date);
    expect(result[1].title).toEqual('Task 2');
    expect(result[1].estimated_minutes).toEqual(45);
  });

  it('should filter tasks by date', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create tasks for different dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Today Task',
          description: 'Task for today',
          scheduled_date: today.toISOString().split('T')[0]
        },
        {
          user_id: user.id,
          title: 'Tomorrow Task',
          description: 'Task for tomorrow',
          scheduled_date: tomorrow.toISOString().split('T')[0]
        }
      ])
      .execute();

    const input: GetTasksInput = {
      user_id: user.id,
      date: today
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Today Task');
    expect(result[0].scheduled_date.toDateString()).toEqual(today.toDateString());
  });

  it('should return empty array for user with no tasks', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    const input: GetTasksInput = {
      user_id: user.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return tasks for specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User 1'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User 2'
      })
      .returning()
      .execute();

    const today = new Date();

    // Create tasks for both users
    await db.insert(tasksTable)
      .values([
        {
          user_id: user1.id,
          title: 'User 1 Task',
          scheduled_date: today.toISOString().split('T')[0]
        },
        {
          user_id: user2.id,
          title: 'User 2 Task',
          scheduled_date: today.toISOString().split('T')[0]
        }
      ])
      .execute();

    const input: GetTasksInput = {
      user_id: user1.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Task');
    expect(result[0].user_id).toEqual(user1.id);
  });

  it('should handle tasks with null fields correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    const today = new Date();

    // Create task with null description and estimated_minutes
    await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Minimal Task',
        description: null,
        estimated_minutes: null,
        scheduled_date: today.toISOString().split('T')[0]
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
    expect(result[0].completed).toEqual(false);
  });

  it('should handle completed tasks correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    const today = new Date();
    const completedAt = new Date();

    // Create completed task
    await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Completed Task',
        description: 'This task is done',
        completed: true,
        completed_at: completedAt,
        scheduled_date: today.toISOString().split('T')[0]
      })
      .execute();

    const input: GetTasksInput = {
      user_id: user.id
    };

    const result = await getTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Completed Task');
    expect(result[0].completed).toEqual(true);
    expect(result[0].completed_at).toBeInstanceOf(Date);
    expect(result[0].completed_at?.getTime()).toBeCloseTo(completedAt.getTime(), -1);
  });
});
