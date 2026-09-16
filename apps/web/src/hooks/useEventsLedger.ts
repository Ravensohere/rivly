// Hook for managing the events ledger - source of truth for analytics

import { useState, useEffect, useCallback } from 'react';
import {
  FocusSessionEvent,
  TaskEvent,
  SleepEvent,
  CheckInEvent,
  ActiveFocusSession,
  TimeRange,
} from '@/types/events';
import {
  addFocusSession as dbAddFocusSession,
  getFocusSessions,
  addTaskEvent as dbAddTaskEvent,
  getTaskEvents,
  addSleepRating as dbAddSleepRating,
  getSleepEvents,
  addCheckInEvent as dbAddCheckInEvent,
  getCheckInEvents,
  getActiveSession,
  setActiveSession,
  getInsightsRange,
  setInsightsRange,
  clearAllEventsData,
  getDateRange,
} from '@/lib/eventsDb';
import {
  groupFocusByDay,
  groupTasksByDay,
  groupSleepByDay,
  groupMoodByDay,
  groupEnergyByDay,
  getTotalFocusMinutes,
  getTotalCompletedTasks,
  getTotalCreatedTasks,
  getActualCompletedTasks,
  calculateFocusStreak,
  getSleepDistribution,
  getAverageSleepRating,
} from '@/lib/aggregation';
import { getLocalDateKey, safeNumber } from '@/lib/focusTotals';
import { api } from '@/lib/api';

