
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type StartFocusSessionInput } from '../schema';
import { startFocusSession } from '../handlers/start_focus_session';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  neon_auth_user_id: 'test_auth_123',
  email: 'test@example.com',
  name: 'Test User'
};

// Test task data
const testTask = {
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'medium' as const
};

describe('startFocusSession', () => {
  let userId: number;
  let taskId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: userId
      })
      .returning()
      .execute();
    taskId = taskResult[0].id;
  });

  afterEach(resetDB);

  it('should start a focus session without a task', async () => {
    const input: StartFocusSessionInput = {};

    const result = await startFocusSession(input, userId);

    // Verify session properties
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toBeNull();
    expect(result.duration_minutes).toEqual(0);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.ended_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should start a focus session with a task', async () => {
    const input: StartFocusSessionInput = {
      task_id: taskId
    };

    const result = await startFocusSession(input, userId);

    // Verify session properties
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.task_id).toEqual(taskId);
    expect(result.duration_minutes).toEqual(0);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.ended_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save focus session to database', async () => {
    const input: StartFocusSessionInput = {
      task_id: taskId
    };

    const result = await startFocusSession(input, userId);

    // Query database to verify session was saved
    const sessions = await db.select()
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(userId);
    expect(sessions[0].task_id).toEqual(taskId);
    expect(sessions[0].duration_minutes).toEqual(0);
    expect(sessions[0].ended_at).toBeNull();
  });

  it('should throw error for non-existent task', async () => {
    const input: StartFocusSessionInput = {
      task_id: 99999
    };

    await expect(startFocusSession(input, userId)).rejects.toThrow(/task not found/i);
  });

  it('should throw error for task belonging to different user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'other_auth_456',
        email: 'other@example.com',
        name: 'Other User'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    // Create task for other user
    const otherTaskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: otherUserId,
        title: 'Other User Task'
      })
      .returning()
      .execute();
    const otherTaskId = otherTaskResult[0].id;

    const input: StartFocusSessionInput = {
      task_id: otherTaskId
    };

    await expect(startFocusSession(input, userId)).rejects.toThrow(/task does not belong to user/i);
  });
});
