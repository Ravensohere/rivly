// Events Database - IndexedDB persistence for analytics events

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { 
  FocusSessionEvent, 
  TaskEvent, 
  SleepEvent, 
  ActiveFocusSession,
  CheckInEvent
} from '@/types/events';

interface EventsDBSchema extends DBSchema {
  focusSessions: {
    key: string;
    value: FocusSessionEvent;
    indexes: { 'by-dateKey': string };
  };
  taskEvents: {
    key: string;
    value: TaskEvent;
    indexes: { 'by-dateKey': string; 'by-taskId': string };
  };
  sleepEvents: {
    key: string;
    value: SleepEvent;
    indexes: { 'by-dateKey': string };
  };
  checkInEvents: {
    key: string;
    value: CheckInEvent;
    indexes: { 'by-dateKey': string };
  };
}

const DB_NAME = 'calm-cycle-events';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EventsDBSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<EventsDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<EventsDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Focus sessions store
        if (!db.objectStoreNames.contains('focusSessions')) {
          const focusStore = db.createObjectStore('focusSessions', { keyPath: 'id' });
          focusStore.createIndex('by-dateKey', 'dateKey');
        }
        
        // Task events store
        if (!db.objectStoreNames.contains('taskEvents')) {
          const taskStore = db.createObjectStore('taskEvents', { keyPath: 'id' });
          taskStore.createIndex('by-dateKey', 'dateKey');
          taskStore.createIndex('by-taskId', 'taskId');
        }
        
        // Sleep events store
        if (!db.objectStoreNames.contains('sleepEvents')) {
          const sleepStore = db.createObjectStore('sleepEvents', { keyPath: 'id' });
          sleepStore.createIndex('by-dateKey', 'dateKey');
        }

        // Check-in events store
        if (!db.objectStoreNames.contains('checkInEvents')) {
          const checkInStore = db.createObjectStore('checkInEvents', { keyPath: 'id' });
          checkInStore.createIndex('by-dateKey', 'dateKey');
        }
      },
    });
  }
  return dbPromise;
}

// LocalStorage keys for lightweight data
const ACTIVE_SESSION_KEY = 'calm-cycle-active-focus';
const INSIGHTS_RANGE_KEY = 'calm-cycle-insights-range';

// ===== Focus Sessions =====

export async function addFocusSession(
  startAt: string,
  endAt: string,
  options?: {
    taskId?: string;
    blockId?: string;
    outcome?: 'good' | 'some' | 'notReally';
    completed?: boolean;
    durationMinutes?: number;
  }
): Promise<FocusSessionEvent> {
  const db = await getDb();
  
  const start = new Date(startAt);
  const end = new Date(endAt);
  // Use explicit duration if provided, otherwise fallback to wall-clock calculation
  const durationMin = options?.durationMinutes ?? Math.round((end.getTime() - start.getTime()) / 60000);
  
  // Use local date for dateKey
  const dateKey = formatDateKey(start);
  
  const event: FocusSessionEvent = {
    id: crypto.randomUUID(),
    startAt,
    endAt,
    durationMin,
    dateKey,
    taskId: options?.taskId,
    blockId: options?.blockId,
    completed: options?.completed ?? true,
    outcome: options?.outcome,
  };
  
  await db.put('focusSessions', event);
  return event;
}

export async function getFocusSessions(
  startDate?: string,
  endDate?: string
): Promise<FocusSessionEvent[]> {
  const db = await getDb();
  const all = await db.getAll('focusSessions');
  
  if (!startDate && !endDate) return all;
  
  return all.filter(event => {
    if (startDate && event.dateKey < startDate) return false;
    if (endDate && event.dateKey > endDate) return false;
    return true;
  });
}

export async function getFocusSessionsByDateKey(dateKey: string): Promise<FocusSessionEvent[]> {
  const db = await getDb();
  return db.getAllFromIndex('focusSessions', 'by-dateKey', dateKey);
}

// ===== Task Events =====

export async function addTaskEvent(
  taskId: string,
  type: TaskEvent['type'],
  at?: string
): Promise<TaskEvent> {
  const db = await getDb();
  
  const timestamp = at || new Date().toISOString();
  const dateKey = formatDateKey(new Date(timestamp));
  
  const event: TaskEvent = {
    id: crypto.randomUUID(),
    taskId,
    type,
    at: timestamp,
    dateKey,
  };
  
  await db.put('taskEvents', event);
  return event;
}

export async function getTaskEvents(
  startDate?: string,
  endDate?: string
): Promise<TaskEvent[]> {
  const db = await getDb();
  const all = await db.getAll('taskEvents');
  
  if (!startDate && !endDate) return all;
  
  const filtered = all.filter(event => {
    if (startDate && event.dateKey < startDate) return false;
    if (endDate && event.dateKey > endDate) return false;
    return true;
  });
  
  return filtered;
}