export function useEventsLedger() {
  const [focusSessions, setFocusSessions] = useState<FocusSessionEvent[]>([]);
  const [taskEvents, setTaskEvents] = useState<TaskEvent[]>([]);
  const [sleepEvents, setSleepEvents] = useState<SleepEvent[]>([]);
  const [checkInEvents, setCheckInEvents] = useState<CheckInEvent[]>([]);
  const [activeSession, setActiveSessionState] = useState<ActiveFocusSession | null>(null);
  const [timeRange, setTimeRangeState] = useState<TimeRange>('week');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const range = getInsightsRange() as TimeRange;
        setTimeRangeState(range);

        const { start, end } = getDateRange(range);
        
        const [focus, tasks, sleep, checkins] = await Promise.all([
          getFocusSessions(start, end),
          getTaskEvents(start, end),
          getSleepEvents(start, end),
          getCheckInEvents(start, end),
        ]);
        
        setFocusSessions(focus);
        setTaskEvents(tasks);
        setSleepEvents(sleep);
        setCheckInEvents(checkins);
        
        // Check for active focus session
        const active = getActiveSession();
        setActiveSessionState(active);
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load events data:', error);
        setIsLoaded(true);
      }
    }
    
    loadData();
  }, []);

  // Reload data when time range changes
  const reloadData = useCallback(async (range?: TimeRange) => {
    const currentRange = range || timeRange;
    const { start, end } = getDateRange(currentRange);
    
    const [focus, tasks, sleep, checkins] = await Promise.all([
      getFocusSessions(start, end),
      getTaskEvents(start, end),
      getSleepEvents(start, end),
      getCheckInEvents(start, end),
    ]);
    
    setFocusSessions(focus);
    setTaskEvents(tasks);
    setSleepEvents(sleep);
    setCheckInEvents(checkins);
  }, [timeRange]);

  // Change time range
  const setTimeRange = useCallback(async (range: TimeRange) => {
    setTimeRangeState(range);
    setInsightsRange(range);
    await reloadData(range);
  }, [reloadData]);

  // ===== Focus Session Actions =====
  
  const startFocusSession = useCallback((options?: {
    taskId?: string;
    blockId?: string;
    purpose?: string;
  }) => {
    const session: ActiveFocusSession = {
      sessionId: crypto.randomUUID(),
      startAt: new Date().toISOString(),
      taskId: options?.taskId,
      blockId: options?.blockId,
      purpose: options?.purpose,
    };
    
    setActiveSession(session);
    setActiveSessionState(session);
    
    return session;
  }, []);

  const endFocusSession = useCallback(async (options?: {
    outcome?: 'good' | 'some' | 'notReally';
    completed?: boolean;
    endAt?: string;
    durationMinutes?: number;
  }) => {
    const active = activeSession || getActiveSession();
    if (!active) {
      console.warn('[EventsLedger] endFocusSession called but no active session found');
      return null;
    }
    
    const endTime = options?.endAt || new Date().toISOString();
    
    
    
    const event = await dbAddFocusSession(active.startAt, endTime, {
      taskId: active.taskId,
      blockId: active.blockId,
      outcome: options?.outcome,
      completed: options?.completed ?? true,
      durationMinutes: options?.durationMinutes,
    });
    
    // Clear active session
    setActiveSession(null);
    setActiveSessionState(null);
    
    // Update local state immediately for instant UI updates
    setFocusSessions(prev => {
      const updated = [...prev, event];
      return updated;
    });

    // Sync to Backend (Fire and Forget)
    try {
      await api.focus.recordSession({
        duration_minutes: options?.durationMinutes || event.durationMin || 0,
        outcome: options?.outcome,
        started_at: active.startAt,
        ended_at: endTime
      });
    } catch (e) {
      console.error('[EventsLedger] Failed to sync session to backend:', e);
      // TODO: Queue for later sync
    }
    
    return event;
  }, [activeSession]);

  const cancelFocusSession = useCallback(() => {
    setActiveSession(null);
    setActiveSessionState(null);
  }, []);

  const resumeOrEndStaleSession = useCallback(async (action: 'resume' | 'end') => {
    const active = activeSession || getActiveSession();
    if (!active) return null;
    
    if (action === 'end') {
      // End the stale session with the current time
      return endFocusSession({ completed: false });
    }
    
    // Resume - just return the session
    return active;
  }, [activeSession, endFocusSession]);

  // ===== Task Event Actions =====
  
  const recordTaskCreated = useCallback(async (taskId: string, dateKey?: string) => {
    // Use provided dateKey or current date
    const timestamp = dateKey ? `${dateKey}T12:00:00` : new Date().toISOString();
    const event = await dbAddTaskEvent(taskId, 'created', timestamp);
    setTaskEvents(prev => [...prev, event]);
    return event;
  }, []);

  const recordTaskCompleted = useCallback(async (taskId: string, dateKey?: string) => {
    // Use provided dateKey or current date - this ensures the completion is recorded on the task's date
    const timestamp = dateKey ? `${dateKey}T12:00:00` : new Date().toISOString();
    const event = await dbAddTaskEvent(taskId, 'completed', timestamp);
    setTaskEvents(prev => [...prev, event]);
    return event;
  }, []);

  const recordTaskUncompleted = useCallback(async (taskId: string, dateKey?: string) => {
    // Record when a task is unchecked/unmarked as done
    const timestamp = dateKey ? `${dateKey}T12:00:00` : new Date().toISOString();
    const event = await dbAddTaskEvent(taskId, 'uncompleted', timestamp);
    setTaskEvents(prev => [...prev, event]);
    return event;
  }, []);

  const recordTaskDeleted = useCallback(async (taskId: string, dateKey?: string) => {
    const timestamp = dateKey ? `${dateKey}T12:00:00` : new Date().toISOString();
    const event = await dbAddTaskEvent(taskId, 'deleted', timestamp);
    setTaskEvents(prev => [...prev, event]);
    return event;
  }, []);

  // ===== Sleep Actions =====
  
  const recordSleepRating = useCallback(async (
    dateKey: string,
    rating: 'good' | 'okay' | 'poor',
    hours?: number
  ) => {
    const event = await dbAddSleepRating(dateKey, rating, hours);
    
    // Update or add to local state
    setSleepEvents(prev => {
      const existing = prev.findIndex(e => e.dateKey === dateKey);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = event;
        return updated;
      }
      return [...prev, event];
    });
    
    return event;
  }, []);

  // ===== Check-in Actions =====

  const recordCheckIn = useCallback(async (
    dateKey: string,
    data: {
      mood: number;
      energy: number;
      sleepQuality: number;
      intent: string;
    }
  ) => {
    const event = await dbAddCheckInEvent(dateKey, data);
    
    // Also record sleep rating if sleep quality is provided
    const ratingMap: Record<number, 'poor' | 'okay' | 'good'> = {
      1: 'poor',
      2: 'okay',
      3: 'good'
    };
    await dbAddSleepRating(dateKey, ratingMap[data.sleepQuality] || 'okay');
    
    // Update local state
    setCheckInEvents(prev => {
      const existing = prev.findIndex(e => e.dateKey === dateKey);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = event;
        return updated;
      }
      return [...prev, event];
    });
    
    // Reload sleep events to stay in sync
    const { start, end } = getDateRange(timeRange);
    const sleep = await getSleepEvents(start, end);
    setSleepEvents(sleep);
    
    return event;
  }, [timeRange]);

  // ===== Clear Data =====
  
  const clearAllData = useCallback(async () => {
    await clearAllEventsData();
    setFocusSessions([]);
    setTaskEvents([]);
    setSleepEvents([]);
    setCheckInEvents([]);
    setActiveSessionState(null);
  }, []);

  // ===== Computed Values - using safe number handling =====
  
  const { start, end } = getDateRange(timeRange);
  
  const focusByDay = groupFocusByDay(focusSessions, start, end);
  const tasksByDay = groupTasksByDay(taskEvents, start, end, 'completed');
  const sleepByDay = groupSleepByDay(sleepEvents, start, end);
  const moodByDay = groupMoodByDay(checkInEvents, start, end);
  const energyByDay = groupEnergyByDay(checkInEvents, start, end);
  
  const totalFocusMinutes = safeNumber(getTotalFocusMinutes(focusSessions));
  const totalCompletedTasks = safeNumber(getTotalCompletedTasks(taskEvents));
  const totalCreatedTasks = safeNumber(getTotalCreatedTasks(taskEvents));
  const focusStreak = safeNumber(calculateFocusStreak(focusSessions));
  const sleepDistribution = getSleepDistribution(sleepEvents);
  const averageSleepRating = safeNumber(getAverageSleepRating(sleepEvents));

  // Today's stats - use local dateKey for consistency
  const today = getLocalDateKey();
  const todayFocusSessions = focusSessions.filter(s => s.dateKey === today);
  const todayFocusMinutes = safeNumber(getTotalFocusMinutes(todayFocusSessions));
  
  // Filter today's task events and apply last-event-wins
  const todayTaskEvents = taskEvents.filter(e => e.dateKey === today);
  const todayCompletedTasks = safeNumber(getActualCompletedTasks(todayTaskEvents));
  const todayCreatedTasks = safeNumber(getTotalCreatedTasks(todayTaskEvents));
  
  const todaySleepEvent = sleepEvents.find(e => e.dateKey === today);
  const todayCheckInEvent = checkInEvents.find(e => e.dateKey === today);

  return {
    // State
    isLoaded,
    timeRange,
    activeSession,
    
    // Raw events
    focusSessions,
    taskEvents,
    sleepEvents,
    
    // Aggregated data
    focusByDay,
    tasksByDay,
    sleepByDay,
    moodByDay,
    energyByDay,
    
    // Summary stats
    totalFocusMinutes,
    totalCompletedTasks,
    totalCreatedTasks,
    focusStreak,
    sleepDistribution,
    averageSleepRating,
    
    // Today's stats
    todayFocusMinutes,
    todayCompletedTasks,
    todayCreatedTasks,
    todaySleepEvent,
    todayCheckInEvent,
    
    // Actions
    setTimeRange,
    reloadData,
    
    // Focus actions
    startFocusSession,
    endFocusSession,
    cancelFocusSession,
    resumeOrEndStaleSession,
    
    // Task actions
    recordTaskCreated,
    recordTaskCompleted,
    recordTaskUncompleted,
    recordTaskDeleted,
    
    // Sleep actions
    recordSleepRating,
    
    // Check-in actions
    recordCheckIn,
    
    // Data management
    clearAllData,
  };
}
