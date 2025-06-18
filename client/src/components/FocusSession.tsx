
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Zap, Target, CheckCircle, X, Play, Pause } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Task, FocusSession as FocusSessionType } from '../../../server/src/schema';

interface FocusSessionProps {
  session: FocusSessionType;
  task?: Task;
  onSessionEnd: () => void;
}

export function FocusSession({ session, task, onSessionEnd }: FocusSessionProps) {
  const [timeRemaining, setTimeRemaining] = useState(session.duration_minutes * 60);
  const [isActive, setIsActive] = useState(true);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Motivational messages based on progress
  const getMotivationalMessage = useCallback((progress: number) => {
    if (progress < 25) return "🚀 Just getting started! You've got this!";
    if (progress < 50) return "🔥 You're in the zone! Keep that momentum!";
    if (progress < 75) return "💪 Halfway there! You're crushing it!";
    if (progress < 90) return "⚡ Almost done! Push through to the finish!";
    return "🎉 Final stretch! You're about to Blitz this task!";
  }, []);

  const handleSessionComplete = useCallback(async () => {
    setIsEnding(true);
    try {
      const actualDuration = Math.ceil((session.duration_minutes * 60 - timeRemaining) / 60);
      await trpc.endFocusSession.mutate({
        id: session.id,
        duration_minutes: Math.max(actualDuration, 1) // At least 1 minute
      });
      onSessionEnd();
    } catch (error) {
      console.error('Failed to end session:', error);
    } finally {
      setIsEnding(false);
    }
  }, [session.id, session.duration_minutes, timeRemaining, onSessionEnd]);

  // Timer effect
  useEffect(() => {
    let interval: number | null = null;

    if (isActive && timeRemaining > 0) {
      interval = window.setInterval(() => {
        setTimeRemaining((prev: number) => {
          if (prev <= 1) {
            // Session completed naturally
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isActive, timeRemaining, handleSessionComplete]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const totalSeconds = session.duration_minutes * 60;
  const progress = Math.round(((totalSeconds - timeRemaining) / totalSeconds) * 100);

  const toggleTimer = () => {
    setIsActive((prev: boolean) => !prev);
  };

  const handleEndSession = () => {
    setShowEndDialog(true);
  };

  return (
    <>
      {/* Fixed overlay for focus session */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-900 to-purple-900 text-white border-0 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-6 w-6 text-yellow-400" />
              <CardTitle className="text-2xl font-bold">Blitz Mode Active!</CardTitle>
            </div>
            <CardDescription className="text-blue-100">
              {task?.title || 'Focus Session'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Timer Display */}
            <div className="text-center">
              <div className="text-6xl font-mono font-bold mb-2 text-yellow-400">
                {formatTime(timeRemaining)}
              </div>
              <Progress 
                value={progress} 
                className="h-3 bg-blue-800"
              />
              <p className="text-sm text-blue-200 mt-2">
                {progress}% complete
              </p>
            </div>

            {/* Motivational Message */}
            <div className="text-center p-4 bg-white/10 rounded-lg">
              <p className="text-lg font-medium">
                {getMotivationalMessage(progress)}
              </p>
            </div>

            {/* Task Details */}
            {task && (
              <div className="flex items-center gap-2 justify-center text-blue-200">
                <Target className="h-4 w-4" />
                <span className="text-sm">{task.title}</span>
                <Badge variant="secondary" className="bg-blue-800 text-blue-100">
                  {task.priority}
                </Badge>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={toggleTimer}
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                disabled={isEnding}
              >
                {isActive ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                )}
              </Button>

              <Button
                onClick={handleEndSession}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                disabled={isEnding}
              >
                <X className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </div>

            {/* Session Info */}
            <div className="text-center text-xs text-blue-300">
              Started at {session.started_at.toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* End Session Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Focus Session?</AlertDialogTitle>
            <AlertDialogDescription>
              You still have {formatTime(timeRemaining)} remaining. 
              Did you complete the task or want to end early?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isEnding}>
              Continue Session
            </AlertDialogCancel>
            <Button
              onClick={() => handleSessionComplete()}
              variant="outline"
              disabled={isEnding}
            >
              <X className="h-4 w-4 mr-2" />
              {isEnding ? 'Ending...' : 'End Early'}
            </Button>
            <AlertDialogAction
              onClick={() => handleSessionComplete()}
              className="bg-green-600 hover:bg-green-700"
              disabled={isEnding}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isEnding ? 'Completing...' : 'Task Complete!'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
