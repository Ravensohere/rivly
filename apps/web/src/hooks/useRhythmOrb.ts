import { useLocalStorage, formatDate } from './useLocalStorage';
import { useCallback, useMemo } from 'react';

// Core orb states - functional, not decorative
export type RhythmOrbState = 'neutral' | 'focused' | 'overwhelmed' | 'settled';

export interface OrbStateEntry {
  state: RhythmOrbState;
  updatedAt: string;
  triggers: string[];
}

export interface OrbStateByDate {
  [dateKey: string]: OrbStateEntry;
}

const STORAGE_KEY = 'dailyRhythm_orbState';

export function useRhythmOrb() {
  const [orbStateByDate, setOrbStateByDate] = useLocalStorage<OrbStateByDate>(STORAGE_KEY, {});

  // Get orb state for a specific date
  const getOrbStateForDate = useCallback((date: string): OrbStateEntry => {
    return orbStateByDate[date] || {
      state: 'neutral',
      updatedAt: new Date().toISOString(),
      triggers: [],
    };
  }, [orbStateByDate]);

  // Get today's orb state
  const today = formatDate(new Date());
  const todayOrbState = useMemo(() => getOrbStateForDate(today), [getOrbStateForDate, today]);

  // Set orb state for a specific date with trigger tracking
  const setOrbStateForDate = useCallback((
    date: string, 
    newState: RhythmOrbState, 
    trigger: string
  ) => {
    setOrbStateByDate(prev => {
      const existing = prev[date] || { state: 'neutral', updatedAt: '', triggers: [] };
      return {
        ...prev,
        [date]: {
          state: newState,
          updatedAt: new Date().toISOString(),
          triggers: [...existing.triggers, trigger],
        },
      };
    });
  }, [setOrbStateByDate]);

  // TRIGGER A: Set to FOCUSED when focus session starts or task/block completed
  const triggerFocused = useCallback((date: string, reason: 'focus_session' | 'task_completed' | 'block_completed') => {
    const current = getOrbStateForDate(date);
    // Don't override settled state
    if (current.state !== 'settled') {
      setOrbStateForDate(date, 'focused', reason);
    }
  }, [getOrbStateForDate, setOrbStateForDate]);

  // TRIGGER B: Set to OVERWHELMED when user taps "I'm overwhelmed"
  const triggerOverwhelmed = useCallback((date: string) => {
    const current = getOrbStateForDate(date);
    // Don't override settled state
    if (current.state !== 'settled') {
      setOrbStateForDate(date, 'overwhelmed', 'user_overwhelmed');
    }
  }, [getOrbStateForDate, setOrbStateForDate]);

  // TRIGGER C: Clear OVERWHELMED when user feels better
  const clearOverwhelmed = useCallback((date: string, reason: 'breathing_complete' | 'feel_better' | 'manual_toggle') => {
    const current = getOrbStateForDate(date);
    if (current.state === 'overwhelmed') {
      setOrbStateForDate(date, 'neutral', reason);
    }
  }, [getOrbStateForDate, setOrbStateForDate]);

  // TRIGGER D: Set to SETTLED when wind-down completes
  const triggerSettled = useCallback((date: string) => {
    setOrbStateForDate(date, 'settled', 'wind_down_complete');
  }, [setOrbStateForDate]);

  // Reset to NEUTRAL (optional manual reset)
  const resetToNeutral = useCallback((date: string) => {
    setOrbStateForDate(date, 'neutral', 'manual_reset');
  }, [setOrbStateForDate]);

  // Get tooltip message based on state
  const getTooltipMessage = useCallback((state: RhythmOrbState): string => {
    switch (state) {
      case 'neutral':
        return 'Neutral — your day is open';
      case 'focused':
        return 'Focused — you\'re in flow';
      case 'overwhelmed':
        return 'Overwhelmed — take it slow';
      case 'settled':
        return 'Settled — day closed';
      default:
        return '';
    }
  }, []);

  return {
    // State access
    orbStateByDate,
    getOrbStateForDate,
    todayOrbState,
    
    // State triggers
    triggerFocused,
    triggerOverwhelmed,
    clearOverwhelmed,
    triggerSettled,
    resetToNeutral,
    
    // Utility
    getTooltipMessage,
  };
}
