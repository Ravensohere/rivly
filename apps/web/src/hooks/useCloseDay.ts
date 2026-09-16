/**
 * useCloseDay - Hook for managing "Close Your Day" reflection entries
 * 
 * Features:
 * - One entry per date (enforced)
 * - Immutable entries (read-only after closing)
 * - Persistent storage with localStorage
 * - Integration with Insights
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage, generateId } from './useLocalStorage';
import { CloseDayEntry, DayRating, DailyWin } from '@/types/reflect';
import { getLocalDateKey } from '@/lib/dateUtils';

const STORAGE_KEY = 'dailyRhythm_closeDay_v2';

export function useCloseDay() {
  const [entries, setEntries] = useLocalStorage<CloseDayEntry[]>(STORAGE_KEY, []);
  
  // Get entry for a specific date
  const getEntryForDate = useCallback((date: string): CloseDayEntry | undefined => {
    return entries.find(e => e.date === date);
  }, [entries]);
  
  // Check if today has been closed
  const hasDayBeenClosed = useCallback((date?: string): boolean => {
    const targetDate = date || getLocalDateKey();
    return entries.some(e => e.date === targetDate);
  }, [entries]);
  
  // Check if today is already closed
  const isTodayClosed = useMemo(() => {
    return hasDayBeenClosed(getLocalDateKey());
  }, [hasDayBeenClosed]);
  
  // Close the day (create new entry)
  const closeDay = useCallback((data: {
    dayRating: DayRating;
    tomorrowIntent: string;
    wins: DailyWin[];
    linkedJournalId?: string;
  }): CloseDayEntry | null => {
    const today = getLocalDateKey();
    
    // Prevent duplicate entries for same day
    if (hasDayBeenClosed(today)) {
      console.warn('[useCloseDay] Day already closed:', today);
      return null;
    }
    
    const newEntry: CloseDayEntry = {
      date: today,
      dayRating: data.dayRating,
      tomorrowIntent: data.tomorrowIntent,
      wins: data.wins,
      closedAt: new Date().toISOString(),
      linkedJournalId: data.linkedJournalId,
    };
    
    setEntries(prev => [...prev, newEntry]);
    
    return newEntry;
  }, [hasDayBeenClosed, setEntries]);
  
  // Get recent entries (sorted newest first)
  const getRecentEntries = useCallback((limit = 7): CloseDayEntry[] => {
    return [...entries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  }, [entries]);
  
  // Get entries in date range
  const getEntriesInRange = useCallback((startDate: string, endDate: string): CloseDayEntry[] => {
    return entries.filter(e => e.date >= startDate && e.date <= endDate);
  }, [entries]);
  
  // Statistics for Insights
  const stats = useMemo(() => {
    const total = entries.length;
    const ratings = {
      hard: entries.filter(e => e.dayRating === 'hard').length,
      okay: entries.filter(e => e.dayRating === 'okay').length,
      good: entries.filter(e => e.dayRating === 'good').length,
    };
    
    // Calculate streak (consecutive days closed)
    let streak = 0;
    const today = getLocalDateKey();
    const sortedDates = entries
      .map(e => e.date)
      .sort((a, b) => b.localeCompare(a));
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateKey = getLocalDateKey(checkDate);
      
      if (sortedDates.includes(dateKey)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    // Win distribution
    const winCounts: Record<DailyWin, number> = {
      completed: 0,
      showedUp: 0,
      selfCare: 0,
      learned: 0,
    };
    entries.forEach(e => {
      e.wins.forEach(w => {
        if (w in winCounts) {
          winCounts[w as keyof typeof winCounts]++;
        }
      });
    });
    
    return {
      total,
      ratings,
      streak,
      winCounts,
      goodDaysPercent: total > 0 ? Math.round((ratings.good / total) * 100) : 0,
    };
  }, [entries]);
  
  // Clear all entries (for debugging/reset)
  const clearAllEntries = useCallback(() => {
    setEntries([]);
  }, [setEntries]);
  
  return {
    entries,
    isTodayClosed,
    getEntryForDate,
    hasDayBeenClosed,
    closeDay,
    getRecentEntries,
    getEntriesInRange,
    stats,
    clearAllEntries,
  };
}
