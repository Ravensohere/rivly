import { useLocalStorage, formatDate } from './useLocalStorage';
import { DailyCheckIn } from '@/types';

const STORAGE_KEY = 'dailyRhythm_checkIns';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type EnergyLevel = 'low' | 'medium' | 'high';
export type SleepQuality = 'poor' | 'okay' | 'good';
export type DayIntent = 'calm' | 'productive' | 'focused' | 'light' | 'brave';

export function useCheckIn() {
  const [checkIns, setCheckIns] = useLocalStorage<DailyCheckIn[]>(STORAGE_KEY, []);

  const getCheckInForDate = (date: string): DailyCheckIn | undefined => {
    return checkIns.find(checkIn => checkIn.date === date);
  };

  const hasCheckedInToday = (): boolean => {
    const today = formatDate(new Date());
    return checkIns.some(checkIn => checkIn.date === today);
  };

  const saveCheckIn = (checkIn: DailyCheckIn) => {
    setCheckIns(prev => {
      const existing = prev.findIndex(c => c.date === checkIn.date);
      if (existing >= 0) {
        return prev.map((c, i) => i === existing ? checkIn : c);
      }
      return [...prev, checkIn];
    });
  };

  return {
    checkIns,
    getCheckInForDate,
    hasCheckedInToday,
    saveCheckIn,
  };
}
