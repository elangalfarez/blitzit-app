
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type GetUserStatsInput } from '../schema';
import { getUserStats } from '../handlers/get_user_stats';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  name: 'Test User'
};

const testDate = new Date('2023-12-15');

const testInput: GetUserStatsInput = {
  user_id: 1,
  date: testDate
};

describe('getUserStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for user with no data', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await getUserStats(testInput);

    expect(result.total_focus_minutes).toEqual(0);
    expect(result.completed_tasks_count).toEqual(0);
    expect(result.total_tasks_count).toEqual(0);
    expect(result.active_session).toBeNull();
  });

  it('should return correct task counts', async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();

    // Create tasks for the target date
    await db.insert(tasksTable).values([
      {
        user_id: 1,
        title: 'Completed Task',
        scheduled_date: '2023-12-15',
        completed: true,
        completed_at: new Date('2023-12-15T10:00:00Z')
      },
      {
        user_id: 1,
        title: 'Incomplete Task',
        scheduled_date: '2023-12-15',
        completed: false
      },
      {
        user_id: 1,
        title: 'Another Completed Task',
        scheduled_date: '2023-12-15',
        completed: true,
        completed_at: new Date('2023-12-15T14:00:00Z')
      }
    ]).execute();

    const result = await getUserStats(testInput);

    expect(result.total_tasks_count).toEqual(3);
    expect(result.completed_tasks_count).toEqual(2);
  });

  it('should return correct focus minutes for completed sessions', async () => {
    // Create user and task
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values({
      user_id: 1,
      title: 'Focus Task',
      scheduled_date: '2023-12-15',
      completed: false
    }).execute();

    // Create focus sessions for the target date
    await db.insert(focusSessionsTable).values([
      {
        user_id: 1,
        task_id: 1,
        duration_minutes: 25,
        started_at: new Date('2023-12-15T09:00:00Z'),
        ended_at: new Date('2023-12-15T09:25:00Z'),
        completed: true
      },
      {
        user_id: 1,
        task_id: 1,
        duration_minutes: 30,
        started_at: new Date('2023-12-15T10:00:00Z'),
        ended_at: new Date('2023-12-15T10:30:00Z'),
        completed: true
      },
      {
        user_id: 1,
        task_id: 1,
        duration_minutes: 15,
        started_at: new Date('2023-12-15T11:00:00Z'),
        ended_at: new Date('2023-12-15T11:15:00Z'),
        completed: false // Not completed - should not count
      }
    ]).execute();

    const result = await getUserStats(testInput);

    expect(result.total_focus_minutes).toEqual(55); // 25 + 30, excluding incomplete session
  });

  it('should return active session when one exists', async () => {
    // Create user and task
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values({
      user_id: 1,
      title: 'Active Task',
      scheduled_date: '2023-12-15',
      completed: false
    }).execute();

    // Create active session (no ended_at)
    const sessionResult = await db.insert(focusSessionsTable).values({
      user_id: 1,
      task_id: 1,
      duration_minutes: 25,
      started_at: new Date('2023-12-15T09:00:00Z'),
      completed: false
    }).returning().execute();

    const result = await getUserStats(testInput);

    expect(result.active_session).not.toBeNull();
    expect(result.active_session?.id).toEqual(sessionResult[0].id);
    expect(result.active_session?.user_id).toEqual(1);
    expect(result.active_session?.task_id).toEqual(1);
    expect(result.active_session?.duration_minutes).toEqual(25);
    expect(result.active_session?.ended_at).toBeNull();
  });

  it('should filter data by date correctly', async () => {
    // Create user and task
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values([
      {
        user_id: 1,
        title: 'Task for target date',
        scheduled_date: '2023-12-15',
        completed: true,
        completed_at: new Date('2023-12-15T10:00:00Z')
      },
      {
        user_id: 1,
        title: 'Task for different date',
        scheduled_date: '2023-12-16',
        completed: true,
        completed_at: new Date('2023-12-16T10:00:00Z')
      }
    ]).execute();

    // Create focus sessions for different dates
    await db.insert(focusSessionsTable).values([
      {
        user_id: 1,
        task_id: 1,
        duration_minutes: 25,
        started_at: new Date('2023-12-15T09:00:00Z'),
        ended_at: new Date('2023-12-15T09:25:00Z'),
        completed: true
      },
      {
        user_id: 1,
        task_id: 2,
        duration_minutes: 30,
        started_at: new Date('2023-12-16T09:00:00Z'),
        ended_at: new Date('2023-12-16T09:30:00Z'),
        completed: true
      }
    ]).execute();

    const result = await getUserStats(testInput);

    // Should only include data for 2023-12-15
    expect(result.total_tasks_count).toEqual(1);
    expect(result.completed_tasks_count).toEqual(1);
    expect(result.total_focus_minutes).toEqual(25);
  });

  it('should use current date when no date provided', async () => {
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];

    // Create user and task for today
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values({
      user_id: 1,
      title: 'Today Task',
      scheduled_date: todayDateString,
      completed: true,
      completed_at: new Date()
    }).execute();

    const inputWithoutDate: GetUserStatsInput = {
      user_id: 1
    };

    const result = await getUserStats(inputWithoutDate);

    expect(result.total_tasks_count).toEqual(1);
    expect(result.completed_tasks_count).toEqual(1);
  });
});
