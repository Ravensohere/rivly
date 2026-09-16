/**
 * FocusTimerContext - Global context for focus timer that persists across navigation
 * 
 * Uses BackgroundTimer as the timing source of truth, and adds focus-specific
 * session metadata (purpose, linkedTaskId, etc.)
 * 
 * Key guarantees:
 * - Timer persists across navigation and refresh
 * - Feedback screen only shows ONCE after completion
 * - Selecting feedback immediately returns to idle state
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { BackgroundTimer, TimerState } from '@/services/BackgroundTimer';
import { useBackgroundTimer } from '@/hooks/useBackgroundTimer';

const FOCUS_SESSION_KEY = 'dailyRhythm_focusSession_v1';

export interface FocusSessionConfig {
  duration: number; // in minutes
  purpose: string;
  purposeType: 'work' | 'study' | 'creative' | 'planning' | 'custom';
  customPurpose?: string;
  linkedTaskId?: string;
  linkedBlockId?: string;
}

export interface FocusSessionResult {
  endedEarly: boolean;
  actualMinutes: number;
  startTime: string;
}

type FocusState = 'idle' | 'running' | 'paused' | 'completed' | 'feedback';

interface FocusTimerContextValue {
  // Current state
  focusState: FocusState;
  sessionConfig: FocusSessionConfig | null;
  sessionResult: FocusSessionResult | null;
  
  // Timer values from BackgroundTimer
  remaining: number;
  formattedTime: string;
  progress: number;
  
  // Actions
  startFocus: (config: FocusSessionConfig) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  cancelFocus: () => void;
  endFocusEarly: () => void;
  completeFeedback: () => void;
  
  // For FocusSession component
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  // Timer Position
  timerPosition: { x: number; y: number };
  updateTimerPosition: (x: number, y: number) => void;
  resetTimerPosition: () => void;
}

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

const TIMER_POSITION_KEY = 'dailyRhythm_timerPosition_v1';

interface PersistedFocusSession {
  config: FocusSessionConfig;
  startedAt: string;
  state: FocusState;
  result?: FocusSessionResult;
  feedbackDismissed?: boolean; // NEW: Track if feedback was already shown
}

function loadPersistedSession(): PersistedFocusSession | null {
  try {
    const saved = localStorage.getItem(FOCUS_SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate duration to prevent restored bad states
      if (parsed.config && (typeof parsed.config.duration !== 'number' || parsed.config.duration > 180 || parsed.config.duration < 1)) {
        console.warn('[FocusTimerContext] Invalid duration in persisted session, clearing:', parsed.config.duration);
        return null;
      }
      return parsed;
    }
  } catch (e) {
    console.error('[FocusTimerContext] Failed to load session:', e);
  }
  return null;
}

function persistSession(session: PersistedFocusSession | null) {
  try {
    if (session) {
      localStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(FOCUS_SESSION_KEY);
    }
  } catch (e) {
    console.error('[FocusTimerContext] Failed to persist session:', e);
  }
}

// Clear all focus session data from storage
function clearPersistedSession() {
  try {
    localStorage.removeItem(FOCUS_SESSION_KEY);
    console.log('[FocusTimerContext] Cleared persisted session');
  } catch (e) {
    console.error('[FocusTimerContext] Failed to clear session:', e);
  }
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const {
    activeTimer,
    isRunning: timerRunning,
    isPaused: timerPaused,
    isCompleted: timerCompleted,
    remaining,
    formattedTime,
    progress,
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    cancel: cancelTimer,
    acknowledge,
  } = useBackgroundTimer('focus');
  
  const [sessionConfig, setSessionConfig] = useState<FocusSessionConfig | null>(null);
  const [sessionResult, setSessionResult] = useState<FocusSessionResult | null>(null);
  const [focusState, setFocusState] = useState<FocusState>('idle');
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [timerPosition, setTimerPosition] = useState({ x: 0, y: 0 });
  
  // Load timer position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMER_POSITION_KEY);
      if (saved) {
        setTimerPosition(JSON.parse(saved));
      }
    } catch (e) {
      console.error('[FocusTimerContext] Failed to load timer position:', e);
    }
  }, []);

  const updateTimerPosition = useCallback((x: number, y: number) => {
    const newPos = { x, y };
    setTimerPosition(newPos);
    localStorage.setItem(TIMER_POSITION_KEY, JSON.stringify(newPos));
  }, []);

  const resetTimerPosition = useCallback(() => {
    setTimerPosition({ x: 0, y: 0 });
    localStorage.removeItem(TIMER_POSITION_KEY);
  }, []);
  
  // Track if we've already transitioned to feedback for this session
  const hasShownFeedbackRef = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (hasRestoredSession) return;
    
    const persisted = loadPersistedSession();
    const timerState = BackgroundTimer.getState();
    const timer = timerState.activeTimer;
    
    // If feedback was already dismissed, don't restore anything
    if (persisted?.feedbackDismissed) {
      clearPersistedSession();
      setFocusState('idle');
      setHasRestoredSession(true);
      return;
    }
    
    if (persisted && timer?.mode === 'focus') {
      // Restore the session config
      setSessionConfig(persisted.config);
      
      // Determine state based on timer status
      if (timer.status === 'running') {
        setFocusState('running');
        console.log('[FocusTimerContext] Restored running session');
      } else if (timer.status === 'paused') {
        setFocusState('paused');
        console.log('[FocusTimerContext] Restored paused session');
      } else if (timer.status === 'completed') {
        // Timer completed, show feedback ONLY if not already dismissed
        const result: FocusSessionResult = {
          endedEarly: false,
          actualMinutes: persisted.config.duration,
          startTime: persisted.startedAt,
        };
        setSessionResult(result);
        setFocusState('feedback');
        hasShownFeedbackRef.current = true;
        console.log('[FocusTimerContext] Restored completed session, showing feedback');
      }
    } else if (persisted?.state === 'feedback' && persisted.result && !persisted.feedbackDismissed) {
      // Feedback state was persisted (user navigated away before giving feedback)
      setSessionConfig(persisted.config);
      setSessionResult(persisted.result);
      setFocusState('feedback');
      hasShownFeedbackRef.current = true;
      console.log('[FocusTimerContext] Restored feedback state');
    } else {
      // No valid session to restore
      setFocusState('idle');
    }
    
    setHasRestoredSession(true);
  }, [hasRestoredSession]);

  // Sync focus state with timer state
  useEffect(() => {
    if (!hasRestoredSession || !sessionConfig) return;
    
    // Only transition to feedback once per session
    if (timerCompleted && focusState !== 'feedback' && focusState !== 'idle' && !hasShownFeedbackRef.current) {
      // Timer just completed
      const elapsedMinutes = sessionConfig.duration;
      const result: FocusSessionResult = {
        endedEarly: false,
        actualMinutes: elapsedMinutes,
        startTime: new Date().toISOString(),
      };
      
      setSessionResult(result);
      setFocusState('feedback');
      hasShownFeedbackRef.current = true;
      
      // Persist the feedback state
      persistSession({
        config: sessionConfig,
        startedAt: result.startTime,
        state: 'feedback',
        result,
        feedbackDismissed: false,
      });
      
      console.log('[FocusTimerContext] Timer completed, transitioning to feedback');
    } else if (timerRunning && focusState !== 'running') {
      setFocusState('running');
    } else if (timerPaused && focusState !== 'paused') {
      setFocusState('paused');
    }
  }, [timerRunning, timerPaused, timerCompleted, focusState, hasRestoredSession, sessionConfig]);

  const startFocus = useCallback((config: FocusSessionConfig) => {
    console.log('[FocusTimerContext] Starting focus session:', config);
    
    // Reset feedback tracking for new session
    hasShownFeedbackRef.current = false;
    
    setSessionConfig(config);
    setSessionResult(null);
    setFocusState('running');
    
    // Start the background timer
    const label = config.purposeType === 'custom' ? config.customPurpose : config.purpose;
    startTimer(config.duration * 60, label);
    
    // Persist the session
    persistSession({
      config,
      startedAt: new Date().toISOString(),
      state: 'running',
      feedbackDismissed: false,
    });
  }, [startTimer]);

  const pauseFocus = useCallback(() => {
    pauseTimer();
    setFocusState('paused');
    
    if (sessionConfig) {
      persistSession({
        config: sessionConfig,
        startedAt: new Date().toISOString(),
        state: 'paused',
        feedbackDismissed: false,
      });
    }
  }, [pauseTimer, sessionConfig]);

  const resumeFocus = useCallback(() => {
    resumeTimer();
    setFocusState('running');
    
    if (sessionConfig) {
      persistSession({
        config: sessionConfig,
        startedAt: new Date().toISOString(),
        state: 'running',
        feedbackDismissed: false,
      });
    }
  }, [resumeTimer, sessionConfig]);

  const cancelFocus = useCallback(() => {
    console.log('[FocusTimerContext] Cancelling focus session');
    cancelTimer();
    hasShownFeedbackRef.current = false;
    setSessionConfig(null);
    setSessionResult(null);
    setFocusState('idle');
    clearPersistedSession();
  }, [cancelTimer]);

  const endFocusEarly = useCallback(() => {
    if (!sessionConfig) return;
    
    const elapsedSeconds = sessionConfig.duration * 60 - remaining;
    // Ensure actualMinutes is realistic: at least 1, and at most the session duration
    const computedMinutes = Math.floor(elapsedSeconds / 60);
    const actualMinutes = Math.min(
      Math.max(1, computedMinutes),
      sessionConfig.duration
    );
    
    console.log('[FocusTimerContext] Ending focus early after', actualMinutes, 'minutes');
    
    const result: FocusSessionResult = {
      endedEarly: true,
      actualMinutes,
      startTime: new Date().toISOString(),
    };
    
    cancelTimer();
    setSessionResult(result);
    setFocusState('feedback');
    hasShownFeedbackRef.current = true;
    
    // Persist feedback state
    persistSession({
      config: sessionConfig,
      startedAt: result.startTime,
      state: 'feedback',
      result,
      feedbackDismissed: false,
    });
  }, [sessionConfig, remaining, cancelTimer]);

  const completeFeedback = useCallback(() => {
    console.log('[FocusTimerContext] Feedback complete, resetting to idle');
    
    // Mark feedback as dismissed BEFORE clearing state
    // This prevents the restoration logic from showing feedback again
    const persisted = loadPersistedSession();
    if (persisted) {
      persistSession({
        ...persisted,
        feedbackDismissed: true,
      });
    }
    
    // Immediately clear everything
    acknowledge();
    hasShownFeedbackRef.current = false;
    setSessionConfig(null);
    setSessionResult(null);
    setFocusState('idle');
    
    // Now fully clear the persisted session
    // Use a small delay to ensure the dismissed flag is written first
    setTimeout(() => {
      clearPersistedSession();
    }, 50);
  }, [acknowledge]);

  const value: FocusTimerContextValue = {
    focusState,
    sessionConfig,
    sessionResult,
    remaining,
    formattedTime,
    progress,
    startFocus,
    pauseFocus,
    resumeFocus,
    cancelFocus,
    endFocusEarly,
    completeFeedback,
    isRunning: focusState === 'running',
    isPaused: focusState === 'paused',
    isCompleted: focusState === 'feedback',
    timerPosition,
    updateTimerPosition,
    resetTimerPosition,
  };

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer(): FocusTimerContextValue {
  const context = useContext(FocusTimerContext);
  if (!context) {
    throw new Error('useFocusTimer must be used within FocusTimerProvider');
  }
  return context;
}
