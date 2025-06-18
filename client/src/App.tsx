
import { useState, useEffect, useCallback } from 'react';
import { AuthForm } from './components/AuthForm';
import { TaskManager } from './components/TaskManager';
import { FocusSession } from './components/FocusSession';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, UserStats, Task, FocusSession as FocusSessionType } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentSession, setCurrentSession] = useState<FocusSessionType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      const [statsData, tasksData] = await Promise.all([
        trpc.getUserStats.query(),
        trpc.getTasks.query()
      ]);
      setUserStats(statsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, [user]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Try to get current user from backend
        const userData = await trpc.getCurrentUser.query();
        setUser(userData);
      } catch (error) {
        console.error('Auth check failed:', error);
        // User not authenticated, will show auth form
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, loadUserData]);

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      // Clear local state
      setUser(null);
      setUserStats(null);
      setTasks([]);
      setCurrentSession(null);
      
      // Reload page to clear any cached auth state
      window.location.reload();
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTaskCreate = (task: Task) => {
    setTasks((prev: Task[]) => [...prev, task]);
    loadUserData(); // Refresh stats
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prev: Task[]) =>
      prev.map((t: Task) => (t.id === updatedTask.id ? updatedTask : t))
    );
    loadUserData(); // Refresh stats
  };

  const handleTaskDelete = (taskId: number) => {
    setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== taskId));
    loadUserData(); // Refresh stats
  };

  const handleFocusSessionStart = (session: FocusSessionType) => {
    setCurrentSession(session);
  };

  const handleSessionEnd = () => {
    setCurrentSession(null);
    loadUserData(); // Refresh stats and tasks
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Blitzit...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                ⚡ Blitzit
              </h1>
              <p className="text-gray-600">
                Lightning-fast productivity with focused work sessions
              </p>
            </div>
            <AuthForm onAuthSuccess={(userData: User) => setUser(userData)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                ⚡ Blitzit
                <Badge variant="secondary" className="text-xs">
                  Focus Mode
                </Badge>
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user.name}! 👋
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              disabled={authLoading}
            >
              {authLoading ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>

          {/* Stats Dashboard */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {userStats.total_tasks}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {userStats.completed_tasks}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Focus Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(userStats.total_focus_time / 60)}h
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600 flex items-center gap-1">
                    {userStats.current_streak}
                    <span className="text-sm">🔥</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Separator className="mb-8" />

          {/* Task Manager */}
          <TaskManager 
            tasks={tasks}
            onTaskCreate={handleTaskCreate}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onFocusSessionStart={handleFocusSessionStart}
          />
        </div>
      </div>

      {/* Focus Session Overlay */}
      {currentSession && (
        <FocusSession
          session={currentSession}
          task={tasks.find((t: Task) => t.id === currentSession.task_id) || undefined}
          onSessionEnd={handleSessionEnd}
        />
      )}
    </>
  );
}

export default App;
