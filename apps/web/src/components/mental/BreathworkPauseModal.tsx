import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BreathworkPauseModalProps {
  open: boolean;
  onClose: () => void;
  /** Duration in seconds (default 60 = 1 min, ~3 breaths at 4-4-4) */
  durationSeconds?: number;
}

type Phase = 'in' | 'hold' | 'out';

export function BreathworkPauseModal({
  open,
  onClose,
  durationSeconds = 60,
}: BreathworkPauseModalProps) {
  const [phase, setPhase] = useState<Phase>('in');
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!open) {
      setPhase('in');
      setSecondsLeft(durationSeconds);
      setIsActive(false);
      return;
    }
  }, [open, durationSeconds]);

  // Phase cycle: in 4s, hold 4s, out 4s
  useEffect(() => {
    if (!open || !isActive) return;
    const phaseDurations = { in: 4, hold: 4, out: 4 };
    const phases: Phase[] = ['in', 'hold', 'out'];
    let phaseIndex = 0;
    let phaseSeconds = 0;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          setIsActive(false);
          onClose();
          return 0;
        }
        phaseSeconds++;
        const currentPhaseDuration = phaseDurations[phases[phaseIndex]];
        if (phaseSeconds >= currentPhaseDuration) {
          phaseIndex = (phaseIndex + 1) % 3;
          phaseSeconds = 0;
          setPhase(phases[phaseIndex]);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, isActive, onClose]);

  if (!open) return null;

  const phaseLabel = phase === 'in' ? 'Breathe in' : phase === 'hold' ? 'Hold' : 'Breathe out';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-background/95 backdrop-blur-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </button>

      {!isActive ? (
        <div className="text-center space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Take a pause</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            One minute of calm breathing. Inhale 4, hold 4, exhale 4.
          </p>
          <Button onClick={() => setIsActive(true)}>Start</Button>
        </div>
      ) : (
        <div className="text-center space-y-8">
          <motion.div
            key={phase}
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{
              scale: phase === 'in' ? 1.15 : phase === 'hold' ? 1.2 : 1,
              opacity: 1,
            }}
            transition={{ duration: phase === 'in' ? 4 : phase === 'out' ? 4 : 0.3 }}
            className="w-40 h-40 mx-auto rounded-full bg-primary/20 flex items-center justify-center"
          >
            <span className="text-lg font-medium text-foreground">{phaseLabel}</span>
          </motion.div>
          <p className="text-sm text-muted-foreground">{secondsLeft}s left</p>
        </div>
      )}
    </motion.div>
  );
}
