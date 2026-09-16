// Hook for accessing focus totals - uses Events Ledger as single source of truth
// All pages should use this hook for consistent focus metrics

import { useMemo } from 'react';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import {
  deriveFocusTotals,
  deriveTodayFocusTotals,
  deriveWeekFocusTotals,
  deriveMonthFocusTotals,
  formatFocusTime,
  FocusTotals,
  debugFocusSessions,
  getLastNDaysKeys,
} from '@/lib/focusTotals';

export type FocusRange = 'day' | 'week' | 'month' | 'all';

export interface UseFocusTotalsResult {
  // Current range totals
  totals: FocusTotals;
  
  // Convenience getters for common ranges
  today: FocusTotals;
  week: FocusTotals;
  month: FocusTotals;
  all: FocusTotals;
  
  // Legacy compatibility
  todayFocusMinutes: number;
  weekFocusMinutes: number;
  totalFocusMinutes: number;
  
  // Formatted strings
  todayFormatted: string;
  weekFormatted: string;
  
  // Session counts
  todaySessions: number;
  weekSessions: number;
  totalSessions: number;
  
  // Streak
  focusStreak: number;
  
  // Loading state
  isLoaded: boolean;
}

/**
 * Hook to get focus totals derived from the Events Ledger
 * This is the CANONICAL way to get focus metrics - use this everywhere
 */
export function useFocusTotals(defaultRange: FocusRange = 'day'): UseFocusTotalsResult {
  const { focusSessions, focusStreak, isLoaded } = useEventsLedgerContext();
  
  // Debug logging in development
  // Derive all totals from ledger
  const today = useMemo(() => deriveTodayFocusTotals(focusSessions), [focusSessions]);
  const week = useMemo(() => deriveWeekFocusTotals(focusSessions), [focusSessions]);
  const month = useMemo(() => deriveMonthFocusTotals(focusSessions), [focusSessions]);
  const all = useMemo(() => deriveFocusTotals(focusSessions), [focusSessions]);
  
  // Get totals for the requested range
  const totals = useMemo(() => {
    switch (defaultRange) {
      case 'day': return today;
      case 'week': return week;
      case 'month': return month;
      case 'all': return all;
      default: return today;
    }
  }, [defaultRange, today, week, month, all]);
  
  return {
    totals,
    today,
    week,
    month,
    all,
    
    // Legacy compatibility
    todayFocusMinutes: today.minutes,
    weekFocusMinutes: week.minutes,
    totalFocusMinutes: all.minutes,
    
    // Formatted strings
    todayFormatted: today.formatted,
    weekFormatted: week.formatted,
    
    // Session counts
    todaySessions: today.sessions,
    weekSessions: week.sessions,
    totalSessions: all.sessions,
    
    // Streak (from ledger)
    focusStreak,
    
    isLoaded,
  };
}

/**
 * Get focus totals for specific date keys
 */
export function useFocusTotalsForDates(dateKeys: string[]): FocusTotals {
  const { focusSessions } = useEventsLedgerContext();
  return useMemo(() => deriveFocusTotals(focusSessions, dateKeys), [focusSessions, dateKeys]);
}
