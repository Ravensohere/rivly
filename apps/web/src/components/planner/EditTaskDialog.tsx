/**
 * EditTaskDialog - Full CRUD dialog for editing tasks
 * Uses ResponsiveModal for proper mobile/desktop handling
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Task, TaskTag } from '@/types';
import { 
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from '@/components/ui/ResponsiveModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Check, Circle } from 'lucide-react';
import { WheelTimePicker, TimePickerTrigger } from '@/components/ui/WheelTimePicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSave: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onToggle: () => void;
}

const tagOptions: { key: TaskTag; label: string; className: string }[] = [
  { key: 'work', label: 'Work', className: 'bg-block-sky' },
  { key: 'study', label: 'Study', className: 'bg-block-lavender' },
  { key: 'personal', label: 'Personal', className: 'bg-block-peach' },
  { key: 'health', label: 'Health', className: 'bg-block-mint' },
  { key: 'other', label: 'Other', className: 'bg-muted' },
];

export function EditTaskDialog({ 
  open, 
  onOpenChange, 
  task, 
  onSave, 
  onDelete, 
  onToggle 
}: EditTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<TaskTag>('work');
  const [date, setDate] = useState('');
  const [reminder, setReminder] = useState('');
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setTag(task.tag);
      // Support both dateKey (new) and date (legacy)
      setDate(task.dateKey || task.date || '');
      setReminder(task.reminder || '');
    }
  }, [task]);

  if (!task) return null;

  const handleSave = () => {
    onSave({
      title: title.trim(),
      tag,
      dateKey: date, // Use dateKey for new saves
      reminder: reminder || undefined,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const isComplete = task.status === 'done';

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none rounded-3xl" />
          
          <ResponsiveModalHeader className="relative">
            <ResponsiveModalTitle className="text-xl font-semibold text-center">
              Edit Task
            </ResponsiveModalTitle>
            <ResponsiveModalDescription className="sr-only">
              Edit the details of your task.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>

          <ResponsiveModalBody className="relative space-y-5">
            {/* Status toggle */}
            <div className="flex justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onToggle}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                  min-h-[44px] touch-manipulation
                  ${isComplete 
                    ? 'bg-primary/15 text-primary' 
                    : 'bg-secondary text-muted-foreground'}
                `}
              >
                {isComplete ? (
                  <>
                    <Check className="w-4 h-4" />
                    Completed
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4" />
                    Mark Complete
                  </>
                )}
              </motion.button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Task
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="h-12 rounded-xl"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            {/* Reminder time */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Reminder time (optional)
              </label>
              <TimePickerTrigger
                value={reminder || '09:00'}
                onClick={() => setShowReminderPicker(true)}
                className="w-full h-12 justify-center min-h-[44px]"
              />
              <WheelTimePicker
                open={showReminderPicker}
                onOpenChange={setShowReminderPicker}
                value={reminder || '09:00'}
                onChange={setReminder}
                title="Reminder Time"
              />
            </div>

            {/* Tag selection */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-3">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((option) => (
                  <motion.button
                    key={option.key}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setTag(option.key)}
                    className={`
                      px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                      min-h-[44px] touch-manipulation
                      ${tag === option.key 
                        ? `${option.className} text-foreground ring-2 ring-primary/30` 
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'}
                    `}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </ResponsiveModalBody>

          {/* Sticky Footer with Actions */}
          <ResponsiveModalFooter className="relative flex-row gap-3">
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button 
              onClick={handleSave} 
              disabled={!title.trim()}
              className="min-h-[44px]"
            >
              Save Changes
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
