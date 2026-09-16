import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ThumbsUp, Meh, ThumbsDown, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FocusOutcome } from '@/hooks/useFocusSessions';
import { useState, useRef, useEffect } from 'react';

interface FocusFeedbackProps {
  duration: number;
  actualMinutes: number;
  endedEarly: boolean;
  onSubmit: (outcome: FocusOutcome) => void;
  onSkip?: () => void;
}

const outcomeOptions: { value: FocusOutcome; label: string; icon: React.ReactNode }[] = [
  { value: 'good', label: 'Good progress', icon: <ThumbsUp className="w-6 h-6" /> },
  { value: 'some', label: 'Some progress', icon: <Meh className="w-6 h-6" /> },
  { value: 'notReally', label: 'Not really', icon: <ThumbsDown className="w-6 h-6" /> },
];

export function FocusFeedback({ duration, actualMinutes, endedEarly, onSubmit, onSkip }: FocusFeedbackProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<FocusOutcome | null>(null);
  const hasSubmittedRef = useRef(false);

  // Debug log on render
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[FocusFeedback] Mounted - duration:', duration, 'actualMinutes:', actualMinutes, 'endedEarly:', endedEarly);
    }
  }, [duration, actualMinutes, endedEarly]);

  const handleFeedback = (outcome: FocusOutcome) => {
    // Debug log
    if (import.meta.env.DEV) {
      console.log('[FocusFeedback] Button clicked - outcome:', outcome, 'hasSubmitted:', hasSubmittedRef.current, 'isExiting:', isExiting);
    }
    
    if (hasSubmittedRef.current || isExiting) {
      console.warn('[FocusFeedback] Blocked duplicate submit');
      return;
    }
    hasSubmittedRef.current = true;
    setSelectedOutcome(outcome);
    
    // Start exit animation
    setIsExiting(true);
    
    // Call onSubmit after a brief animation delay
    setTimeout(() => {
      console.log('[FocusFeedback] Calling onSubmit with:', outcome);
      onSubmit(outcome);
    }, 300);
  };

  const handleSkip = () => {
    if (import.meta.env.DEV) {
      console.log('[FocusFeedback] Skip clicked - hasSubmitted:', hasSubmittedRef.current, 'isExiting:', isExiting);
    }
    
    if (hasSubmittedRef.current || isExiting) {
      console.warn('[FocusFeedback] Blocked duplicate skip');
      return;
    }
    hasSubmittedRef.current = true;
    setIsExiting(true);
    
    setTimeout(() => {
      // Default to 'some' when skipping
      if (onSkip) {
        console.log('[FocusFeedback] Calling onSkip');
        onSkip();
      } else {
        console.log('[FocusFeedback] Calling onSubmit with default "some"');
        onSubmit('some');
      }
    }, 300);
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} minutes`;
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${m}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background overflow-y-auto"
      style={{ 
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Bloom animation on complete */}
      {!endedEarly && (
        <motion.div
          className="absolute pointer-events-none"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <div className="w-32 h-32 rounded-full bg-primary/30" />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-8 text-center px-6 relative z-10 pointer-events-auto"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-primary" />
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {endedEarly ? 'Session ended' : 'Well done!'}
          </h2>
          <p className="text-muted-foreground">
            {endedEarly 
              ? `You focused for ${formatDuration(actualMinutes)}. Every minute counts.`
              : `You completed ${formatDuration(duration)} of focused work.`
            }
          </p>
        </motion.div>

        {/* Outcome selection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            How did that session go?
          </p>
          <div className="grid grid-cols-3 gap-3">
            {outcomeOptions.map((option, index) => (
              <motion.button
                key={option.value}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFeedback(option.value);
                }}
                disabled={isExiting}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border transition-all cursor-pointer touch-manipulation select-none ${
                  selectedOutcome === option.value 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/30 hover:bg-accent active:bg-accent'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-muted-foreground pointer-events-none">
                  {option.icon}
                </span>
                <span className="text-xs text-muted-foreground font-medium pointer-events-none">
                  {option.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Skip button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSkip();
            }}
            disabled={isExiting}
            className="text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip feedback
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
