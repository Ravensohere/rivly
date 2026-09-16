// Events Ledger Types - Source of truth for all analytics data

export interface FocusSessionEvent {
  id: string;
  startAt: string; // ISO timestamp
  endAt: string; // ISO timestamp
  durationMin: number;
  dateKey: string; // YYYY-MM-DD local date
  taskId?: string;
  blockId?: string;
  completed: boolean;
  outcome?: 'good' | 'some' | 'notReally';
}

export interface TaskEvent {
  id: string;
  taskId: string;
  type: 'created' | 'completed' | 'uncompleted' | 'deleted' | 'edited';
  at: string; // ISO timestamp
  dateKey: string; // YYYY-MM-DD local date
}

export interface SleepEvent {
  id: string;
  dateKey: string; // YYYY-MM-DD local date (the morning of)
  rating: 'good' | 'okay' | 'poor';
  hours?: number;
  at: string; // ISO timestamp when logged
}

export interface CheckInEvent {
  id: string;
  dateKey: string; // YYYY-MM-DD local date
  mood: number; // 1-5
  energy: number; // 1-3
  sleepQuality: number; // 1-3
  intent: string;
  at: string; // ISO timestamp when logged
}

export interface ActiveFocusSession {
  sessionId: string;
  startAt: string; // ISO timestamp
  taskId?: string;
  blockId?: string;
  purpose?: string;
}

export type EventType = 'focus' | 'task' | 'sleep' | 'checkin';

export type TimeRange = 'week' | 'month' | '3months';

export interface DailyAggregate {
  dateKey: string;
  value: number;
}

export interface WeeklyAggregate {
  weekStartDateKey: string;
  value: number;
}

export interface MonthlyAggregate {
  monthKey: string; // YYYY-MM
  value: number;
}
