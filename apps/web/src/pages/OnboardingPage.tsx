/**
 * OnboardingPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * First Win Onboarding Flow - Gets users to their first win in < 3 minutes.
 * 
 * Flow (4 steps, no skipping):
 * 1. Set intention → Creates a task for today
 * 2. First focus session → 5-minute countdown timer
 * 3. Watch landscape grow → See seed planted animation
 * 4. Welcome message → Social proof + enter app
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTasks } from '@/hooks/useTasks';
import { useOnboarding } from '@/hooks/useOnboarding';
import { getLocalDateKey } from '@/lib/dateUtils';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Users,
  CheckCircle2,
  Target,
  Timer,
  Sprout,
  ArrowRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type OnboardingStep = 0 | 1 | 2 | 3;

interface OnboardingState {
  intention: string;
  timerSeconds: number;
  timerRunning: boolean;
  timerComplete: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const FOCUS_DURATION_SECONDS = 5 * 60; // 5 minutes for first win

const STEP_TITLES = [
  "What's your one intention for today?",
  "Let's start your first session",
  "Watch your landscape grow",
  "Welcome to Vivly",
];

// ── Components ────────────────────────────────────────────────────────────────

/**
 * Progress indicator with dots
 */
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{
            scale: i === current ? 1.2 : 1,
            opacity: i === current ? 1 : 0.3,
            width: i === current ? 32 : 8,
          }}
          transition={{ duration: 0.3 }}
          className={`h-2 rounded-full ${
            i === current ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Step 1: Intention Setting
 */
function Step1Intention({
  intention,
  setIntention,
  onNext,
}: {
  intention: string;
  setIntention: (value: string) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intention.trim().length > 0) {
      onNext();
    }
  };

  const handleSkip = () => {
    if (intention.trim().length > 0) {
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto px-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
      >
        <Target className="w-8 h-8 text-primary" />
      </motion.div>

      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
        {STEP_TITLES[0]}
      </h2>

      <p className="text-muted-foreground text-center mb-8">
        This becomes your first task. Keep it simple and achievable.
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="e.g., Finish the presentation, Study for 2 hours..."
            className="text-lg py-6 px-4 rounded-xl border-2 focus:border-primary transition-colors"
            autoComplete="off"
          />
        </div>

        <Button
          type="submit"
          disabled={intention.trim().length === 0}
          className="w-full h-14 text-lg rounded-xl font-semibold"
        >
          Start
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </form>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Takes about 30 seconds
      </p>
    </motion.div>
  );
}

/**
 * Step 2: First Focus Timer (5 minutes)
 */
function Step2Timer({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [seconds, setSeconds] = useState(FOCUS_DURATION_SECONDS);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((FOCUS_DURATION_SECONDS - seconds) / FOCUS_DURATION_SECONDS) * 100;

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (seconds === 0) {
      // Timer complete
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running, seconds]);

  const handleStart = () => {
    setStarted(true);
    setRunning(true);
  };

  const handlePause = () => {
    setRunning(false);
  };

  const handleReset = () => {
    setSeconds(FOCUS_DURATION_SECONDS);
    setRunning(false);
    setStarted(false);
  };

  const handleComplete = () => {
    onComplete();
  };

  // Auto-complete when timer reaches 0
  useEffect(() => {
    if (seconds === 0 && started) {
      handleComplete();
    }
  }, [seconds, started]);

  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto px-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
        >
          <Timer className="w-8 h-8 text-primary" />
        </motion.div>

        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
          {STEP_TITLES[1]}
        </h2>

        <p className="text-muted-foreground text-center mb-8">
          Even 2 minutes counts. Let's build momentum together.
        </p>

        <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 relative">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={553}
              strokeDashoffset={553 - (553 * progress) / 100}
              className="text-primary"
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center z-10">
            <div className="text-4xl font-bold font-mono">{formatTime(seconds)}</div>
            <div className="text-sm text-muted-foreground mt-1">5 min focus</div>
          </div>
        </div>

        <Button
          onClick={handleStart}
          className="w-full h-14 text-lg rounded-xl font-semibold"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Focus
        </Button>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Takes about 90 seconds (we'll speed it up for demo)
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto px-4"
    >
      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 relative">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="88"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          <motion.circle
            cx="96"
            cy="96"
            r="88"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={553}
            strokeDashoffset={553 - (553 * progress) / 100}
            className="text-primary"
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center z-10">
          <div className="text-4xl font-bold font-mono">{formatTime(seconds)}</div>
          <div className="text-sm text-muted-foreground mt-1">Keep going!</div>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex-1 h-12 rounded-xl"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        {running ? (
          <Button
            variant="outline"
            onClick={handlePause}
            className="flex-1 h-12 rounded-xl"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button
            onClick={() => setRunning(true)}
            className="flex-1 h-12 rounded-xl"
          >
            <Play className="w-4 h-4 mr-2" />
            Resume
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Step 3: Landscape Growth Preview
 */
function Step3Landscape({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [seedPlanted, setSeedPlanted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSeedPlanted(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [seedPlanted, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto px-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6"
      >
        <Sprout className="w-8 h-8 text-emerald-500" />
      </motion.div>

      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
        {STEP_TITLES[2]}
      </h2>

      <p className="text-muted-foreground text-center mb-8">
        Your focus plants seeds in your landscape. Every session grows it.
      </p>

      {/* Simplified Landscape Preview */}
      <div className="w-full aspect-video rounded-2xl bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-800 dark:to-emerald-900/20 overflow-hidden relative mb-6">
        {/* Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-200/50 to-transparent dark:from-slate-700/30" />

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-emerald-200 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/20" />

        {/* Seed Animation */}
        <AnimatePresence>
          {seedPlanted && (
            <motion.div
              initial={{ scale: 0, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                damping: 12,
                stiffness: 100,
                delay: 0.3,
              }}
              className="absolute bottom-1/3 left-1/2 -translate-x-1/2"
            >
              {/* Seedling */}
              <motion.svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {/* Stem */}
                <motion.path
                  d="M24 40 Q24 30 24 20"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                />
                {/* Left leaf */}
                <motion.ellipse
                  cx="18"
                  cy="28"
                  rx="8"
                  ry="5"
                  fill="#10B981"
                  opacity="0.8"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: -30 }}
                  transition={{ delay: 1, duration: 0.5 }}
                />
                {/* Right leaf */}
                <motion.ellipse
                  cx="30"
                  cy="24"
                  rx="8"
                  ry="5"
                  fill="#10B981"
                  opacity="0.8"
                  initial={{ scale: 0, rotate: 30 }}
                  animate={{ scale: 1, rotate: 30 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sparkles */}
        {seedPlanted && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: -20 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="absolute bottom-1/2 left-1/3"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </motion.div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: -30 }}
              transition={{ delay: 1.8, duration: 0.5 }}
              className="absolute bottom-2/3 left-1/2"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
            </motion.div>
          </>
        )}
      </div>

      {/* Auto-continue indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <span>Continuing in</span>
        <motion.span
          key={Date.now()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono"
        >
          3...
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

/**
 * Step 4: Welcome Message with Social Proof
 */
function Step4Welcome({
  intention,
  onComplete,
}: {
  intention: string;
  onComplete: () => void;
}) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto px-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-8 h-8 text-primary" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl sm:text-3xl font-bold text-center mb-3"
      >
        {STEP_TITLES[3]}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground text-center mb-8"
      >
        You just completed your first Vivly session.
      </motion.p>

      {/* Intention Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full bg-card border border-border rounded-2xl p-4 mb-6"
      >
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground mb-1">Today's intention</p>
            <p className="font-medium">{intention || 'Build momentum'}</p>
          </div>
        </div>
      </motion.div>

      {/* Social Proof */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
      >
        <div className="flex -space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium"
            >
              {['A', 'B', 'C', 'D'][i - 1]}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>12,400 others focused today too</span>
        </div>
      </motion.div>

      {/* CTA Button */}
      <AnimatePresence>
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
          >
            <Button
              onClick={onComplete}
              className="w-full h-14 text-lg rounded-xl font-semibold"
            >
              Explore Vivly
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Your journey begins now 🌱
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { completeOnboarding, setOnboardingCompleted } = useOnboarding();
  const { addTask } = useTasks();

  const [step, setStep] = useState<OnboardingStep>(0);
  const [intention, setIntention] = useState('');

  // Create task from intention when moving to step 2
  const handleStep1Complete = useCallback(async () => {
    if (intention.trim().length > 0) {
      try {
        await addTask({
          title: intention.trim(),
          status: 'todo',
          tag: 'personal',
          dateKey: getLocalDateKey(),
        });
      } catch (error) {
        console.error('Failed to create intention task:', error);
      }
    }
    setStep(1);
  }, [intention, addTask]);

  // Handle timer completion
  const handleStep2Complete = useCallback(() => {
    setStep(2);
  }, []);

  // Handle landscape auto-complete
  const handleStep3Complete = useCallback(() => {
    setStep(3);
  }, []);

  // Complete onboarding and navigate to planner
  const handleComplete = useCallback(() => {
    setOnboardingCompleted(true);
    completeOnboarding();
    navigate('/planner');
  }, [setOnboardingCompleted, completeOnboarding, navigate]);

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Step1Intention
            intention={intention}
            setIntention={setIntention}
            onNext={handleStep1Complete}
          />
        );
      case 1:
        return (
          <Step2Timer
            onComplete={handleStep2Complete}
          />
        );
      case 2:
        return (
          <Step3Landscape
            onComplete={handleStep3Complete}
          />
        );
      case 3:
        return (
          <Step4Welcome
            intention={intention}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PageTransition className="page-container bg-background">
      <div className="content-wrapper pt-8 pb-8 min-h-screen flex flex-col">
        {/* Progress Indicator */}
        <div className="flex justify-center mb-4">
          <ProgressDots current={step} total={TOTAL_STEPS} />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="flex-1 flex flex-col"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Skip hint (only on step 1) */}
        {step === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs text-muted-foreground text-center pb-4"
          >
            This helps us personalize your experience
          </motion.p>
        )}
      </div>
    </PageTransition>
  );
}
