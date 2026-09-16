import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Tag, Bell, FileText, Repeat, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
} from '@/components/ui/ResponsiveModal';
import { WheelTimePicker } from '@/components/ui/WheelTimePicker';
import { useEvents, CalendarEvent, EventCategory, ReminderOption } from '@/hooks/useEvents';
import { useGoogleCalendarSimple } from '@/hooks/useGoogleCalendarSimple';

interface EventFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  editEvent?: CalendarEvent | null;
}

const CATEGORIES: { value: EventCategory; label: string; color: string }[] = [
  { value: 'birthday', label: 'Birthday', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { value: 'personal', label: 'Personal', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'work', label: 'Work', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'reminder', label: 'Reminder', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

const REMINDER_OPTIONS: { value: ReminderOption; label: string }[] = [
  { value: 'none', label: 'No reminder' },
  { value: 'at_time', label: 'At event time' },
  { value: '10m', label: '10 minutes before' },
  { value: '1h', label: '1 hour before' },
  { value: '1d', label: '1 day before' },
];

export function EventFormModal({ 
  open, 
  onOpenChange, 
  date,
  editEvent,
}: EventFormModalProps) {
  const { addEvent, updateEvent, deleteEvent } = useEvents();
  const { isConnected, createGoogleEvent } = useGoogleCalendarSimple();
  
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [time, setTime] = useState('12:00');
  const [category, setCategory] = useState<EventCategory>('personal');
  const [notes, setNotes] = useState('');
  const [reminderOption, setReminderOption] = useState<ReminderOption>('none');
  const [recurringYearly, setRecurringYearly] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setAllDay(editEvent.all_day);
      setTime(editEvent.time?.slice(0, 5) || '12:00');
      setCategory(editEvent.category);
      setNotes(editEvent.notes || '');
      setReminderOption(editEvent.reminder_option);
      setRecurringYearly(editEvent.recurring_yearly);
    } else {
      // Reset form for new event
      setTitle('');
      setAllDay(true);
      setTime('12:00');
      setCategory('personal');
      setNotes('');
      setReminderOption('none');
      setRecurringYearly(false);
    }
  }, [editEvent, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    const eventData = {
      title: title.trim(),
      date: format(date, 'yyyy-MM-dd'),
      time: allDay ? undefined : `${time}:00`,
      all_day: allDay,
      category,
      notes: notes.trim() || undefined,
      reminder_option: reminderOption,
      recurring_yearly: recurringYearly,
    };

    if (editEvent) {
      await updateEvent(editEvent.id, eventData);
    } else {
      await addEvent(eventData);
      
      // Sync to Google Calendar if connected
      if (isConnected) {
        const start = allDay ? `${eventData.date}T00:00:00Z` : `${eventData.date}T${time}:00`;
        const end = allDay ? `${eventData.date}T23:59:59Z` : `${eventData.date}T${time}:00`; // Just a placeholder end for now
        
        createGoogleEvent({
          title: title.trim(),
          startTime: start,
          endTime: end,
          description: notes.trim() || 'Created via Rivly',
        });
      }
    }

    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!editEvent) return;
    
    setIsSubmitting(true);
    await deleteEvent(editEvent.id);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent className="max-w-md">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              {editEvent ? 'Edit Event' : 'Add Event'}
            </ResponsiveModalTitle>
            <p className="text-sm text-muted-foreground">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </p>
          </ResponsiveModalHeader>

          <form onSubmit={handleSubmit}>
            <ResponsiveModalBody className="space-y-5">
              {/* Title */}
              <div>
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  className="mt-1.5"
                  required
                />
              </div>

              {/* All day toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="all-day" className="font-normal">All day</Label>
                </div>
                <Switch
                  id="all-day"
                  checked={allDay}
                  onCheckedChange={setAllDay}
                />
              </div>

              {/* Time picker (if not all day) */}
              {!allDay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label>Time</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-1.5 justify-start font-normal"
                    onClick={() => setShowTimePicker(true)}
                  >
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    {time}
                  </Button>
                </motion.div>
              )}

              {/* Category */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Category
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <motion.button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                        ${category === cat.value 
                          ? cat.color + ' ring-2 ring-offset-2 ring-offset-background ring-primary/30'
                          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                        }
                      `}
                    >
                      {cat.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Recurring (for birthdays) */}
              {category === 'birthday' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Repeat className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="recurring" className="font-normal">
                      Repeat every year
                    </Label>
                  </div>
                  <Switch
                    id="recurring"
                    checked={recurringYearly}
                    onCheckedChange={setRecurringYearly}
                  />
                </motion.div>
              )}

              {/* Reminder */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  Reminder
                </Label>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.value}
                      type="button"
                      onClick={() => setReminderOption(opt.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        px-3 py-1.5 rounded-full text-sm border transition-all
                        ${reminderOption === opt.value 
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                        }
                      `}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="mt-1.5 min-h-[80px]"
                />
              </div>
            </ResponsiveModalBody>

            <ResponsiveModalFooter className="flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={!title.trim() || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (editEvent ? 'Save Changes' : 'Add Event')}
              </Button>
              
              {editEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </Button>
              )}
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <WheelTimePicker
        open={showTimePicker}
        onOpenChange={setShowTimePicker}
        value={time}
        onChange={setTime}
        title="Event Time"
      />
    </>
  );
}
