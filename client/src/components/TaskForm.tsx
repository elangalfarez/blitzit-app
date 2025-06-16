
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Task, CreateTaskInput } from '../../../server/src/schema';

interface TaskFormProps {
  user: User;
  onTaskCreate: (task: Task) => void;
  onClose: () => void;
}

export function TaskForm({ user, onTaskCreate, onClose }: TaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateTaskInput>({
    user_id: user.id,
    title: '',
    description: null,
    estimated_minutes: null,
    scheduled_date: new Date()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await trpc.createTask.mutate(formData);
      onTaskCreate(response);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a task for today and start blitzing! ⚡
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Task title *"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
              }
              required
              className="w-full"
            />
          </div>

          <div>
            <Textarea
              placeholder="Description (optional)"
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: CreateTaskInput) => ({
                  ...prev,
                  description: e.target.value || null
                }))
              }
              className="w-full resize-none"
              rows={3}
            />
          </div>

          <div>
            <Input
              type="number"
              placeholder="Estimated time (minutes)"
              value={formData.estimated_minutes || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateTaskInput) => ({
                  ...prev,
                  estimated_minutes: e.target.value ? parseInt(e.target.value) : null
                }))
              }
              min="1"
              className="w-full"
            />
          </div>

          {error && (
            <Alert className="border-red-200 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
