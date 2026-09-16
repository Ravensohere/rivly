/**
 * ActivityHeatmap - GitHub/LeetCode-style activity visualization
 * 
 * Shows user activity over time with:
 * - Week/Month/Year toggle
 * - Day detail sheet on tap
 * - Streak statistics
 * - Stagger fade-in animation
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Calendar, TrendingUp, Clock, Target, CheckCircle2, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useCloseDay } from '@/hooks/useCloseDay';
import { generateHeatmapData, getIntensityLevel, DayActivity } from '@/lib/activityDerivation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { getLocalDateKey, formatDateKeyDisplay } from '@/lib/dateUtils';

type HeatmapRange = 'week' | 'month' | 'year';

interface ActivityHeatmapProps {
  className?: string;
}

// Intensity colors (pastel-friendly, not childish)
const intensityColors = [
  'bg-muted/30',           // 0 - no activity
  'bg-primary/20',         // 1 - light
  'bg-primary/40',         // 2 - medium
  'bg-primary/60',         // 3 - high
  'bg-primary/90',         // 4 - very high
];

const rangeLabels: Record<HeatmapRange, string> = {
  week: '7 Days',
  month: 'Month',
  year: 'Year',
};

export function ActivityHeatmap({ className }: ActivityHeatmapProps) {
  const { focusSessions, taskEvents, sleepEvents } = useEventsLedgerContext();
  const { entries: reflectEntries } = useCloseDay();
  const [range, setRange] = useState<HeatmapRange>('month');
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    return generateHeatmapData(
      focusSessions,
      taskEvents,
      sleepEvents,
      reflectEntries,
      [], // morning bridge days - could be added later
      range
    );
  }, [focusSessions, taskEvents, sleepEvents, reflectEntries, range]);

  const today = getLocalDateKey();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Activity</span>
        </div>
        
        {/* Range Toggle */}
        <div className="flex rounded-xl bg-muted/50 p-1">
          {(['week', 'month', 'year'] as HeatmapRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                range === r
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-3 text-center border border-border/40">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-lg font-bold text-foreground">{heatmapData.stats.currentStreak}</span>
          </div>
          <span className="text-xs text-muted-foreground">Current</span>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/40">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-lg font-bold text-foreground">{heatmapData.stats.longestStreak}</span>
          </div>
          <span className="text-xs text-muted-foreground">Best</span>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/40">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-lg font-bold text-foreground">{heatmapData.stats.daysActive}</span>
          </div>
          <span className="text-xs text-muted-foreground">Active</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="bg-card rounded-2xl border border-border/40 p-4">
        {range === 'year' ? (
          <YearHeatmap 
            days={heatmapData.days} 
            today={today}
            onDayClick={setSelectedDay} 
          />
        ) : range === 'month' ? (
          <MonthHeatmap 
            days={heatmapData.days} 
            today={today}
            onDayClick={setSelectedDay} 
          />
        ) : (
          <WeekHeatmap 
            days={heatmapData.days} 
            today={today}
            onDayClick={setSelectedDay} 
          />
        )}

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          {intensityColors.map((color, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-sm', color)} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Day Detail Sheet */}
      <DayDetailSheet
        day={selectedDay}
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </div>
  );
}

// ===== Week Heatmap =====

function WeekHeatmap({ 
  days, 
  today, 
  onDayClick 
}: { 
  days: DayActivity[]; 
  today: string;
  onDayClick: (day: DayActivity) => void;
}) {
  // Use unique labels (Sa/Su for Saturday/Sunday)
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'Sa', 'Su'];
  return (
    <div className="flex gap-2 justify-between">
      {days.map((day, index) => {
        const intensity = getIntensityLevel(day.activityScore);
        const isToday = day.dateKey === today;
        const dayOfWeek = new Date(day.dateKey + 'T00:00:00').getDay();
        const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0

        return (
          <motion.button
            key={day.dateKey}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onDayClick(day)}
            className="flex flex-col items-center gap-2 flex-1"
          >
            <span className="text-xs text-muted-foreground">
              {dayLabels[adjustedDayIndex]}
            </span>
            <div
              className={cn(
                'w-10 h-10 rounded-xl transition-transform hover:scale-110',
                intensityColors[intensity],
                isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
}

// ===== Month Heatmap =====

function MonthHeatmap({ 
  days, 
  today, 
  onDayClick 
}: { 
  days: DayActivity[]; 
  today: string;
  onDayClick: (day: DayActivity) => void;
}) {
  // Group days into weeks (rows)
  const weeks: DayActivity[][] = [];
  let currentWeek: DayActivity[] = [];

  // Pad the beginning if month doesn't start on Monday
  if (days.length > 0) {
    const firstDay = new Date(days[0].dateKey + 'T00:00:00').getDay();
    const paddingDays = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < paddingDays; i++) {
      currentWeek.push({
        dateKey: '',
        focusMinutes: 0,
        focusSessions: 0,
        tasksDone: 0,
        reflectDone: false,
        sleepLogged: false,
        morningBridgeDone: false,
        activityScore: 0,
        isActive: false,
      });
    }
  }

  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <div className="space-y-1.5">
      {/* Day headers - use unique labels */}
      <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
        {['M', 'T', 'W', 'T', 'F', 'Sa', 'Su'].map((d, i) => (
          <span key={i} className="text-xs text-muted-foreground">{d}</span>
        ))}
      </div>
      
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1.5">
          {week.map((day, dayIndex) => {
            if (!day.dateKey) {
              return <div key={dayIndex} className="w-full aspect-square" />;
            }
            
            const intensity = getIntensityLevel(day.activityScore);
            const isToday = day.dateKey === today;

            return (
              <motion.button
                key={day.dateKey}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (weekIndex * 7 + dayIndex) * 0.01 }}
                onClick={() => onDayClick(day)}
                className={cn(
                  'w-full aspect-square rounded-md transition-transform hover:scale-110',
                  intensityColors[intensity],
                  isToday && 'ring-2 ring-primary'
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ===== Year Heatmap =====

function YearHeatmap({ 
  days, 
  today, 
  onDayClick 
}: { 
  days: DayActivity[]; 
  today: string;
  onDayClick: (day: DayActivity) => void;
}) {
  // Group by week columns (GitHub style)
  const weeks: DayActivity[][] = [];
  let currentWeek: DayActivity[] = [];

  // Pad beginning to align with day of week
  if (days.length > 0) {
    const firstDay = new Date(days[0].dateKey + 'T00:00:00').getDay();
    const paddingDays = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < paddingDays; i++) {
      currentWeek.push({
        dateKey: '',
        focusMinutes: 0,
        focusSessions: 0,
        tasksDone: 0,
        reflectDone: false,
        sleepLogged: false,
        morningBridgeDone: false,
        activityScore: 0,
        isActive: false,
      });
    }
  }

  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    // Pad end of last week
    while (currentWeek.length < 7) {
      currentWeek.push({
        dateKey: '',
        focusMinutes: 0,
        focusSessions: 0,
        tasksDone: 0,
        reflectDone: false,
        sleepLogged: false,
        morningBridgeDone: false,
        activityScore: 0,
        isActive: false,
      });
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex gap-0.5 min-w-max">
        {/* Day labels with unique Sa/Su */}
        <div className="flex flex-col gap-0.5 mr-1">
          {['', 'M', '', 'W', '', 'F', 'Sa'].map((d, i) => (
            <div key={i} className="h-2.5 flex items-center">
              <span className="text-[10px] text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5">
            {week.map((day, dayIndex) => {
              if (!day.dateKey) {
                return <div key={dayIndex} className="w-2.5 h-2.5" />;
              }

              const intensity = getIntensityLevel(day.activityScore);
              const isToday = day.dateKey === today;

              return (
                <motion.button
                  key={day.dateKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(weekIndex * 0.005, 0.5) }}
                  onClick={() => onDayClick(day)}
                  title={`${formatDateKeyDisplay(day.dateKey)}: ${day.activityScore > 0 ? 'Active' : 'No activity'}`}
                  className={cn(
                    'w-2.5 h-2.5 rounded-sm transition-all hover:scale-150',
                    intensityColors[intensity],
                    isToday && 'ring-1 ring-primary'
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Day Detail Sheet =====

function DayDetailSheet({ 
  day, 
  open, 
  onOpenChange 
}: { 
  day: DayActivity | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  if (!day) return null;

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {formatDateKeyDisplay(day.dateKey)}
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="pb-8">
          <div className="space-y-3">
            {/* Focus */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">Focus Time</span>
              </div>
              <span className="font-semibold text-foreground">
                {day.focusMinutes > 0 ? formatMinutes(day.focusMinutes) : '—'}
              </span>
            </div>

            {/* Sessions */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">Sessions</span>
              </div>
              <span className="font-semibold text-foreground">
                {day.focusSessions > 0 ? day.focusSessions : '—'}
              </span>
            </div>

            {/* Tasks */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">Tasks Done</span>
              </div>
              <span className="font-semibold text-foreground">
                {day.tasksDone > 0 ? day.tasksDone : '—'}
              </span>
            </div>

            {/* Reflection */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">Day Closed</span>
              </div>
              <span className={cn(
                'font-semibold',
                day.reflectDone ? 'text-primary' : 'text-muted-foreground'
              )}>
                {day.reflectDone ? '✓ Yes' : '—'}
              </span>
            </div>

            {/* Activity Summary */}
            <div className="mt-4 p-4 rounded-xl bg-primary/5 text-center">
              {day.isActive ? (
                <>
                  <span className="text-2xl mb-2 block">🌿</span>
                  <p className="text-sm text-foreground font-medium">Active Day</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Activity score: {Math.round(day.activityScore)}
                  </p>
                </>
              ) : (
                <>
                  <span className="text-2xl mb-2 block">💤</span>
                  <p className="text-sm text-muted-foreground">Rest day</p>
                </>
              )}
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
