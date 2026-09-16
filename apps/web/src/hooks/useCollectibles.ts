// Collectibles System Hook - Manages unlock state and evaluation

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import {
  CollectibleDefinition,
  UnlockedCollectible,
  COLLECTIBLE_DEFINITIONS,
  getCollectibleById,
} from '@/types/collectibles';
import { FocusSessionEvent, SleepEvent } from '@/types/events';

const COLLECTIBLES_KEY = 'calm-cycle-collectibles';
const PENDING_CELEBRATIONS_KEY = 'calm-cycle-pending-celebrations';

interface CollectiblesState {
  unlocked: UnlockedCollectible[];
}

interface UnlockStats {
  totalFocusSessions: number;
  totalFocusMinutes: number;
  focusStreak: number;
  todayFocusMinutes: number;
  totalSleepLogs: number;
  goodSleepStreak: number;
  hasFocusAndSleepToday: boolean;
  hasEarlyMorningSession: boolean;
  hasLateNightSession: boolean;
  longestSessionMinutes: number;
}

export function useCollectibles() {
  const [state, setState] = useLocalStorage<CollectiblesState>(COLLECTIBLES_KEY, { unlocked: [] });
  const [pendingCelebrations, setPendingCelebrations] = useLocalStorage<string[]>(PENDING_CELEBRATIONS_KEY, []);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  
  const { focusSessions, sleepEvents, focusStreak, todayFocusMinutes, todaySleepEvent } = useEventsLedgerContext();

  // Calculate stats for unlock evaluation
  const stats: UnlockStats = useMemo(() => {
    const totalFocusSessions = focusSessions.filter(s => s.completed).length;
    const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + s.durationMin, 0);
    const longestSessionMinutes = Math.max(0, ...focusSessions.map(s => s.durationMin));
    
    // Count sleep logs
    const totalSleepLogs = sleepEvents.length;
    
    // Calculate good sleep streak
    let goodSleepStreak = 0;
    const sortedSleep = [...sleepEvents].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    for (const event of sortedSleep) {
      if (event.rating === 'good') {
        goodSleepStreak++;
      } else {
        break;
      }
    }
    
    // Check for early morning / late night sessions
    let hasEarlyMorningSession = false;
    let hasLateNightSession = false;
    
    for (const session of focusSessions) {
      const hour = new Date(session.startAt).getHours();
      if (hour < 9) hasEarlyMorningSession = true;
      if (hour >= 21) hasLateNightSession = true;
    }
    
    // Check for balanced day (focus + sleep on same day)
    const hasFocusAndSleepToday = todayFocusMinutes > 0 && todaySleepEvent !== undefined;
    
    return {
      totalFocusSessions,
      totalFocusMinutes,
      focusStreak,
      todayFocusMinutes,
      totalSleepLogs,
      goodSleepStreak,
      hasFocusAndSleepToday,
      hasEarlyMorningSession,
      hasLateNightSession,
      longestSessionMinutes,
    };
  }, [focusSessions, sleepEvents, focusStreak, todayFocusMinutes, todaySleepEvent]);

  // Check if a collectible should be unlocked based on stats
  const shouldUnlock = useCallback((ruleKey: string, stats: UnlockStats): boolean => {
    switch (ruleKey) {
      case 'first_focus_completed':
        return stats.totalFocusSessions >= 1;
      case 'focus_60_min_day':
        return stats.todayFocusMinutes >= 60;
      case 'focus_session_45_min':
        return stats.longestSessionMinutes >= 45;
      case 'focus_sessions_5_total':
        return stats.totalFocusSessions >= 5;
      case 'focus_sessions_10_total':
        return stats.totalFocusSessions >= 10;
      case 'streak_3_days':
        return stats.focusStreak >= 3;
      case 'streak_7_days':
        return stats.focusStreak >= 7;
      case 'streak_14_days':
        return stats.focusStreak >= 14;
      case 'streak_30_days':
        return stats.focusStreak >= 30;
      case 'first_sleep_logged':
        return stats.totalSleepLogs >= 1;
      case 'sleep_logged_7_nights':
        return stats.totalSleepLogs >= 7;
      case 'good_sleep_streak_3':
        return stats.goodSleepStreak >= 3;
      case 'balanced_day':
        return stats.hasFocusAndSleepToday;
      case 'focus_before_9am':
        return stats.hasEarlyMorningSession;
      case 'focus_after_9pm':
        return stats.hasLateNightSession;
      default:
        return false;
    }
  }, []);

  // Evaluate all collectibles and return newly unlocked ones
  const evaluateUnlocks = useCallback((): CollectibleDefinition[] => {
    const newUnlocks: CollectibleDefinition[] = [];
    const unlockedIds = new Set(state.unlocked.map(u => u.collectibleId));
    
    for (const collectible of COLLECTIBLE_DEFINITIONS) {
      if (!unlockedIds.has(collectible.id) && shouldUnlock(collectible.ruleKey, stats)) {
        newUnlocks.push(collectible);
      }
    }
    
    return newUnlocks;
  }, [state.unlocked, shouldUnlock, stats]);

  // Run unlock evaluation and save newly unlocked collectibles
  const checkAndUnlock = useCallback(() => {
    const newUnlocks = evaluateUnlocks();
    
    if (newUnlocks.length > 0) {
      const now = new Date().toISOString();
      const newUnlockedItems: UnlockedCollectible[] = newUnlocks.map(c => ({
        collectibleId: c.id,
        unlockedAt: now,
        ruleKey: c.ruleKey,
      }));
      
      setState(prev => ({
        ...prev,
        unlocked: [...prev.unlocked, ...newUnlockedItems],
      }));
      
      // Add to pending celebrations queue
      setPendingCelebrations(prev => [...prev, ...newUnlocks.map(c => c.id)]);
    }
    
    return newUnlocks;
  }, [evaluateUnlocks, setState, setPendingCelebrations]);

  // Show next celebration from queue
  const showNextCelebration = useCallback(() => {
    if (pendingCelebrations.length > 0 && !celebratingId) {
      setCelebratingId(pendingCelebrations[0]);
    }
  }, [pendingCelebrations, celebratingId]);

  // Dismiss current celebration
  const dismissCelebration = useCallback(() => {
    if (celebratingId) {
      setPendingCelebrations(prev => prev.filter(id => id !== celebratingId));
      setCelebratingId(null);
    }
  }, [celebratingId, setPendingCelebrations]);

  // Get all unlocked collectibles with full data
  const unlockedCollectibles = useMemo(() => {
    return state.unlocked.map(u => {
      const definition = getCollectibleById(u.collectibleId);
      return {
        ...u,
        definition,
      };
    }).filter(u => u.definition !== undefined);
  }, [state.unlocked]);

  // Get all collectibles with unlock status
  const allCollectibles = useMemo(() => {
    const unlockedMap = new Map(state.unlocked.map(u => [u.collectibleId, u]));
    
    return COLLECTIBLE_DEFINITIONS.map(def => ({
      ...def,
      isUnlocked: unlockedMap.has(def.id),
      unlockedAt: unlockedMap.get(def.id)?.unlockedAt,
    }));
  }, [state.unlocked]);

  // Get current celebration collectible
  const currentCelebration = useMemo(() => {
    if (!celebratingId) return null;
    return getCollectibleById(celebratingId);
  }, [celebratingId]);

  // Auto-show celebrations when they're queued
  useEffect(() => {
    showNextCelebration();
  }, [pendingCelebrations, showNextCelebration]);

  return {
    // State
    unlockedCollectibles,
    allCollectibles,
    unlockedCount: state.unlocked.length,
    totalCount: COLLECTIBLE_DEFINITIONS.length,
    
    // Celebration
    currentCelebration,
    hasPendingCelebrations: pendingCelebrations.length > 0,
    dismissCelebration,
    
    // Actions
    checkAndUnlock,
    
    // Stats (for debugging)
    stats,
  };
}
