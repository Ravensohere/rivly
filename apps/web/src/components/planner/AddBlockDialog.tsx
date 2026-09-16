import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bell, BellOff } from 'lucide-react';
import { BlockColor } from '@/types';
import { 
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from '@/components/ui/ResponsiveModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { WheelTimePicker, TimePickerTrigger } from '@/components/ui/WheelTimePicker';
import { CategoryChips, blockColorOptions } from './CategoryChips';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseDateKey } from '@/lib/dateUtils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AddBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (block: {
    title: string;
    startTime: string;
    endTime: string;
    color: string;
    reminder?: string;
    notes?: string;
    endDateKey?: string;
  }) => void;
  defaultDate?: string;
  defaultTitle?: string;
}

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    },
  },
};

export function AddBlockDialog({ open, onOpenChange, onAdd, defaultDate, defaultTitle }: AddBlockDialogProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState<BlockColor>('sage');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notes, setNotes] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize selectedEndDate from defaultDate
  useEffect(() => {
    if (defaultDate) {
      setSelectedEndDate(parseDateKey(defaultDate));
    } else {
        setSelectedEndDate(new Date());
    }
  }, [defaultDate]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle || '');
      setStartTime('09:00');
      setEndTime('10:00');
      setColor('sage');
      setReminderEnabled(false);
      setNotes('');
      // Reset date to default
      if (defaultDate) {
        setSelectedEndDate(parseDateKey(defaultDate));
      } else {
        setSelectedEndDate(new Date());
      }
    }
  }, [open, defaultDate, defaultTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onAdd({
      title: title.trim(),
      startTime,
      endTime,
      color,
      reminder: reminderEnabled ? startTime : undefined,
      notes: notes.trim() || undefined,
      endDateKey: selectedEndDate ? format(selectedEndDate, 'yyyy-MM-dd') : undefined,
    });
    
    // Reset form
    setTitle('');
    setStartTime('09:00');
    setEndTime('10:00');
    setColor('sage');
    setReminderEnabled(false);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent 
        className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl"
        aria-describedby="add-block-description"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none rounded-3xl" />
        
        <motion.form
          onSubmit={handleSubmit}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative flex flex-col h-full"
        >
          <ResponsiveModalHeader className="mb-2 flex-shrink-0">
            <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <ResponsiveModalTitle>New Time Block</ResponsiveModalTitle>
              <ResponsiveModalDescription id="add-block-description" className="sr-only">
                Create a new scheduled time block for your day.
              </ResponsiveModalDescription>
            </motion.div>
          </ResponsiveModalHeader>

          <ResponsiveModalBody className="space-y-5">
            {/* Title */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                What will you work on?
              </label>
              <Input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Deep work session"
                className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all duration-300"
              />
            </motion.div>

            {/* Time selection */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Start
                </label>
                <TimePickerTrigger
                  value={startTime}
                  onClick={() => setShowStartPicker(true)}
                  className="w-full h-12 justify-center"
                />
                <WheelTimePicker
                  open={showStartPicker}
                  onOpenChange={setShowStartPicker}
                  value={startTime}
                  onChange={setStartTime}
                  title="Start Time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  End
                </label>
                <TimePickerTrigger
                  value={endTime}
                  onClick={() => setShowEndPicker(true)}
                  className="w-full h-12 justify-center"
                />
                <WheelTimePicker
                  open={showEndPicker}
                  onOpenChange={setShowEndPicker}
                  value={endTime}
                  onChange={setEndTime}
                  title="End Time"
                />
              </div>
            </motion.div>

            {/* End Date Picker */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Ends on
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal h-12 rounded-xl justify-start",
                      !selectedEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedEndDate ? format(selectedEndDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 99999 }}>
                  <Calendar
                    mode="single"
                    selected={selectedEndDate}
                    onSelect={setSelectedEndDate}
                    disabled={(date) => {
                      // Disable dates before defaultDate (Start Date)
                      if (defaultDate) {
                        return date < parseDateKey(defaultDate);
                      }
                      return date < new Date(); // Fallback
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </motion.div>

            {/* Category (Color) selection - uses shared component */}
            <motion.div variants={itemVariants}>
              <CategoryChips<BlockColor>
                options={blockColorOptions}
                selected={color}
                onSelect={setColor}
                label="Category"
              />
            </motion.div>

            {/* Reminder toggle */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  {reminderEnabled ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Remind me</p>
                    <p className="text-xs text-muted-foreground">
                      {reminderEnabled ? `At ${startTime}` : 'No reminder'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={setReminderEnabled}
                />
              </div>
            </motion.div>
          </ResponsiveModalBody>

          {/* Sticky footer with CTA */}
          <ResponsiveModalFooter>
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: title.trim() ? 1.02 : 1 }}
              whileTap={{ scale: title.trim() ? 0.98 : 1 }}
              className="w-full"
            >
              <Button
                type="submit"
                disabled={!title.trim()}
                className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 transition-all duration-300"
              >
                Create Block
              </Button>
            </motion.div>
          </ResponsiveModalFooter>
        </motion.form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
