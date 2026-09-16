import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActiveTimerDisplayProps {
  purpose: string;
  formattedTime: string;
  progress: number;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  onPause: () => void;
  onResume: () => void;
  onEndEarly: () => void; // For break, this effectively cancels/skips
  onCancel: () => void;
  showExitConfirm?: boolean;
}

// Simple focus session orb visual
function TimerOrb({ progress, isPaused }: { progress: number; isPaused: boolean }) {
  const getGlowIntensity = () => {
    if (isPaused) return 0.2;
    if (progress > 0.7) return 0.5;
    return 0.3;
  };

  const getBreathingSpeed = () => {
    if (isPaused) return 8;
    return 3;
  };

  return (
    <motion.div className="relative w-48 h-48">
      {/* Outer breathing ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary) / ${getGlowIntensity() * 0.4}) 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.2, 0.5],
        }}
        transition={{
          duration: getBreathingSpeed() + 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main orb body */}
      <motion.div
        className="absolute inset-6 rounded-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at 35% 35%, 
            hsl(var(--primary) / ${getGlowIntensity()}) 0%, 
            hsl(var(--primary) / ${getGlowIntensity() * 0.5}) 40%, 
            hsl(var(--secondary) / ${getGlowIntensity() * 0.3}) 70%, 
            hsl(var(--primary) / ${getGlowIntensity() * 0.15}) 100%)`,
          boxShadow: `inset 0 0 30px -5px hsl(var(--primary) / ${getGlowIntensity() * 0.5})`,
        }}
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: getBreathingSpeed(),
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner highlight */}
        <motion.div
          className="absolute top-4 left-4 w-1/3 h-1/4 rounded-full blur-sm"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--background) / 0.5) 0%, transparent 70%)',
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Center pulse */}
        <motion.div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-1/2 h-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle, hsl(var(--primary) / ${getGlowIntensity() * 0.8}) 0%, transparent 60%)`,
            }}
            animate={{
              opacity: progress > 0.7 ? [0.6, 0.9, 0.6] : [0.4, 0.7, 0.4],
              scale: [0.9, 1.05, 0.9],
            }}
            transition={{
              duration: getBreathingSpeed() - 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function ActiveTimerDisplay({ 
  purpose, 
  formattedTime, 
  progress, 
  isRunning, 
  isPaused, 
  isCompleted,
  onPause,
  onResume,
  onEndEarly,
  onCancel,
}: ActiveTimerDisplayProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleTogglePauseResume = useCallback(() => {
    if (isRunning) {
      onPause();
    } else if (isPaused) {
      onResume();
    }
  }, [isRunning, isPaused, onPause, onResume]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Subtle animated background */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        animate={{
          background: isPaused 
            ? 'radial-gradient(circle at 50% 50%, hsl(var(--muted)) 0%, hsl(var(--background)) 70%)'
            : [
              'radial-gradient(circle at 50% 50%, hsl(var(--accent)) 0%, hsl(var(--background)) 70%)',
              'radial-gradient(circle at 50% 60%, hsl(var(--accent)) 0%, hsl(var(--background)) 70%)',
              'radial-gradient(circle at 50% 50%, hsl(var(--accent)) 0%, hsl(var(--background)) 70%)',
            ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Purpose label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <span className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
            {purpose}
          </span>
        </motion.div>

        {/* Timer Orb with progress ring */}
        <div className="relative">
          <TimerOrb progress={progress} isPaused={isPaused} />
          
          {/* Progress ring around the orb */}
          <svg 
            className="absolute inset-0 w-48 h-48 -rotate-90"
            viewBox="0 0 192 192"
          >
            {/* Background ring */}
            <circle
              cx="96"
              cy="96"
              r="90"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="2"
              strokeOpacity={0.3}
            />
            {/* Progress ring */}
            <motion.circle
              cx="96"
              cy="96"
              r="90"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 90}
              initial={{ strokeDashoffset: 2 * Math.PI * 90 }}
              animate={{ 
                strokeDashoffset: 2 * Math.PI * 90 * (1 - progress),
                strokeOpacity: isPaused ? 0.4 : 0.8,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>
        </div>

        {/* Timer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <div className="text-5xl font-light text-foreground tracking-wide mb-2">
            {formattedTime}
          </div>
          <div className="text-sm text-muted-foreground">
            {isPaused ? 'Paused' : isCompleted ? 'Complete!' : 'remaining'}
          </div>
        </motion.div>

        {/* Background timer notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/60"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Timer continues across pages & refresh</span>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex items-center gap-4"
        >
          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => setShowExitConfirm(true)}
          >
            <X className="w-5 h-5" />
          </Button>
          
          <Button
            size="icon"
            className="w-16 h-16 rounded-full shadow-lg"
            onClick={handleTogglePauseResume}
            disabled={isCompleted}
          >
            {isPaused ? (
              <Play className="w-6 h-6 ml-1" />
            ) : (
              <Pause className="w-6 h-6" />
            )}
          </Button>
        </motion.div>

        {/* Pause message */}
        <AnimatePresence>
          {isPaused && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-sm text-muted-foreground text-center max-w-xs"
            >
              Take your time. Your progress will wait for you.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Exit confirmation overlay */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-8 rounded-3xl shadow-lg max-w-xs text-center"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">
                End session early?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                That's okay. Progress still counts.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowExitConfirm(false)}
                >
                  Continue
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={onEndEarly}
                >
                  End Session
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
