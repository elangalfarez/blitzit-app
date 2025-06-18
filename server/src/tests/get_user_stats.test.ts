import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type GetUserStatsInput } from '../schema';
import { getUserStats } from '../handlers/get_user_stats';
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

describe('getUserStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user stats with no data', async () => {
    // Create a test user first
    const user = await createTestUser();

    const input: GetUserStatsInput = {
      user_id: user.id
    };

    const result = await getUserStats(input);

    expect(result.total_focus_minutes).toEqual(0);
    expect(result.completed_tasks_count).toEqual(0);
    expect(result.total_tasks_count).toEqual(0);
    expect(result.active_session).toBeNull();
  });

  it('should return user stats with tasks', async () => {
    // Create a test user first
    const user = await createTestUser();

    const testDate = new Date('2024-01-15');

    // Create tasks
    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Completed Task',
          completed: true,
          scheduled_date: '2024-01-15'
        },
        {
          user_id: user.id,
          title: 'Pending Task',
          completed: false,
          scheduled_date: '2024-01-15'
        }
      ])
      .execute();

    const input: GetUserStatsInput = {
      user_id: user.id,
      date: testDate
    };

    const result = await getUserStats(input);

    expect(result.total_focus_minutes).toEqual(0);
    expect(result.completed_tasks_count).toEqual(1);
    expect(result.total_tasks_count).toEqual(2);
    expect(result.active_session).toBeNull();
  });

  it('should return user stats with focus sessions', async () => {
    // Create a test user first
    const user = await createTestUser();

    const testDate = new Date('2024-01-15');

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

    // Create completed focus sessions with test date
    await db.insert(focusSessionsTable)
      .values([
        {
          user_id: user.id,
          task_id: task.id,
          duration_minutes: 30,
          started_at: testDate,
          ended_at: testDate,
          completed: true
        },
        {
          user_id: user.id,
          task_id: task.id,
          duration_minutes: 45,
          started_at: testDate,
          ended_at: testDate,
          completed: true
        }
      ])
      .execute();

    const input: GetUserStatsInput = {
      user_id: user.id,
      date: testDate
    };

    const result = await getUserStats(input);

    expect(result.total_focus_minutes).toEqual(75);
    expect(result.completed_tasks_count).toEqual(0);
    expect(result.total_tasks_count).toEqual(1);
    expect(result.active_session).toBeNull();
  });

  it('should return user stats with active session', async () => {
    // Create a test user first
    const user = await createTestUser();

    const testDate = new Date('2024-01-15');

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Active Focus Task',
        scheduled_date: '2024-01-15'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create an active focus session (not ended)
    const sessionResult = await db.insert(focusSessionsTable)
      .values({
        user_id: user.id,
        task_id: task.id,
        duration_minutes:  60,
        started_at: testDate,
        completed: false
      })
      .returning()
      .execute();

    const session = sessionResult[0];

    const input: GetUserStatsInput = {
      user_id: user.id,
      date: testDate
    };

    const result = await getUserStats(input);

    expect(result.total_focus_minutes).toEqual(0); // Active session doesn't count
    expect(result.completed_tasks_count).toEqual(0);
    expect(result.total_tasks_count).toEqual(1);
    expect(result.active_session).not.toBeNull();
    expect(result.active_session?.id).toEqual(session.id);
    expect(result.active_session?.duration_minutes).toEqual(60);
  });

  it('should filter stats by date', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create tasks for different dates
    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Today Task',
          completed: true,
          scheduled_date: '2024-01-15'
        },
        {
          user_id: user.id,
          title: 'Yesterday Task',
          completed: true,
          scheduled_date: '2024-01-14'
        }
      ])
      .execute();

    const input: GetUserStatsInput = {
      user_id: user.id,
      date: new Date('2024-01-15')
    };

    const result = await getUserStats(input);

    expect(result.completed_tasks_count).toEqual(1);
    expect(result.total_tasks_count).toEqual(1);
  });

  it('should not include stats from other users', async () => {
    // Create two test users
    const user1 = await createTestUser('user1@example.com', 'User One');
    const user2 = await createTestUser('user2@example.com', 'User Two');

    const testDate = new Date('2024-01-15');

    // Create tasks for both users
    await db.insert(tasksTable)
      .values([
        {
          user_id: user1.id,
          title: 'User1 Task',
          completed: true,
          scheduled_date: '2024-01-15'
        },
        {
          user_id: user2.id,
          title: 'User2 Task',
          completed: true,
          scheduled_date: '2024-01-15'
        }
      ])
      .execute();

    const input: GetUserStatsInput = {
      user_id: user1.id,
      date: testDate
    };

    const result = await getUserStats(input);

    expect(result.completed_tasks_count).toEqual(1);
    expect(result.total_tasks_count).toEqual(1);
  });
});