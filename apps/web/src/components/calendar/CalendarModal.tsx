import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday,
  getYear,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
} from '@/components/ui/ResponsiveModal';
import { useEvents } from '@/hooks/useEvents';

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onAddEvent: (date: Date) => void;
}

type ViewType = 'month' | 'year';

export function CalendarModal({ 
  open, 
  onOpenChange, 
  selectedDate, 
  onDateSelect,
  onAddEvent,
}: CalendarModalProps) {
  // TWO SEPARATE STATES: viewMonth for navigation, selectedDate for selection
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));
  const [viewType, setViewType] = useState<ViewType>('month');
  const { hasEventsOnDate } = useEvents();

  // Reset viewMonth when modal opens to show the selected date's month
  useEffect(() => {
    if (open) {
      setViewMonth(startOfMonth(selectedDate));
      setViewType('month');
    }
  }, [open, selectedDate]);

  // PURE navigation - creates NEW Date objects, never mutates
  const handlePrevMonth = useCallback(() => {
    setViewMonth(prev => startOfMonth(subMonths(prev, 1)));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth(prev => startOfMonth(addMonths(prev, 1)));
  }, []);

  const handlePrevYear = useCallback(() => {
    setViewMonth(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(prev.getFullYear() - 1);
      return startOfMonth(newDate);
    });
  }, []);

  const handleNextYear = useCallback(() => {
    setViewMonth(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(prev.getFullYear() + 1);
      return startOfMonth(newDate);
    });
  }, []);

  // Go to current day - sets both viewMonth and selectedDate
  const handleGoToToday = useCallback(() => {
    const today = new Date();
    setViewMonth(startOfMonth(today));
    onDateSelect(today);
    onOpenChange(false);
  }, [onDateSelect, onOpenChange]);

  // Select a day - updates selectedDate and closes modal
  const handleDayClick = useCallback((day: Date) => {
    onDateSelect(day);
    onOpenChange(false);
  }, [onDateSelect, onOpenChange]);

  // Select a month from year view
  const handleMonthClick = useCallback((monthIndex: number) => {
    setViewMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(monthIndex);
      return startOfMonth(newDate);
    });
    setViewType('month');
  }, []);

  const handleAddEventClick = useCallback(() => {
    onAddEvent(selectedDate);
    onOpenChange(false);
  }, [selectedDate, onAddEvent, onOpenChange]);

  // Calculate days for the current view month
  const days = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = useMemo(() => {
    return startOfMonth(viewMonth).getDay();
  }, [viewMonth]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = getYear(viewMonth);

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl">
        <AnimatePresence mode="wait">
          {viewType === 'month' ? (
            <motion.div
              key="month-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              {/* Month View Header - Sticky */}
              <ResponsiveModalHeader className="flex flex-row items-center justify-between gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-9 w-9 shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <button 
                  onClick={() => setViewType('year')}
                  className="flex-1 text-center hover:bg-muted/50 rounded-lg py-1 px-2 transition-colors"
                >
                  <ResponsiveModalTitle className="text-lg font-semibold">
                    {format(viewMonth, 'MMMM yyyy')}
                  </ResponsiveModalTitle>
                </button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-9 w-9 shrink-0"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </ResponsiveModalHeader>

              {/* Scrollable Body */}
              <ResponsiveModalBody>
                {/* Today Button */}
                <div className="flex justify-center mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoToToday}
                    className="gap-2"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Go to Today
                  </Button>
                </div>

                {/* Week day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map(day => (
                    <div 
                      key={day} 
                      className="text-center text-xs font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before the month starts */}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {/* Days of the month */}
                  {days.map(day => {
                    const dateString = format(day, 'yyyy-MM-dd');
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    const hasEvents = hasEventsOnDate(dateString);

                    return (
                      <motion.button
                        key={dateString}
                        onClick={() => handleDayClick(day)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          relative aspect-square flex flex-col items-center justify-center rounded-xl
                          transition-colors duration-200 touch-manipulation min-h-[40px]
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : isCurrentDay
                              ? 'ring-2 ring-primary/50 text-foreground'
                              : 'hover:bg-muted/50 text-foreground'
                          }
                        `}
                      >
                        <span className="text-sm font-medium">
                          {format(day, 'd')}
                        </span>
                        
                        {/* Event indicator dot */}
                        {hasEvents && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`
                              absolute bottom-1.5 w-1 h-1 rounded-full
                              ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}
                            `}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </ResponsiveModalBody>

              {/* Footer with selected date and add event */}
              <ResponsiveModalFooter className="flex-col gap-3">
                <motion.div
                  key={format(selectedDate, 'yyyy-MM-dd')}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between w-full"
                >
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Selected</p>
                    <p className="font-medium text-sm">{format(selectedDate, 'EEE, MMM d, yyyy')}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddEventClick}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Event
                  </Button>
                </motion.div>
              </ResponsiveModalFooter>
            </motion.div>
          ) : (
            <motion.div
              key="year-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              {/* Year View Header - Sticky */}
              <ResponsiveModalHeader className="flex flex-row items-center justify-between gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handlePrevYear}
                  className="h-9 w-9 shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <button 
                  onClick={() => setViewType('month')}
                  className="flex-1 text-center hover:bg-muted/50 rounded-lg py-1 px-2 transition-colors"
                >
                  <ResponsiveModalTitle className="text-lg font-semibold">
                    {currentYear}
                  </ResponsiveModalTitle>
                </button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleNextYear}
                  className="h-9 w-9 shrink-0"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </ResponsiveModalHeader>

              {/* Scrollable Body */}
              <ResponsiveModalBody>
                {/* Today Button */}
                <div className="flex justify-center mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoToToday}
                    className="gap-2"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Go to Today
                  </Button>
                </div>

                {/* 12 Months Grid (3x4) */}
                <div className="grid grid-cols-3 gap-3">
                  {months.map((month, index) => {
                    const isCurrentMonth = new Date().getMonth() === index && 
                                           new Date().getFullYear() === currentYear;
                    const isSelectedMonth = selectedDate.getMonth() === index && 
                                           selectedDate.getFullYear() === currentYear;

                    return (
                      <motion.button
                        key={month}
                        onClick={() => handleMonthClick(index)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          py-4 px-3 rounded-xl text-sm font-medium touch-manipulation
                          transition-colors duration-200
                          ${isSelectedMonth 
                            ? 'bg-primary text-primary-foreground' 
                            : isCurrentMonth
                              ? 'ring-2 ring-primary/50 text-foreground'
                              : 'hover:bg-muted/50 text-foreground bg-muted/20'
                          }
                        `}
                      >
                        {month}
                      </motion.button>
                    );
                  })}
                </div>
              </ResponsiveModalBody>

              {/* Footer with back button */}
              <ResponsiveModalFooter>
                <Button
                  variant="ghost"
                  onClick={() => setViewType('month')}
                  className="w-full text-muted-foreground"
                >
                  Back to Month View
                </Button>
              </ResponsiveModalFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
