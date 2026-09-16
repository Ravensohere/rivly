/**
 * CloseYourDay - Component for the daily reflection flow
 * 
 * Features:
 * - One-time submission per day (read-only after)
 * - Calm confirmation state
 * - Optional CTA to write more in journal
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Moon, X, BookOpen, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DayStateIcon } from '@/components/reflection/DayStateIcon';
import { useCloseDay } from '@/hooks/useCloseDay';
import { useCollectiblesContext } from '@/contexts/CollectiblesContext';
import { CloseDayEntry, DayRating, DailyWin, DAY_RATING_OPTIONS, DAILY_WIN_OPTIONS, getDayRatingEmoji, getDayRatingLabel, getDailyWinLabel } from '@/types/reflect';
import { getLocalDateKey } from '@/lib/dateUtils';
import { format, parseISO, subDays, addDays } from 'date-fns';

interface CloseYourDayProps {
  onWriteInJournal?: () => void;
}

export function CloseYourDay({ onWriteInJournal }: CloseYourDayProps) {
  const { 
    isTodayClosed, 
    closeDay, 
    getEntryForDate, 
    getRecentEntries 
  } = useCloseDay();
  const { checkAndUnlock } = useCollectiblesContext();
  
  const today = getLocalDateKey();
  const todayEntry = getEntryForDate(today);
  
  // Form state (only used when not yet closed)
  const [dayRating, setDayRating] = useState<DayRating | null>(null);
  const [tomorrowIntent, setTomorrowIntent] = useState('');
  const [selectedWins, setSelectedWins] = useState<DailyWin[]>([]);
  const [isAddingCustomWin, setIsAddingCustomWin] = useState(false);
  const [customWinInput, setCustomWinInput] = useState('');
  
  // UI state
  const [justClosed, setJustClosed] = useState(false);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  
  const recentEntries = getRecentEntries(7);
  
  const isFormComplete = dayRating !== null && selectedWins.length > 0;
  
  const handleToggleWin = (win: DailyWin) => {
    setSelectedWins(prev => 
      prev.includes(win) 
        ? prev.filter(w => w !== win)
        : [...prev, win]
    );
  };

  const handleAddCustomWin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const win = customWinInput.trim();
    if (win && !selectedWins.includes(win)) {
      setSelectedWins(prev => [...prev, win]);
      setCustomWinInput('');
      setIsAddingCustomWin(false);
    }
  };
  
  const handleCloseDay = () => {
    if (!dayRating || selectedWins.length === 0) return;
    
    const entry = closeDay({
      dayRating,
      tomorrowIntent: tomorrowIntent.trim(),
      wins: selectedWins,
    });
    
    if (entry) {
      setJustClosed(true);
      // Check for collectible unlocks
      setTimeout(() => {
        checkAndUnlock();
      }, 500);
    }
  };
  
  const handleViewPast = (date: string) => {
    setViewingDate(date);
  };
  
  const viewingEntry = viewingDate ? getEntryForDate(viewingDate) : null;
  
  // If today is already closed, show the closed state
  if (isTodayClosed && !justClosed) {
    return (
      <ClosedDayView 
        entry={todayEntry!}
        recentEntries={recentEntries.filter(e => e.date !== today)}
        onViewPast={handleViewPast}
        viewingEntry={viewingEntry}
        viewingDate={viewingDate}
        onCloseViewer={() => setViewingDate(null)}
        onWriteInJournal={onWriteInJournal}
      />
    );
  }
  
  // Just closed celebration
  if (justClosed && todayEntry) {
    return (
      <JustClosedView 
        entry={todayEntry}
        onWriteInJournal={onWriteInJournal}
        onDone={() => setJustClosed(false)}
      />
    );
  }
  
  // Form to close the day
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center pt-2">
        <motion.div
          className="inline-flex items-center gap-2 mb-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Sparkles className="w-4 h-4 text-primary/60" />
        </motion.div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Close Your Day
        </h1>
        <p className="text-sm text-muted-foreground">
          A moment to reflect and let go
        </p>
      </div>

      {/* Day Rating */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">How was your day?</p>
        <div className="flex justify-center gap-4">
          {DAY_RATING_OPTIONS.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDayRating(option.value)}
              className={`relative flex flex-col items-center gap-3 p-5 rounded-3xl transition-all duration-300 ${
                dayRating === option.value
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-secondary/50 hover:bg-secondary/80'
              }`}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span className="text-xs font-medium">{option.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tomorrow Intent */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          What would you do differently tomorrow?
        </p>
        <Textarea
          placeholder="Take your time..."
          value={tomorrowIntent}
          onChange={(e) => setTomorrowIntent(e.target.value)}
          className="min-h-[100px] resize-none rounded-2xl bg-secondary/30 border-border/30 focus:border-primary/50 transition-all duration-300"
        />
      </div>

      {/* Daily Wins (Multi-select) */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          What counts as a win today? (Select all that apply)
        </p>
        <div className="flex flex-wrap gap-2">
          {DAILY_WIN_OPTIONS.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleToggleWin(option.value)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                selectedWins.includes(option.value)
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
              }`}
            >
              <span>{option.emoji}</span>
              {option.label}
            </motion.button>
          ))}

          {/* Render custom selected wins that aren't in options */}
          {selectedWins.filter(win => !DAILY_WIN_OPTIONS.some(opt => opt.value === win)).map((customWin, idx) => (
            <motion.button
              key={customWin}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleToggleWin(customWin)}
              className="px-4 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-md flex items-center gap-2"
            >
              <span>✨</span>
              {customWin}
            </motion.button>
          ))}

          {/* Add Custom Win Button/Input */}
          <AnimatePresence mode="wait">
            {!isAddingCustomWin ? (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddingCustomWin(true)}
                className="px-4 py-2.5 rounded-full text-sm font-medium bg-secondary/30 hover:bg-secondary/50 text-muted-foreground border border-dashed border-border/50 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add custom
              </motion.button>
            ) : (
              <motion.div
                key="add-input"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center"
              >
                <form 
                  onSubmit={handleAddCustomWin}
                  className="flex items-center gap-2 bg-secondary/50 rounded-full px-3 py-1 border border-primary/30"
                >
                  <input
                    autoFocus
                    value={customWinInput}
                    onChange={(e) => setCustomWinInput(e.target.value)}
                    placeholder="E.g. Drank 2L water"
                    className="bg-transparent border-none outline-none text-sm py-1 placeholder:text-muted-foreground/50 min-w-[120px]"
                    onBlur={() => {
                      if (!customWinInput.trim()) setIsAddingCustomWin(false);
                    }}
                  />
                  <button 
                    type="submit"
                    className="p-1 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-transform"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingCustomWin(false)}
                    className="p-1 rounded-full text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Close Button */}
      <Button
        onClick={handleCloseDay}
        disabled={!isFormComplete}
        className="w-full h-14 rounded-2xl text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Moon className="w-5 h-5 mr-2" />
        Close my day
      </Button>

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <div className="pt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Recent reflections</p>
          <div className="space-y-2">
            {recentEntries.slice(0, 5).map((entry) => (
              <button
                key={entry.date}
                onClick={() => handleViewPast(entry.date)}
                className="w-full p-3 rounded-xl bg-secondary/50 text-left hover:bg-secondary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {format(parseISO(entry.date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-sm">
                    {getDayRatingEmoji(entry.dayRating)}
                  </span>
                </div>
                {entry.tomorrowIntent && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {entry.tomorrowIntent}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View Past Entry Modal */}
      <PastEntryModal
        entry={viewingEntry}
        date={viewingDate}
        onClose={() => setViewingDate(null)}
      />
    </motion.div>
  );
}

// Sub-component: Already closed today view
function ClosedDayView({ 
  entry,
  recentEntries,
  onViewPast,
  viewingEntry,
  viewingDate,
  onCloseViewer,
  onWriteInJournal,
}: {
  entry: CloseDayEntry;
  recentEntries: CloseDayEntry[];
  onViewPast: (date: string) => void;
  viewingEntry: CloseDayEntry | null;
  viewingDate: string | null;
  onCloseViewer: () => void;
  onWriteInJournal?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="text-center pt-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Check className="w-10 h-10 text-primary" />
        </motion.div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Day Closed
        </h1>
        <p className="text-sm text-muted-foreground">
          You've already reflected on today. Rest well.
        </p>
      </div>
      
      {/* Today's summary */}
      <div className="p-6 rounded-2xl bg-secondary/30 border border-border/30 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Today's mood</span>
          <span className="flex items-center gap-2">
            <span className="text-lg">{getDayRatingEmoji(entry.dayRating)}</span>
            <span className="text-sm font-medium">{getDayRatingLabel(entry.dayRating)}</span>
          </span>
        </div>
        
        {entry.tomorrowIntent && (
          <div>
            <span className="text-sm text-muted-foreground">Tomorrow's intent</span>
            <p className="text-sm text-foreground mt-1">{entry.tomorrowIntent}</p>
          </div>
        )}
        
        <div>
          <span className="text-sm text-muted-foreground">Wins</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {entry.wins.map(win => (
              <span key={win} className="px-3 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary flex items-center gap-1.5">
                <span>{DAILY_WIN_OPTIONS.find(o => o.value === win)?.emoji || '✨'}</span>
                {getDailyWinLabel(win)}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* CTA to write in journal */}
      {onWriteInJournal && (
        <Button
          variant="outline"
          onClick={onWriteInJournal}
          className="w-full h-12 rounded-2xl"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Write more in Journal
        </Button>
      )}
      
      {/* Recent entries */}
      {recentEntries.length > 0 && (
        <div className="pt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Recent reflections</p>
          <div className="space-y-2">
            {recentEntries.slice(0, 5).map((e) => (
              <button
                key={e.date}
                onClick={() => onViewPast(e.date)}
                className="w-full p-3 rounded-xl bg-secondary/50 text-left hover:bg-secondary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {format(parseISO(e.date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-sm">
                    {getDayRatingEmoji(e.dayRating)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <PastEntryModal entry={viewingEntry} date={viewingDate} onClose={onCloseViewer} />
    </motion.div>
  );
}

// Sub-component: Just closed celebration
function JustClosedView({ 
  entry,
  onWriteInJournal,
  onDone,
}: {
  entry: CloseDayEntry;
  onWriteInJournal?: () => void;
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 p-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <Moon className="w-12 h-12 text-primary" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Day closed
        </h1>
        <p className="text-muted-foreground">
          Rest well. Tomorrow is a fresh start.
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col gap-3 w-full max-w-xs pt-4"
      >
        {onWriteInJournal && (
          <Button
            variant="outline"
            onClick={onWriteInJournal}
            className="w-full rounded-2xl"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Write more in Journal
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onDone}
          className="w-full rounded-2xl text-muted-foreground"
        >
          Done
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Sub-component: Past entry modal
function PastEntryModal({ 
  entry,
  date,
  onClose,
}: {
  entry: CloseDayEntry | null;
  date: string | null;
  onClose: () => void;
}) {
  if (!entry || !date) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4 border border-border/40"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {format(parseISO(date), 'MMMM d, yyyy')}
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xl">{getDayRatingEmoji(entry.dayRating)}</span>
            <span className="text-sm font-medium">{getDayRatingLabel(entry.dayRating)}</span>
          </div>
          
          {entry.tomorrowIntent && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tomorrow's intent</p>
              <p className="text-sm text-foreground">{entry.tomorrowIntent}</p>
            </div>
          )}
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">Wins</p>
            <div className="flex flex-wrap gap-2">
              {entry.wins.map(win => (
                <span key={win} className="px-2 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary flex items-center gap-1.5">
                  <span>{DAILY_WIN_OPTIONS.find(o => o.value === win)?.emoji || '✨'}</span>
                  {getDailyWinLabel(win)}
                </span>
              ))}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Closed at {format(parseISO(entry.closedAt), 'h:mm a')}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
