import { useLocalStorage, generateId, formatDate } from './useLocalStorage';
import { 
  SleepEntry, 
  SoundPlaybackState, 
  Alarm, 
  SleepPreferences,
  SoundCategory
} from '@/types/sleep';
import { useCallback, useMemo } from 'react';

const ENTRIES_KEY = 'dailyRhythm_sleepEntries';
const PLAYBACK_KEY = 'dailyRhythm_soundPlayback';
const ALARMS_KEY = 'dailyRhythm_alarms';
const PREFS_KEY = 'dailyRhythm_sleepPrefs';

const defaultPlayback: SoundPlaybackState = {
  selectedSound: null,
  isPlaying: false,
  volume: 70,
  sleepTimerMinutes: null,
  autoFade: true,
};

const defaultPrefs: SleepPreferences = {
  windDownScheduleEnabled: false,
  windDownTime: '21:30',
  morningBridgeEnabled: true,
  selectedSoundCategory: 'rain',
};

export function useSleep() {
  const [entries, setEntries] = useLocalStorage<SleepEntry[]>(ENTRIES_KEY, []);
  const [playback, setPlayback] = useLocalStorage<SoundPlaybackState>(PLAYBACK_KEY, defaultPlayback);
  const [alarms, setAlarms] = useLocalStorage<Alarm[]>(ALARMS_KEY, []);
  const [prefs, setPrefs] = useLocalStorage<SleepPreferences>(PREFS_KEY, defaultPrefs);

  const today = formatDate(new Date());

  // Sleep Entry helpers
  const getEntryForDate = useCallback((date: string): SleepEntry | undefined => {
    return entries.find(e => e.date === date);
  }, [entries]);

  const todayEntry = useMemo(() => getEntryForDate(today), [getEntryForDate, today]);

  const updateEntry = useCallback((date: string, updates: Partial<SleepEntry>) => {
    setEntries(prev => {
      const existing = prev.find(e => e.date === date);
      if (existing) {
        return prev.map(e => e.date === date ? { ...e, ...updates } : e);
      }
      return [...prev, { 
        date, 
        windDownUsed: false, 
        windDownCompleted: false,
        remindTomorrow: true,
        ...updates 
      }];
    });
  }, [setEntries]);

  // Wind-down
  const startWindDown = useCallback(() => {
    updateEntry(today, { windDownUsed: true, windDownCompleted: false });
  }, [today, updateEntry]);

  const completeWindDown = useCallback((ritual: SleepEntry['ritual']) => {
    updateEntry(today, { windDownCompleted: true, ritual });
  }, [today, updateEntry]);

  // Night anxiety parking
  const saveNightDump = useCallback((text: string, remindTomorrow: boolean, reminderTime?: string) => {
    updateEntry(today, { nightDumpText: text, remindTomorrow, reminderTime });
  }, [today, updateEntry]);

  // Wake intent
  const setWakeIntent = useCallback((intent: SleepEntry['wakeIntent']) => {
    updateEntry(today, { wakeIntent: intent });
  }, [today, updateEntry]);

  // Sleep quality
  const setSleepQuality = useCallback((quality: SleepEntry['sleepQuality'], helper?: SleepEntry['sleepHelper']) => {
    updateEntry(today, { sleepQuality: quality, sleepHelper: helper });
  }, [today, updateEntry]);

  // Sound playback
  const selectSound = useCallback((soundId: string | null) => {
    setPlayback(prev => ({ ...prev, selectedSound: soundId, isPlaying: soundId !== null }));
  }, [setPlayback]);

  const togglePlayback = useCallback(() => {
    setPlayback(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [setPlayback]);

  const setVolume = useCallback((volume: number) => {
    setPlayback(prev => ({ ...prev, volume }));
  }, [setPlayback]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setPlayback(prev => ({ ...prev, sleepTimerMinutes: minutes }));
  }, [setPlayback]);

  const toggleAutoFade = useCallback(() => {
    setPlayback(prev => ({ ...prev, autoFade: !prev.autoFade }));
  }, [setPlayback]);

  const stopPlayback = useCallback(() => {
    setPlayback(prev => ({ ...prev, isPlaying: false, selectedSound: null }));
  }, [setPlayback]);

  // Alarms
  const addAlarm = useCallback((alarm: Omit<Alarm, 'id'>) => {
    const newAlarm: Alarm = { ...alarm, id: generateId() };
    setAlarms(prev => [...prev, newAlarm]);
    return newAlarm;
  }, [setAlarms]);

  const updateAlarm = useCallback((id: string, updates: Partial<Alarm>) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, [setAlarms]);

  const deleteAlarm = useCallback((id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  }, [setAlarms]);

  const toggleAlarm = useCallback((id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  }, [setAlarms]);

  // Preferences
  const updatePrefs = useCallback((updates: Partial<SleepPreferences>) => {
    setPrefs(prev => ({ ...prev, ...updates }));
  }, [setPrefs]);

  const setSoundCategory = useCallback((category: SoundCategory) => {
    setPrefs(prev => ({ ...prev, selectedSoundCategory: category }));
  }, [setPrefs]);

  // Insights
  const getWeeklyInsights = useCallback(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = entries.filter(e => new Date(e.date) >= weekAgo);
    
    const windDownCount = weekEntries.filter(e => e.windDownUsed).length;
    const parkedCount = weekEntries.filter(e => e.nightDumpText).length;
    const qualityEntries = weekEntries.filter(e => e.sleepQuality);
    const goodSleepWithParking = weekEntries.filter(e => e.nightDumpText && e.sleepQuality === 'good').length;

    return {
      windDownCount,
      parkedCount,
      totalEntries: weekEntries.length,
      goodSleepWithParking,
      qualityCount: qualityEntries.length,
    };
  }, [entries]);

  return {
    // Entry state
    entries,
    todayEntry,
    getEntryForDate,
    updateEntry,
    
    // Wind-down
    startWindDown,
    completeWindDown,
    isWindDownActive: todayEntry?.windDownUsed && !todayEntry?.windDownCompleted,
    
    // Night anxiety
    saveNightDump,
    
    // Wake intent
    setWakeIntent,
    
    // Sleep quality
    setSleepQuality,
    
    // Playback
    playback,
    selectSound,
    togglePlayback,
    setVolume,
    setSleepTimer,
    toggleAutoFade,
    stopPlayback,
    
    // Alarms
    alarms,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
    
    // Preferences
    prefs,
    updatePrefs,
    setSoundCategory,
    
    // Insights
    getWeeklyInsights,
  };
}
