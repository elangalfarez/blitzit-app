import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type EndFocusSessionInput } from '../schema';
import { endFocusSession } from '../handlers/end_focus_session';
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

describe('endFocusSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should end focus session successfully', async () => {
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

    // Create a focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes: 30,
        started_at: new Date()
      })
      .returning()
      .execute();

    const session = sessionResult[0];

    const input: EndFocusSessionInput = {
      session_id: session.id,
      user_id: user.id,
      completed: true
    };

    const result = await endFocusSession(input);

    expect(result.id).toEqual(session.id);
    expect(result.completed).toBe(true);
    expect(result.ended_at).toBeInstanceOf(Date);
    expect(result.user_id).toEqual(user.id);
    expect(result.task_id).toEqual(task.id);
  });

  it('should end focus session as incomplete', async () => {
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

    // Create a focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes: 30,
        started_at: new Date()
      })
      .returning()
      .execute();

    const session = sessionResult[0];

    const input: EndFocusSessionInput = {
      session_id: session.id,
      user_id: user.id,
      completed: false
    };

    const result = await endFocusSession(input);

    expect(result.id).toEqual(session.id);
    expect(result.completed).toBe(false);
    expect(result.ended_at).toBeInstanceOf(Date);
  });

  it('should throw error when session not found', async () => {
    // Create a test user first
    const user = await createTestUser();

    const input: EndFocusSessionInput = {
      session_id: 999,
      user_id: user.id,
      completed: true
    };

    await expect(endFocusSession(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when user does not own the session', async () => {
    // Create two test users
    const user1 = await createTestUser('user1@example.com', 'User One');
    const user2 = await createTestUser('user2@example.com', 'User Two');

    // Create a task for user1
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user1.id,
        title: 'User1 Task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create a focus session for user1
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user1.id,
        task_id: task.id,
        duration_minutes: 30,
        started_at: new Date()
      })
      .returning()
      .execute();

    const session = sessionResult[0];

    const input: EndFocusSessionInput = {
      session_id: session.id,
      user_id: user2.id, // Different user trying to end session
      completed: true
    };

    await expect(endFocusSession(input)).rejects.toThrow(/not found/i);
  });

  it('should save ended session to database', async () => {
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

    // Create a focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes: 45,
        started_at: new Date()
      })
      .returning()
      .execute();

    const session = sessionResult[0];

    const input: EndFocusSessionInput = {
      session_id: session.id,
      user_id: user.id,
      completed: true
    };

    await endFocusSession(input);

    // Verify it was saved to database
    const sessions = await db.select()
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.id, session.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].completed).toBe(true);
    expect(sessions[0].ended_at).toBeInstanceOf(Date);
    expect(sessions[0].ended_at).not.toBeNull();
  });

  it('should not end already ended session', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Already Ended Task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create an already ended focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes: 30,
        started_at: new Date(),
        ended_at: new Date(),
        completed: true
      })
      .returning()
      .execute();

    const session = sessionResult[0];

    const input: EndFocusSessionInput = {
      session_id: session.id,
      user_id: user.id,
      completed: false
    };

    await expect(endFocusSession(input)).rejects.toThrow(/already ended/i);
  });
});