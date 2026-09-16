/**
 * rhythmReport.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * "Vivly Wrapped" — monthly analysis function.
 * Pure computation: no side-effects, no React, fully testable.
 */

import { FocusSession, DailyCheckIn, Task, TaskTag } from '@/types';

// ── Public types ───────────────────────────────────────────────────────────────

export interface RhythmReport {
  /** Hour of day (0–23) with the most focus sessions e.g. 10 = 10am */
  bestFocusHour: number;
  /** Average number of tasks completed per active day */
  avgTasksPerDay: number;
  /** Longest consecutive daily check-in streak (ending at or before month end) */
  morningCheckinStreak: number;
  /** Most used task tag across completed tasks */
  topTag: string;
  /** Total focus minutes for the month */
  focusMinutesTotal: number;
  /** Whether higher-energy days correlated with higher mood */
  moodEnergyCorrelation: 'positive' | 'negative' | 'neutral';
  /**
   * How many times more tasks are completed on check-in days vs non-check-in days.
   * e.g. 2.67 means "You complete 2.67× more tasks when you check in"
   */
  checkinBoostFactor: number;
  /** "February 2026" */
  monthYear: string;
  /** Total completed tasks for the month */
  tasksCompleted: number;
  /** Total focus sessions for the month */
  sessionsCount: number;
  /** Hours array for bar chart — index is hour (0–23), value is session count */
  focusByHour: number[];
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function isInMonth(dateStr: string, month: number, year: number): boolean {
  if (!dateStr) return false;
  // dateStr may be "YYYY-MM-DD" or full ISO string
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

function hourFrom(dateStr: string): number {
  return new Date(dateStr).getHours();
}

function dateKeyFrom(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

/** Count consecutive trailing 1s in a boolean array (pre-sorted oldest→newest) */
function longestConsecutiveStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort();
  let maxStreak = 1;
  let cur = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);

    if (diffDays === 1) {
      cur += 1;
      maxStreak = Math.max(maxStreak, cur);
    } else if (diffDays > 1) {
      cur = 1;
    }
  }

  return maxStreak;
}

