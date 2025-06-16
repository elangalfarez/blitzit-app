
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTaskId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: testUserId,
        title: 'Original Task',
        description: 'Original description',
        estimated_minutes: 60,
        completed: false,
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();
    testTaskId = taskResult[0].id;
  });

  it('should update task title', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      title: 'Updated Task Title'
    };

    const result = await updateTask(input);

    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Original description');
    expect(result.estimated_minutes).toEqual(60);
    expect(result.completed).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.scheduled_date).toBeInstanceOf(Date);
  });

  it('should update task description', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      description: 'Updated description'
    };

    const result = await updateTask(input);

    expect(result.title).toEqual('Original Task');
    expect(result.description).toEqual('Updated description');
    expect(result.estimated_minutes).toEqual(60);
    expect(result.completed).toEqual(false);
    expect(result.scheduled_date).toBeInstanceOf(Date);
  });

  it('should update estimated minutes', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      estimated_minutes: 90
    };

    const result = await updateTask(input);

    expect(result.title).toEqual('Original Task');
    expect(result.description).toEqual('Original description');
    expect(result.estimated_minutes).toEqual(90);
    expect(result.completed).toEqual(false);
    expect(result.scheduled_date).toBeInstanceOf(Date);
  });

  it('should mark task as completed and set completed_at', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      completed: true
    };

    const result = await updateTask(input);

    expect(result.completed).toEqual(true);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at).not.toBeNull();
    expect(result.scheduled_date).toBeInstanceOf(Date);
  });

  it('should mark task as incomplete and clear completed_at', async () => {
    // First mark as completed
    await updateTask({
      id: testTaskId,
      user_id: testUserId,
      completed: true
    });

    // Then mark as incomplete
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      completed: false
    };

    const result = await updateTask(input);

    expect(result.completed).toEqual(false);
    expect(result.completed_at).toBeNull();
    expect(result.scheduled_date).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      title: 'Multi-update Task',
      description: 'Updated with multiple fields',
      estimated_minutes: 45,
      completed: true
    };

    const result = await updateTask(input);

    expect(result.title).toEqual('Multi-update Task');
    expect(result.description).toEqual('Updated with multiple fields');
    expect(result.estimated_minutes).toEqual(45);
    expect(result.completed).toEqual(true);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.scheduled_date).toBeInstanceOf(Date);
  });

  it('should set description to null', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      description: null
    };

    const result = await updateTask(input);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Original Task');
    expect(result.scheduled_date).toBeInstanceOf(Date);
  });

  it('should set estimated_minutes to null', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      estimated_minutes: null
    };

    const result = await updateTask(input);

    expect(result.estimated_minutes).toBeNull();
    expect(result.title).toEqual('Original Task');
    expect(result.scheduled_date).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: testUserId,
      title: 'Database Update Test',
      completed: true
    };

    await updateTask(input);

    // Verify in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Update Test');
    expect(tasks[0].completed).toEqual(true);
    expect(tasks[0].completed_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent task', async () => {
    const input: UpdateTaskInput = {
      id: 99999,
      user_id: testUserId,
      title: 'Non-existent task'
    };

    await expect(updateTask(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when user tries to update another users task', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        name: 'Other User'
      })
      .returning()
      .execute();

    const input: UpdateTaskInput = {
      id: testTaskId,
      user_id: otherUserResult[0].id, // Different user ID
      title: 'Unauthorized update'
    };

    await expect(updateTask(input)).rejects.toThrow(/not found/i);
  });
});
