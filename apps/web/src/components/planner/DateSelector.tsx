import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useIsMobile } from '@/hooks/use-mobile';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onOpenCalendar?: () => void;
}

const E = [0.22, 1, 0.36, 1] as const;

export function DateSelector({ selectedDate, onDateChange, onOpenCalendar }: DateSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [hasAnimatedToday, setHasAnimatedToday] = useState(false);
  const [showSelectionGlow, setShowSelectionGlow] = useState(false);
  const { hasEventsOnDate } = useEvents();
  const isMobile = useIsMobile();

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 121 }, (_, i) => addDays(today, i - 60));
  }, []);

  useEffect(() => {
    if (selectedRef.current && scrollContainerRef.current) {
      const c = scrollContainerRef.current;
      const el = selectedRef.current;
      c.scrollTo({ left: el.offsetLeft - c.offsetWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
    }
  }, [selectedDate]);

  useEffect(() => {
    const t = setTimeout(() => setHasAnimatedToday(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    setShowSelectionGlow(true);
    setTimeout(() => setShowSelectionGlow(false), 600);
    onDateChange(date);
  }, [onDateChange]);

  const scroll = (dir: 'left' | 'right') => {
    scrollContainerRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  /* Dynamic tile sizing based on viewport */
  const tileW  = 'clamp(2.9rem, 5.5vw, 4.2rem)';
  const tileH  = 'clamp(3.5rem, 6vh, 5rem)';
  const dayFz  = 'clamp(0.55rem, 0.75vw, 0.7rem)';
  const numFz  = 'clamp(1.05rem, 1.7vw, 1.5rem)';
  const tileR  = 'clamp(0.85rem, 1.2vw, 1.1rem)';

  return (
    <div className="relative flex items-center justify-between w-full">
      {/* Left tool group (Left arrow + spacer for balance) */}
      <div className="flex items-center" style={{ width: 'clamp(2rem, 3.5vw, 3rem)' }}>
        {!isMobile && (
          <button onClick={() => scroll('left')} aria-label="Show earlier dates"
            className="flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200 hover:bg-muted/60"
            style={{ width: 'clamp(1.8rem, 2.5vw, 2.4rem)', height: 'clamp(1.8rem, 2.5vw, 2.4rem)', marginLeft: '0.6rem' }}
          >
            <ChevronLeft style={{ width: 'clamp(0.9rem, 1.2vw, 1.1rem)', height: 'clamp(0.9rem, 1.2vw, 1.1rem)', color: 'hsl(var(--muted-foreground))' }} />
          </button>
        )}
      </div>

      {/* Center scroll container */}
      <div className="relative flex-1 min-w-0">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, hsl(var(--background)), transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, hsl(var(--background)), transparent)' }} />

        <div ref={scrollContainerRef} className="flex overflow-x-auto scrollbar-hide"
          style={{ 
            gap: 'clamp(0.35rem, 0.6vw, 0.55rem)', 
            padding: 'clamp(0.4rem, 0.8vh, 0.6rem) 0',
            scrollSnapType: 'x mandatory', 
            WebkitOverflowScrolling: 'touch', 
            overscrollBehavior: 'contain' 
          }}
        >
          {/* Invisible spacers at start/end to allow any item to be perfectly centered */}
          <div style={{ flexShrink: 0, width: '42vw' }} />
          
          {dates.map(date => {
            const selected  = isSameDay(date, selectedDate);
            const today     = isToday(date);
            const past      = isBefore(startOfDay(date), startOfDay(new Date()));
            const hasEvents = hasEventsOnDate(format(date, 'yyyy-MM-dd'));

            return (
              <motion.button
                key={date.toISOString()}
                ref={selected ? selectedRef : null}
                onClick={() => handleDateClick(date)}
                aria-label={`${format(date, 'EEEE, d MMMM yyyy')}${today ? ', today' : ''}${hasEvents ? ', has events' : ''}`}
                aria-current={selected ? 'date' : undefined}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.91 }}
                animate={{ scale: selected ? 1.06 : 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                style={{
                  position: 'relative', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  minWidth: tileW, width: tileW, height: tileH,
                  borderRadius: tileR, flexShrink: 0, scrollSnapAlign: 'center',
                  color: selected ? 'hsl(var(--primary-foreground))' : past ? 'hsl(var(--muted-foreground) / 0.4)' : 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {/* Selected pill */}
                {selected && (
                  <motion.div layoutId="date-selector-pill"
                    className="absolute inset-0"
                    style={{ borderRadius: tileR, background: 'var(--gradient-indigo)', boxShadow: showSelectionGlow ? '0 0 20px 4px hsl(235 35% 55% / 0.3)' : '0 4px 14px -4px hsl(235 35% 55% / 0.35)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  />
                )}

                {/* Tap glow */}
                <AnimatePresence>
                  {selected && showSelectionGlow && (
                    <motion.div className="absolute inset-0 pointer-events-none"
                      style={{ borderRadius: tileR, background: 'radial-gradient(circle, hsl(235 35% 55% / 0.35) 0%, transparent 70%)' }}
                      initial={{ scale: 1, opacity: 0.35 }} animate={{ scale: 1.35, opacity: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }} />
                  )}
                </AnimatePresence>

                {/* Today dot */}
                {today && !selected && (
                  <motion.div className="absolute"
                    style={{ top: 'clamp(0.28rem, 0.5vh, 0.4rem)', width: 'clamp(0.22rem, 0.35vw, 0.3rem)', height: 'clamp(0.22rem, 0.35vw, 0.3rem)', borderRadius: '50%', background: 'hsl(var(--primary))' }}
                    initial={!hasAnimatedToday ? { scale: 0, opacity: 0 } : false}
                    animate={!hasAnimatedToday ? { scale: [0, 1.5, 1], opacity: [0, 1, 0.85] } : { opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }}
                    transition={!hasAnimatedToday ? { duration: 0.8, delay: 0.5, ease: E } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Day label */}
                <span className="absolute z-10"
                  style={{ top: 'clamp(0.45rem, 0.8vh, 0.65rem)', fontFamily: "'DM Mono', monospace", fontSize: dayFz, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: selected ? 0.75 : 1 }}>
                  {format(date, 'EEE')}
                </span>

                {/* Day number */}
                <span className="relative z-10"
                  style={{ fontFamily: "Roboto, sans-serif", fontSize: numFz, fontWeight: selected ? 600 : 400, lineHeight: 1, transform: 'translateY(clamp(0.3rem, 0.6vh, 0.45rem))' }}>
                  {format(date, 'd')}
                </span>

                {/* Event dot */}
                {hasEvents && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute z-10"
                    style={{ bottom: 'clamp(0.22rem, 0.4vh, 0.32rem)', width: 'clamp(0.2rem, 0.3vw, 0.28rem)', height: 'clamp(0.2rem, 0.3vw, 0.28rem)', borderRadius: '50%', background: selected ? 'rgba(255,255,255,0.7)' : 'hsl(var(--primary))' }}
                  />
                )}
              </motion.button>
            );
          })}

          <div style={{ flexShrink: 0, width: '42vw' }} />
        </div>
      </div>

      {/* Right tool group (Right arrow + Calendar) */}
      <div className="flex items-center justify-end" style={{ width: 'clamp(3rem, 5vw, 4.5rem)', gap: '0.2rem', paddingRight: 'clamp(0.4rem, 0.8vw, 0.8rem)' }}>
        {!isMobile && (
          <button onClick={() => scroll('right')} aria-label="Show later dates"
            className="flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200 hover:bg-muted/60"
            style={{ width: 'clamp(1.8rem, 2.5vw, 2.4rem)', height: 'clamp(1.8rem, 2.5vw, 2.4rem)' }}
          >
            <ChevronRight style={{ width: 'clamp(0.9rem, 1.2vw, 1.1rem)', height: 'clamp(0.9rem, 1.2vw, 1.1rem)', color: 'hsl(var(--muted-foreground))' }} />
          </button>
        )}

        {/* Calendar open */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={onOpenCalendar} aria-label="Open calendar to jump to a date"
          className="flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200"
          style={{ width: 'clamp(2rem, 3vw, 2.4rem)', height: 'clamp(2rem, 3vw, 2.4rem)', background: 'hsl(var(--muted) / 0.5)', border: '1px solid hsl(var(--border) / 0.4)' }}
        >
          <Calendar style={{ width: 'clamp(0.85rem, 1.1vw, 1rem)', height: 'clamp(0.85rem, 1.1vw, 1rem)', color: 'hsl(var(--muted-foreground))' }} />
        </motion.button>
      </div>
    </div>
  );
}
