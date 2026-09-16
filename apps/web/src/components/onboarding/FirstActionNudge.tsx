import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export type NudgeType = 'add-task' | 'first-task-added' | 'first-sleep-sound';

interface FirstActionNudgeProps {
  type: NudgeType;
  show: boolean;
  onDismiss: () => void;
}

const NUDGE_CONFIG: Record<NudgeType, { icon: React.ReactNode; message: string; duration: number }> = {
  'add-task': {
    icon: <Plus className="w-4 h-4" />,
    message: "Let's add your first task.",
    duration: 8000,
  },
  'first-task-added': {
    icon: <Sparkles className="w-4 h-4" />,
    message: 'Nice. Your orb will start changing now.',
    duration: 4000,
  },
  'first-sleep-sound': {
    icon: <Moon className="w-4 h-4" />,
    message: 'Sleep impacts your rhythm more than you think.',
    duration: 5000,
  },
};

export function FirstActionNudge({ type, show, onDismiss }: FirstActionNudgeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = NUDGE_CONFIG[type];

  useEffect(() => {
    if (show) {
      // Small delay before showing
      const showTimer = setTimeout(() => setIsVisible(true), 500);
      
      // Auto-dismiss after duration
      const dismissTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 400);
      }, config.duration + 500);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [show, config.duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 400);
  };

  // Position based on nudge type
  const getPosition = () => {
    switch (type) {
      case 'add-task':
        return 'bottom-32 right-24'; // Moved up and left from FAB
      case 'first-task-added':
        return 'top-1/3 left-4 right-4'; // Center-ish
      case 'first-sleep-sound':
        return 'top-1/3 left-4 right-4';
      default:
        return 'bottom-24 left-4 right-4';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed z-[80] ${getPosition()}`}
          onClick={handleDismiss}
        >
          <motion.div
            className={`
              ${type === 'add-task' ? 'max-w-[200px] ml-auto' : 'max-w-xs mx-auto'}
              px-4 py-3 rounded-2xl border border-border/40 backdrop-blur-xl cursor-pointer
            `}
            style={{
              background: 'linear-gradient(135deg, hsl(var(--card) / 0.95) 0%, hsl(var(--card) / 0.85) 100%)',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3), 0 0 0 1px hsl(var(--border) / 0.1)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.1) 100%)',
                }}
                animate={{
                  scale: type === 'add-task' ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  duration: 1.5,
                  repeat: type === 'add-task' ? Infinity : 0,
                  ease: 'easeInOut',
                }}
              >
                <div className="text-primary">
                  {config.icon}
                </div>
              </motion.div>
              <p className="text-sm text-foreground/90 leading-snug">
                {config.message}
              </p>
            </div>

            {/* Pointer for add-task nudge - pointing right towards FAB */}
            {type === 'add-task' && (
              <motion.div
                className="absolute top-1/2 -right-2 w-4 h-4 -translate-y-1/2 rotate-45 border-r border-t border-border/40"
                style={{
                  background: 'hsl(var(--card) / 0.95)',
                }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
