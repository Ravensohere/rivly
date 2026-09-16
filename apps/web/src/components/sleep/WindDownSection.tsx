import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sparkles, Clock, Check } from 'lucide-react';
import { useState } from 'react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { WheelTimePicker, TimePickerTrigger } from '@/components/ui/WheelTimePicker';
import { SleepEntry, SleepPreferences } from '@/types/sleep';

interface WindDownSectionProps {
  entry?: SleepEntry;
  prefs: SleepPreferences;
  isActive: boolean;
  onStartWindDown: () => void;
  onCompleteWindDown: (ritual: SleepEntry['ritual']) => void;
  onUpdatePrefs: (updates: Partial<SleepPreferences>) => void;
}

export function WindDownSection({
  entry,
  prefs,
  isActive,
  onStartWindDown,
  onCompleteWindDown,
  onUpdatePrefs,
}: WindDownSectionProps) {
  const [ritual, setRitual] = useState({
    didWell: entry?.ritual?.didWell || '',
    handleTomorrow: entry?.ritual?.handleTomorrow || '',
    gratefulFor: entry?.ritual?.gratefulFor || '',
  });
  const [showComplete, setShowComplete] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleComplete = () => {
    onCompleteWindDown(ritual);
    setShowComplete(true);
  };

  const isCompleted = entry?.windDownCompleted;

  return (
    <SleepCard delay={0.1}>
      <SleepCardHeader 
        icon={<Moon className="w-5 h-5" />}
        title="Wind Down"
        subtitle={isCompleted ? "Day closed" : isActive ? "Ritual in progress" : "Prepare for rest"}
      />

      <AnimatePresence mode="wait">
        {/* Completed state - Day Closure Seal */}
        {isCompleted && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            className="text-center py-8"
          >
            {/* Moon-like completion seal */}
            <motion.div
              className="relative inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 bg-secondary"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 0 0 hsl(var(--primary) / 0)',
                    '0 0 0 12px hsl(var(--primary) / 0.1)',
                    '0 0 0 24px hsl(var(--primary) / 0)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
              />
              
              {/* Inner moon circle */}
              <motion.div
                className="w-14 h-14 rounded-full flex items-center justify-center bg-primary"
                animate={{
                  boxShadow: [
                    '0 0 20px 5px hsl(var(--primary) / 0.2)',
                    '0 0 30px 10px hsl(var(--primary) / 0.3)',
                    '0 0 20px 5px hsl(var(--primary) / 0.2)',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Check className="w-7 h-7 text-primary-foreground" />
              </motion.div>
            </motion.div>
            
            <motion.p 
              className="text-foreground font-semibold text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Day closed. You can rest now.
            </motion.p>
            <motion.p 
              className="text-muted-foreground text-sm mt-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Sweet dreams
            </motion.p>
          </motion.div>
        )}

        {/* Active wind-down ritual */}
        {isActive && !isCompleted && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-2xl bg-secondary border border-border/30">
              <p className="text-primary text-sm mb-3 flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4" />
                Wind-Down Ritual
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-muted-foreground text-xs mb-1.5 block font-medium">One thing you did well today</label>
                  <Input
                    value={ritual.didWell}
                    onChange={(e) => setRitual(prev => ({ ...prev, didWell: e.target.value }))}
                    placeholder="I accomplished..."
                    className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
                
                <div>
                  <label className="text-muted-foreground text-xs mb-1.5 block font-medium">One thing you'll handle tomorrow</label>
                  <Input
                    value={ritual.handleTomorrow}
                    onChange={(e) => setRitual(prev => ({ ...prev, handleTomorrow: e.target.value }))}
                    placeholder="Tomorrow I'll..."
                    className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
                
                <div>
                  <label className="text-muted-foreground text-xs mb-1.5 block font-medium">One thing you're grateful for (optional)</label>
                  <Input
                    value={ritual.gratefulFor}
                    onChange={(e) => setRitual(prev => ({ ...prev, gratefulFor: e.target.value }))}
                    placeholder="I'm thankful for..."
                    className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleComplete}
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              Close the day
            </Button>
          </motion.div>
        )}

        {/* Inactive state */}
        {!isActive && !isCompleted && (
          <motion.div
            key="inactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <Button
              onClick={onStartWindDown}
              className="w-full h-12 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20"
              variant="outline"
            >
              <Moon className="w-4 h-4 mr-2" />
              Start Wind-Down
            </Button>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary border border-border/30">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground text-sm">Suggest at {prefs.windDownTime}</span>
              </div>
              <Switch
                checked={prefs.windDownScheduleEnabled}
                onCheckedChange={(checked) => onUpdatePrefs({ windDownScheduleEnabled: checked })}
              />
            </div>
            
            {prefs.windDownScheduleEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4 }}
                className="pl-6"
              >
                <TimePickerTrigger
                  value={prefs.windDownTime}
                  onClick={() => setShowTimePicker(true)}
                />
                <WheelTimePicker
                  open={showTimePicker}
                  onOpenChange={setShowTimePicker}
                  value={prefs.windDownTime}
                  onChange={(value) => onUpdatePrefs({ windDownTime: value })}
                  title="Wind Down Time"
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </SleepCard>
  );
}