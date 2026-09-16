// Hook for managing the landscape - now driven by Events Ledger as single source of truth

import { useCallback, useMemo } from 'react';
import { useLocalStorage, generateId, formatDate } from './useLocalStorage';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import {
  LandscapeData,
  DEFAULT_LANDSCAPE_DATA,
  FocusSeed,
  DailyGrowth,
  LandscapeState,
  COLLECTIBLES,
  Collectible,
  SkyState,
  WaterState,
  LightState,
} from '@/types/landscape';
import { FocusSessionEvent } from '@/types/events';
import { safeNumber, formatFocusTime } from '@/lib/focusTotals';

const STORAGE_KEY = 'dailyRhythm_landscape';

export function useLandscape() {
  const [data, setData] = useLocalStorage<LandscapeData>(STORAGE_KEY, DEFAULT_LANDSCAPE_DATA);
  
  // Use Events Ledger as the single source of truth for focus sessions
  const { 
    focusSessions, 
    focusByDay, 
    focusStreak,
    todayFocusMinutes,
    sleepEvents,
    taskEvents,
  } = useEventsLedgerContext();

  const today = formatDate(new Date());

  // Derive seeds from focus sessions in the ledger - with safe number handling
  const derivedSeeds = useMemo((): FocusSeed[] => {
    if (!focusSessions || !Array.isArray(focusSessions)) return [];
    
    return focusSessions.map(session => {
      const durationMinutes = safeNumber(session.durationMin);
      return {
        id: session.id,
        date: session.dateKey,
        durationMinutes,
        completed: session.completed ?? true,
        endedEarly: !session.completed,
        purpose: session.taskId || 'Focus',
        growthLevel: session.completed ? 1 : Math.min(durationMinutes / 25, 0.8),
        // Store the actual end time for positioning
        endTime: session.endAt,
      };
    });
  }, [focusSessions]);

  // Get sessions for a specific date with time-based positioning
  const getSeedsForDate = useCallback((dateKey: string): (FocusSeed & { xPosition: number })[] => {
    const daySeeds = derivedSeeds.filter(s => s.date === dateKey);
    
    return daySeeds.map(seed => {
      // Calculate x position based on time of day (0-1)
      const endTime = new Date((seed as any).endTime || new Date());
      const hours = endTime.getHours();
      const minutes = endTime.getMinutes();
      const dayMinutes = hours * 60 + minutes;
      // Normalize to 0-1 range (6am to 11pm = 17 hours)
      const startMinutes = 6 * 60; // 6am
      const endMinutes = 23 * 60; // 11pm
      const normalizedPos = Math.max(0, Math.min(1, (dayMinutes - startMinutes) / (endMinutes - startMinutes)));
      
      return {
        ...seed,
        xPosition: normalizedPos,
      };
    });
  }, [derivedSeeds]);

  // Get sessions grouped by date for week/month views
  const getSessionsByDateRange = useCallback((days: number): Map<string, FocusSeed[]> => {
    const result = new Map<string, FocusSeed[]>();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = formatDate(cutoff);
    
    derivedSeeds
      .filter(s => s.date >= cutoffStr)
      .forEach(seed => {
        const existing = result.get(seed.date) || [];
        result.set(seed.date, [...existing, seed]);
      });
    
    return result;
  }, [derivedSeeds]);

  // Add a new focus seed when a session completes (backward compat)
  const addFocusSeed = useCallback((
    durationMinutes: number,
    completed: boolean,
    endedEarly: boolean,
    purpose: string
  ): FocusSeed => {
    const seed: FocusSeed = {
      id: generateId(),
      date: today,
      durationMinutes,
      completed,
      endedEarly,
      purpose,
      growthLevel: completed ? 1 : Math.min(durationMinutes / 25, 0.8),
    };

    // Legacy storage update for collectibles tracking
    setData(prev => ({
      ...prev,
      seeds: [...prev.seeds, seed],
      totalFocusMinutes: prev.totalFocusMinutes + durationMinutes,
      lastActivityDate: today,
    }));

    // Check for new collectibles after adding seed
    checkAndUnlockCollectibles(seed);

    return seed;
  }, [today, setData]);

  // Check and unlock collectibles based on conditions
  const checkAndUnlockCollectibles = useCallback((newSeed?: FocusSeed) => {
    setData(prev => {
      const newUnlocks: string[] = [];
      
      // Use derived seeds from ledger for accurate counting
      const allSeeds = derivedSeeds;

      // Deep Root - long focused session (45+ minutes completed)
      if (newSeed && newSeed.completed && newSeed.durationMinutes >= 45) {
        if (!prev.unlockedCollectibles.includes('deep-root')) {
          newUnlocks.push('deep-root');
        }
      }

      // Bamboo Form - 5+ short sessions completed
      const shortSessions = allSeeds.filter(s => s.completed && s.durationMinutes <= 20);
      if (shortSessions.length >= 5 && !prev.unlockedCollectibles.includes('bamboo-form')) {
        newUnlocks.push('bamboo-form');
      }

      // Pine Form - evening session (after 6pm)
      const hour = new Date().getHours();
      if (newSeed && newSeed.completed && hour >= 18 && !prev.unlockedCollectibles.includes('pine-form')) {
        newUnlocks.push('pine-form');
      }

      // Willow Form - 5+ completed sessions with good balance
      const completedSessions = allSeeds.filter(s => s.completed);
      if (completedSessions.length >= 5 && !prev.unlockedCollectibles.includes('willow-form')) {
        newUnlocks.push('willow-form');
      }

      // Golden Light - 3+ balanced days (focus + rest)
      const uniqueFocusDays = new Set(allSeeds.filter(s => s.completed).map(s => s.date));
      if (uniqueFocusDays.size >= 3 && !prev.unlockedCollectibles.includes('golden-light')) {
        newUnlocks.push('golden-light');
      }

      if (newUnlocks.length > 0) {
        return {
          ...prev,
          unlockedCollectibles: [...prev.unlockedCollectibles, ...newUnlocks],
        };
      }

      return prev;
    });
  }, [derivedSeeds, setData]);

  // Check and update daily growth
  const checkDailyGrowth = useCallback(() => {
    const todaySessions = derivedSeeds.filter(s => s.date === today);
    const hasCompletedFocus = todaySessions.some(s => s.completed);

    setData(prev => {
      const existingGrowth = prev.dailyGrowth.find(d => d.date === today);
      
      if (existingGrowth) {
        return {
          ...prev,
          dailyGrowth: prev.dailyGrowth.map(d => 
            d.date === today 
              ? { ...d, focusCompleted: hasCompletedFocus, hasGrown: hasCompletedFocus }
              : d
          ),
        };
      } else {
        const newGrowth: DailyGrowth = {
          date: today,
          hasGrown: hasCompletedFocus,
          focusCompleted: hasCompletedFocus,
          reflectionDone: false,
          windDownUsed: false,
          seeds: todaySessions.map(s => s.id),
        };
        return {
          ...prev,
          dailyGrowth: [...prev.dailyGrowth, newGrowth],
        };
      }
    });

    // Also check collectibles
    checkAndUnlockCollectibles();
  }, [derivedSeeds, today, setData, checkAndUnlockCollectibles]);

  // Evaluate weekly environment evolution based on ledger data
  const updateLandscapeState = useCallback(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = formatDate(weekAgo);

    const recentSeeds = derivedSeeds.filter(s => s.date >= weekAgoStr);
    const focusDays = new Set(recentSeeds.filter(s => s.completed).map(s => s.date)).size;
    const totalMinutes = recentSeeds.reduce((sum, s) => sum + s.durationMinutes, 0);
    const avgMinutesPerDay = totalMinutes / 7;

    // Determine sky state based on balance (not just volume)
    let skyState: SkyState = 'cloudy';
    if (focusDays >= 2) skyState = 'clearing';
    if (focusDays >= 4) skyState = 'clear';
    if (focusDays >= 5 && avgMinutesPerDay < 180) skyState = 'golden';

    // Determine water state based on session count
    let waterState: WaterState = 'still';
    if (recentSeeds.length >= 3) waterState = 'rippling';
    if (recentSeeds.length >= 7) waterState = 'flowing';

    // Determine light state based on overall health
    let lightState: LightState = 'dim';
    if (focusDays >= 2) lightState = 'soft';
    if (focusDays >= 4) lightState = 'warm';
    if (focusDays >= 5 && skyState === 'golden') lightState = 'radiant';

    const newState: LandscapeState = {
      skyState,
      waterState,
      lightState,
      lastUpdated: today,
    };

    setData(prev => ({
      ...prev,
      landscapeState: newState,
    }));

    return newState;
  }, [derivedSeeds, today, setData]);

  // Get unlocked collectibles with full data
  const unlockedCollectibles = useMemo((): Collectible[] => {
    return COLLECTIBLES
      .filter(c => data.unlockedCollectibles.includes(c.id))
      .map(c => ({ ...c, unlockedAt: today }));
  }, [data.unlockedCollectibles, today]);

  // Get recent seeds for visualization (last 7 days) - now from ledger
  const recentSeeds = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return derivedSeeds.filter(s => s.date >= formatDate(weekAgo));
  }, [derivedSeeds]);

  // Get today's growth info
  const todayGrowth = useMemo(() => {
    return data.dailyGrowth.find(d => d.date === today);
  }, [data.dailyGrowth, today]);

  // Get landscape message based on state
  const getLandscapeMessage = useCallback((): string => {
    const { skyState, lightState } = data.landscapeState;
    
    if (lightState === 'radiant') return "Your landscape glows with balanced effort.";
    if (skyState === 'golden') return "The light is warm. Balance suits you.";
    if (skyState === 'clear') return "Clear skies reflect your rhythm.";
    if (skyState === 'clearing') return "The clouds are parting. Keep going gently.";
    return "Every small step adds to your landscape.";
  }, [data.landscapeState]);

  // Get seed count for today (for UI display) - from ledger
  const todaySeedCount = useMemo(() => {
    return derivedSeeds.filter(s => s.date === today).length;
  }, [derivedSeeds, today]);

  // Stats derived from ledger - using safe number handling
  const stats = useMemo(() => ({
    todayFocusMinutes: safeNumber(todayFocusMinutes),
    totalFocusMinutes: derivedSeeds.reduce((sum, s) => sum + safeNumber(s.durationMinutes), 0),
    streak: safeNumber(focusStreak),
    sessionsToday: derivedSeeds.filter(s => s.date === today).length,
    sessionsThisWeek: recentSeeds.length,
  }), [todayFocusMinutes, derivedSeeds, focusStreak, today, recentSeeds]);

  return {
    data,
    addFocusSeed,
    checkDailyGrowth,
    updateLandscapeState,
    unlockedCollectibles,
    recentSeeds,
    derivedSeeds,
    todayGrowth,
    todaySeedCount,
    getLandscapeMessage,
    landscapeState: data.landscapeState,
    // New methods for history views
    getSeedsForDate,
    getSessionsByDateRange,
    stats,
  };
}
