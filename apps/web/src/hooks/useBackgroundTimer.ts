/**
 * React hook for BackgroundTimer
 * Provides reactive state and convenient methods for timer operations
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  BackgroundTimer, 
  BackgroundTimerState, 
  TimerMode, 
  TimerState,
} from '@/services/BackgroundTimer';

export function useBackgroundTimer(mode?: TimerMode) {
  const [state, setState] = useState<BackgroundTimerState>(() => BackgroundTimer.getState());
  const [remaining, setRemaining] = useState(() => BackgroundTimer.getRemainingSeconds());
  const [formattedTime, setFormattedTime] = useState(() => BackgroundTimer.formatRemaining());
  const [progress, setProgress] = useState(() => BackgroundTimer.getProgress());

  useEffect(() => {
    const unsubscribe = BackgroundTimer.subscribe((newState) => {
      setState(newState);
      setRemaining(BackgroundTimer.getRemainingSeconds());
      setFormattedTime(BackgroundTimer.formatRemaining());
      setProgress(BackgroundTimer.getProgress());
    });
    return unsubscribe;
  }, []);

  const start = useCallback((durationSeconds: number, label?: string) => {
    const timerMode = mode ?? 'custom';
    return BackgroundTimer.start(timerMode, durationSeconds, label);
  }, [mode]);

  const pause = useCallback(() => {
    BackgroundTimer.pause();
  }, []);

  const resume = useCallback(() => {
    BackgroundTimer.resume();
  }, []);

  const cancel = useCallback(() => {
    BackgroundTimer.cancel();
  }, []);

  const acknowledge = useCallback(() => {
    BackgroundTimer.acknowledge();
  }, []);

  const togglePauseResume = useCallback(() => {
    if (BackgroundTimer.isRunning(mode)) {
      BackgroundTimer.pause();
    } else if (BackgroundTimer.isPaused(mode)) {
      BackgroundTimer.resume();
    }
  }, [mode]);

  const onComplete = useCallback((callback: (timer: TimerState) => void) => {
    BackgroundTimer.onComplete(callback);
  }, []);

  const requestNotifications = useCallback(async () => {
    return BackgroundTimer.requestNotificationPermission();
  }, []);

  // Filter by mode if specified
  const activeTimer = state.activeTimer;
  const isActive = mode 
    ? activeTimer?.mode === mode && activeTimer?.status !== 'idle'
    : activeTimer !== null && activeTimer.status !== 'idle';
  const isRunning = BackgroundTimer.isRunning(mode);
  const isPaused = BackgroundTimer.isPaused(mode);
  const isCompleted = BackgroundTimer.isCompleted(mode);

  return {
    // State
    activeTimer,
    isActive,
    isRunning,
    isPaused,
    isCompleted,
    remaining,
    formattedTime,
    progress,
    notificationsEnabled: state.notificationsEnabled,
    
    // Actions
    start,
    pause,
    resume,
    cancel,
    acknowledge,
    togglePauseResume,
    onComplete,
    requestNotifications,
  };
}
