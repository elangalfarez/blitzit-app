
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type StartFocusSessionInput } from '../schema';
import { startFocusSession } from '../handlers/start_focus_session';
import { eq, and, isNull } from 'drizzle-orm';

describe('startFocusSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTaskId: number;
  let otherUserId: number;
  let otherTaskId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashed_password',
          name: 'Test User'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password',
          name: 'Other User'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test tasks
    const tasks = await db.insert(tasksTable)
      .values([
        {
          user_id: testUserId,
          title: 'Test Task',
          description: 'A task for testing',
          estimated_minutes: 30,
          scheduled_date: '2024-01-01'
        },
        {
          user_id: otherUserId,
          title: 'Other Task',
          description: 'Another user\'s task',
          estimated_minutes: 45,
          scheduled_date: '2024-01-01'
        }
      ])
      .returning()
      .execute();

    testTaskId = tasks[0].id;
    otherTaskId = tasks[1].id;
  });

  it('should create a focus session successfully', async () => {
    const input: StartFocusSessionInput = {
      user_id: testUserId,
      task_id: testTaskId,
      duration_minutes: 25
    };

    const result = await startFocusSession(input);

    // Verify returned session
    expect(result.user_id).toEqual(testUserId);
    expect(result.task_id).toEqual(testTaskId);
    expect(result.duration_minutes).toEqual(25);
    expect(result.completed).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.ended_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save focus session to database', async () => {
    const input: StartFocusSessionInput = {
      user_id: testUserId,
      task_id: testTaskId,
      duration_minutes: 25
    };

    const result = await startFocusSession(input);

    // Verify database record
    const sessions = await db.select()
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(testUserId);
    expect(sessions[0].task_id).toEqual(testTaskId);
    expect(sessions[0].duration_minutes).toEqual(25);
    expect(sessions[0].completed).toBe(false);
    expect(sessions[0].ended_at).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const input: StartFocusSessionInput = {
      user_id: 99999,
      task_id: testTaskId,
      duration_minutes: 25
    };

    await expect(startFocusSession(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent task', async () => {
    const input: StartFocusSessionInput = {
      user_id: testUserId,
      task_id: 99999,
      duration_minutes: 25
    };

    await expect(startFocusSession(input)).rejects.toThrow(/task not found/i);
  });

  it('should throw error when task does not belong to user', async () => {
    const input: StartFocusSessionInput = {
      user_id: testUserId,
      task_id: otherTaskId, // This task belongs to otherUserId
      duration_minutes: 25
    };

    await expect(startFocusSession(input)).rejects.toThrow(/task not found or does not belong to user/i);
  });

  it('should throw error when user already has an active session', async () => {
    // Create an active session first
    await db.insert(focusSessionsTable)
      .values({
        user_id: testUserId,
        task_id: testTaskId,
        duration_minutes: 30,
        completed: false
        // ended_at is null by default, making it active
      })
      .execute();

    const input: StartFocusSessionInput = {
      user_id: testUserId,
      task_id: testTaskId,
      duration_minutes: 25
    };

    await expect(startFocusSession(input)).rejects.toThrow(/already has an active focus session/i);
  });

  it('should allow starting session when previous session is ended', async () => {
    // Create a completed session (with ended_at set)
    await db.insert(focusSessionsTable)
      .values({
        user_id: testUserId,
        task_id: testTaskId,
        duration_minutes: 30,
        completed: true,
        ended_at: new Date()
      })
      .execute();

    const input: StartFocusSessionInput = {
      user_id: testUserId,
      task_id: testTaskId,
      duration_minutes: 25
    };

    const result = await startFocusSession(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.task_id).toEqual(testTaskId);
    expect(result.duration_minutes).toEqual(25);
    expect(result.completed).toBe(false);
    expect(result.ended_at).toBeNull();
  });

  it('should handle different duration values', async () => {
    const input: StartFocusSessionInput = {
      user_id: testUserId,
      task_id: testTaskId,
      duration_minutes: 60
    };

    const result = await startFocusSession(input);

    expect(result.duration_minutes).toEqual(60);
  });
});
