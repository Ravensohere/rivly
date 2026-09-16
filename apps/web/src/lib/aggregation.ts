// Aggregation utilities for analytics

import { 
  FocusSessionEvent, 
  TaskEvent, 
  SleepEvent,
  CheckInEvent,
  DailyAggregate,
  WeeklyAggregate,
  MonthlyAggregate 
} from '@/types/events';
import { formatDateKey } from './eventsDb';
import { safeNumber } from './focusTotals';

// ===== Date Utilities =====

export function getDaysInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  while (current <= end) {
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

export function getWeekStart(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  const day = date.getDay();
  // Monday = 0, Sunday = 6 (week starts on Monday)
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return formatDateKey(date);
}

export function getMonthKey(dateKey: string): string {
  return dateKey.substring(0, 7); // YYYY-MM
}

// ===== Last-Event-Wins Task State Resolution =====

/**
 * Computes the final completion state of each task using last-event-wins logic.
 * Returns a Map of taskId -> boolean (true = completed, false = not completed)
 */
export function getTaskFinalStates(events: TaskEvent[]): Map<string, boolean> {
  const taskStates = new Map<string, { completed: boolean; timestamp: string }>();
  
  // Process events in order - last event wins
  for (const event of events) {
    if (event.type === 'completed' || event.type === 'uncompleted') {
      const existing = taskStates.get(event.taskId);
      if (!existing || event.at >= existing.timestamp) {
        taskStates.set(event.taskId, {
          completed: event.type === 'completed',
          timestamp: event.at,
        });
      }
    }
    // If a task is deleted, remove it from tracking
    if (event.type === 'deleted') {
      taskStates.delete(event.taskId);
    }
  }
  
  const result = new Map<string, boolean>();
  taskStates.forEach((state, taskId) => {
    result.set(taskId, state.completed);
  });
  
  return result;
}

/**
 * Gets the count of currently completed tasks (last-event-wins)
 */
export function getActualCompletedTasks(events: TaskEvent[]): number {
  const states = getTaskFinalStates(events);
  let count = 0;
  states.forEach(isCompleted => {
    if (isCompleted) count++;
  });
  return count;
}

/**
 * Gets the count of total tasks (created - deleted)
 */
export function getTotalCreatedTasks(events: TaskEvent[]): number {
  const createdTasks = new Set<string>();
  const deletedTasks = new Set<string>();
  
  for (const event of events) {
    if (event.type === 'created') {
      createdTasks.add(event.taskId);
    }
    if (event.type === 'deleted') {
      deletedTasks.add(event.taskId);
    }
  }
  
  // Count tasks that were created but not deleted
  let count = 0;
  createdTasks.forEach(taskId => {
    if (!deletedTasks.has(taskId)) count++;
  });
  
  return count;
}

/**
 * Gets completed tasks count per day using last-event-wins within each day
 */
export function getCompletedTasksByDay(
  events: TaskEvent[],
  startDate: string,
  endDate: string
): DailyAggregate[] {
  const days = getDaysInRange(startDate, endDate);
  const result: DailyAggregate[] = [];
  
  for (const dateKey of days) {
    // Get all events for this day
    const dayEvents = events.filter(e => e.dateKey === dateKey);
    
    // Apply last-event-wins for this day
    const taskStates = new Map<string, boolean>();
    for (const event of dayEvents) {
      if (event.type === 'completed') {
        taskStates.set(event.taskId, true);
      } else if (event.type === 'uncompleted') {
        taskStates.set(event.taskId, false);
      }
    }
    
    // Count completed
    let count = 0;
    taskStates.forEach(isCompleted => {
      if (isCompleted) count++;
    });
    
    result.push({ dateKey, value: count });
  }
  
  return result;
}

// ===== Focus Sessions Aggregation =====

export function groupFocusByDay(
  sessions: FocusSessionEvent[],
  startDate: string,
  endDate: string
): DailyAggregate[] {
  const days = getDaysInRange(startDate, endDate);
  const map = new Map<string, number>();
  
  // Initialize all days with 0
  days.forEach(d => map.set(d, 0));
  
  // Sum up focus minutes per day - use safeNumber to handle NaN
  sessions.forEach(session => {
    if (!session || !session.dateKey) return;
    const current = map.get(session.dateKey) || 0;
    const duration = safeNumber(session.durationMin);
    map.set(session.dateKey, current + duration);
  });
  
  return days.map(dateKey => ({
    dateKey,
    value: map.get(dateKey) || 0,
  }));
}

export function groupFocusByWeek(
  sessions: FocusSessionEvent[],
  startDate: string,
  endDate: string
): WeeklyAggregate[] {
  const map = new Map<string, number>();
  
  sessions.forEach(session => {
    if (!session || !session.dateKey) return;
    const weekStart = getWeekStart(session.dateKey);
    const current = map.get(weekStart) || 0;
    const duration = safeNumber(session.durationMin);
    map.set(weekStart, current + duration);
  });

  return Array.from(map.entries())
    .map(([weekStartDateKey, value]) => ({ weekStartDateKey, value }))
    .sort((a, b) => a.weekStartDateKey.localeCompare(b.weekStartDateKey));
}

export function groupFocusByMonth(
  sessions: FocusSessionEvent[],
  startDate: string,
  endDate: string
): MonthlyAggregate[] {
  const map = new Map<string, number>();
  
  sessions.forEach(session => {
    if (!session || !session.dateKey) return;
    const monthKey = getMonthKey(session.dateKey);
    const current = map.get(monthKey) || 0;
    const duration = safeNumber(session.durationMin);
    map.set(monthKey, current + duration);
  });

  return Array.from(map.entries())
    .map(([monthKey, value]) => ({ monthKey, value }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export function getTotalFocusMinutes(sessions: FocusSessionEvent[]): number {
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) return 0;
  return sessions.reduce((sum, s) => sum + safeNumber(s?.durationMin), 0);
}

// ===== Task Events Aggregation (Legacy - still used for chart) =====

export function groupTasksByDay(
  events: TaskEvent[],
  startDate: string,
  endDate: string,
  type: TaskEvent['type'] = 'completed'
): DailyAggregate[] {
  // Use the new last-event-wins logic for completed tasks
  if (type === 'completed') {
    return getCompletedTasksByDay(events, startDate, endDate);
  }
  
  // For other event types, use simple counting
  const days = getDaysInRange(startDate, endDate);
  const map = new Map<string, number>();
  
  // Initialize all days with 0
  days.forEach(d => map.set(d, 0));
  
  // Count events per day
  events
    .filter(e => e.type === type)
    .forEach(event => {
      const current = map.get(event.dateKey) || 0;
      map.set(event.dateKey, current + 1);
    });
  
  return days.map(dateKey => ({
    dateKey,
    value: map.get(dateKey) || 0,
  }));
}

export function groupTasksByWeek(
  events: TaskEvent[],
  startDate: string,
  endDate: string,
  type: TaskEvent['type'] = 'completed'
): WeeklyAggregate[] {
  const map = new Map<string, number>();
  
  events
    .filter(e => e.type === type)
    .forEach(event => {
      const weekStart = getWeekStart(event.dateKey);
      const current = map.get(weekStart) || 0;
      map.set(weekStart, current + 1);
    });
  
  return Array.from(map.entries())
    .map(([weekStartDateKey, value]) => ({ weekStartDateKey, value }))
    .sort((a, b) => a.weekStartDateKey.localeCompare(b.weekStartDateKey));
}

// DEPRECATED: Use getActualCompletedTasks for accurate count
export function getTotalCompletedTasks(events: TaskEvent[]): number {
  return getActualCompletedTasks(events);
}

// ===== Sleep Events Aggregation =====

export function groupSleepByDay(
  events: SleepEvent[],
  startDate: string,
  endDate: string
): DailyAggregate[] {
  const days = getDaysInRange(startDate, endDate);
  const map = new Map<string, number>();
  
  // Initialize all days with 0
  days.forEach(d => map.set(d, 0));
  
  // Map rating to numeric value: poor=1, okay=2, good=3
  events.forEach(event => {
    const value = event.rating === 'good' ? 3 : event.rating === 'okay' ? 2 : 1;
    map.set(event.dateKey, value);
  });
  
  return days.map(dateKey => ({
    dateKey,
    value: map.get(dateKey) || 0,
  }));
}

export function groupMoodByDay(
  events: CheckInEvent[],
  startDate: string,
  endDate: string
): DailyAggregate[] {
  const days = getDaysInRange(startDate, endDate);
  const map = new Map<string, number>();
  
  // Initialize all days with 0
  days.forEach(d => map.set(d, 0));
  
  events.forEach(event => {
    map.set(event.dateKey, event.mood);
  });
  
  return days.map(dateKey => ({
    dateKey,
    value: map.get(dateKey) || 0,
  }));
}

export function groupEnergyByDay(
  events: CheckInEvent[],
  startDate: string,
  endDate: string
): DailyAggregate[] {
  const days = getDaysInRange(startDate, endDate);
  const map = new Map<string, number>();
  
  // Initialize all days with 0
  days.forEach(d => map.set(d, 0));
  
  events.forEach(event => {
    map.set(event.dateKey, event.energy);
  });
  
  return days.map(dateKey => ({
    dateKey,
    value: map.get(dateKey) || 0,
  }));
}

export function getSleepDistribution(
  events: SleepEvent[]
): { good: number; okay: number; poor: number } {
  return events.reduce(
    (acc, e) => {
      acc[e.rating]++;
      return acc;
    },
    { good: 0, okay: 0, poor: 0 }
  );
}

export function getAverageSleepRating(events: SleepEvent[]): number {
  if (events.length === 0) return 0;
  
  const total = events.reduce((sum, e) => {
    const value = e.rating === 'good' ? 3 : e.rating === 'okay' ? 2 : 1;
    return sum + value;
  }, 0);
  
  return total / events.length;
}

// ===== Streak Calculation =====

export function calculateFocusStreak(sessions: FocusSessionEvent[]): number {
  if (sessions.length === 0) return 0;
  
  // Get unique dates with focus sessions, sorted descending
  const uniqueDates = [...new Set(sessions.map(s => s.dateKey))].sort().reverse();
  
  if (uniqueDates.length === 0) return 0;
  
  const today = formatDateKey(new Date());
  const yesterday = formatDateKey(new Date(Date.now() - 86400000));
  
  // Must have activity today or yesterday to have a streak
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0;
  }
  
  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = new Date(uniqueDates[i] + 'T00:00:00');
    const prev = new Date(uniqueDates[i + 1] + 'T00:00:00');
    const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000);
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

// ===== Chart Data Formatting =====

export function formatDayLabel(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatDateLabel(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatWeekLabel(weekStartDateKey: string): string {
  const date = new Date(weekStartDateKey + 'T00:00:00');
  return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
