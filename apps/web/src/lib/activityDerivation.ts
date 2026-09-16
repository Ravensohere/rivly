/**
 * Activity Derivation - Single source of truth for all activity-based analytics
 * 
 * This module derives activity data from the Events Ledger for:
 * - Achievements (ledger-derived)
 * - Heatmap visualization
 * - Streak calculations
 */

import { FocusSessionEvent, TaskEvent, SleepEvent } from '@/types/events';
import { CloseDayEntry } from '@/types/reflect';
import { getLocalDateKey } from '@/lib/dateUtils';
import { getActualCompletedTasks } from '@/lib/aggregation';

// ===== Types =====

export interface DayActivity {
  dateKey: string;
  focusMinutes: number;
  focusSessions: number;
  tasksDone: number;
  reflectDone: boolean;
  sleepLogged: boolean;
  morningBridgeDone: boolean;
  activityScore: number; // Weighted score for heatmap intensity
  isActive: boolean; // Has at least one qualifying activity
}

export interface ActivityStats {
  totalFocusMinutes: number;
  totalFocusSessions: number;
  totalTasksDone: number;
  totalReflectDays: number;
  totalSleepDays: number;
  currentStreak: number;
  longestStreak: number;
  daysActive: number;
}

export interface HeatmapData {
  days: DayActivity[];
  stats: ActivityStats;
}

// ===== Core Activity Derivation =====

/**
 * Derives activity data for each day from ledger events
 * This is the SINGLE source of truth for all activity-based calculations
 */
