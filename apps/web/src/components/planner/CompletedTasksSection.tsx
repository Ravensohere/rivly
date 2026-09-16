/**
 * Completed Tasks Section - Collapsible section showing completed tasks
 * Auto-removes tasks after 4 hours
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Task } from '@/types';
import { ChevronDown, Check, Clock } from 'lucide-react';

interface CompletedTasksSectionProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CompletedTasksSection({ tasks, onTaskClick }: CompletedTasksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter to only completed tasks
  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'done');
  }, [tasks]);

  if (completedTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      {/* Collapsible header */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Completed ({completedTasks.length})
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </motion.button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-2">
              {completedTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onTaskClick(task)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/50 cursor-pointer hover:bg-card transition-colors min-h-[44px]"
                >
                  {/* Completed checkbox */}
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                  </div>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-muted-foreground line-through block truncate">
                      {task.title}
                    </span>
                  </div>

                  {/* Completed time */}
                  {task.completedAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/60 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(task.completedAt), 'h:mm a')}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Auto-remove notice */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs text-muted-foreground/50 text-center mt-3 px-4"
            >
              Completed tasks auto-remove after 4 hours
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
