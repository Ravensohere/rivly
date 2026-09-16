import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Zap, Moon, Target, Feather, Sparkles, Play, AlertCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DailyCheckIn } from '@/types';
import { formatDate } from '@/hooks/useLocalStorage';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { getLocalDateKey } from '@/lib/focusTotals';
import { useRivaLogic } from '@/hooks/useRivaLogic';
import { getGreeting as sharedGreeting, getTimeOfDay } from '@/lib/greeting';

interface DailyCheckInModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (checkIn: DailyCheckIn) => void;
}

// Mode derived from state
type DayMode = 'survival' | 'light' | 'balanced';

function getDayMode(mood: number, energy: number, sleep: number): DayMode {
  const score = mood + energy * 1.5 + sleep * 0.3;
  if (score <= 5) return 'survival';
  if (score <= 9) return 'light';
  return 'balanced';
}

function getModeColor(mode: DayMode): string {
  if (mode === 'survival') return 'text-rose-400';
  if (mode === 'light') return 'text-amber-400';
  return 'text-emerald-400';
}

function getModeLabel(mode: DayMode): string {
  if (mode === 'survival') return 'Survival day';
  if (mode === 'light') return 'Light day';
  return 'Balanced day';
}

interface PlanCard {
  type: 'needle' | 'maintenance' | 'recovery';
  label: string;
  duration: string;
  description: string;
  icon: React.ReactNode;
}

function getPlanCards(mode: DayMode): PlanCard[] {
  if (mode === 'survival') {
    return [
      { type: 'needle', label: 'One Must-Do', duration: '25–40 min', description: 'The single thing that moves the needle today', icon: <Target className="w-4 h-4" /> },
      { type: 'maintenance', label: 'Quick Check', duration: '10–15 min', description: 'Essential messages or admin only', icon: <Feather className="w-4 h-4" /> },
      { type: 'recovery', label: 'Recovery', duration: '5–10 min', description: 'Rest, walk, or breathe', icon: <Moon className="w-4 h-4" /> },
    ];
  }
  if (mode === 'light') {
    return [
      { type: 'needle', label: 'Needle-Mover', duration: '50–60 min', description: 'The one task that matters most today', icon: <Target className="w-4 h-4" /> },
      { type: 'maintenance', label: 'Maintenance', duration: '20–30 min', description: 'Routine work, emails, admin', icon: <Feather className="w-4 h-4" /> },
      { type: 'recovery', label: 'Recovery', duration: '5–10 min', description: 'A short break to recharge', icon: <Moon className="w-4 h-4" /> },
    ];
  }
  return [
    { type: 'needle', label: 'Needle-Mover', duration: '60–90 min', description: 'Your highest-impact work block', icon: <Target className="w-4 h-4" /> },
    { type: 'maintenance', label: 'Maintenance', duration: '25–30 min', description: 'Communication, admin, reviews', icon: <Feather className="w-4 h-4" /> },
    { type: 'recovery', label: 'Recovery', duration: '5–10 min', description: 'Active rest to stay sharp', icon: <Moon className="w-4 h-4" /> },
  ];
}

