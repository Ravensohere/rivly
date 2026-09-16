/**
 * RhythmReportCard.tsx — "Vivly Wrapped" Spotify-style monthly report
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, Share2,
  Flame, Clock, Target, Hash, TrendingUp, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  RhythmReport,
  formatFocusHourRange,
  formatMinutesAsHours,
} from '@/lib/rhythmReport';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RhythmReportCardProps {
  report: RhythmReport;
  onClose: () => void;
}

// ── Palettes (one per slide) ───────────────────────────────────────────────────

const SLIDE_PALETTES = [
  { bg: 'from-violet-950 via-indigo-900 to-indigo-800', accent: '#a78bfa' },  // slide 1
  { bg: 'from-emerald-950 via-teal-900 to-cyan-800',    accent: '#34d399' },  // slide 2
  { bg: 'from-orange-950 via-amber-900 to-yellow-800',  accent: '#fbbf24' },  // slide 3
  { bg: 'from-rose-950 via-pink-900 to-fuchsia-800',    accent: '#f9a8d4' },  // slide 4
  { bg: 'from-slate-950 via-slate-900 to-gray-900',     accent: '#94a3b8' },  // final
];

// ── Mini bar chart ────────────────────────────────────────────────────────────

function HourBarChart({ data, accent }: { data: number[]; accent: string }) {
  const maxVal = Math.max(...data, 1);
  // Show only hours 5am–11pm for cleanliness
  const visible = data.slice(5, 23);

  return (
    <div className="flex items-end gap-0.5 h-20 w-full mt-4">
      {visible.map((val, i) => {
        const heightPct = (val / maxVal) * 100;
        const hour = i + 5;
        const isHighlight = val === maxVal && val > 0;
        return (
          <div key={hour} className="flex flex-col items-center flex-1 gap-0.5">
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${Math.max(4, heightPct)}%`,
                background: isHighlight ? accent : 'rgba(255,255,255,0.15)',
                boxShadow: isHighlight ? `0 0 8px ${accent}80` : 'none',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Slide components ───────────────────────────────────────────────────────────

function Slide1({ report, accent }: { report: RhythmReport; accent: string }) {
  return (
    <div className="flex flex-col h-full px-8 pt-16 pb-8 justify-between">
      <div>
        <p className="text-white/50 text-sm font-medium uppercase tracking-widest mb-3">
          {report.monthYear}
        </p>
        <h1 className="text-3xl font-bold text-white leading-tight">
          Your best focus time
        </h1>
        <div
          className="text-5xl font-black mt-4 leading-none"
          style={{ color: accent }}
        >
          {formatFocusHourRange(report.bestFocusHour)}
        </div>
        <p className="text-white/60 mt-3 text-base">
          {report.sessionsCount} sessions logged this month
        </p>
      </div>

      <div>
        <p className="text-white/40 text-xs mb-2">Sessions by hour</p>
        <HourBarChart data={report.focusByHour} accent={accent} />
        <div className="flex justify-between text-white/30 text-xs mt-1">
          <span>5am</span>
          <span>12pm</span>
          <span>11pm</span>
        </div>
      </div>
    </div>
  );
}

function Slide2({ report, accent }: { report: RhythmReport; accent: string }) {
  const hours = Math.floor(report.focusMinutesTotal / 60);
  const mins = report.focusMinutesTotal % 60;

  return (
    <div className="flex flex-col h-full px-8 pt-16 pb-8 items-center justify-center text-center">
      <Clock className="w-14 h-14 mb-6" style={{ color: accent }} />
      <p className="text-white/50 text-sm uppercase tracking-widest mb-2">
        Total focus this month
      </p>
      <div className="text-6xl font-black text-white leading-none">
        {hours > 0 ? (
          <>
            {hours}
            <span className="text-3xl font-bold text-white/60">h</span>
            {mins > 0 && (
              <>
                {mins}
                <span className="text-3xl font-bold text-white/60">m</span>
              </>
            )}
          </>
        ) : (
          <>
            {mins}
            <span className="text-3xl font-bold text-white/60">m</span>
          </>
        )}
      </div>
      <p className="text-white/50 mt-4 text-base leading-relaxed max-w-xs">
        {report.focusMinutesTotal === 0
          ? 'No focus sessions logged — this month is a great time to start!'
          : report.focusMinutesTotal < 300
          ? 'A solid start. Consistency compounds over time.'
          : report.focusMinutesTotal < 1200
          ? 'Great momentum. You\'re building a real habit.'
          : 'Outstanding focus. You\'re in the top tier of Vivly users!'}
      </p>
    </div>
  );
}

function Slide3({ report, accent }: { report: RhythmReport; accent: string }) {
  const factor = report.checkinBoostFactor;
  const isBoost = factor > 1.1;

  return (
    <div className="flex flex-col h-full px-8 pt-16 pb-8 justify-center text-center">
      <TrendingUp className="w-14 h-14 mb-6 mx-auto" style={{ color: accent }} />
      <p className="text-white/50 text-sm uppercase tracking-widest mb-2">
        Check-in effect
      </p>
      {report.morningCheckinStreak > 0 ? (
        <>
          <div className="text-6xl font-black text-white leading-none">
            {factor.toFixed(1)}
            <span className="text-3xl font-bold" style={{ color: accent }}>
              ×
            </span>
          </div>
          <p className="text-white/70 mt-4 text-base leading-relaxed max-w-xs mx-auto">
            You complete <strong style={{ color: accent }}>{factor.toFixed(1)}× more tasks</strong> on days
            when you check in each morning.
          </p>
          <div
            className="mt-6 flex items-center gap-2 justify-center px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
          >
            <Flame className="w-4 h-4" />
            {report.morningCheckinStreak}-day check-in streak
          </div>
        </>
      ) : (
        <p className="text-white/60 mt-4 text-base text-center max-w-xs mx-auto">
          Start your morning check-ins to unlock this insight. Consistent check-ins improve daily task completion.
        </p>
      )}
    </div>
  );
}

function Slide4({ report, accent }: { report: RhythmReport; accent: string }) {
  const TAG_EMOJIS: Record<string, string> = {
    work: '💼', study: '📚', personal: '🌱', health: '💪', other: '✨',
  };
  const emoji = TAG_EMOJIS[report.topTag] ?? '✨';

  return (
    <div className="flex flex-col h-full px-8 pt-16 pb-8 justify-center text-center">
      <div className="text-7xl mb-4">{emoji}</div>
      <p className="text-white/50 text-sm uppercase tracking-widest mb-2">
        Your top category
      </p>
      <div
        className="text-5xl font-black capitalize"
        style={{ color: accent }}
      >
        #{report.topTag}
      </div>
      <p className="text-white/60 mt-4 text-base">
        {report.tasksCompleted > 0
          ? `${report.tasksCompleted} tasks completed — mostly ${report.topTag} work.`
          : 'No completed tasks this month yet.'}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 text-left max-w-xs mx-auto w-full">
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <p className="text-white/40 text-xs mb-1">Avg tasks/day</p>
          <p className="text-white font-bold text-xl">{report.avgTasksPerDay}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <p className="text-white/40 text-xs mb-1">Mood × Energy</p>
          <p className="text-white font-bold text-xl capitalize">{report.moodEnergyCorrelation}</p>
        </div>
      </div>
    </div>
  );
}

function FinalSlide({
  report,
  accent,
  onShare,
}: {
  report: RhythmReport;
  accent: string;
  onShare: () => void;
}) {
  return (
    <div className="flex flex-col h-full px-8 pt-12 pb-8 justify-between text-center">
      <div>
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-5xl mb-4"
        >
          🎉
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Your {report.monthYear} Wrap</h2>
        <p className="text-white/50 text-sm mt-2">Share your rhythm</p>
      </div>

      {/* Share card */}
      <div
        id="rhythm-share-card"
        className="rounded-3xl p-5 text-left"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-semibold text-sm">Vivly · {report.monthYear}</span>
          <Sparkles className="w-4 h-4" style={{ color: accent }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Focus time', value: formatMinutesAsHours(report.focusMinutesTotal), icon: '⏱️' },
            { label: 'Best hour', value: formatFocusHourRange(report.bestFocusHour), icon: '🕐' },
            { label: 'Tasks done', value: String(report.tasksCompleted), icon: '✅' },
            { label: 'Top tag', value: `#${report.topTag}`, icon: '🏷️' },
            { label: 'Check-in boost', value: `${report.checkinBoostFactor.toFixed(1)}×`, icon: '📈' },
            { label: 'Streak', value: `${report.morningCheckinStreak}d`, icon: '🔥' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p className="text-white/40 text-xs">{icon} {label}</p>
              <p className="text-white font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs text-center mt-4">vivly.app · Built your rhythm 🌱</p>
      </div>

      {/* Share buttons */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={onShare}
          className="w-full h-12 font-medium rounded-2xl"
          style={{ background: '#25D366', color: '#fff' }}
          id="share-whatsapp-btn"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share to WhatsApp
        </Button>
        <Button
          onClick={() => {
            const text = `My ${report.monthYear} focus: ${formatMinutesAsHours(report.focusMinutesTotal)} focused, ${report.tasksCompleted} tasks done, best hour: ${formatFocusHourRange(report.bestFocusHour)} 🌱 #Vivly`;
            if (navigator.share) {
              navigator.share({ title: 'My Vivly Rhythm Report', text }).catch(() => {});
            } else {
              navigator.clipboard.writeText(text).catch(() => {});
            }
          }}
          variant="outline"
          className="w-full h-11 font-medium rounded-2xl border-white/20 text-white bg-transparent hover:bg-white/10"
          id="share-copy-btn"
        >
          Copy stats
        </Button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const SLIDE_COUNT = 5;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

export function RhythmReportCard({ report, onClose }: RhythmReportCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback(
    (slide: number) => {
      setDirection(slide > currentSlide ? 1 : -1);
      setCurrentSlide(slide);
    },
    [currentSlide]
  );

  const next = () => {
    if (currentSlide < SLIDE_COUNT - 1) goTo(currentSlide + 1);
  };
  const prev = () => {
    if (currentSlide > 0) goTo(currentSlide - 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 40) next();
    else if (delta < -40) prev();
    touchStartX.current = null;
  };

  const handleShare = () => {
    const text = `My ${report.monthYear} focus: ${formatMinutesAsHours(report.focusMinutesTotal)} focused, ${report.tasksCompleted} tasks done, best hour: ${formatFocusHourRange(report.bestFocusHour)} 🌱 #Vivly`;
    const url = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  };

  const { bg, accent } = SLIDE_PALETTES[currentSlide];

  const slides = [
    <Slide1 key="s1" report={report} accent={accent} />,
    <Slide2 key="s2" report={report} accent={accent} />,
    <Slide3 key="s3" report={report} accent={accent} />,
    <Slide4 key="s4" report={report} accent={accent} />,
    <FinalSlide key="s5" report={report} accent={accent} onShare={handleShare} />,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-label="Monthly Rhythm Report"
    >
      {/* Card */}
      <motion.div
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className={`relative w-full max-w-sm h-[640px] mx-4 rounded-3xl overflow-hidden bg-gradient-to-b ${bg} transition-all duration-700`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        id="rhythm-report-modal"
      >
        {/* Top bar: close + dots */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 pt-5">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentSlide ? 20 : 6,
                  height: 6,
                  background: i === currentSlide ? accent : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label="Close report"
            id="close-rhythm-report"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Slide content */}
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            {slides[currentSlide]}
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        {currentSlide > 0 && (
          <button
            onClick={prev}
            aria-label="Previous slide"
            id="rhythm-prev-btn"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center z-20"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        {currentSlide < SLIDE_COUNT - 1 && (
          <button
            onClick={next}
            aria-label="Next slide"
            id="rhythm-next-btn"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center z-20"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
