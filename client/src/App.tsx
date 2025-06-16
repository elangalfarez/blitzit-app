
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { AuthForm } from '@/components/AuthForm';
import { Dashboard } from '@/components/Dashboard';
import { FocusSession } from '@/components/FocusSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, Zap } from 'lucide-react';
import type { User, Task, FocusSession as FocusSessionType, UserStats } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeFocusSession, setActiveFocusSession] = useState<FocusSessionType | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('blitzit_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('blitzit_user');
      }
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Load data when user is authenticated
  const loadUserData = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [tasksData, statsData] = await Promise.all([
        trpc.getTasks.query({ user_id: user.id, date: today }),
        trpc.getUserStats.query({ user_id: user.id, date: today })
      ]);

      setTasks(tasksData);
      setUserStats(statsData);
      setActiveFocusSession(statsData.active_session);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleAuth = (authData: { user: User; token: string }) => {
    setUser(authData.user);
    localStorage.setItem('blitzit_user', JSON.stringify(authData.user));
    localStorage.setItem('blitzit_token', authData.token);
  };

  const handleLogout = () => {
    setUser(null);
    setTasks([]);
    setUserStats(null);
    setActiveFocusSession(null);
    localStorage.removeItem('blitzit_user');
    localStorage.removeItem('blitzit_token');
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prev: Task[]) => 
      prev.map((task: Task) => task.id === updatedTask.id ? updatedTask : task)
    );
    // Reload stats to reflect changes
    loadUserData();
  };

  const handleTaskCreate = (newTask: Task) => {
    setTasks((prev: Task[]) => [...prev, newTask]);
    loadUserData();
  };

  const handleTaskDelete = (taskId: number) => {
    setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== taskId));
    loadUserData();
  };

  const handleFocusSessionStart = (session: FocusSessionType) => {
    setActiveFocusSession(session);
  };

  const handleFocusSessionEnd = () => {
    setActiveFocusSession(null);
    loadUserData(); // Refresh stats and tasks
  };

  const toggleDarkMode = () => {
    setDarkMode((prev: boolean) => !prev);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blitzit</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Focus. Complete. Achieve.</p>
          </div>
          <AuthForm onAuth={handleAuth} />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className="fixed top-4 right-4"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Blitzit</h1>
              {userStats && (
                <Badge variant="secondary" className="hidden sm:flex">
                  🔥 {userStats.total_focus_minutes}min focused today
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                Hi, {user.name}!
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDarkMode}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard
          user={user}
          tasks={tasks}
          userStats={userStats}
          onTaskCreate={handleTaskCreate}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onFocusSessionStart={handleFocusSessionStart}
        />
      </main>

      {/* Focus Session Modal */}
      {activeFocusSession && (
        <FocusSession
          session={activeFocusSession}
          task={tasks.find((t: Task) => t.id === activeFocusSession.task_id)}
          user={user}
          onSessionEnd={handleFocusSessionEnd}
        />
      )}
    </div>
  );
}

export default App;
