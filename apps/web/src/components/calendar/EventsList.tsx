import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { EventCard } from './EventCard';
import { CalendarEvent } from '@/hooks/useEvents';

interface EventsListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  emptyMessage?: string;
}

export function EventsList({ events, onEventClick, emptyMessage = 'No events for this day' }: EventsListProps) {
  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-6 text-muted-foreground"
      >
        <Calendar className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className="space-y-2"
    >
      {events.map((event) => (
        <motion.div
          key={event.id}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <EventCard event={event} onClick={() => onEventClick(event)} />
        </motion.div>
      ))}
    </motion.div>
  );
}
