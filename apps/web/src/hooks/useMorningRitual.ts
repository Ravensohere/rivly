/**
 * Morning Ritual (Bridge): 3 steps — sleep, energy, review plan.
 * Persists completion per day so we can gate the app or show wizard once per day.
 */

import { useState, useEffect, useCallback } from 'react';
import { getLocalDateKey } from '@/lib/dateUtils';

const STORAGE_KEY_PREFIX = 'morning_ritual_done_v1:';
const DATA_KEY_PREFIX = 'morning_ritual_data_v1:';

export interface MorningRitualData {
  dateKey: string;
  sleepQuality: number; // 1-5 or 0 for skip
  energyLevel: number; // 1-10
  completedAt: string;
}

export function useMorningRitual() {
  const today = getLocalDateKey();
  const [doneToday, setDoneToday] = useState(false);
  const [dataToday, setDataToday] = useState<MorningRitualData | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + today);
      setDoneToday(raw === 'true');
      const dataRaw = localStorage.getItem(DATA_KEY_PREFIX + today);
      if (dataRaw) setDataToday(JSON.parse(dataRaw));
    } catch {
      setDoneToday(false);
      setDataToday(null);
    }
  }, [today]);

  const completeMorningRitual = useCallback(
    (sleepQuality: number, energyLevel: number) => {
      const payload: MorningRitualData = {
        dateKey: today,
        sleepQuality,
        energyLevel,
        completedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + today, 'true');
        localStorage.setItem(DATA_KEY_PREFIX + today, JSON.stringify(payload));
        setDoneToday(true);
        setDataToday(payload);
      } catch (e) {
        console.error('[MorningRitual] save failed', e);
      }
    },
    [today]
  );

  return {
    doneToday,
    dataToday,
    completeMorningRitual,
    today,
  };
}
