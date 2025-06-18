
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { getUserStats } from '../handlers/get_user_stats';

describe('getUserStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for user with no data', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const stats = await getUserStats(userId);

    expect(stats.total_tasks).toEqual(0);
    expect(stats.completed_tasks).toEqual(0);
    expect(stats.total_focus_time).toEqual(0);
    expect(stats.current_streak).toEqual(0);
  });

  it('should calculate task statistics correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create tasks - some completed, some not
    await db.insert(tasksTable)
      .values([
        {
          user_id: userId,
          title: 'Task 1',
          completed: true,
          priority: 'high'
        },
        {
          user_id: userId,
          title: 'Task 2',
          completed: false,
          priority: 'medium'
        },
        {
          user_id: userId,
          title: 'Task 3',
          completed: true,
          priority: 'low'
        }
      ])
      .execute();

    const stats = await getUserStats(userId);

    expect(stats.total_tasks).toEqual(3);
    expect(stats.completed_tasks).toEqual(2);
    expect(stats.total_focus_time).toEqual(0); // No focus sessions yet
    expect(stats.current_streak).toEqual(1); // Today has completed tasks
  });

  it('should calculate focus time correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create completed focus sessions
    const now = new Date();
    const earlier = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

    await db.insert(focusSessionsTable)
      .values([
        {
          user_id: userId,
          duration_minutes: 25,
          started_at: earlier,
          ended_at: now // Completed session
        },
        {
          user_id: userId,
          duration_minutes: 15,
          started_at: earlier,
          ended_at: now // Completed session
        },
        {
          user_id: userId,
          duration_minutes: 30,
          started_at: now,
          ended_at: null // Ongoing session - should not count
        }
      ])
      .execute();

    const stats = await getUserStats(userId);

    expect(stats.total_tasks).toEqual(0);
    expect(stats.completed_tasks).toEqual(0);
    expect(stats.total_focus_time).toEqual(40); // 25 + 15, ongoing session not counted
    expect(stats.current_streak).toEqual(0);
  });

  it('should calculate current streak correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create tasks completed on consecutive days
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    await db.insert(tasksTable)
      .values([
        {
          user_id: userId,
          title: 'Today Task',
          completed: true,
          priority: 'medium',
          updated_at: today
        },
        {
          user_id: userId,
          title: 'Yesterday Task',
          completed: true,
          priority: 'medium',
          updated_at: yesterday
        },
        {
          user_id: userId,
          title: 'Two Days Ago Task',
          completed: true,
          priority: 'medium',
          updated_at: twoDaysAgo
        },
        {
          user_id: userId,
          title: 'Four Days Ago Task',
          completed: true,
          priority: 'medium',
          updated_at: fourDaysAgo
        }
      ])
      .execute();

    const stats = await getUserStats(userId);

    expect(stats.total_tasks).toEqual(4);
    expect(stats.completed_tasks).toEqual(4);
    expect(stats.current_streak).toEqual(3); // Today, yesterday, two days ago (streak broken at day 3)
  });

  it('should not include other users data', async () => {
    // Create two users
    const userResults = await db.insert(usersTable)
      .values([
        {
          neon_auth_user_id: 'test-auth-id-1',
          email: 'test1@example.com',
          name: 'Test User 1'
        },
        {
          neon_auth_user_id: 'test-auth-id-2',
          email: 'test2@example.com',
          name: 'Test User 2'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create tasks for both users
    await db.insert(tasksTable)
      .values([
        {
          user_id: user1Id,
          title: 'User 1 Task',
          completed: true,
          priority: 'medium'
        },
        {
          user_id: user2Id,
          title: 'User 2 Task',
          completed: true,
          priority: 'medium'
        }
      ])
      .execute();

    // Create focus sessions for both users
    const now = new Date();
    await db.insert(focusSessionsTable)
      .values([
        {
          user_id: user1Id,
          duration_minutes: 25,
          started_at: now,
          ended_at: now
        },
        {
          user_id: user2Id,
          duration_minutes: 50,
          started_at: now,
          ended_at: now
        }
      ])
      .execute();

    const user1Stats = await getUserStats(user1Id);

    expect(user1Stats.total_tasks).toEqual(1);
    expect(user1Stats.completed_tasks).toEqual(1);
    expect(user1Stats.total_focus_time).toEqual(25);
    expect(user1Stats.current_streak).toEqual(1);
  });
});