export function deriveActivityByDay(
  focusSessions: FocusSessionEvent[],
  taskEvents: TaskEvent[],
  sleepEvents: SleepEvent[],
  reflectEntries: CloseDayEntry[],
  morningBridgeDays: string[], // dayKeys where morning bridge was completed
  range: { start: string; end: string }
): Map<string, DayActivity> {
  const activityMap = new Map<string, DayActivity>();

  // Helper to get or create day entry
  const getDay = (dateKey: string): DayActivity => {
    if (!activityMap.has(dateKey)) {
      activityMap.set(dateKey, {
        dateKey,
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
    return activityMap.get(dateKey)!;
  };

  // Process focus sessions
  focusSessions.forEach(session => {
    if (!session?.dateKey) return;
    const day = getDay(session.dateKey);
    day.focusMinutes += session.durationMin || 0;
    day.focusSessions += 1;
  });

  // Process task events - use last-event-wins per day
  const tasksByDay = new Map<string, TaskEvent[]>();
  taskEvents.forEach(event => {
    if (!event?.dateKey) return;
    if (!tasksByDay.has(event.dateKey)) {
      tasksByDay.set(event.dateKey, []);
    }
    tasksByDay.get(event.dateKey)!.push(event);
  });

  tasksByDay.forEach((events, dateKey) => {
    const day = getDay(dateKey);
    day.tasksDone = getActualCompletedTasks(events);
  });

  // Process reflect entries
  reflectEntries.forEach(entry => {
    if (!entry?.date) return;
    const day = getDay(entry.date);
    day.reflectDone = true;
  });

  // Process sleep events
  sleepEvents.forEach(event => {
    if (!event?.dateKey) return;
    const day = getDay(event.dateKey);
    day.sleepLogged = true;
  });

  // Process morning bridge completions
  morningBridgeDays.forEach(dateKey => {
    const day = getDay(dateKey);
    day.morningBridgeDone = true;
  });

  // Calculate activity score and isActive for each day
  activityMap.forEach(day => {
    // A day is "active" if it has at least one of:
    // - Focus session
    // - Task completed
    // - Reflection closed
    // - Sleep logged
    // - Morning bridge done
    day.isActive = 
      day.focusSessions > 0 ||
      day.tasksDone > 0 ||
      day.reflectDone ||
      day.sleepLogged ||
      day.morningBridgeDone;

    // Activity score for heatmap intensity (weighted)
    day.activityScore = 
      (day.focusMinutes / 15) + // 15 min = 1 point
      (day.focusSessions * 2) + // Each session = 2 points
      (day.tasksDone * 1.5) + // Each task = 1.5 points
      (day.reflectDone ? 3 : 0) + // Reflect = 3 points
      (day.sleepLogged ? 1 : 0) + // Sleep = 1 point
      (day.morningBridgeDone ? 2 : 0); // Morning bridge = 2 points
  });

  return activityMap;
}

// ===== Streak Calculation (ledger-derived) =====

/**
 * Calculates current and longest streak from activity data
 * Uses the canonical "active day" definition
 */
export function calculateActivityStreaks(activityMap: Map<string, DayActivity>): {
  currentStreak: number;
  longestStreak: number;
} {
  // Get all active days sorted descending
  const activeDays = Array.from(activityMap.values())
    .filter(d => d.isActive)
    .map(d => d.dateKey)
    .sort((a, b) => b.localeCompare(a));

  if (activeDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const today = getLocalDateKey();
  const yesterday = getLocalDateKey(new Date(Date.now() - 86400000));

  // Calculate longest streak from all data
  let longestStreak = 1;
  let currentRun = 1;

  const sortedAsc = [...activeDays].sort();
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1] + 'T00:00:00');
    const curr = new Date(sortedAsc[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      currentRun++;
      longestStreak = Math.max(longestStreak, currentRun);
    } else if (diffDays > 1) {
      currentRun = 1;
    }
  }

  // Calculate current streak (counting back from today/yesterday)
  let currentStreak = 0;
  const mostRecent = activeDays[0];

  // Must have activity today or yesterday to have a current streak
  if (mostRecent !== today && mostRecent !== yesterday) {
    return { currentStreak: 0, longestStreak };
  }

  currentStreak = 1;
  for (let i = 0; i < activeDays.length - 1; i++) {
    const current = new Date(activeDays[i] + 'T00:00:00');
    const prev = new Date(activeDays[i + 1] + 'T00:00:00');
    const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

// ===== Heatmap Data Generation =====

/**
 * Generates heatmap data for a given range
 */
export function generateHeatmapData(
  focusSessions: FocusSessionEvent[],
  taskEvents: TaskEvent[],
  sleepEvents: SleepEvent[],
  reflectEntries: CloseDayEntry[],
  morningBridgeDays: string[],
  range: 'week' | 'month' | 'year'
): HeatmapData {
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  switch (range) {
    case 'week':
      startDate = new Date(now.getTime() - 6 * 86400000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      // For month view, we want to show the full calendar month, not just up to today
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); 
      break;
    case 'year':
      // Calendar year (Jan 1 - Dec 31)
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
  }

  const start = getLocalDateKey(startDate);
  const end = getLocalDateKey(endDate);

  const activityMap = deriveActivityByDay(
    focusSessions,
    taskEvents,
    sleepEvents,
    reflectEntries,
    morningBridgeDays,
    { start, end }
  );

  // Generate all days in range
  const days: DayActivity[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = getLocalDateKey(current);
    const activity = activityMap.get(dateKey) || {
      dateKey,
      focusMinutes: 0,
      focusSessions: 0,
      tasksDone: 0,
      reflectDone: false,
      sleepLogged: false,
      morningBridgeDone: false,
      activityScore: 0,
      isActive: false,
    };
    days.push(activity);
    current.setDate(current.getDate() + 1);
  }

  // Calculate stats
  const { currentStreak, longestStreak } = calculateActivityStreaks(activityMap);

  const stats: ActivityStats = {
    totalFocusMinutes: days.reduce((sum, d) => sum + d.focusMinutes, 0),
    totalFocusSessions: days.reduce((sum, d) => sum + d.focusSessions, 0),
    totalTasksDone: days.reduce((sum, d) => sum + d.tasksDone, 0),
    totalReflectDays: days.filter(d => d.reflectDone).length,
    totalSleepDays: days.filter(d => d.sleepLogged).length,
    currentStreak,
    longestStreak,
    daysActive: days.filter(d => d.isActive).length,
  };

  return { days, stats };
}

// ===== Intensity Level for Heatmap =====

/**
 * Converts activity score to intensity level (0-4) for heatmap coloring
 */
export function getIntensityLevel(activityScore: number): 0 | 1 | 2 | 3 | 4 {
  if (activityScore === 0) return 0;
  if (activityScore < 3) return 1;
  if (activityScore < 8) return 2;
  if (activityScore < 15) return 3;
  return 4;
}

// ===== Reflect Achievement Helpers =====

/**
 * Counts unique days with reflect_closed_day events
 */
export function countUniquReflectDays(reflectEntries: CloseDayEntry[]): number {
  const uniqueDays = new Set(reflectEntries.map(e => e.date));
  return uniqueDays.size;
}
