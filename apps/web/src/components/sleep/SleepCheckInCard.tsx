// Sleep Check-in Card - Log sleep quality

import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { getLocalDateKey } from '@/lib/dateUtils';

type SleepQuality = 'good' | 'okay' | 'poor';

const QUALITY_OPTIONS: { id: SleepQuality; label: string; emoji: string; color: string }[] = [
  { id: 'good', label: 'Good', emoji: '😊', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
  { id: 'okay', label: 'Okay', emoji: '😐', color: 'bg-amber-100 border-amber-300 text-amber-700' },
  { id: 'poor', label: 'Poor', emoji: '😔', color: 'bg-rose-100 border-rose-300 text-rose-700' },
];

export function SleepCheckInCard() {
  const { todaySleepEvent, recordSleepRating } = useEventsLedgerContext();
  const [selectedQuality, setSelectedQuality] = useState<SleepQuality | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  
  const hasRecordedToday = !!todaySleepEvent;
  
  const handleSave = async () => {
    if (!selectedQuality) return;
    
    setSaving(true);
    try {
      const today = getLocalDateKey();
      await recordSleepRating(today, selectedQuality);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save sleep rating:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <SleepCard delay={0.2}>
      <SleepCardHeader 
        icon={<Moon className="w-5 h-5" />}
        title="Sleep Check-in"
        subtitle={hasRecordedToday ? "Recorded today" : "How did you sleep?"}
      />
      
      <AnimatePresence mode="wait">
        {hasRecordedToday || justSaved ? (
          <motion.div
            key="recorded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 mb-2">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <p className="text-foreground font-medium">Recorded for today</p>
            <p className="text-muted-foreground text-sm mt-1">
              {todaySleepEvent?.rating === 'good' && 'Great to hear! 🌟'}
              {todaySleepEvent?.rating === 'okay' && 'Tomorrow will be better 💪'}
              {todaySleepEvent?.rating === 'poor' && 'Take it easy today 🌸'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Quality Options */}
            <div className="flex gap-2">
              {QUALITY_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedQuality(opt.id)}
                  className={`
                    flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all duration-300 border-2
                    ${selectedQuality === opt.id 
                      ? opt.color
                      : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'}
                  `}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </motion.button>
              ))}
            </div>
            
            {/* Notes (optional) */}
            {selectedQuality && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes? (optional)"
                  className="bg-secondary border-border resize-none min-h-[80px]"
                />
                
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </SleepCard>
  );
}
