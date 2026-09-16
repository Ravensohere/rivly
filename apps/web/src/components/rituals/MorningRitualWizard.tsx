import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMorningRitual } from '@/hooks/useMorningRitual';
import { Moon, Zap, Calendar } from 'lucide-react';

interface MorningRitualWizardProps {
  open: boolean;
  onComplete: () => void;
}

const SLEEP_LABELS: Record<number, string> = {
  1: 'Restless',
  2: 'Okay',
  3: 'Good',
  4: 'Very good',
  5: 'Great',
};

export function MorningRitualWizard({ open, onComplete }: MorningRitualWizardProps) {
  const { completeMorningRitual } = useMorningRitual();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(5);

  const handleFinish = () => {
    completeMorningRitual(sleepQuality, energyLevel);
    setStep(1);
    setSleepQuality(3);
    setEnergyLevel(5);
    onComplete();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/95 backdrop-blur-sm"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
      }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Good morning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start your day in rhythm
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Moon className="w-5 h-5" />
                <span className="text-sm font-medium">How did you sleep?</span>
              </div>
              <div className="px-2">
                <Slider
                  value={[sleepQuality]}
                  onValueChange={([v]) => setSleepQuality(v)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {SLEEP_LABELS[sleepQuality]}
                </p>
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>
                Next
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-5 h-5" />
                <span className="text-sm font-medium">How is your energy? (1–10)</span>
              </div>
              <div className="px-2">
                <Slider
                  value={[energyLevel]}
                  onValueChange={([v]) => setEnergyLevel(v)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {energyLevel} / 10
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Review your plan</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You’re set. Head to your day and see your plan — Balanced, Light, or Survival.
              </p>
              <Button className="w-full" onClick={handleFinish}>
                Start my day
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