const moodEmojis = [
  { value: 1, emoji: '😔', label: 'Low' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
];

const energyLevels = [
  { value: 1, label: 'Low', sublabel: 'Survival day', icon: <Moon className="w-5 h-5" /> },
  { value: 2, label: 'Medium', sublabel: 'Light day', icon: <Sun className="w-5 h-5" /> },
  { value: 3, label: 'High', sublabel: 'Balanced day', icon: <Zap className="w-5 h-5" /> },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

export function DailyCheckInModal({ open, onClose, onComplete }: DailyCheckInModalProps) {
  const [step, setStep] = useState(0);
  // 0=mood 1=energy 2=sleep 3=intent 4=plan
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number>(5);
  const [hoursSlept, setHoursSlept] = useState<string>('');
  const [intent, setIntent] = useState<string | null>(null);
  const [planReady, setPlanReady] = useState(false);

  const { recordCheckIn } = useEventsLedgerContext();
  const { playMorningBriefing } = useRivaLogic();

  const handleComplete = async (skipPlan = false) => {
    if (mood && energy) {
      const dateKey = getLocalDateKey();
      const finalIntent = intent || 'balanced';
      const checkInData = { mood, energy, sleepQuality, intent: finalIntent };
      await recordCheckIn(dateKey, checkInData);
      playMorningBriefing(checkInData);
      onComplete({ date: formatDate(new Date()), ...checkInData });
      resetState();
    }
  };

  const resetState = () => {
    setStep(0); setMood(null); setEnergy(null);
    setSleepQuality(5); setHoursSlept(''); setIntent(null); setPlanReady(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleNext = () => {
    if (step === 2) {
      // Sleep → Intent (optional): go to intent step
      setStep(3);
    } else if (step === 3) {
      // Intent → Plan
      setStep(4);
    } else if (step < 3) {
      setStep(s => s + 1);
    }
  };

  const handleSkipIntent = () => {
    setStep(4);
  };

  const canProceed = () => {
    if (step === 0) return mood !== null;
    if (step === 1) return energy !== null;
    if (step === 2) return true; // slider always has value
    if (step === 3) return true; // intent optional
    return false;
  };

  const TIME_EMOJI = { morning: '☀️', afternoon: '🌤️', evening: '🌙', night: '🌙' } as const;
  const getGreeting = () => `${sharedGreeting()} ${TIME_EMOJI[getTimeOfDay()]}`;

  const dayMode: DayMode = mood && energy ? getDayMode(mood, energy, sleepQuality) : 'balanced';
  const planCards = getPlanCards(dayMode);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
          paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 1rem)',
          paddingRight: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
        }}
      >
        <motion.div className="absolute inset-0 bg-gradient-to-br from-background via-background/98 to-primary/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
        <motion.div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl" animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-accent/10 blur-3xl" animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="relative w-full max-w-[min(92vw,26rem)] max-h-[90dvh] overflow-y-auto bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-border/50"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

          {/* Header */}
          <motion.div className="relative flex justify-between items-center mb-5" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
            <h2 className="text-xl font-semibold text-foreground">{step === 4 ? "Today's Plan" : getGreeting()}</h2>
            <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} onClick={handleClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          </motion.div>

          {/* Progress dots (only for steps 0-3) */}
          {step < 4 && (
            <motion.div className="flex justify-center gap-3 mb-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>
              {[0, 1, 2, 3].map(i => (
                <motion.div key={i}
                  className={`rounded-full transition-all duration-300 ${i < step ? 'bg-primary w-2.5 h-2.5' : i === step ? 'bg-primary w-4 h-2.5' : 'bg-border w-2.5 h-2.5'}`}
                  animate={i === step ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.4 }}
                />
              ))}
            </motion.div>
          )}

          {/* Steps */}
          <AnimatePresence mode="wait">
            {/* Step 0: Mood */}
            {step === 0 && (
              <motion.div key="mood" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }} className="text-center space-y-6">
                <div>
                  <p className="text-muted-foreground mb-1">How are you feeling?</p>
                  <p className="text-xs text-muted-foreground/60">This sets today's plan intensity.</p>
                </div>
                <motion.div className="flex justify-center gap-3" variants={containerVariants} initial="hidden" animate="visible">
                  {moodEmojis.map(option => (
                    <motion.button key={option.value} variants={itemVariants} whileHover={{ scale: 1.15, y: -4 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setMood(option.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-300 ${mood === option.value ? 'bg-primary/15 scale-110 shadow-lg shadow-primary/20' : 'hover:bg-secondary'}`}
                    >
                      <span className="text-3xl">{option.emoji}</span>
                      <span className="text-xs text-muted-foreground">{option.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Step 1: Energy */}
            {step === 1 && (
              <motion.div key="energy" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }} className="text-center space-y-6">
                <p className="text-muted-foreground">What's your energy like?</p>
                <motion.div className="flex justify-center gap-4" variants={containerVariants} initial="hidden" animate="visible">
                  {energyLevels.map(option => (
                    <motion.button key={option.value} variants={itemVariants} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setEnergy(option.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 min-w-[5.5rem] ${energy === option.value ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary hover:bg-secondary/80'}`}
                    >
                      {option.icon}
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className={`text-xs ${energy === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{option.sublabel}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Sleep */}
            {step === 2 && (
              <motion.div key="sleep" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }} className="space-y-6">
                <p className="text-muted-foreground text-center">How did you sleep?</p>

                {/* Slider 1-10 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Restless</span>
                    <span className="text-2xl font-bold text-foreground">{sleepQuality}/10</span>
                    <span className="text-xs text-muted-foreground">Refreshed</span>
                  </div>
                  <input
                    type="range" min={1} max={10} step={1} value={sleepQuality}
                    onChange={e => setSleepQuality(Number(e.target.value))}
                    className="w-full h-3 rounded-full accent-primary cursor-pointer"
                    style={{ accentColor: 'hsl(var(--primary))' }}
                  />
                  <div className="flex justify-between px-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <div key={n} className={`w-1.5 h-1.5 rounded-full transition-colors ${n <= sleepQuality ? 'bg-primary' : 'bg-border'}`} />
                    ))}
                  </div>
                </div>

                {/* Optional hours */}
                <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-3">
                  <Moon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="number" min={0} max={24} step={0.5} value={hoursSlept}
                    onChange={e => setHoursSlept(e.target.value)}
                    placeholder="Hours slept (optional)"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                  />
                  {hoursSlept && <span className="text-xs text-muted-foreground">hrs</span>}
                </div>
              </motion.div>
            )}

            {/* Step 3: Intent (optional) */}
            {step === 3 && (
              <motion.div key="intent" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }} className="space-y-5">
                <div className="text-center">
                  <p className="text-muted-foreground">One word for today? <span className="text-xs text-muted-foreground/60">(optional)</span></p>
                </div>
                <motion.div className="flex flex-wrap justify-center gap-3" variants={containerVariants} initial="hidden" animate="visible">
                  {[
                    { value: 'calm', label: 'Calm', icon: <Feather className="w-4 h-4" /> },
                    { value: 'productive', label: 'Productive', icon: <Target className="w-4 h-4" /> },
                    { value: 'focused', label: 'Focused', icon: <Sparkles className="w-4 h-4" /> },
                    { value: 'creative', label: 'Creative', icon: <Sparkles className="w-4 h-4" /> },
                  ].map(option => (
                    <motion.button key={option.value} variants={itemVariants} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setIntent(intent === option.value ? null : option.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${intent === option.value ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}
                    >
                      {option.icon}{option.label}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Step 4: Today's Plan */}
            {step === 4 && mood && energy && (
              <motion.div key="plan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="space-y-4">
                {/* Mode badge */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-muted-foreground">Mode today:</span>
                  <span className={`text-sm font-semibold capitalize ${getModeColor(dayMode)}`}>
                    {getModeLabel(dayMode)}
                  </span>
                </div>

                {/* Plan cards */}
                <div className="space-y-3">
                  {planCards.map((card, i) => (
                    <motion.div
                      key={card.type}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-2xl border transition-all ${
                        card.type === 'needle'
                          ? 'bg-primary/10 border-primary/30'
                          : card.type === 'maintenance'
                          ? 'bg-secondary/60 border-border/40'
                          : 'bg-muted/40 border-border/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={card.type === 'needle' ? 'text-primary' : 'text-muted-foreground'}>{card.icon}</span>
                            <span className="text-sm font-semibold text-foreground">{card.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{card.description}</p>
                        </div>
                        <span className={`text-xs font-medium shrink-0 px-2 py-1 rounded-full ${card.type === 'needle' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{card.duration}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* CTA row */}
                <div className="space-y-3 mt-2">
                  {/* Focus durations */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 text-center">Start Focus</p>
                    <div className="flex gap-2">
                      {['25 min', '50 min', '90 min'].map(dur => (
                        <motion.button key={dur} whileTap={{ scale: 0.96 }}
                          onClick={() => handleComplete()}
                          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                          {dur}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Overwhelmed */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleComplete()}
                    className="w-full py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" />
                    I'm overwhelmed
                  </motion.button>

                  {/* Edit plan */}
                  <button onClick={() => handleComplete()} className="w-full text-xs text-muted-foreground/70 hover:text-muted-foreground py-1 transition-colors">
                    Edit plan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons (steps 0-3) */}
          {step < 4 && (
            <motion.div className="mt-7 space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
              {step === 3 && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button type="button" onClick={handleNext} className="w-full h-12 rounded-2xl text-base font-medium shadow-lg shadow-primary/20">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate today's plan ✨
                  </Button>
                </motion.div>
              )}
              {step < 3 && (
                <motion.div whileHover={{ scale: canProceed() ? 1.02 : 1 }} whileTap={{ scale: canProceed() ? 0.98 : 1 }}>
                  <Button type="button" onClick={() => { if (canProceed()) handleNext(); }}
                    disabled={!canProceed()}
                    className="w-full h-12 rounded-2xl text-base font-medium shadow-lg shadow-primary/20"
                  >
                    Continue
                  </Button>
                </motion.div>
              )}
              {/* Skip for mood step */}
              {step === 0 && (
                <button onClick={() => { setMood(3); setStep(1); }} className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground py-1 transition-colors">
                  Skip
                </button>
              )}
              {/* Skip intent */}
              {step === 3 && (
                <button onClick={handleSkipIntent} className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground py-1 transition-colors">
                  Skip intention →
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
