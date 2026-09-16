import { motion } from 'framer-motion';
import { Clock, Cake, Briefcase, Bell, User, Video } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CalendarEvent, EventCategory } from '@/hooks/useEvents';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
}

const CATEGORY_ICONS: Record<EventCategory, React.ReactNode> = {
  birthday: <Cake className="w-4 h-4" />,
  personal: <User className="w-4 h-4" />,
  work: <Briefcase className="w-4 h-4" />,
  reminder: <Bell className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<EventCategory, string> = {
  birthday: 'bg-rose-100 text-rose-700 border-rose-200',
  personal: 'bg-violet-100 text-violet-700 border-violet-200',
  work: 'bg-sky-100 text-sky-700 border-sky-200',
  reminder: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function EventCard({ event, onClick }: EventCardProps) {
  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleJoinMeet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.meet_link) {
      window.open(event.meet_link, '_blank');
    }
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      className={`
        w-full flex items-center gap-3 p-3 rounded-xl border text-left
        transition-all duration-200 cursor-pointer
        ${CATEGORY_COLORS[event.category]}
      `}
    >
      <div className="flex-shrink-0">
        {CATEGORY_ICONS[event.category]}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{event.title}</p>
          {event.is_google_event && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/50 border border-current/20">
              Google
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs opacity-80">
          {event.all_day ? (
            <span>All day</span>
          ) : event.time ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(event.time)}
            </span>
          ) : null}
          
          {event.recurring_yearly && (
            <span className="flex items-center gap-1">
              • Yearly
            </span>
          )}
        </div>
      </div>

      {/* Join Meeting Button */}
      {event.meet_link && (
        <motion.button
          onClick={handleJoinMeet}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-blue-600 rounded-lg text-xs font-medium border border-blue-200 hover:bg-blue-50 transition-colors"
        >
          <Video className="w-3.5 h-3.5" />
          Join
        </motion.button>
      )}
    </motion.button>
  );
}
