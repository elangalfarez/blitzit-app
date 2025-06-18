
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Task, FocusSession } from '../../../server/src/schema';

interface FocusTimerProps {
  tasks: Task[];
  onSessionComplete: () => void;
}

export function FocusTimer({ tasks, onSessionComplete }: FocusTimerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('none');
  const [duration, setDuration] = useState(25); // minutes
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60); // seconds
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<number | null>(null);

  // Update timeLeft when duration changes
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration * 60);
    }
  }, [duration, isActive]);

  const handleTimerComplete = useCallback(async () => {
    if (!currentSession) return;

    setIsActive(false);
    try {
      await trpc.endFocusSession.mutate({
        id: currentSession.id,
        duration_minutes: duration
      });
      setCurrentSession(null);
      setTimeLeft(duration * 60);
      onSessionComplete();
      
      // Show completion notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus session complete! 🎉', {
          body: `You completed a ${duration}-minute focus session.`,
          icon: '/favicon.ico'
        });
      }
    } catch (error: unknown) {
      console.error('Failed to end focus session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete focus session.';
      setError(errorMessage);
    }
  }, [currentSession, duration, onSessionComplete]);

  // Timer countdown effect
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft, handleTimerComplete]);

  const handleStartTimer = async () => {
    setError(null);
    try {
      const taskId = selectedTaskId !== 'none' ? parseInt(selectedTaskId) : null;
      const session = await trpc.startFocusSession.mutate({
        task_id: taskId
      });
      
      setCurrentSession(session);
      setIsActive(true);
      setTimeLeft(duration * 60);

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (error: unknown) {
      console.error('Failed to start focus session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start focus session. Please try again.';
      setError(errorMessage);
    }
  };

  const handleStopTimer = async () => {
    if (!currentSession) return;

    setIsActive(false);
    try {
      const actualDuration = Math.ceil((duration * 60 - timeLeft) / 60);
      if (actualDuration > 0) {
        await trpc.endFocusSession.mutate({
          id: currentSession.id,
          duration_minutes: actualDuration
        });
        onSessionComplete();
      }
      setCurrentSession(null);
      setTimeLeft(duration * 60);
    } catch (error: unknown) {
      console.error('Failed to stop focus session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop focus session.';
      setError(errorMessage);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;
  const pendingTasks = tasks.filter((task: Task) => !task.completed);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 Focus Timer
          {isActive && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Use the Pomodoro technique to stay focused and productive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Timer Display */}
        <div className="text-center">
          <div className="text-6xl font-mono font-bold text-gray-900 mb-2">
            {formatTime(timeLeft)}
          </div>
          <Progress value={progress} className="w-full h-2 mb-4" />
          <p className="text-sm text-gray-600">
            {isActive ? 'Focus time remaining' : 'Ready to start focusing'}
          </p>
        </div>

        {/* Configuration */}
        {!isActive && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Duration (minutes)
              </label>
              <Select
                value={duration.toString()}
                onValueChange={(value: string) => setDuration(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="25">25 minutes (Pomodoro)</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Focus Task (Optional)
              </label>
              <Select
                value={selectedTaskId}
                onValueChange={setSelectedTaskId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific task</SelectItem>
                  {pendingTasks.map((task: Task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Current Task Display */}
        {isActive && selectedTaskId !== 'none' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-1">Focusing on:</h4>
            <p className="text-blue-700">
              {tasks.find((t: Task) => t.id === parseInt(selectedTaskId))?.title || 'Task not found'}
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center space-x-3">
          {!isActive ? (
            <Button 
              onClick={handleStartTimer}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              🚀 Start Focus Session
            </Button>
          ) : (
            <Button 
              onClick={handleStopTimer}
              variant="destructive"
              size="lg"
            >
              ⏹️ Stop Session
            </Button>
          )}
        </div>

        {/* Tips */}
        {!isActive && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">💡 Focus Tips:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Eliminate distractions before starting</li>
              <li>• Take short breaks between sessions</li>
              <li>• Stay hydrated and maintain good posture</li>
              <li>• Focus on one task at a time</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
