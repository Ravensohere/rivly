// Winddown Context - Global state for winddown sessions that persist across navigation

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  WinddownSession, 
  WinddownSoundPack, 
  WinddownPreferences,
  WINDDOWN_SOUNDS,
  getSoundsForPack,
} from '@/types/winddown';
import { getLocalDateKey } from '@/lib/dateUtils';

const PREFS_KEY = 'calm-cycle-winddown-prefs';
const SESSION_KEY = 'calm-cycle-winddown-session';
const HISTORY_KEY = 'calm-cycle-winddown-history';

interface WinddownContextType {
  // State
  activeSession: WinddownSession | null;
  preferences: WinddownPreferences;
  isPlaying: boolean;
  remainingSeconds: number;
  todayCompleted: boolean;
  
  // Actions
  startSession: (durationMinutes: number, soundPack: WinddownSoundPack, soundId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  cancelSession: () => void;
  updatePreferences: (updates: Partial<WinddownPreferences>) => void;
  
  // Stats
  weeklyWinddownCount: number;
  getSessionHistory: () => WinddownSession[];
}

const WinddownContext = createContext<WinddownContextType | null>(null);

const defaultPrefs: WinddownPreferences = {
  defaultDuration: 10,
  defaultSoundPack: 'calm',
  scheduleEnabled: false,
};

export function WinddownProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<WinddownSession | null>(null);
  const [preferences, setPreferences] = useState<WinddownPreferences>(defaultPrefs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  
  // Load state on mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem(PREFS_KEY);
      if (savedPrefs) {
        setPreferences({ ...defaultPrefs, ...JSON.parse(savedPrefs) });
      }
      
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession) as WinddownSession;
        // Check if session is still valid (not completed/cancelled)
        if (session.status === 'active') {
          // Calculate remaining time
          const startTime = new Date(session.startedAt).getTime();
          const expectedEnd = startTime + session.durationMinutes * 60 * 1000;
          const remaining = Math.max(0, Math.floor((expectedEnd - Date.now()) / 1000));
          
          if (remaining > 0) {
            setActiveSession(session);
            setRemainingSeconds(remaining);
          } else {
            // Session expired, mark as completed
            const completed = { ...session, status: 'completed' as const, endedAt: new Date().toISOString() };
            saveSessionToHistory(completed);
            localStorage.removeItem(SESSION_KEY);
          }
        }
      }
    } catch (error) {
      console.error('[Winddown] Failed to load state:', error);
    }
  }, []);
  
  // Timer effect
  useEffect(() => {
    if (isPlaying && remainingSeconds > 0) {
      timerRef.current = window.setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            // Session completed
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, remainingSeconds > 0]);
  
  // Audio management
  useEffect(() => {
    if (isPlaying && activeSession) {
      const sound = WINDDOWN_SOUNDS.find(s => s.id === activeSession.soundId);
      if (sound?.audioUrl) {
        if (!audioRef.current) {
          audioRef.current = new Audio(sound.audioUrl);
          audioRef.current.loop = true;
          audioRef.current.volume = 0.7;
        }
        audioRef.current.play().catch(console.error);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    
    return () => {
      // Don't stop audio on unmount - let it continue during navigation
    };
  }, [isPlaying, activeSession?.soundId]);
  
  const saveSessionToHistory = (session: WinddownSession) => {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as WinddownSession[];
      history.push(session);
      // Keep last 30 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const filtered = history.filter(s => new Date(s.startedAt) > cutoff);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('[Winddown] Failed to save history:', error);
    }
  };
  
  const startSession = useCallback((durationMinutes: number, soundPack: WinddownSoundPack, soundId: string) => {
    const session: WinddownSession = {
      id: crypto.randomUUID(),
      date: getLocalDateKey(),
      startedAt: new Date().toISOString(),
      durationMinutes,
      soundPack,
      soundId,
      status: 'active',
    };
    
    setActiveSession(session);
    setRemainingSeconds(durationMinutes * 60);
    setIsPlaying(true);
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    console.log('[Winddown] Session started:', session);
  }, []);
  
  const pauseSession = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);
  
  const resumeSession = useCallback(() => {
    if (activeSession && remainingSeconds > 0) {
      setIsPlaying(true);
    }
  }, [activeSession, remainingSeconds]);
  
  const completeSession = useCallback(() => {
    if (!activeSession) return;
    
    const completed: WinddownSession = {
      ...activeSession,
      status: 'completed',
      endedAt: new Date().toISOString(),
    };
    
    saveSessionToHistory(completed);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setActiveSession(null);
    setIsPlaying(false);
    setRemainingSeconds(0);
    
    localStorage.removeItem(SESSION_KEY);
    
    console.log('[Winddown] Session completed:', completed);
  }, [activeSession]);
  
  const cancelSession = useCallback(() => {
    if (!activeSession) return;
    
    const cancelled: WinddownSession = {
      ...activeSession,
      status: 'cancelled',
      endedAt: new Date().toISOString(),
    };
    
    saveSessionToHistory(cancelled);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setActiveSession(null);
    setIsPlaying(false);
    setRemainingSeconds(0);
    
    localStorage.removeItem(SESSION_KEY);
    
    console.log('[Winddown] Session cancelled');
  }, [activeSession]);
  
  const updatePreferences = useCallback((updates: Partial<WinddownPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  const getSessionHistory = useCallback((): WinddownSession[] => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  }, []);
  
  // Calculate weekly count
  const weeklyWinddownCount = React.useMemo(() => {
    const history = getSessionHistory();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return history.filter(s => 
      s.status === 'completed' && 
      new Date(s.startedAt) > weekAgo
    ).length;
  }, [getSessionHistory]);
  
  // Check if today has a completed session
  const todayCompleted = React.useMemo(() => {
    const today = getLocalDateKey();
    const history = getSessionHistory();
    return history.some(s => s.date === today && s.status === 'completed');
  }, [getSessionHistory]);
  
  return (
    <WinddownContext.Provider value={{
      activeSession,
      preferences,
      isPlaying,
      remainingSeconds,
      todayCompleted,
      startSession,
      pauseSession,
      resumeSession,
      completeSession,
      cancelSession,
      updatePreferences,
      weeklyWinddownCount,
      getSessionHistory,
    }}>
      {children}
    </WinddownContext.Provider>
  );
}

export function useWinddownContext(): WinddownContextType {
  const context = useContext(WinddownContext);
  if (!context) {
    throw new Error('useWinddownContext must be used within WinddownProvider');
  }
  return context;
}
