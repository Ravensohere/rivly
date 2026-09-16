import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types';
import { Check } from 'lucide-react';
import { useState } from 'react';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onTap?: () => void;
  compact?: boolean;
}

const tagColors: Record<string, string> = {
  work: 'bg-block-sky',
  study: 'bg-block-lavender',
  personal: 'bg-block-peach',
  health: 'bg-block-mint',
  other: 'bg-muted',
};

export function TaskItem({ task, onToggle, onTap, compact = false }: TaskItemProps) {
  const isDone = task.status === 'done';
  const [showCompletionGlow, setShowCompletionGlow] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onTap
    if (!isDone) {
      setShowCompletionGlow(true);
      setJustCompleted(true);
      setTimeout(() => setShowCompletionGlow(false), 800);
      setTimeout(() => setJustCompleted(false), 600);
    }
    onToggle();
  };

  const handleRowClick = () => {
    if (onTap) {
      onTap();
    } else {
      // Fallback to toggle if no onTap handler
      handleCheckboxClick({ stopPropagation: () => {} } as React.MouseEvent);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, scale: 0.95 }}
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleRowClick}
      className={`
        relative flex items-center gap-3 p-3 rounded-xl bg-card cursor-pointer
        transition-all duration-300 hover:shadow-soft min-h-[44px]
        ${compact ? 'py-2' : 'py-3'}
      `}
    >
      {/* Completion glow overlay */}
      <AnimatePresence>
        {showCompletionGlow && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.4, 0],
              scale: [1, 1.02, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              background: 'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 60%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Checkbox with enhanced animation */}
      <motion.div
        whileTap={{ scale: 0.8 }}
        animate={justCompleted ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={handleCheckboxClick}
        className={`
          relative flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
          transition-colors duration-300
          ${isDone 
            ? 'bg-primary border-primary' 
            : 'border-muted-foreground/40 hover:border-primary/60'
          }
        `}
      >
        {/* Checkbox glow on complete */}
        <AnimatePresence>
          {justCompleted && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
              }}
            />
          )}
        </AnimatePresence>

        {isDone && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
          </motion.div>
        )}
      </motion.div>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <motion.span
          animate={{ 
            opacity: isDone ? 0.5 : 1,
          }}
          transition={{ duration: 0.3 }}
          className={`
            text-sm font-medium text-foreground block truncate
            transition-all duration-300
            ${isDone ? 'line-through' : ''}
          `}
        >
          {task.title}
        </motion.span>
      </div>

      {/* Tag indicator with subtle pulse on complete */}
      <motion.div 
        className={`w-2 h-2 rounded-full ${tagColors[task.tag] || tagColors.other}`}
        animate={justCompleted ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] } : {}}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  );
}
