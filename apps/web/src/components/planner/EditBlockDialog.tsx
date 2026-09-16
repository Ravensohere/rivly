/**
 * EditBlockDialog - Full edit dialog for time blocks
 * Uses ResponsiveModal for proper mobile/desktop behavior
 * No "Start Focus" - blocks are for time planning only
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TimeBlock, BlockColor } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trash2, Check, Edit3, Bell, BellOff, Sparkles, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { WheelTimePicker, TimePickerTrigger } from '@/components/ui/WheelTimePicker';
import { CategoryChips, blockColorOptions } from './CategoryChips';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseDateKey } from '@/lib/dateUtils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EditBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: TimeBlock | null;
  onSave: (updates: Partial<TimeBlock>) => void;
  onDelete: () => void;
  onComplete: () => void;
}

// Animation variants
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

// Determine block status based on time and completion
function getBlockStatus(block: TimeBlock): 'upcoming' | 'active' | 'missed' | 'completed' {
  if (block.status === 'completed') return 'completed';
  if (block.status === 'inProgress') return 'active';
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = block.startTime.split(':').map(Number);
  const [endH, endM] = block.endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  if (currentMinutes < startMinutes) return 'upcoming';
  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return 'active';
  if (currentMinutes >= endMinutes) return 'missed';
  
  return 'upcoming';
}

export function EditBlockDialog({ 
  open, 
  onOpenChange, 
  block, 
  onSave, 
  onDelete,
  onComplete,
}: EditBlockDialogProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(''); // Start date
  const [endDate, setEndDate] = useState(''); // End date
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState<BlockColor>('sage');
  const [notes, setNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (block && open) {
      setTitle(block.title);
      setDate(block.dateKey || block.date || '');
      // Initialize endDateKey, fallback to dateKey (start date) if not present
      setEndDate(block.endDateKey || block.dateKey || block.date || '');
      setStartTime(block.startTime);
      setEndTime(block.endTime);
      setColor(block.color as BlockColor);
      setNotes(block.notes || '');
      setReminderEnabled(!!block.reminder);
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [block, open]);

  if (!block) return null;

  const status = getBlockStatus(block);
  const isCompleted = status === 'completed';
  const isMissed = status === 'missed';

  const handleSave = () => {
    onSave({
      title: title.trim(),
      dateKey: date,
      endDateKey: endDate,
      startTime,
      endTime,
      color,
      notes: notes.trim() || undefined,
      reminder: reminderEnabled ? startTime : undefined,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
  };

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none rounded-3xl" />
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative flex flex-col h-full"
          >
            <ResponsiveModalHeader className="mb-2 flex-shrink-0">
              <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                <ResponsiveModalTitle>Edit Time Block</ResponsiveModalTitle>
                <ResponsiveModalDescription className="sr-only">
                  Edit the details of your scheduled time block.
                </ResponsiveModalDescription>
              </motion.div>
              
              {/* Status indicator */}
              {(isCompleted || isMissed) && (
                <motion.div 
                  variants={itemVariants}
                  className="flex justify-center mt-2"
                >
                  <span className={`
                    px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5
                    ${isCompleted 
                      ? 'bg-primary/15 text-primary' 
                      : 'bg-destructive/15 text-destructive'
                    }
                  `}>
                    {isCompleted ? (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Completed
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        Missed
                      </>
                    )}
                  </span>
                </motion.div>
              )}
            </ResponsiveModalHeader>

            <ResponsiveModalBody className="space-y-5">
              {/* Title */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Title
                </label>
                <Input
                  ref={inputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Block title"
                  className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all duration-300"
                />
              </motion.div>

              {/* Start Date */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal h-12 rounded-xl justify-start",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(parseDateKey(date), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 99999 }}>
                    <Calendar
                      mode="single"
                      selected={date ? parseDateKey(date) : undefined}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setDate(format(newDate, 'yyyy-MM-dd'));
                          // If end date is before new start date, update it
                          if (endDate && newDate > parseDateKey(endDate)) {
                            setEndDate(format(newDate, 'yyyy-MM-dd'));
                          }
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </motion.div>

              {/* End Date */}
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
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(parseDateKey(endDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 99999 }}>
                    <Calendar
                      mode="single"
                      selected={endDate ? parseDateKey(endDate) : undefined}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setEndDate(format(newDate, 'yyyy-MM-dd'));
                        }
                      }}
                      disabled={(d) => {
                        // Disable dates before start date
                        if (date) {
                          return d < parseDateKey(date);
                        }
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </motion.div>

              {/* Time range */}
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

              {/* Category selection - uses shared component */}
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
                      <p className="text-sm font-medium">Reminder</p>
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

              {/* Notes */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="min-h-[80px] rounded-xl resize-none border-border/50 bg-muted/30 focus:bg-background transition-all duration-300"
                />
              </motion.div>
            </ResponsiveModalBody>

            {/* Sticky footer */}
            <ResponsiveModalFooter>
              {/* Complete button (if not completed) */}
              {!isCompleted && (
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full"
                >
                  <Button
                    onClick={handleComplete}
                    className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 transition-all duration-300"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Mark Complete
                  </Button>
                </motion.div>
              )}
              
              {/* Secondary actions */}
              <motion.div variants={itemVariants} className="flex gap-3 w-full">
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  className="flex-1 h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!title.trim()}
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                >
                  Save Changes
                </Button>
              </motion.div>
            </ResponsiveModalFooter>
          </motion.div>
        </ResponsiveModalContent>
      </ResponsiveModal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this time block?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The time block will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
