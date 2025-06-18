
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type EndFocusSessionInput } from '../schema';
import { endFocusSession } from '../handlers/end_focus_session';
import { eq, and, isNull } from 'drizzle-orm';

describe('endFocusSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should end an ongoing focus session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-neon-id',
        email: 'test@example.com',
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
        description: 'A task for testing',
        priority: 'medium'
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Create ongoing focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: userId,
        task_id: taskId,
        duration_minutes: 0, // Initial duration
        started_at: new Date(),
        ended_at: null // Ongoing session
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: EndFocusSessionInput = {
      id: sessionId,
      duration_minutes: 25
    };

    const result = await endFocusSession(input, userId);

    // Verify the result
    expect(result.id).toEqual(sessionId);
    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toEqual(taskId);
    expect(result.duration_minutes).toEqual(25);
    expect(result.ended_at).toBeInstanceOf(Date);
    expect(result.ended_at).not.toBeNull();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save ended session to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-neon-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create ongoing focus session without task
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: userId,
        task_id: null, // Session without specific task
        duration_minutes: 0,
        started_at: new Date(),
        ended_at: null
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: EndFocusSessionInput = {
      id: sessionId,
      duration_minutes: 30
    };

    await endFocusSession(input, userId);

    // Verify the session was updated in database
    const sessions = await db.select()
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].duration_minutes).toEqual(30);
    expect(sessions[0].ended_at).toBeInstanceOf(Date);
    expect(sessions[0].ended_at).not.toBeNull();
  });

  it('should throw error for non-existent session', async () => {
    const input: EndFocusSessionInput = {
      id: 999,
      duration_minutes: 25
    };

    await expect(endFocusSession(input, 1)).rejects.toThrow(/not found or already ended/i);
  });

  it('should throw error for session belonging to different user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-neon-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create ongoing focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: userId,
        task_id: null,
        duration_minutes: 0,
        started_at: new Date(),
        ended_at: null
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: EndFocusSessionInput = {
      id: sessionId,
      duration_minutes: 25
    };

    // Try to end session with different user ID
    await expect(endFocusSession(input, userId + 1)).rejects.toThrow(/not found or already ended/i);
  });

  it('should throw error for already ended session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-neon-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create already ended focus session
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: userId,
        task_id: null,
        duration_minutes: 20,
        started_at: new Date(),
        ended_at: new Date() // Already ended
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: EndFocusSessionInput = {
      id: sessionId,
      duration_minutes: 25
    };

    await expect(endFocusSession(input, userId)).rejects.toThrow(/not found or already ended/i);
  });

  it('should only update ongoing sessions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-neon-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple sessions - one ongoing, one ended
    const ongoingResult = await db.insert(focusSessionsTable)
      .values({
        user_id: userId,
        task_id: null,
        duration_minutes: 0,
        started_at: new Date(),
        ended_at: null // Ongoing
      })
      .returning()
      .execute();

    const endedResult = await db.insert(focusSessionsTable)
      .values({
        user_id: userId,
        task_id: null,
        duration_minutes: 15,
        started_at: new Date(),
        ended_at: new Date() // Already ended
      })
      .returning()
      .execute();

    // End the ongoing session
    const input: EndFocusSessionInput = {
      id: ongoingResult[0].id,
      duration_minutes: 25
    };

    await endFocusSession(input, userId);

    // Verify only the ongoing session was updated
    const ongoingSessions = await db.select()
      .from(focusSessionsTable)
      .where(
        and(
          eq(focusSessionsTable.user_id, userId),
          isNull(focusSessionsTable.ended_at)
        )
      )
      .execute();

    expect(ongoingSessions).toHaveLength(0); // No more ongoing sessions

    const allSessions = await db.select()
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.user_id, userId))
      .execute();

    expect(allSessions).toHaveLength(2);
    // The ended session should remain unchanged
    const unchangedSession = allSessions.find(s => s.id === endedResult[0].id);
    expect(unchangedSession?.duration_minutes).toEqual(15);
  });
});
