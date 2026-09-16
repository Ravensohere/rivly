import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, PenLine, CalendarClock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TimerMode } from '@/services/BackgroundTimer';

interface TimerCompletionCelebrationProps {
  isOpen: boolean;
  mode: TimerMode;
  label?: string;
  durationMinutes?: number;
  onClose: () => void;
  onMarkTaskDone?: () => void;
  onAddNote?: (note: string) => void;
  onScheduleNext?: () => void;
  // Legacy props kept for compatibility
  onLogReflection?: () => void;
  onStartBreak?: (durationMinutes: number) => void;
  onStartNext?: () => void;
}

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1,
    size: 4 + Math.random() * 8,
    color: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(250 70% 70%)', 'hsl(170 70% 60%)'][Math.floor(Math.random() * 4)],
  }));
}

export function TimerCompletionCelebration({
  isOpen,
  mode,
  label,
  durationMinutes = 25,
  onClose,
  onMarkTaskDone,
  onAddNote,
  onScheduleNext,
  onLogReflection,
  onStartNext,
}: TimerCompletionCelebrationProps) {
  const [particles] = useState(() => generateParticles(35));
  const [showCTAs, setShowCTAs] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const hasPlayedEffects = useRef(false);

  useEffect(() => {
    if (isOpen && !hasPlayedEffects.current) {
      hasPlayedEffects.current = true;
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, audioContext.currentTime + startTime);
          gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
          osc.start(audioContext.currentTime + startTime);
          osc.stop(audioContext.currentTime + startTime + duration);
        };
        playNote(523.25, 0, 0.4);
        playNote(659.25, 0.15, 0.5);
        playNote(783.99, 0.3, 0.6);
      } catch {}
      setTimeout(() => setShowCTAs(true), 1800);
    }
    if (!isOpen) {
      hasPlayedEffects.current = false;
      setShowCTAs(false);
      setShowNoteInput(false);
      setNote('');
    }
  }, [isOpen]);

  const getDurationLabel = () => {
    if (durationMinutes < 60) return `${durationMinutes}m`;
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  };

  const getModeLabel = () => label?.toLowerCase() || (mode === 'focus' ? 'focused work' : 'rest');

  const handleSaveNote = () => {
    if (note.trim()) onAddNote?.(note.trim());
    setShowNoteInput(false);
    setNote('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{
            background: 'hsl(var(--background))',
            backgroundImage: 'radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Close button */}
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted"
            style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(p => (
              <motion.div key={p.id} className="absolute rounded-full"
                style={{ left: `${p.x}%`, top: '-20px', width: p.size, height: p.size, background: p.color }}
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: 900, opacity: [1, 1, 0], rotate: 360 }}
                transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
              />
            ))}
          </div>

          {/* Orb */}
          <motion.div className="relative" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
            {[1, 2, 3].map(ring => (
              <motion.div key={ring} className="absolute inset-0 rounded-full border-2 border-primary/30"
                initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 2 + ring * 0.5, opacity: 0 }}
                transition={{ duration: 1.5, delay: ring * 0.2 }} style={{ margin: -40 * ring }}
              />
            ))}
            <motion.div className="w-40 h-40 rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.7) 0%, hsl(var(--primary) / 0.3) 100%)', boxShadow: '0 0 60px 20px hsl(var(--primary) / 0.3)' }}
              animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-16 h-16 text-primary-foreground" />
            </motion.div>
          </motion.div>

          {/* Message */}
          <motion.div className="mt-9 text-center z-10 px-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <h2 className="text-3xl font-bold text-foreground mb-1">Session complete!</h2>
            <p className="text-muted-foreground">{getDurationLabel()} of {getModeLabel()} · auto-logged</p>
          </motion.div>

          {/* Operational CTAs */}
          <AnimatePresence mode="wait">
            {showCTAs && mode === 'focus' && !showNoteInput && (
              <motion.div key="ctас" className="mt-9 flex flex-col gap-3 w-full max-w-xs px-6 z-10"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              >
                {/* Mark task done */}
                <Button 
                  size="lg" 
                  className="w-full h-14 rounded-full gap-3 shadow-xl text-lg font-semibold transition-all active:scale-[0.98]"
                  onClick={() => { onMarkTaskDone?.(); onLogReflection?.(); onClose(); }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark task done
                </Button>

                {/* Row: note + next block */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 h-12 rounded-full gap-2 text-sm" 
                    onClick={() => setShowNoteInput(true)}
                  >
                    <PenLine className="w-4 h-4" />
                    Add note
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 h-12 rounded-full gap-2 text-sm"
                    onClick={() => { onScheduleNext?.(); onStartNext?.(); onClose(); }}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Next block
                  </Button>
                </div>

                <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground" onClick={onClose}>
                  Dismiss
                </Button>
              </motion.div>
            )}

            {/* Inline note entry */}
            {showCTAs && showNoteInput && (
              <motion.div key="note" className="mt-9 w-full max-w-xs px-6 z-10 space-y-3"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <Textarea autoFocus placeholder="One line about this session..."
                  value={note} onChange={e => setNote(e.target.value)}
                  className="rounded-2xl resize-none bg-card/80 backdrop-blur" rows={2} maxLength={200}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNote(); } }}
                />
                <div className="flex gap-3">
                  <Button size="lg" className="flex-1" onClick={handleSaveNote} disabled={!note.trim()}>Save</Button>
                  <Button variant="outline" size="lg" className="flex-1" onClick={() => { setShowNoteInput(false); setNote(''); }}>Back</Button>
                </div>
              </motion.div>
            )}

            {/* Break/rest mode: simple dismiss */}
            {showCTAs && mode !== 'focus' && (
              <motion.div className="mt-9" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button variant="outline" size="lg" onClick={onClose}>Continue</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
