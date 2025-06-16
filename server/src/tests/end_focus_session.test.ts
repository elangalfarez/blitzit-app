
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type EndFocusSessionInput } from '../schema';
import { endFocusSession } from '../handlers/end_focus_session';
import { eq } from 'drizzle-orm';

describe('endFocusSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should end a focus session successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Test Task',
        description: 'A test task',
        estimated_minutes: 30,
        scheduled_date: '2024-01-01'
      })
      .returning()
      .execute();
    const task = taskResult[0];

    // Create test focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes: 25,
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

    // Verify the focus session was updated
    expect(result.id).toEqual(session.id);
    expect(result.completed).toBe(true);
    expect(result.ended_at).toBeInstanceOf(Date);
    expect(result.ended_at).not.toBeNull();
  });

  it('should mark task as completed when session is completed', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Test Task',
        description: 'A test task',
        estimated_minutes: 30,
        scheduled_date: '2024-01-01'
      })
      .returning()
      .execute();
    const task = taskResult[0];

    // Create test focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes: 25,
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

    // Verify the task was marked as completed
    const updatedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(updatedTasks).toHaveLength(1);
    expect(updatedTasks[0].completed).toBe(true);
    expect(updatedTasks[0].completed_at).toBeInstanceOf(Date);
    expect(updatedTasks[0].completed_at).not.toBeNull();
  });

  it('should not mark task as completed when session is not completed', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Test Task',
        description: 'A test task',
        estimated_minutes: 30,
        scheduled_date: '2024-01-01'
      })
      .returning()
      .execute();
    const task = taskResult[0];

    // Create test focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes: 25,
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

    // Verify the focus session was updated but not completed
    expect(result.completed).toBe(false);
    expect(result.ended_at).toBeInstanceOf(Date);

    // Verify the task was not marked as completed
    const updatedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(updatedTasks).toHaveLength(1);
    expect(updatedTasks[0].completed).toBe(false);
    expect(updatedTasks[0].completed_at).toBeNull();
  });

  it('should throw error for non-existent session', async () => {
    const input: EndFocusSessionInput = {
      session_id: 999,
      user_id: 1,
      completed: true
    };

    await expect(endFocusSession(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when user does not own the session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        name: 'Other User'
      })
      .returning()
      .execute();
    const otherUser = otherUserResult[0];

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Test Task',
        description: 'A test task',
        estimated_minutes: 30,
        scheduled_date: '2024-01-01'
      })
      .returning()
      .execute();
    const task = taskResult[0];

    // Create test focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes: 25,
        started_at: new Date()
      })
      .returning()
      .execute();
    const session = sessionResult[0];

    const input: EndFocusSessionInput = {
      session_id: session.id,
      user_id: otherUser.id, // Different user trying to end the session
      completed: true
    };

    await expect(endFocusSession(input)).rejects.toThrow(/not owned by user/i);
  });
});
