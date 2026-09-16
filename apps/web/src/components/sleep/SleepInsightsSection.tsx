import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Moon, CloudMoon, Waves, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Button } from '@/components/ui/button';
import { SleepQuality, SleepHelper, SleepEntry } from '@/types/sleep';

interface SleepInsightsSectionProps {
  entry?: SleepEntry;
  insights: {
    windDownCount: number;
    parkedCount: number;
    totalEntries: number;
    goodSleepWithParking: number;
    qualityCount: number;
  };
  onSetQuality: (quality: SleepQuality, helper?: SleepHelper) => void;
}

const QUALITY_OPTIONS: { id: SleepQuality; label: string; emoji: string }[] = [
  { id: 'poor', label: 'Poor', emoji: '😔' },
  { id: 'okay', label: 'Okay', emoji: '😐' },
  { id: 'good', label: 'Good', emoji: '😊' },
];

const HELPER_OPTIONS: { id: SleepHelper; label: string; icon: React.ElementType }[] = [
  { id: 'sounds', label: 'Sounds', icon: Waves },
  { id: 'winddown', label: 'Wind-down', icon: Moon },
  { id: 'parking', label: 'Parking thoughts', icon: CloudMoon },
  { id: 'early', label: 'Early bedtime', icon: Moon },
  { id: 'unsure', label: 'Not sure', icon: Sparkles },
];

export function SleepInsightsSection({ entry, insights, onSetQuality }: SleepInsightsSectionProps) {
  const [selectedQuality, setSelectedQuality] = useState<SleepQuality | null>(entry?.sleepQuality || null);
  const [selectedHelper, setSelectedHelper] = useState<SleepHelper | null>(entry?.sleepHelper || null);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (selectedQuality) {
      onSetQuality(selectedQuality, selectedHelper || undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const hasRecordedToday = entry?.sleepQuality !== undefined;

  return (
    <SleepCard delay={0.6}>
      <SleepCardHeader 
        icon={<BarChart3 className="w-5 h-5" />}
        title="Sleep Check-in"
        subtitle="Track what helps you rest"
      />

      <AnimatePresence mode="wait">
        {saved || hasRecordedToday ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center py-4 mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 mb-2">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <p className="text-foreground text-sm font-medium">Recorded for today</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div>
              <p className="text-muted-foreground text-sm mb-3">How did you sleep?</p>
              <div className="flex gap-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedQuality(opt.id)}
                    className={`
                      flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-300 border
                      ${selectedQuality === opt.id 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-secondary border-border text-foreground hover:bg-secondary/80'}
                    `}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {selectedQuality && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-muted-foreground text-sm mb-3">What helped most?</p>
                <div className="flex flex-wrap gap-2">
                  {HELPER_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <motion.button
                        key={opt.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedHelper(opt.id)}
                        className={`
                          flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all duration-300 border
                          ${selectedHelper === opt.id 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'}
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="font-medium">{opt.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {selectedQuality && (
              <Button
                onClick={handleSave}
                className="w-full mt-2"
              >
                Save
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights */}
      {insights.totalEntries > 0 && (
        <div className="mt-6 pt-5 border-t border-border/50 space-y-3">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">This week</p>
          
          <div className="space-y-2">
            {insights.windDownCount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-secondary"
              >
                <Moon className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground text-sm">
                  You used wind-down <span className="text-foreground font-medium">{insights.windDownCount}</span> {insights.windDownCount === 1 ? 'night' : 'nights'} this week
                </span>
              </motion.div>
            )}
            
            {insights.parkedCount > 0 && insights.goodSleepWithParking > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-secondary"
              >
                <CloudMoon className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground text-sm">
                  On nights you parked thoughts, sleep felt better
                </span>
              </motion.div>
            )}
            
            {insights.totalEntries === 0 && (
              <p className="text-muted-foreground text-sm text-center py-2">
                Start tracking to see insights
              </p>
            )}
          </div>
        </div>
      )}
    </SleepCard>
  );
}