import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Trees, Clock, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTransition } from '@/components/ui/PageTransition';
import { PremiumLandscapeScene } from '@/components/landscape/PremiumLandscapeScene';
import { CollectionSheet } from '@/components/collectibles/CollectionSheet';
import { FocusDebugPanel } from '@/components/focus/FocusDebugPanel';
import { useLandscape } from '@/hooks/useLandscape';
import { useCollectiblesContext } from '@/contexts/CollectiblesContext';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/hooks/useLocalStorage';
import { formatFocusTime, safeNumber } from '@/lib/focusTotals';
type ViewMode = 'day' | 'week' | 'month';

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

// Helper to get week dates
function getWeekDates(date: Date): string[] {
  const result: string[] = [];
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1; // Start from Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result.push(formatDate(d));
  }
  return result;
}

// Helper to get month dates
function getMonthDates(date: Date): string[] {
  const result: string[] = [];
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let i = 1; i <= daysInMonth; i++) {
    result.push(formatDate(new Date(year, month, i)));
  }
  return result;
}

export default function LandscapePage() {
  const { 
    landscapeState, 
    getSeedsForDate, 
    getSessionsByDateRange,
    unlockedCollectibles: landscapeCollectibles, 
    getLandscapeMessage, 
    updateLandscapeState, 
    checkDailyGrowth,
  } = useLandscape();
  
  // Use the canonical focus totals hook for consistent metrics
  const { today: todayTotals, week: weekTotals, focusStreak, isLoaded } = useFocusTotals();
  
  // Use collectibles context
  const { 
    allCollectibles, 
    unlockedCount, 
    totalCount, 
    checkAndUnlock 
  } = useCollectiblesContext();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCollection, setShowCollection] = useState(false);

  useEffect(() => {
    checkDailyGrowth();
    updateLandscapeState();
    // Check for new collectible unlocks
    checkAndUnlock();
  }, []);

  const today = formatDate(new Date());
  const selectedDateKey = formatDate(selectedDate);
  const isToday = selectedDateKey === today;

  // Get seeds for current view
  const viewSeeds = useMemo(() => {
    if (viewMode === 'day') {
      return getSeedsForDate(selectedDateKey);
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(selectedDate);
      const allSeeds: any[] = [];
      weekDates.forEach((dateKey, dayIndex) => {
        const daySeeds = getSeedsForDate(dateKey);
        daySeeds.forEach(seed => {
          allSeeds.push({
            ...seed,
            // Adjust x position to span across week (each day is 1/7 of width)
            xPosition: (dayIndex + seed.xPosition) / 7,
            dayLabel: new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
          });
        });
      });
      return allSeeds;
    } else {
      // Month view - show summary badges
      const monthDates = getMonthDates(selectedDate);
      const allSeeds: any[] = [];
      monthDates.forEach((dateKey, dayIndex) => {
        const daySeeds = getSeedsForDate(dateKey);
        daySeeds.forEach(seed => {
          allSeeds.push({
            ...seed,
            xPosition: (dayIndex + seed.xPosition) / monthDates.length,
            dayOfMonth: dayIndex + 1,
          });
        });
      });
      return allSeeds;
    }
  }, [viewMode, selectedDate, selectedDateKey, getSeedsForDate]);

  // Calculate total minutes for selected view - SAFE derivation, never null
  const viewStats = useMemo(() => {
    let totalMinutes = 0;
    let sessionCount = 0;
    
    if (viewMode === 'day') {
      const seeds = getSeedsForDate(selectedDateKey);
      totalMinutes = seeds.reduce((sum, s) => sum + safeNumber(s.durationMinutes), 0);
      sessionCount = seeds.length;
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(selectedDate);
      weekDates.forEach(dateKey => {
        const daySeeds = getSeedsForDate(dateKey);
        totalMinutes += daySeeds.reduce((sum, s) => sum + safeNumber(s.durationMinutes), 0);
        sessionCount += daySeeds.length;
      });
    } else {
      const monthDates = getMonthDates(selectedDate);
      monthDates.forEach(dateKey => {
        const daySeeds = getSeedsForDate(dateKey);
        totalMinutes += daySeeds.reduce((sum, s) => sum + safeNumber(s.durationMinutes), 0);
        sessionCount += daySeeds.length;
      });
    }
    
    // Ensure we never return NaN
    return { 
      totalMinutes: safeNumber(totalMinutes), 
      sessionCount: safeNumber(sessionCount),
      formatted: formatFocusTime(totalMinutes),
    };
  }, [viewMode, selectedDate, selectedDateKey, getSeedsForDate]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => setSelectedDate(new Date());

  const getDateLabel = () => {
    if (viewMode === 'day') {
      if (isToday) return 'Today';
      return selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(selectedDate);
      const start = new Date(weekDates[0] + 'T00:00:00');
      const end = new Date(weekDates[6] + 'T00:00:00');
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <PageTransition className="bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to="/focus">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">My Landscape</h1>
            <p className="text-xs text-muted-foreground">Your focus journey visualized</p>
          </div>
          
          {/* Collection Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCollection(true)}
            className="rounded-full gap-1.5"
          >
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">{unlockedCount}/{totalCount}</span>
          </Button>
          
          {/* Streak Badge */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{safeNumber(focusStreak)} day streak</span>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 bg-muted/50 rounded-xl p-1">
          {VIEW_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setViewMode(option.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                viewMode === option.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{getDateLabel()}</span>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => navigateDate('next')} disabled={isToday && viewMode === 'day'}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        
        {!isToday && (
          <div className="flex justify-center mt-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
              Go to Today
            </Button>
          </div>
        )}
      </div>

      {/* Main landscape view */}
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="h-[55vh] rounded-3xl overflow-hidden shadow-lg border border-border/30"
        >
          <PremiumLandscapeScene
            landscapeState={landscapeState}
            seeds={viewSeeds}
            unlockedCollectibles={landscapeCollectibles}
            viewMode={viewMode}
            isInteractive={true}
          />
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 grid grid-cols-2 gap-3"
        >
          <div className="bg-card rounded-2xl border border-border/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {viewStats.formatted}
            </div>
            <div className="text-xs text-muted-foreground">Focus time</div>
          </div>
          
          <div className="bg-card rounded-2xl border border-border/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <Trees className="w-4 h-4 text-success" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {viewStats.sessionCount}
            </div>
            <div className="text-xs text-muted-foreground">
              {viewStats.sessionCount === 1 ? 'Session' : 'Sessions'}
            </div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            {viewSeeds.length === 0 
              ? (isToday ? "Start a focus session to grow your landscape" : "No focus sessions on this day")
              : getLandscapeMessage()
            }
          </p>
        </motion.div>

        {/* Collectibles count hint */}
        {unlockedCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-4 text-center"
          >
            <button 
              onClick={() => setShowCollection(true)}
              className="text-xs text-muted-foreground/60 hover:text-primary transition-colors"
            >
              {unlockedCount} collectible{unlockedCount !== 1 ? 's' : ''} discovered — tap to view
            </button>
          </motion.div>
        )}
      </div>

      {/* Collection Sheet */}
      <CollectionSheet
        open={showCollection}
        onOpenChange={setShowCollection}
        collectibles={allCollectibles}
        unlockedCount={unlockedCount}
      />
      
      {/* Debug Panel - only visible with ?debug=1 */}
      <FocusDebugPanel />
    </PageTransition>
  );
}
