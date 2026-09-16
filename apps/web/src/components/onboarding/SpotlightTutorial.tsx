/**
 * SpotlightTutorial - 12-step guided walkthrough
 *
 * IMPORTANT:
 * - Does NOT change theme.
 * - Overlay is a neutral backdrop and the tooltip uses the app theme tokens.
 * - Cleans up listeners on close.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Shuffle,
  Sparkles,
  Heart,
  Brain,
  Plus,
  CheckSquare,
  Focus,
  BookHeart,
  Moon,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route?: string;
  position: 'top' | 'center' | 'bottom';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'date-scroller',
    title: 'Date Scroller',
    description: 'This is your timeline.\nEverything you do is saved by date.',
    icon: <Calendar className="w-5 h-5" />,
    route: '/app',
    position: 'top',
  },
  {
    id: 'view-toggle',
    title: 'Flow vs Plan',
    description: 'Flow is flexible. Plan is structured.\nChoose what fits today.',
    icon: <Shuffle className="w-5 h-5" />,
    route: '/app',
    position: 'top',
  },
  {
    id: 'orb',
    title: 'The Orb',
    description: 'This orb reflects your day.\nIt changes with your mood, sleep, focus, and tasks.',
    icon: <Sparkles className="w-5 h-5" />,
    route: '/app',
    position: 'center',
  },
  {
    id: 'overwhelmed',
    title: "I'm Overwhelmed",
    description: 'When things feel heavy, tap here to slow down.',
    icon: <Heart className="w-5 h-5" />,
    route: '/app',
    position: 'center',
  },
  {
    id: 'park-thought',
    title: 'Park a Thought',
    description: "Write something down so it doesn't stay in your head.",
    icon: <Brain className="w-5 h-5" />,
    route: '/app',
    position: 'center',
  },
  {
    id: 'add-button',
    title: 'Add Button',
    description: 'Add tasks, reminders, or write in your journal.',
    icon: <Plus className="w-5 h-5" />,
    route: '/app',
    position: 'bottom',
  },
  {
    id: 'task-block',
    title: 'Tasks & Time Blocks',
    description: 'Tap any task to edit or mark it complete.',
    icon: <CheckSquare className="w-5 h-5" />,
    route: '/app',
    position: 'center',
  },
  {
    id: 'focus-tab',
    title: 'Focus Tab',
    description: 'Focus without distractions.\nTime here improves your rhythm.',
    icon: <Focus className="w-5 h-5" />,
    route: '/focus',
    position: 'center',
  },
  {
    id: 'reflect-tab',
    title: 'Reflect Tab',
    description: 'Close your day.\nTrack mood, wins, and patterns.',
    icon: <BookHeart className="w-5 h-5" />,
    route: '/reflect',
    position: 'center',
  },
  {
    id: 'journal',
    title: 'Journal',
    description: 'Write freely, anytime.\nThis is your private space.',
    icon: <BookHeart className="w-5 h-5" />,
    route: '/reflect',
    position: 'center',
  },
  {
    id: 'sleep-tab',
    title: 'Sleep Tab',
    description: 'Wind down with sounds, timers, and gentle reminders.',
    icon: <Moon className="w-5 h-5" />,
    route: '/sleep',
    position: 'center',
  },
  {
    id: 'insights-tab',
    title: 'Insights Tab',
    description: 'See patterns over time.\nNo judgment — just awareness.',
    icon: <BarChart3 className="w-5 h-5" />,
    route: '/insights',
    position: 'center',
  },
];

interface SpotlightTutorialProps {
  open: boolean;
  onComplete: () => void;
}

export function SpotlightTutorial({ open, onComplete }: SpotlightTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  // Navigate to the correct route for each step
  useEffect(() => {
    if (open && step?.route) {
      navigate(step.route);
    }
  }, [open, currentStep, navigate]); // Changed dependency to currentStep instead of step?.route

  const finish = useCallback(() => {
    setIsExiting(true);
    navigate('/app');
    setTimeout(() => {
      onComplete();
      setIsExiting(false);
      setCurrentStep(0);
    }, 250);
  }, [navigate, onComplete]);

  const handleNext = useCallback(() => {
    if (isLastStep) finish();
    else setCurrentStep((p) => p + 1);
  }, [isLastStep, finish]);

  const handleSkip = useCallback(() => {
    finish();
  }, [finish]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  }, [currentStep]);

  // Keyboard navigation (cleaned up on close)
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        e.preventDefault();
        handleBack();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleNext, handleBack, handleSkip, currentStep]);

  if (!open) return null;

  const getTooltipPosition = () => {
    switch (step.position) {
      case 'top':
        return 'top-[18%]';
      case 'bottom':
        return 'bottom-[25%]';
      default:
        return 'top-1/2 -translate-y-1/2';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[90]"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* Very light dim layer so UI is clearly visible */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'hsl(0 0% 0% / 0.15)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        />

        {/* Skip button (theme-aligned) */}
        <motion.button
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25 }}
          onClick={handleSkip}
          className="absolute top-6 right-6 z-[100] text-sm font-medium px-4 py-2 rounded-full border border-border/40 bg-card/70 text-foreground/70 hover:text-foreground backdrop-blur-sm transition-colors"
        >
          Skip tour
        </motion.button>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.25 }}
          className="absolute top-6 left-6 right-24 z-[100]"
        >
          <div className="h-1 rounded-full bg-border/40 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} of {TUTORIAL_STEPS.length}
            </span>
            {step?.route && (
              <span className="text-xs text-primary font-medium">
                {step.route === '/app' ? 'Day Planner' : step.route.replace('/', '').charAt(0).toUpperCase() + step.route.slice(2)}
              </span>
            )}
          </div>
        </motion.div>

        {/* Content card */}
        <motion.div className={`absolute left-4 right-4 ${getTooltipPosition()} z-[100]`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-sm mx-auto"
            >
              <div
                className="p-6 rounded-3xl bg-card/95 border border-border/40 backdrop-blur-xl"
                style={{ boxShadow: 'var(--shadow-soft)' }}
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <div className="text-primary">{step.icon}</div>
                </div>

                <h3 className="text-lg font-semibold text-foreground text-center mb-2">
                  {step.title}
                </h3>

                <p className="text-muted-foreground text-sm text-center leading-relaxed whitespace-pre-line mb-6">
                  {step.description}
                </p>

                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <Button variant="outline" onClick={handleBack} className="flex-1 h-11 rounded-xl">
                      Back
                    </Button>
                  )}
                  <Button onClick={handleNext} className="flex-1 h-11 rounded-xl">
                    {isLastStep ? "Let's start" : 'Next'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-1.5 mt-4">
                {TUTORIAL_STEPS.map((_, idx) => (
                  <motion.div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full ${
                      idx === currentStep ? 'bg-primary' : 'bg-border/60'
                    }`}
                    animate={idx === currentStep ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    transition={{ duration: 1.4, repeat: idx === currentStep ? Infinity : 0 }}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="absolute bottom-8 left-0 right-0 text-center text-muted-foreground text-xs"
        >
          Use arrow keys or tap Next to continue
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

// Backwards compatibility alias
export { SpotlightTutorial as TutorialOverlay };
