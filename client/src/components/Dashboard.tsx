
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { Plus, Clock, CheckCircle, Target, Zap } from 'lucide-react';
import type { User, Task, UserStats, FocusSession } from '../../../server/src/schema';

interface DashboardProps {
  user: User;
  tasks: Task[];
  userStats: UserStats | null;
  onTaskCreate: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: number) => void;
  onFocusSessionStart: (session: FocusSession) => void;
}

export function Dashboard({
  user,
  tasks,
  userStats,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onFocusSessionStart
}: DashboardProps) {
  const [showTaskForm, setShowTaskForm] = useState(false);

  const pendingTasks = tasks.filter((task: Task) => !task.completed);
  const completedTasks = tasks.filter((task: Task) => task.completed);
  const totalEstimatedMinutes = pendingTasks.reduce((sum: number, task: Task) => 
    sum + (task.estimated_minutes || 0), 0
  );

  const completionRate = tasks.length > 0 
    ? Math.round((completedTasks.length / tasks.length) * 100) 
    : 0;

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Ready to Blitz it, {user.name}? ⚡
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{today}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Focus Time
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {userStats?.total_focus_minutes || 0}m
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Time spent focused today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">
              Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {completedTasks.length}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Tasks completed today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Pending
            </CardTitle>
            <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {pendingTasks.length}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Tasks remaining
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Progress
            </CardTitle>
            <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {completionRate}%
            </div>
            <Progress value={completionRate} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Task Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Today's Tasks
                </CardTitle>
                <CardDescription>
                  {pendingTasks.length} tasks • ~{totalEstimatedMinutes}min estimated
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowTaskForm(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={pendingTasks}
              user={user}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              onFocusSessionStart={onFocusSessionStart}
              showBlitzButton={true}
            />
            {pendingTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No tasks yet. Add one to get started! 🚀</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              Completed Today
            </CardTitle>
            <CardDescription>
              {completedTasks.length} tasks completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={completedTasks}
              user={user}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              onFocusSessionStart={onFocusSessionStart}
              showBlitzButton={false}
            />
            {completedTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No completed tasks yet. You've got this! 💪</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          user={user}
          onTaskCreate={onTaskCreate}
          onClose={() => setShowTaskForm(false)}
        />
      )}
    </div>
  );
}
