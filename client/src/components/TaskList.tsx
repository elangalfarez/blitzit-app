
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Zap, Trash2, CheckCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Task, FocusSession } from '../../../server/src/schema';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: number) => void;
  onFocusSessionStart: (session: FocusSession) => void;
  showBlitzButton: boolean;
}

export function TaskList({ 
  tasks, 
  onTaskUpdate, 
  onTaskDelete, 
  onFocusSessionStart, 
  showBlitzButton 
}: TaskListProps) {
  const [loadingTasks, setLoadingTasks] = useState<Set<number>>(new Set());

  const handleToggleComplete = async (task: Task) => {
    const taskId = task.id;
    setLoadingTasks((prev: Set<number>) => new Set(prev).add(taskId));

    try {
      const updatedTask = await trpc.updateTask.mutate({
        id: task.id,
        completed: !task.completed
      });
      onTaskUpdate(updatedTask);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setLoadingTasks((prev: Set<number>) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleStartFocus = async (task: Task) => {
    const taskId = task.id;
    setLoadingTasks((prev: Set<number>) => new Set(prev).add(taskId));

    try {
      const session = await trpc.startFocusSession.mutate({
        task_id: task.id
      });
      onFocusSessionStart(session);
    } catch (error) {
      console.error('Failed to start focus session:', error);
    } finally {
      setLoadingTasks((prev: Set<number>) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await trpc.deleteTask.mutate({ id: taskId });
      onTaskDelete(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task: Task) => (
        <div
          key={task.id}
          className={`p-4 rounded-lg border transition-all duration-200 ${
            task.completed
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => handleToggleComplete(task)}
              disabled={loadingTasks.has(task.id)}
              className={task.completed ? 'data-[state=checked]:bg-green-600' : ''}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className={`font-medium truncate ${
                    task.completed
                      ? 'text-green-800 dark:text-green-200 line-through'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {task.title}
                </h3>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
              {task.description && (
                <p
                  className={`text-sm truncate ${
                    task.completed
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {task.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showBlitzButton && !task.completed && (
                <Button
                  size="sm"
                  onClick={() => handleStartFocus(task)}
                  disabled={loadingTasks.has(task.id)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Blitz it!
                </Button>
              )}

              {task.completed && (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{task.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteTask(task.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
