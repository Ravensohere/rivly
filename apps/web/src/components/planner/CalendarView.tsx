import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimeBlock } from '@/types';
import { TimeBlockCard } from './TimeBlockCard';
import { parseTime } from '@/hooks/useLocalStorage';

interface CalendarViewProps {
  blocks: TimeBlock[];
  events?: any[];
  onBlockClick: (block: TimeBlock) => void;
  onEventClick?: (event: any) => void;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 0;
const END_HOUR = 24;

// Time-of-day gradient colors
const getTimeGradient = (hour: number) => {
  if (hour >= 6 && hour < 10) {
    return 'hsl(45 80% 97% / 0.5)'; // Morning - warm
  } else if (hour >= 10 && hour < 14) {
    return 'hsl(200 60% 97% / 0.5)'; // Midday - bright
  } else if (hour >= 14 && hour < 18) {
    return 'hsl(30 70% 97% / 0.5)'; // Afternoon - golden
  } else if (hour >= 18 && hour < 21) {
    return 'hsl(270 50% 97% / 0.5)'; // Evening - purple
  } else {
    return 'hsl(230 40% 96% / 0.5)'; // Night - blue
  }
};

export function CalendarView({ blocks, events = [], onBlockClick, onEventClick }: CalendarViewProps) {
  const hours = useMemo(() => {
    return Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  }, []);

  const getPosition = (startTime: string, endTime: string) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    const startMinutes = (start.hours - START_HOUR) * 60 + start.minutes;
    const endMinutes = (end.hours - START_HOUR) * 60 + end.minutes;
    
    return {
      top: (startMinutes / 60) * HOUR_HEIGHT,
      height: Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 30),
    };
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${period}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 overflow-y-auto scrollbar-hide pb-28"
    >
      <div className="relative min-h-full px-3">
        {/* Time grid with time-of-day gradient */}
        <div className="relative ml-14">
          {hours.map((hour, index) => (
            <motion.div
              key={hour}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.015 }}
              className="relative"
              style={{ 
                height: HOUR_HEIGHT,
                background: getTimeGradient(hour),
              }}
            >
              {/* Softer grid line */}
              <div 
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--border) / 0.3) 0%, hsl(var(--border) / 0.15) 100%)',
                }}
              />
              
              {/* Hour label */}
              <span className="absolute -left-14 top-0 text-[11px] text-muted-foreground/60 font-medium w-12 text-right pr-2 -translate-y-1/2">
                {formatHour(hour)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Current time indicator */}
        <CurrentTimeIndicator startHour={START_HOUR} hourHeight={HOUR_HEIGHT} />

        {/* Items (Blocks + Events) */}
        <div className="absolute top-0 left-14 right-3">
          <AnimatePresence mode="popLayout">
            {/* Render Blocks */}
            {blocks.map((block, index) => {
              const position = getPosition(block.startTime, block.endTime);
              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -10 }}
                  transition={{ 
                    delay: index * 0.04, 
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute left-0 right-0 z-10"
                  style={{
                    top: position.top,
                    height: position.height,
                  }}
                >
                  <TimeBlockCard
                    block={block}
                    onClick={() => onBlockClick(block)}
                    variant="calendar"
                    style={{ height: '100%', minHeight: 30 }}
                  />
                </motion.div>
              );
            })}

            {/* Render Events */}
            {events.map((event, index) => {
              const startTime = event.time || '09:00';
              const duration = event.all_day ? '01:00' : '01:00'; // Default duration for events if not specified
              const [h, m] = startTime.split(':');
              const endH = (parseInt(h) + 1).toString().padStart(2, '0');
              const endTime = `${endH}:${m}`;
              
              const position = getPosition(startTime, endTime);
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-0 right-0 z-0"
                  style={{
                    top: position.top,
                    height: position.height,
                    paddingLeft: '4px', // Offset events slightly
                  }}
                  onClick={() => onEventClick?.(event)}
                >
                  <div className={`h-full w-full rounded-xl border border-blue-200/50 bg-blue-50/40 backdrop-blur-[2px] p-2 flex flex-col justify-center overflow-hidden transition-all hover:bg-blue-50/60`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className={`w-1 h-3 rounded-full ${event.is_google_event ? 'bg-blue-400' : 'bg-primary/40'}`} />
                      <span className="text-[9px] font-bold text-blue-600/70 uppercase tracking-tight">
                        {event.time ? event.time.slice(0, 5) : 'All Day'}
                      </span>
                    </div>
                    <h5 className="text-[11px] font-semibold text-blue-900/80 truncate leading-tight">
                      {event.title}
                    </h5>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function CurrentTimeIndicator({ startHour, hourHeight }: { startHour: number; hourHeight: number }) {
  const now = new Date();
  const currentMinutes = (now.getHours() - startHour) * 60 + now.getMinutes();
  const top = (currentMinutes / 60) * hourHeight;

  if (now.getHours() < startHour || now.getHours() >= 24) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-0 right-0 z-20 pointer-events-none origin-left"
      style={{ top }}
    >
      <div className="flex items-center">
        <motion.div 
          className="w-3 h-3 rounded-full bg-primary"
          animate={{ 
            scale: [1, 1.3, 1],
            boxShadow: [
              '0 0 8px 2px hsl(var(--primary) / 0.3)',
              '0 0 16px 4px hsl(var(--primary) / 0.5)',
              '0 0 8px 2px hsl(var(--primary) / 0.3)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div 
          className="flex-1 h-[2px]"
          style={{ 
            background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.2) 100%)'
          }}
        />
      </div>
    </motion.div>
  );
}