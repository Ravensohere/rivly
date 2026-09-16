import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduledReminder } from '@/hooks/useNotifications';

interface ReminderBannerProps {
  reminder: ScheduledReminder | null;
  onSnooze: (minutes?: number) => void;
  onDismiss: () => void;
  onOpen?: () => void;
}

export function ReminderBanner({ reminder, onSnooze, onDismiss, onOpen }: ReminderBannerProps) {
  return (
    <AnimatePresence>
      {reminder && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ 
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
          className="fixed top-0 left-0 right-0 z-50 safe-top"
        >
          <div className="mx-4 mt-4">
            <div 
              className="relative overflow-hidden rounded-2xl border border-border/30 backdrop-blur-xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--background) / 0.95) 100%)',
              }}
            >
              {/* Animated glow */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  background: [
                    'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.2) 0%, transparent 50%)',
                    'radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.2) 0%, transparent 50%)',
                    'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.2) 0%, transparent 50%)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Close button */}
              <button
                onClick={onDismiss}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="relative z-10 p-4">
                <div className="flex items-start gap-3">
                  {/* Pulsing clock icon */}
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0"
                  >
                    <Clock className="w-5 h-5 text-primary" />
                  </motion.div>

                  <div className="flex-1 min-w-0 pr-6">
                    <p className="font-semibold text-foreground truncate">
                      {reminder.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reminder.body}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSnooze(5)}
                    className="flex-1 gap-1.5"
                  >
                    <BellOff className="w-3.5 h-3.5" />
                    Snooze 5m
                  </Button>
                  {onOpen && (
                    <Button
                      size="sm"
                      onClick={onOpen}
                      className="flex-1"
                    >
                      Open
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
