import { motion } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { TimeGreeting } from './TimeGreeting';
import { DateSelector } from './DateSelector';
import { ViewToggle } from './ViewToggle';

interface DayHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: 'flow' | 'plan';
  onViewModeChange: (mode: 'flow' | 'plan') => void;
  onOpenCalendar?: () => void;
  hasCheckedIn?: boolean;
  onOpenCheckIn?: () => void;
}

const E = [0.22, 1, 0.36, 1] as const;

export function DayHeader({
  selectedDate, onDateChange, viewMode, onViewModeChange,
  onOpenCalendar, hasCheckedIn, onOpenCheckIn,
}: DayHeaderProps) {
  const todayCheck = isToday(selectedDate);

  return (
    <header className="sticky top-0 z-40" style={{ background: 'transparent' }}>
      {/* Frosted glass */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--background) / 0.96) 0%, hsl(var(--background) / 0.88) 100%)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          borderBottom: '1px solid hsl(var(--border) / 0.25)',
        }}
      />

      {/* Animated gradient accent line */}
      <motion.div className="absolute bottom-0 left-0 right-0" style={{ height: '1px' }}
        animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.4) 35%, hsl(260 35% 65% / 0.35) 65%, transparent 100%)' }} />
      </motion.div>

      <div className="relative">
        <TimeGreeting hasCheckedIn={hasCheckedIn} onOpenCheckIn={onOpenCheckIn} />
        <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} onOpenCalendar={onOpenCalendar} />

        {/* Date label */}
        <motion.div key={format(selectedDate, 'yyyy-MM-dd')}
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: E }}
          className="flex justify-center" style={{ paddingTop: '0.05rem', paddingBottom: '0.1rem' }}
        >
          <span style={{
            fontFamily: todayCheck ? "'Playfair Display', Georgia, serif" : "Roboto, sans-serif",
            fontStyle:  todayCheck ? 'italic' : 'normal',
            fontSize:   todayCheck ? 'clamp(1rem, 1.4vw, 1.2rem)' : 'clamp(0.75rem, 1vw, 0.95rem)',
            fontWeight: todayCheck ? 400 : 700, letterSpacing: '-0.01em',
            color: todayCheck ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.65)',
          }}>
            {todayCheck ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}
          </span>
        </motion.div>

        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </header>
  );
}
