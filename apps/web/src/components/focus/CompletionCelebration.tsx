/**
 * Full-screen celebration overlay for timer completion
 * Features: confetti particles, orb pulse, haptic feedback,
 * + operational CTAs: Mark done / Add note / Schedule next
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, PenLine, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CompletionCelebrationProps {
  show: boolean;
  durationMinutes: number;
  purpose: string;
  onMarkTaskDone: () => void;
  onAddNote: (note: string) => void;
  onScheduleNext: () => void;
  onDismiss: () => void;
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

export function CompletionCelebration({
  show,
  durationMinutes,
  purpose,
  onMarkTaskDone,
  onAddNote,
  onScheduleNext,
  onDismiss,
}: CompletionCelebrationProps) {
  const [particles] = useState(() => generateParticles(30));
  const [showCTAs, setShowCTAs] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (show) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      try {
        audioRef.current = new Audio('/audio/completion-chime.mp3');
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      } catch { /* Audio not available */ }
      const timer = setTimeout(() => setShowCTAs(true), 1800);
      return () => clearTimeout(timer);
    } else {
      setShowCTAs(false);
      setShowNoteInput(false);
      setNote('');
    }
  }, [show]);

  const handleSaveNote = () => {
    if (note.trim()) onAddNote(note.trim());
    setShowNoteInput(false);
    setNote('');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 70%)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(p => (
              <motion.div key={p.id} className="absolute rounded-full"
                style={{ left: `${p.x}%`, top: '-20px', width: p.size, height: p.size, background: p.color }}
                initial={{ y: 0, opacity: 1, rotate: 0 }}
                animate={{ y: window.innerHeight + 50, opacity: [1, 1, 0], rotate: 360 * (Math.random() > 0.5 ? 1 : -1), x: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 150] }}
                transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
              />
            ))}
          </div>

          {/* Orb burst */}
          <motion.div className="relative" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
            {[1, 2, 3].map(ring => (
              <motion.div key={ring} className="absolute inset-0 rounded-full border-2 border-primary/30"
                initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 2 + ring * 0.5, opacity: 0 }}
                transition={{ duration: 1.5, delay: ring * 0.2, ease: 'easeOut' }} style={{ margin: -40 * ring }}
              />
            ))}
            <motion.div className="w-36 h-36 rounded-full relative"
              style={{ background: 'radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.6) 0%, hsl(var(--primary) / 0.3) 50%, hsl(var(--secondary) / 0.2) 100%)', boxShadow: '0 0 60px 20px hsl(var(--primary) / 0.3)' }}
              animate={{ scale: [1, 1.1, 1], boxShadow: ['0 0 60px 20px hsl(var(--primary) / 0.3)', '0 0 80px 30px hsl(var(--primary) / 0.4)', '0 0 60px 20px hsl(var(--primary) / 0.3)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.div className="absolute inset-0 flex items-center justify-center" initial={{ rotate: 0, scale: 0 }} animate={{ rotate: 360, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
                <Sparkles className="w-14 h-14 text-primary-foreground drop-shadow-lg" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Message */}
          <motion.div className="mt-8 text-center z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <motion.h2 className="text-3xl font-bold text-foreground mb-1" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              Session complete!
            </motion.h2>
            <p className="text-muted-foreground">
              {durationMinutes}m of {purpose.toLowerCase()} · auto-logged
            </p>
          </motion.div>

          {/* Operational CTAs */}
          <AnimatePresence>
            {showCTAs && !showNoteInput && (
              <motion.div
                className="mt-8 flex flex-col gap-3 w-full max-w-xs px-6 z-10"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              >
                {/* Primary: Mark task done */}
                <Button 
                  size="lg" 
                  className="w-full h-14 rounded-full gap-3 shadow-xl text-lg font-semibold transition-all active:scale-[0.98]" 
                  onClick={onMarkTaskDone}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark task done
                </Button>

                {/* Secondary row */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 h-12 rounded-full gap-2 text-sm" 
                    onClick={() => setShowNoteInput(true)}
                  >
                    <PenLine className="w-4 h-4" />
                    Add 1-line note
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 h-12 rounded-full gap-2 text-sm" 
                    onClick={onScheduleNext}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Next block
                  </Button>
                </div>

                <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground" onClick={onDismiss}>
                  Dismiss
                </Button>
              </motion.div>
            )}

            {/* Inline note input */}
            {showCTAs && showNoteInput && (
              <motion.div
                className="mt-8 w-full max-w-xs px-6 z-10 space-y-3"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              >
                <Textarea
                  autoFocus
                  placeholder="One line about this session..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="rounded-2xl resize-none bg-card/80 backdrop-blur"
                  rows={2}
                  maxLength={200}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNote(); } }}
                />
                <div className="flex gap-3">
                  <Button size="lg" className="flex-1" onClick={handleSaveNote} disabled={!note.trim()}>Save</Button>
                  <Button variant="outline" size="lg" className="flex-1" onClick={() => { setShowNoteInput(false); setNote(''); }}>Cancel</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
