import { useLocalStorage } from './useLocalStorage';
import { useCallback, useEffect, useRef } from 'react';
import { RivaLanguage } from '@/lib/rivaLanguage';

export interface UserPreferences {
  // User Profile
  firstName: string | null;
  email: string | null;
  authProvider: 'local' | 'google' | null;
  tagline: string | null;
  timezone: string | null;
  wakeTime: string | null;
  dailyFocusGoal: number; // minutes
  dailyTaskGoal: number;
  createdAt: string | null;
  hasCompletedOnboarding: boolean;
  hasSeenTutorial: boolean;
  hasCompletedProfileSetup: boolean;

  // Pro Tier Tracking
  tier: 'student' | 'scholar' | 'sovereign';
  voiceCommandsUsed: number; // Resets daily for free tier
  lastVoiceReset: string | null; // Date key for last reset

  // Calendar
  calendarConnected: boolean;
  calendarLastSync: string | null;

  // Sound & Sleep defaults
  defaultSleepSound: string | null;
  defaultSleepTimer: number | null;
  defaultAutoFade: boolean;
  defaultAlarmTone: string;

  // Notifications
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  windDownReminderEnabled: boolean;
  windDownReminderTime: string;
  gentleWakeEnabled: boolean;

  // Voice AI
  voiceId: string;
  rivaLanguage: RivaLanguage;
}

const PREFS_KEY = 'flowday_profile_v1';

const defaultPrefs: UserPreferences = {
  firstName: null,
  email: null,
  authProvider: null,
  tagline: null,
  timezone: null,
  wakeTime: null,
  dailyFocusGoal: 60, // 1 hour default
  dailyTaskGoal: 5,
  createdAt: null,
  hasCompletedOnboarding: false,
  hasSeenTutorial: false,
  hasCompletedProfileSetup: false,
  tier: 'student',
  voiceCommandsUsed: 0,
  lastVoiceReset: null,
  calendarConnected: false,
  calendarLastSync: null,
  defaultSleepSound: null,
  defaultSleepTimer: 30,
  defaultAutoFade: true,
  defaultAlarmTone: 'soft-chime',
  dailyReminderEnabled: false,
  dailyReminderTime: '09:00',
  windDownReminderEnabled: true,
  windDownReminderTime: '21:30',
  gentleWakeEnabled: true,
  voiceId: 'meera', // Default to female Indian voice
  rivaLanguage: 'english', // Default language
};

/**
 * Migration function to handle preference schema changes
 * - Ensures hasCompletedProfileSetup is derived from existing data
 * - Migrates legacy tiers (free -> student, pro -> scholar)
 */
function migratePreferences(prefs: any): UserPreferences {
  const migrated = { ...defaultPrefs, ...prefs };
  
  // If firstName exists but hasCompletedProfileSetup is false, fix it
  if (migrated.firstName && !migrated.hasCompletedProfileSetup) {
    migrated.hasCompletedProfileSetup = true;
  }
  
  // If onboarding was completed previously, ensure profile setup is also marked
  if (migrated.hasCompletedOnboarding && !migrated.hasCompletedProfileSetup) {
    migrated.hasCompletedProfileSetup = true;
  }
  
  // Tier Migration
  if (migrated.tier === 'free') migrated.tier = 'student';
  if (migrated.tier === 'pro') migrated.tier = 'scholar';
  
  // Ensure we don't have invalid tiers
  if (!['student', 'scholar', 'sovereign'].includes(migrated.tier)) {
    migrated.tier = 'student';
  }
  
  return migrated;
}

export function useUserPreferences() {
  const [rawPrefs, setPrefs] = useLocalStorage<UserPreferences>(PREFS_KEY, defaultPrefs);
  const hasMigratedRef = useRef(false);
  
  // Apply migrations on first load
  const prefs = rawPrefs;
  
  useEffect(() => {
    if (hasMigratedRef.current) return;
    hasMigratedRef.current = true;
    
    const migrated = migratePreferences(rawPrefs);
    // Only update if migration changed something
    if (JSON.stringify(migrated) !== JSON.stringify(rawPrefs)) {
      setPrefs(migrated);
    }
  }, [rawPrefs, setPrefs]);

  const setProfile = useCallback((name: string, email: string, provider: 'local' | 'google' = 'local') => {
    setPrefs(prev => ({ 
      ...prev, 
      firstName: name, 
      email: email,
      authProvider: provider,
      hasCompletedProfileSetup: true,
      createdAt: prev.createdAt || new Date().toISOString(),
    }));
  }, [setPrefs]);

  const setFirstName = useCallback((name: string | null) => {
    setPrefs(prev => ({ ...prev, firstName: name, hasCompletedOnboarding: true }));
  }, [setPrefs]);

  const markOnboardingComplete = useCallback(() => {
    setPrefs(prev => ({ ...prev, hasCompletedOnboarding: true }));
  }, [setPrefs]);

  const markTutorialComplete = useCallback(() => {
    setPrefs(prev => ({ ...prev, hasSeenTutorial: true }));
  }, [setPrefs]);

  const markProfileSetupComplete = useCallback(() => {
    setPrefs(prev => ({ ...prev, hasCompletedProfileSetup: true }));
  }, [setPrefs]);
  
  const resetOnboarding = useCallback(() => {
    setPrefs(prev => ({ 
      ...prev, 
      hasCompletedOnboarding: false, 
      hasSeenTutorial: false,
      hasCompletedProfileSetup: false,
      firstName: null,
      email: null,
      authProvider: null,
    }));
  }, [setPrefs]);

  const connectCalendar = useCallback(() => {
    setPrefs(prev => ({
      ...prev,
      calendarConnected: true,
      calendarLastSync: new Date().toISOString(),
    }));
  }, [setPrefs]);

  const disconnectCalendar = useCallback(() => {
    setPrefs(prev => ({
      ...prev,
      calendarConnected: false,
      calendarLastSync: null,
    }));
  }, [setPrefs]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPrefs(prev => ({ ...prev, ...updates }));
  }, [setPrefs]);

  const getGreeting = useCallback((timeBasedGreeting: string) => {
    if (prefs.firstName) {
      return `${timeBasedGreeting}, ${prefs.firstName}`;
    }
    return timeBasedGreeting;
  }, [prefs.firstName]);

  const logout = useCallback(() => {
    setPrefs(prev => ({
      ...prev,
      firstName: null,
      email: null,
      authProvider: null,
      hasCompletedProfileSetup: false,
      calendarConnected: false,
      calendarLastSync: null,
    }));
  }, [setPrefs]);

  return {
    ...prefs,
    prefs,
    setProfile,
    setFirstName,
    markOnboardingComplete,
    markTutorialComplete,
    markProfileSetupComplete,
    resetOnboarding,
    connectCalendar,
    disconnectCalendar,
    updatePreferences,
    getGreeting,
    logout,
  };
}
