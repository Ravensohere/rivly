// Canonical focus totals derivation - SINGLE SOURCE OF TRUTH
// All pages (Focus, Landscape, Insights) must use these functions

import { FocusSessionEvent } from '@/types/events';

export interface FocusTotals {
  minutes: number;
  sessions: number;
  formatted: string;
}

/**
 * Safe number parsing - never returns NaN
 */
export function safeNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Format minutes as "Xh Ym" - always returns a valid string
 */
export function formatFocusTime(minutes: number): string {
  const safeMinutes = safeNumber(minutes);
  const h = Math.floor(safeMinutes / 60);
  const m = Math.round(safeMinutes % 60);
  return `${h}h ${m}m`;
}

/**
 * Get the local dateKey for a date (YYYY-MM-DD)
 * Uses local timezone, NOT UTC
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get dateKey from an ISO string using LOCAL timezone
 */
export function getDateKeyFromISO(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return getLocalDateKey();
    }
    return getLocalDateKey(date);
  } catch {
    return getLocalDateKey();
  }
}

/**
 * Get the last N days as dateKeys (including today)
 * E.g., getLastNDaysKeys(7) returns [today-6, today-5, ..., today]
 */
export function getLastNDaysKeys(n: number): string[] {
  const result: string[] = [];
  const today = new Date();
  
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    result.push(getLocalDateKey(date));
  }
  
  return result;
}

/**
 * Get today's dateKey
 */
export function getTodayKey(): string {
  return getLocalDateKey();
}

/**
 * Derive focus totals from ledger events - SAFE, never returns null
 * 
 * @param sessions - Array of focus session events
 * @param dateKeys - Array of dateKeys to filter by (empty = all sessions)
 * @returns FocusTotals with minutes, sessions count, and formatted string
 */
export function deriveFocusTotals(
  sessions: FocusSessionEvent[],
  dateKeys?: string[]
): FocusTotals {
  // Handle empty/undefined input
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    return { minutes: 0, sessions: 0, formatted: '0h 0m' };
  }
  
  // Filter by dateKeys if provided
  const filteredSessions = dateKeys && dateKeys.length > 0
    ? sessions.filter(s => s && dateKeys.includes(s.dateKey))
    : sessions;
  
  // Safely sum up minutes
  let totalMinutes = 0;
  let sessionCount = 0;
  
  for (const session of filteredSessions) {
    if (!session) continue;
    
    // Safely get duration - handle missing/NaN values
    const duration = safeNumber(session.durationMin);
    if (duration > 0) {
      totalMinutes += duration;
      sessionCount++;
    }
  }
  
  return {
    minutes: totalMinutes,
    sessions: sessionCount,
    formatted: formatFocusTime(totalMinutes),
  };
}

/**
 * Derive today's focus totals
 */
export function deriveTodayFocusTotals(sessions: FocusSessionEvent[]): FocusTotals {
  const todayKey = getTodayKey();
  return deriveFocusTotals(sessions, [todayKey]);
}

/**
 * Derive this week's focus totals (rolling 7 days including today)
 */
export function deriveWeekFocusTotals(sessions: FocusSessionEvent[]): FocusTotals {
  const weekKeys = getLastNDaysKeys(7);
  return deriveFocusTotals(sessions, weekKeys);
}

/**
 * Derive this month's focus totals (rolling 30 days including today)
 */
export function deriveMonthFocusTotals(sessions: FocusSessionEvent[]): FocusTotals {
  const monthKeys = getLastNDaysKeys(30);
  return deriveFocusTotals(sessions, monthKeys);
}

/**
 * Debug helper - log focus session data for troubleshooting
 */
export function debugFocusSessions(sessions: FocusSessionEvent[], label: string = 'Focus Debug'): void {
  if (import.meta.env.DEV) {
    const todayKey = getTodayKey();
    const weekKeys = getLastNDaysKeys(7);
    
    console.log(`[${label}]`, {
      totalSessions: sessions?.length ?? 0,
      todayKey,
      weekKeys,
      todaySessions: sessions?.filter(s => s.dateKey === todayKey).length ?? 0,
      weekSessions: sessions?.filter(s => weekKeys.includes(s.dateKey)).length ?? 0,
      sample: sessions?.slice(0, 3).map(s => ({
        id: s.id?.substring(0, 8),
        dateKey: s.dateKey,
        durationMin: s.durationMin,
      })),
    });
  }
}
