import { motion, AnimatePresence } from 'framer-motion';
import { TimeBlock, Task } from '@/types';
import { formatTimeDisplay } from '@/hooks/useLocalStorage';
import { TaskItem } from './TaskItem';
import { Check, Trash2, Clock, FileText, Sparkles, Edit3, AlarmClock, AlertTriangle } from 'lucide-react';
import { 
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
} from '@/components/ui/ResponsiveModal';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
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

interface BlockDetailSheetProps {
  block: TimeBlock | null;
  tasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTaskToggle: (taskId: string) => void;
  onSnooze?: (minutes: number) => void;
}

const colorClasses: Record<string, string> = {
  sage: 'bg-block-sage',
  lavender: 'bg-block-lavender',
  peach: 'bg-block-peach',
  sky: 'bg-block-sky',
  mint: 'bg-block-mint',
  rose: 'bg-block-rose',
};

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    },
  },
};

// Determine block status based on time and completion
function getBlockStatus(block: TimeBlock): 'upcoming' | 'active' | 'missed' | 'completed' {
  if (block.status === 'completed') return 'completed';
  if (block.status === 'inProgress') return 'active';
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = block.startTime.split(':').map(Number);
  const [endH, endM] = block.endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  if (currentMinutes < startMinutes) return 'upcoming';
  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return 'active';
  if (currentMinutes >= endMinutes) return 'missed';
  
  return 'upcoming';
}

export function BlockDetailSheet({
  block,
  tasks,
  open,
  onOpenChange,
  onComplete,
  onEdit,
  onDelete,
  onTaskToggle,
  onSnooze,
}: BlockDetailSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  if (!block) return null;

  const status = getBlockStatus(block);
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isMissed = status === 'missed';

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return { icon: Sparkles, label: 'Completed', className: 'bg-primary/15 text-primary' };
      case 'active':
        return { icon: Clock, label: 'Active', className: 'bg-accent text-accent-foreground' };
      case 'missed':
        return { icon: AlertTriangle, label: 'Missed', className: 'bg-destructive/15 text-destructive' };
      default:
        return { icon: Clock, label: 'Upcoming', className: 'bg-muted text-muted-foreground' };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl">
          {/* Color indicator bar */}
          <motion.div 
            className={`absolute top-0 left-0 right-0 h-1 rounded-full ${colorClasses[block.color]}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          />
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative flex flex-col h-full"
          >
            <ResponsiveModalHeader className="mb-2 flex-shrink-0">
              <motion.div 
                variants={itemVariants}
                className="flex items-start justify-between"
              >
                <div className="flex-1">
                  <ResponsiveModalTitle className="text-xl font-semibold text-left mb-2">
                    {block.title}
                  </ResponsiveModalTitle>
                  <motion.div 
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                  >
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTimeDisplay(block.startTime)} – {formatTimeDisplay(block.endTime)}
                    </span>
                  </motion.div>
                </div>
                
                {/* Status badge */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5
                    ${statusBadge.className}
                  `}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusBadge.label}
                </motion.div>
              </motion.div>
            </ResponsiveModalHeader>

            <ResponsiveModalBody className="space-y-4">
              {/* Notes */}
              <AnimatePresence>
                {block.notes && (
                  <motion.div 
                    variants={itemVariants}
                    className="p-4 rounded-2xl bg-muted/50 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>Notes</span>
                    </div>
                    <p className="text-sm text-foreground">{block.notes}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tasks in this block */}
              <AnimatePresence>
                {tasks.length > 0 && (
                  <motion.div variants={itemVariants}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Tasks ({tasks.filter(t => t.status === 'done').length}/{tasks.length})
                    </h4>
                    <div className="space-y-2">
                      {tasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                        >
                          <TaskItem
                            task={task}
                            onToggle={() => onTaskToggle(task.id)}
                            compact
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Snooze options for ongoing/planned blocks */}
              {!isCompleted && onSnooze && (
                <motion.div variants={itemVariants}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <AlarmClock className="w-4 h-4" />
                    Snooze Reminder
                  </h4>
                  <div className="flex gap-2">
                    {[10, 30, 60].map((mins) => (
                      <Button
                        key={mins}
                        variant="outline"
                        size="sm"
                        onClick={() => onSnooze(mins)}
                        className="flex-1 rounded-xl min-h-[44px]"
                      >
                        {mins === 60 ? '1h' : `${mins}m`}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </ResponsiveModalBody>

            {/* Sticky Footer Actions */}
            <ResponsiveModalFooter>
              {!isCompleted && (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full"
                >
                  <Button
                    onClick={() => {
                      onComplete();
                      onOpenChange(false);
                    }}
                    className="w-full h-12 rounded-2xl text-base font-medium shadow-lg shadow-primary/20"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Mark Complete
                  </Button>
                </motion.div>
              )}
              
              {/* Secondary actions row */}
              <motion.div variants={itemVariants} className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    // Small delay to let sheet close before opening edit
                    setTimeout(() => onEdit(), 150);
                  }}
                  className="flex-1 h-11 rounded-2xl text-base font-medium"
                >
                  <Edit3 className="w-5 h-5 mr-2" />
                  Edit
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  className="h-11 rounded-2xl text-base font-medium text-destructive hover:text-destructive hover:bg-destructive/10 px-6"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </motion.div>
            </ResponsiveModalFooter>
          </motion.div>
        </ResponsiveModalContent>
      </ResponsiveModal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this time block?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The time block will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