export async function getTaskEventsByDateKey(dateKey: string): Promise<TaskEvent[]> {
  const db = await getDb();
  return db.getAllFromIndex('taskEvents', 'by-dateKey', dateKey);
}

export async function getCompletedTasksCount(startDate: string, endDate: string): Promise<number> {
  const events = await getTaskEvents(startDate, endDate);
  return events.filter(e => e.type === 'completed').length;
}

// ===== Sleep Events =====

export async function addSleepRating(
  dateKey: string,
  rating: SleepEvent['rating'],
  hours?: number
): Promise<SleepEvent> {
  const db = await getDb();
  
  // Check if there's already a sleep event for this date
  const existing = await db.getAllFromIndex('sleepEvents', 'by-dateKey', dateKey);
  
  const event: SleepEvent = {
    id: existing.length > 0 ? existing[0].id : crypto.randomUUID(),
    dateKey,
    rating,
    hours,
    at: new Date().toISOString(),
  };
  
  await db.put('sleepEvents', event);
  return event;
}

export async function getSleepEvents(
  startDate?: string,
  endDate?: string
): Promise<SleepEvent[]> {
  const db = await getDb();
  const all = await db.getAll('sleepEvents');
  
  if (!startDate && !endDate) return all;
  
  return all.filter(event => {
    if (startDate && event.dateKey < startDate) return false;
    if (endDate && event.dateKey > endDate) return false;
    return true;
  });
}

export async function getSleepEventByDateKey(dateKey: string): Promise<SleepEvent | undefined> {
  const db = await getDb();
  const events = await db.getAllFromIndex('sleepEvents', 'by-dateKey', dateKey);
  return events[0];
}

// ===== Check-in Events =====

export async function addCheckInEvent(
  dateKey: string,
  data: {
    mood: number;
    energy: number;
    sleepQuality: number;
    intent: string;
  }
): Promise<CheckInEvent> {
  const db = await getDb();
  
  // Check if there's already a check-in for this date
  const existing = await db.getAllFromIndex('checkInEvents', 'by-dateKey', dateKey);
  
  const event: CheckInEvent = {
    id: existing.length > 0 ? existing[0].id : crypto.randomUUID(),
    dateKey,
    mood: data.mood,
    energy: data.energy,
    sleepQuality: data.sleepQuality,
    intent: data.intent,
    at: new Date().toISOString(),
  };
  
  await db.put('checkInEvents', event);
  return event;
}

export async function getCheckInEvents(
  startDate?: string,
  endDate?: string
): Promise<CheckInEvent[]> {
  const db = await getDb();
  const all = await db.getAll('checkInEvents');
  
  if (!startDate && !endDate) return all;
  
  return all.filter(event => {
    if (startDate && event.dateKey < startDate) return false;
    if (endDate && event.dateKey > endDate) return false;
    return true;
  });
}

export async function getCheckInEventByDateKey(dateKey: string): Promise<CheckInEvent | undefined> {
  const db = await getDb();
  const events = await db.getAllFromIndex('checkInEvents', 'by-dateKey', dateKey);
  return events[0];
}

// ===== Active Focus Session (localStorage) =====

export function getActiveSession(): ActiveFocusSession | null {
  try {
    const data = localStorage.getItem(ACTIVE_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setActiveSession(session: ActiveFocusSession | null): void {
  try {
    if (session) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {
    // localStorage not available
  }
}

// ===== Insights Range (localStorage) =====

export function getInsightsRange(): string {
  try {
    return localStorage.getItem(INSIGHTS_RANGE_KEY) || 'week';
  } catch {
    return 'week';
  }
}

export function setInsightsRange(range: string): void {
  try {
    localStorage.setItem(INSIGHTS_RANGE_KEY, range);
  } catch {
    // localStorage not available
  }
}

// ===== Clear All Data =====

export async function clearAllEventsData(): Promise<void> {
  const db = await getDb();
  await db.clear('focusSessions');
  await db.clear('taskEvents');
  await db.clear('sleepEvents');
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

// ===== Utility Functions =====

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateRange(range: 'week' | 'month' | '3months'): { start: string; end: string } {
  const now = new Date();
  const end = formatDateKey(now);
  
  let start: Date;
  switch (range) {
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      break;
    case 'month':
      start = new Date(now);
      start.setDate(start.getDate() - 29);
      break;
    case '3months':
      start = new Date(now);
      start.setDate(start.getDate() - 89);
      break;
  }
  
  return { start: formatDateKey(start), end };
}
