
import { db } from '../db';
import { tasksTable, focusSessionsTable } from '../db/schema';
import { type UserStats } from '../schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export const getUserStats = async (userId: number): Promise<UserStats> => {
  try {
    // Get task statistics
    const taskStats = await db.select({
      total_tasks: sql<number>`count(*)`,
      completed_tasks: sql<number>`count(case when ${tasksTable.completed} = true then 1 end)`
    })
    .from(tasksTable)
    .where(eq(tasksTable.user_id, userId))
    .execute();

    // Get total focus time (sum of all completed sessions)
    const focusTimeResult = await db.select({
      total_focus_time: sql<number>`coalesce(sum(${focusSessionsTable.duration_minutes}), 0)`
    })
    .from(focusSessionsTable)
    .where(
      and(
        eq(focusSessionsTable.user_id, userId),
        sql`${focusSessionsTable.ended_at} is not null` // Only completed sessions
      )
    )
    .execute();

    // Calculate current streak (consecutive days with completed tasks)
    // Get dates of completed tasks ordered by date descending
    const completedTaskDates = await db.select({
      date: sql<string>`date(${tasksTable.updated_at})`
    })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.user_id, userId),
        eq(tasksTable.completed, true)
      )
    )
    .groupBy(sql`date(${tasksTable.updated_at})`)
    .orderBy(sql`date(${tasksTable.updated_at}) desc`)
    .execute();

    // Calculate streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < completedTaskDates.length; i++) {
      const taskDate = new Date(completedTaskDates[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (taskDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    const stats = taskStats[0];
    const focusTime = focusTimeResult[0];

    return {
      total_tasks: Number(stats.total_tasks),
      completed_tasks: Number(stats.completed_tasks),
      total_focus_time: Number(focusTime.total_focus_time),
      current_streak: currentStreak
    };
  } catch (error) {
    console.error('Get user stats failed:', error);
    throw error;
  }
};