function getMonthName(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Generates a monthly rhythm report from raw data arrays.
 *
 * @param sessions - All focus sessions (from useFocusSessions)
 * @param checkins - All daily check-ins (from useEventsLedger or similar)
 * @param tasks    - All tasks (from useTasks)
 * @param month    - 1–12
 * @param year     - e.g. 2026
 */
export function generateMonthlyReport(
  sessions: FocusSession[],
  checkins: DailyCheckIn[],
  tasks: Task[],
  month: number,
  year: number
): RhythmReport {
  // ── Filter to target month ────────────────────────────────────────────────
  const monthSessions = sessions.filter((s) => isInMonth(s.date, month, year));
  const monthCheckins = checkins.filter((c) => isInMonth(c.date, month, year));
  const monthTasks = tasks.filter((t) => isInMonth(t.dateKey || t.date || '', month, year));
  const completedTasks = monthTasks.filter((t) => t.status === 'done');

  // ── 1. bestFocusHour ─────────────────────────────────────────────────────
  const focusByHour = new Array<number>(24).fill(0);
  monthSessions.forEach((s) => {
    try {
      const hour = hourFrom(s.date);
      if (hour >= 0 && hour < 24) focusByHour[hour]++;
    } catch {
      // ignore malformed dates
    }
  });

  let bestFocusHour = 9; // default to 9am when no data
  let maxHourCount = 0;
  focusByHour.forEach((count, hr) => {
    if (count > maxHourCount) {
      maxHourCount = count;
      bestFocusHour = hr;
    }
  });

  // ── 2. focusMinutesTotal ──────────────────────────────────────────────────
  const focusMinutesTotal = monthSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  // ── 3. avgTasksPerDay ─────────────────────────────────────────────────────
  const activeDays = new Set(
    completedTasks.map((t) => dateKeyFrom(t.completedAt || t.dateKey || t.date || ''))
  );
  const avgTasksPerDay =
    activeDays.size > 0
      ? Math.round((completedTasks.length / activeDays.size) * 10) / 10
      : 0;

  // ── 4. morningCheckinStreak ───────────────────────────────────────────────
  const checkinDates = monthCheckins.map((c) => dateKeyFrom(c.date));
  const morningCheckinStreak = longestConsecutiveStreak(checkinDates);

  // ── 5. topTag ─────────────────────────────────────────────────────────────
  const tagCounts: Partial<Record<TaskTag, number>> = {};
  completedTasks.forEach((t) => {
    tagCounts[t.tag] = (tagCounts[t.tag] ?? 0) + 1;
  });
  let topTag = 'work';
  let maxTagCount = 0;
  (Object.entries(tagCounts) as [TaskTag, number][]).forEach(([tag, count]) => {
    if (count > maxTagCount) {
      maxTagCount = count;
      topTag = tag;
    }
  });

  // ── 6. moodEnergyCorrelation ──────────────────────────────────────────────
  // pearson-lite: if same-day mood and energy move together → positive
  let moodEnergyCorrelation: RhythmReport['moodEnergyCorrelation'] = 'neutral';
  const pairedCheckins = monthCheckins.filter((c) => c.mood > 0 && c.energy > 0);

  if (pairedCheckins.length >= 3) {
    const n = pairedCheckins.length;
    const avgMood = pairedCheckins.reduce((a, c) => a + c.mood, 0) / n;
    const avgEnergy = pairedCheckins.reduce((a, c) => a + c.energy, 0) / n;

    let covSum = 0;
    let varMoodSum = 0;
    let varEnergySum = 0;

    pairedCheckins.forEach((c) => {
      const dm = c.mood - avgMood;
      const de = c.energy - avgEnergy;
      covSum += dm * de;
      varMoodSum += dm * dm;
      varEnergySum += de * de;
    });

    const denominator = Math.sqrt(varMoodSum * varEnergySum);
    const pearson = denominator > 0 ? covSum / denominator : 0;

    if (pearson > 0.2) moodEnergyCorrelation = 'positive';
    else if (pearson < -0.2) moodEnergyCorrelation = 'negative';
  }

  // ── 7. checkinBoostFactor ─────────────────────────────────────────────────
  const checkinDateSet = new Set(monthCheckins.map((c) => dateKeyFrom(c.date)));

  const tasksByDate: Record<string, { completed: number; total: number }> = {};
  monthTasks.forEach((t) => {
    const key = dateKeyFrom(t.dateKey || t.date || '');
    if (!tasksByDate[key]) tasksByDate[key] = { completed: 0, total: 0 };
    tasksByDate[key].total++;
    if (t.status === 'done') tasksByDate[key].completed++;
  });

  let checkinDayCompleted = 0;
  let checkinDayTotal = 0;
  let noCheckinDayCompleted = 0;
  let noCheckinDayTotal = 0;

  Object.entries(tasksByDate).forEach(([date, { completed, total }]) => {
    if (checkinDateSet.has(date)) {
      checkinDayCompleted += completed;
      checkinDayTotal += total;
    } else {
      noCheckinDayCompleted += completed;
      noCheckinDayTotal += total;
    }
  });

  const checkinRate = checkinDayTotal > 0 ? checkinDayCompleted / checkinDayTotal : 0;
  const noCheckinRate = noCheckinDayTotal > 0 ? noCheckinDayCompleted / noCheckinDayTotal : checkinRate;

  let checkinBoostFactor =
    noCheckinRate > 0
      ? Math.round((checkinRate / noCheckinRate) * 10) / 10
      : checkinRate > 0
      ? 1.0
      : 1.0;

  // Clamp to sensible range
  checkinBoostFactor = Math.max(0.1, Math.min(10, checkinBoostFactor));

  // ── 8. monthYear ──────────────────────────────────────────────────────────
  const monthYear = getMonthName(month, year);

  return {
    bestFocusHour,
    avgTasksPerDay,
    morningCheckinStreak,
    topTag,
    focusMinutesTotal,
    moodEnergyCorrelation,
    checkinBoostFactor,
    monthYear,
    tasksCompleted: completedTasks.length,
    sessionsCount: monthSessions.length,
    focusByHour,
  };
}

// ── Formatting helpers (used by UI component) ─────────────────────────────────

export function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

export function formatFocusHourRange(hour: number): string {
  return `${formatHour(hour)}–${formatHour(hour + 1)}`;
}

export function formatMinutesAsHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
