/**
 * TimerCompletionContext - Global context for timer completion state
 * 
 * Provides a single source of truth for timer completion celebrations
 * that can be shown on any screen (FocusPage, DayPlanner, etc.)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { BackgroundTimer, TimerState, TimerMode } from '@/services/BackgroundTimer';
import { TimerCompletionCelebration } from '@/components/timer/TimerCompletionCelebration';
import { useNavigate } from 'react-router-dom';

interface TimerCompletionContextValue {
  showCelebration: boolean;
  completedTimer: TimerState | null;
  triggerCelebration: (timer: TimerState) => void;
  dismissCelebration: () => void;
  lastCelebrationId: string | null;
}

const TimerCompletionContext = createContext<TimerCompletionContextValue | null>(null);

// Storage key to track last celebrated timer ID (prevents duplicates)
const LAST_CELEBRATION_KEY = 'dailyRhythm_lastCelebrationId';

export function TimerCompletionProvider({ children }: { children: React.ReactNode }) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedTimer, setCompletedTimer] = useState<TimerState | null>(null);
  const [lastCelebrationId, setLastCelebrationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_CELEBRATION_KEY);
    } catch {
      return null;
    }
  });
  const hasSetupListener = useRef(false);
  const navigate = useNavigate();

  // Set up listener for timer completion
  useEffect(() => {
    if (hasSetupListener.current) return;
    hasSetupListener.current = true;

    // Listen for timer completion from BackgroundTimer
    BackgroundTimer.onComplete((timer) => {
      console.log('[TimerCompletionContext] Timer completed:', timer.id);
      
      // Check if we've already celebrated this timer
      const stored = localStorage.getItem(LAST_CELEBRATION_KEY);
      if (stored === timer.id) {
        console.log('[TimerCompletionContext] Already celebrated this timer, skipping');
        return;
      }

      // Trigger celebration
      setCompletedTimer(timer);
      setShowCelebration(true);
      setLastCelebrationId(timer.id);
      
      // Persist to prevent duplicate celebrations on resume
      localStorage.setItem(LAST_CELEBRATION_KEY, timer.id);
    });

    // Also check current state on mount (in case timer completed while unmounted)
    const state = BackgroundTimer.getState();
    if (state.activeTimer?.status === 'completed') {
      const stored = localStorage.getItem(LAST_CELEBRATION_KEY);
      if (stored !== state.activeTimer.id) {
        console.log('[TimerCompletionContext] Found completed timer on mount:', state.activeTimer.id);
        setCompletedTimer(state.activeTimer);
        setShowCelebration(true);
        setLastCelebrationId(state.activeTimer.id);
        localStorage.setItem(LAST_CELEBRATION_KEY, state.activeTimer.id);
      }
    }
  }, []);

  const triggerCelebration = useCallback((timer: TimerState) => {
    // Check for duplicate
    if (lastCelebrationId === timer.id) {
      console.log('[TimerCompletionContext] Duplicate celebration prevented');
      return;
    }

    setCompletedTimer(timer);
    setShowCelebration(true);
    setLastCelebrationId(timer.id);
    localStorage.setItem(LAST_CELEBRATION_KEY, timer.id);
  }, [lastCelebrationId]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
    // Acknowledge the timer completion in BackgroundTimer
    BackgroundTimer.acknowledge();
    // Clear completed timer after a short delay (for exit animation)
    setTimeout(() => setCompletedTimer(null), 300);
  }, []);

  return (
    <TimerCompletionContext.Provider
      value={{
        showCelebration,
        completedTimer,
        triggerCelebration,
        dismissCelebration,
        lastCelebrationId,
      }}
    >
      {children}

      {/* Global celebration overlay */}
      <TimerCompletionCelebration
        isOpen={showCelebration}
        mode={completedTimer?.mode || 'focus'}
        label={completedTimer?.label}
        durationMinutes={completedTimer ? Math.round(completedTimer.durationSeconds / 60) : 25}
        onClose={dismissCelebration}
        onLogReflection={() => {
          navigate('/reflect');
          dismissCelebration();
        }}
        onStartBreak={(durationMinutes = 5) => {
          // Start the break timer
          BackgroundTimer.start('custom', durationMinutes * 60, 'Break');
          
          // Manually dismiss without calling acknowledge() to avoid clearing the new timer
          setShowCelebration(false);
          // Clear completed timer reference after animation
          setTimeout(() => setCompletedTimer(null), 300);
        }}
        onStartNext={() => {
          // Will reset to setup state
          dismissCelebration();
        }}
      />
    </TimerCompletionContext.Provider>
  );
}

export function useTimerCompletion() {
  const context = useContext(TimerCompletionContext);
  if (!context) {
    throw new Error('useTimerCompletion must be used within TimerCompletionProvider');
  }
  return context;
}
