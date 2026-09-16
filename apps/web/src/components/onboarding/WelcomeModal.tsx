/**
 * WelcomeModal - Full screen welcome for new users
 * Shows on first app load, explains the app's purpose
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface WelcomeModalProps {
  open: boolean;
  onStartTutorial: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ open, onStartTutorial, onSkip }: WelcomeModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/98 backdrop-blur-md"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm mx-4 p-8 rounded-3xl bg-card border border-border/40 shadow-xl"
        >
          <div className="text-center">
            {/* Breathing orb animation */}
            <motion.div
              className="w-24 h-24 mx-auto mb-8 rounded-full relative"
              style={{
                background: 'radial-gradient(circle at 40% 40%, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0.2) 50%, transparent 80%)',
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Inner glow */}
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.6) 0%, hsl(var(--primary) / 0.3) 40%, transparent 70%)',
                  boxShadow: '0 0 60px -10px hsl(var(--primary) / 0.5)',
                }}
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              />
              {/* Highlight */}
              <motion.div
                className="absolute top-3 left-3 w-6 h-4 rounded-full blur-sm"
                style={{
                  background: 'radial-gradient(ellipse, hsl(var(--background) / 0.6) 0%, transparent 70%)',
                }}
              />
            </motion.div>
            
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Welcome. Let's find your rhythm.
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-10">
              Rivly helps you plan, focus, reflect, and rest — without pressure.
            </p>
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={onSkip}
                className="flex-1 rounded-xl h-12 text-muted-foreground"
              >
                Skip
              </Button>
              <Button 
                onClick={onStartTutorial}
                className="flex-1 rounded-xl h-12"
              >
                Show me how
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
