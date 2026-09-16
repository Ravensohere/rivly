/**
 * Hook for tracking completion statistics persistently
 * Prevents duplicate completion triggers and tracks progress
 */

import { useLocalStorage } from './useLocalStorage';
import { useCallback } from 'react';
import { getLocalDateKey } from '@/lib/dateUtils';

interface CompletionStats {
  lastCompletedAt: string | null;
  completionCount: number;
  focusMinutesToday: number;
  tasksCompletedToday: number;
  lastCompletionDate: string;
}

const DEFAULT_STATS: CompletionStats = {
  lastCompletedAt: null,
  completionCount: 0,
  focusMinutesToday: 0,
  tasksCompletedToday: 0,
  lastCompletionDate: '',
};

export function useCompletionStats() {
  const [stats, setStats] = useLocalStorage<CompletionStats>('dailyRhythm_completionStats', DEFAULT_STATS);

  // Reset daily counters if it's a new day
  const getUpdatedStats = useCallback((): CompletionStats => {
    const today = getLocalDateKey();
    if (stats.lastCompletionDate !== today) {
      return {
        ...stats,
        focusMinutesToday: 0,
        tasksCompletedToday: 0,
        lastCompletionDate: today,
      };
    }
    return stats;
  }, [stats]);

  const recordFocusCompletion = useCallback((minutes: number, sessionId: string) => {
    const updatedStats = getUpdatedStats();
    const now = new Date().toISOString();
    
    // Check for duplicate completion (same session within 10 seconds)
    if (updatedStats.lastCompletedAt) {
      const lastTime = new Date(updatedStats.lastCompletedAt).getTime();
      const currentTime = new Date(now).getTime();
      if (currentTime - lastTime < 10000) {
        return false;
      }
    }

    setStats({
      ...updatedStats,
      lastCompletedAt: now,
      completionCount: updatedStats.completionCount + 1,
      focusMinutesToday: updatedStats.focusMinutesToday + minutes,
      lastCompletionDate: getLocalDateKey(),
    });

    return true;
  }, [getUpdatedStats, setStats]);

  const recordTaskCompletion = useCallback(() => {
    const updatedStats = getUpdatedStats();
    setStats({
      ...updatedStats,
      tasksCompletedToday: updatedStats.tasksCompletedToday + 1,
      lastCompletionDate: getLocalDateKey(),
    });
  }, [getUpdatedStats, setStats]);

  return {
    stats: getUpdatedStats(),
    recordFocusCompletion,
    recordTaskCompletion,
  };
}
