import { motion, AnimatePresence } from 'framer-motion';
import { CloudMoon, Check, Bell } from 'lucide-react';
import { useState } from 'react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { WheelTimePicker, TimePickerTrigger } from '@/components/ui/WheelTimePicker';
import { SleepEntry } from '@/types/sleep';

interface NightAnxietySectionProps {
  entry?: SleepEntry;
  onSave: (text: string, remindTomorrow: boolean, reminderTime?: string) => void;
}

export function NightAnxietySection({ entry, onSave }: NightAnxietySectionProps) {
  const [text, setText] = useState(entry?.nightDumpText || '');
  const [remind, setRemind] = useState(entry?.remindTomorrow ?? true);
  const [reminderTime, setReminderTime] = useState(entry?.reminderTime || '09:00');
  const [saved, setSaved] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave(text, remind, remind ? reminderTime : undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const hasSavedContent = entry?.nightDumpText && entry.nightDumpText === text;

  return (
    <SleepCard delay={0.3}>
      <SleepCardHeader 
        icon={<CloudMoon className="w-5 h-5" />}
        title="Park Tomorrow"
        subtitle="If something is on your mind, leave it here for the night"
      />

      <AnimatePresence mode="wait">
        {saved || hasSavedContent ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="text-center py-8"
          >
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-4"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 hsl(var(--primary) / 0)',
                  '0 0 0 15px hsl(var(--primary) / 0.1)',
                  '0 0 0 0 hsl(var(--primary) / 0)',
                ],
              }}
              transition={{ duration: 2.5, repeat: saved ? 1 : 0 }}
            >
              <Check className="w-7 h-7 text-primary" />
            </motion.div>
            <p className="text-foreground font-medium">It's safe here. You can rest.</p>
            {remind && (
              <p className="text-muted-foreground text-sm mt-2 flex items-center justify-center gap-1">
                <Bell className="w-3 h-3" />
                Reminder set for {reminderTime}
              </p>
            )}
            
            <Button
              variant="ghost"
              onClick={() => setSaved(false)}
              className="mt-4 text-muted-foreground hover:text-foreground"
            >
              Edit
            </Button>
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
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind? Write it here and let it go for the night..."
              className="min-h-[100px] bg-secondary/80 border-border/40 text-foreground placeholder:text-muted-foreground/60 resize-none"
            />

            <div className="flex items-center gap-3">
              <Checkbox
                id="remind"
                checked={remind}
                onCheckedChange={(checked) => setRemind(checked === true)}
                className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label htmlFor="remind" className="text-muted-foreground text-sm cursor-pointer">
                Remind me tomorrow
              </label>
            </div>

            <AnimatePresence>
              {remind && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-2 pl-6"
                >
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <TimePickerTrigger
                    value={reminderTime}
                    onClick={() => setShowTimePicker(true)}
                  />
                  <WheelTimePicker
                    open={showTimePicker}
                    onOpenChange={setShowTimePicker}
                    value={reminderTime}
                    onChange={setReminderTime}
                    title="Reminder Time"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleSave}
              disabled={!text.trim()}
              className="w-full bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20 disabled:opacity-30"
            >
              <CloudMoon className="w-4 h-4 mr-2" />
              Save & let it go
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </SleepCard>
  );
}