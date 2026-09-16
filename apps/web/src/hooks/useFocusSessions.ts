import { useLocalStorage, generateId, formatDate } from './useLocalStorage';
import { FocusSession } from '@/types';

const STORAGE_KEY = 'dailyRhythm_focusSessions';

export type FocusPurpose = 'study' | 'work' | 'creative' | 'custom';
export type FocusOutcome = 'good' | 'some' | 'notReally';

export function useFocusSessions() {
  const [sessions, setSessions] = useLocalStorage<FocusSession[]>(STORAGE_KEY, []);

  const getSessionsForDate = (date: string): FocusSession[] => {
    return sessions.filter(session => session.date === date);
  };

  const addSession = (session: Omit<FocusSession, 'id'>) => {
    const newSession: FocusSession = {
      ...session,
      id: generateId(),
    };
    setSessions(prev => [...prev, newSession]);
    return newSession;
  };

  const updateSession = (id: string, updates: Partial<FocusSession>) => {
    setSessions(prev => prev.map(session => 
      session.id === id ? { ...session, ...updates } : session
    ));
  };

  const getTotalFocusMinutesToday = (date: string): number => {
    return getSessionsForDate(date).reduce((sum, session) => sum + session.durationMinutes, 0);
  };

  const getCompletedSessionsCount = (date: string): number => {
    return getSessionsForDate(date).filter(s => !s.endedEarly).length;
  };

  return {
    sessions,
    getSessionsForDate,
    addSession,
    updateSession,
    getTotalFocusMinutesToday,
    getCompletedSessionsCount,
  };
}
