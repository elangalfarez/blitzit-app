
import { db } from '../db';
import { usersTable, tasksTable, focusSessionsTable } from '../db/schema';
import { type GetUserStatsInput, type UserStats } from '../schema';
import { eq, and, sum, count, isNull, gte, lt } from 'drizzle-orm';

export const getUserStats = async (input: GetUserStatsInput): Promise<UserStats> => {
  try {
    // Default to today if no date provided
    const targetDate = input.date || new Date();
    
    // Set up date range for the target date (start and end of day)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get total focus minutes for the date
    const focusMinutesResult = await db
      .select({
        total_minutes: sum(focusSessionsTable.duration_minutes)
      })
      .from(focusSessionsTable)
      .where(
        and(
          eq(focusSessionsTable.user_id, input.user_id),
          gte(focusSessionsTable.started_at, startOfDay),
          lt(focusSessionsTable.started_at, endOfDay),
          eq(focusSessionsTable.completed, true)
        )
      )
      .execute();

    // Get task counts for the date
    const taskCountsResult = await db
      .select({
        total_tasks: count(),
        completed_tasks: count(tasksTable.completed_at)
      })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.user_id, input.user_id),
          eq(tasksTable.scheduled_date, targetDate.toISOString().split('T')[0])
        )
      )
      .execute();

    // Get active focus session (one that's started but not ended)
    const activeSessionResult = await db
      .select()
      .from(focusSessionsTable)
      .where(
        and(
          eq(focusSessionsTable.user_id, input.user_id),
          isNull(focusSessionsTable.ended_at)
        )
      )
      .limit(1)
      .execute();

    // Extract results with proper defaults
    const totalFocusMinutes = focusMinutesResult[0]?.total_minutes ? 
      parseInt(focusMinutesResult[0].total_minutes) : 0;
    
    const taskCounts = taskCountsResult[0];
    const totalTasksCount = taskCounts?.total_tasks || 0;
    const completedTasksCount = taskCounts?.completed_tasks || 0;
    
    const activeSession = activeSessionResult.length > 0 ? activeSessionResult[0] : null;

    return {
      total_focus_minutes: totalFocusMinutes,
      completed_tasks_count: completedTasksCount,
      total_tasks_count: totalTasksCount,
      active_session: activeSession
    };
  } catch (error) {
    console.error('Get user stats failed:', error);
    throw error;
  }
};
