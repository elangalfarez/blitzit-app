import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type StartFocusSessionInput } from '../schema';
import { startFocusSession } from '../handlers/start_focus_session';
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

describe('startFocusSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should start a focus session successfully', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Focus Task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    const input: StartFocusSessionInput = {
      user_id: user.id,
      task_id: task.id,
      duration_minutes: 30
    };

    const result = await startFocusSession(input);

    expect(result.user_id).toEqual(user.id);
    expect(result.task_id).toEqual(task.id);
    expect(result.duration_minutes).toEqual(30);
    expect(result.completed).toBe(false);
    expect(result.ended_at).toBeNull();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
  });

  it('should save focus session to database', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Database Task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    const input: StartFocusSessionInput = {
      user_id: user.id,
      task_id: task.id,
      duration_minutes: 45
    };

    const result = await startFocusSession(input);

    // Verify it was saved to database
    const sessions = await db.select()
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(user.id);
    expect(sessions[0].task_id).toEqual(task.id);
    expect(sessions[0].duration_minutes).toEqual(45);
    expect(sessions[0].completed).toBe(false);
    expect(sessions[0].ended_at).toBeNull();
  });

  it('should prevent starting multiple active sessions', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create tasks
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

    // Start first session
    const input1: StartFocusSessionInput = {
      user_id: user.id,
      task_id: task1.id,
      duration_minutes: 30
    };

    await startFocusSession(input1);

    // Try to start second session (should fail)
    const input2: StartFocusSessionInput = {
      user_id: user.id,
      task_id: task2.id,
      duration_minutes: 30
    };

    await expect(startFocusSession(input2)).rejects.toThrow(/already has an active/i);
  });

  it('should handle different duration values', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Duration Test Task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    const input: StartFocusSessionInput = {
      user_id: user.id,
      task_id: task.id,
      duration_minutes: 90
    };

    const result = await startFocusSession(input);

    expect(result.duration_minutes).toEqual(90);
  });

  it('should handle task ownership validation', async () => {
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

    // Try to start focus session with user2 (should fail)
    const input: StartFocusSessionInput = {
      user_id: user2.id,
      task_id: task.id,
      duration_minutes: 30
    };

    await expect(startFocusSession(input)).rejects.toThrow(/not found/i);
  });
});