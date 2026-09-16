/**
 * useRhythmScore - Data-driven scoring system for the Rhythm Orb
 * Calculates a 0-100 score based on user's daily activities
 */

import { useMemo } from 'react';
import { useLocalStorage, formatDate } from './useLocalStorage';
import { useTasks } from './useTasks';
import { useTimeBlocks } from './useTimeBlocks';
import { useFocusSessions } from './useFocusSessions';
import { useCheckIn } from './useCheckIn';
import { useSleep } from './useSleep';

const STORAGE_KEY = 'dailyRhythm_rhythmScore';

export type EnergyLevel = 'low' | 'ok' | 'high';

interface DailyScoreData {
  date: string;
  moodScore: number | null; // 0-20 from check-in mood
  sleepScore: number | null; // 0-20 from sleep quality
  energyLevel: EnergyLevel | null; // low/ok/high
  energyScore: number | null; // 0-20 derived from energy level
  taskCompletionScore: number | null; // 0-20 from task completion %
  focusScore: number | null; // 0-20 from focus minutes
  totalScore: number; // 0-100 normalized
  inputCount: number; // how many inputs we have
}

interface RhythmScoreStore {
  [date: string]: {
    energyLevel?: EnergyLevel;
    manualOverride?: number;
  };
}

export function useRhythmScore() {
  const [store, setStore] = useLocalStorage<RhythmScoreStore>(STORAGE_KEY, {});
  const { getTasksForDate } = useTasks();
  const { getBlocksForDate } = useTimeBlocks();
  const { getSessionsForDate } = useFocusSessions();
  const { getCheckInForDate } = useCheckIn();
  const { getEntryForDate } = useSleep();

  // Calculate score for a specific date
  const getScoreForDate = (date: string): DailyScoreData => {
    const tasks = getTasksForDate(date);
    const blocks = getBlocksForDate(date);
    const focusSessions = getSessionsForDate(date);
    const checkIn = getCheckInForDate(date);
    const sleepEntry = getEntryForDate(date);
    const dayStore = store[date] || {};

    let moodScore: number | null = null;
    let sleepScore: number | null = null;
    let energyScore: number | null = null;
    let taskCompletionScore: number | null = null;
    let focusScore: number | null = null;

    // 1. Mood from check-in (0-20)
    if (checkIn && checkIn.mood !== undefined) {
      // mood is 1-5, map to 0-20
      moodScore = ((checkIn.mood - 1) / 4) * 20;
    }

    // 2. Sleep quality (0-20)
    if (sleepEntry?.sleepQuality) {
      const sleepMap = { poor: 5, okay: 12, good: 20 };
      sleepScore = sleepMap[sleepEntry.sleepQuality] ?? null;
    }

    // 3. Energy level (0-20)
    if (dayStore.energyLevel) {
      const energyMap = { low: 5, ok: 12, high: 20 };
      energyScore = energyMap[dayStore.energyLevel];
    }

    // 4. Task completion percentage (0-20)
    if (tasks.length > 0) {
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const completedBlocks = blocks.filter(b => b.status === 'completed').length;
      const totalItems = tasks.length + blocks.length;
      const completedItems = completedTasks + completedBlocks;
      const completionPercent = totalItems > 0 ? completedItems / totalItems : 0;
      taskCompletionScore = completionPercent * 20;
    }

    // 5. Focus minutes (0-20) - up to 120 mins = full score
    if (focusSessions.length > 0) {
      const totalMinutes = focusSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const normalizedMinutes = Math.min(totalMinutes / 120, 1);
      focusScore = normalizedMinutes * 20;
    }

    // Calculate available scores
    const scores: number[] = [];
    if (moodScore !== null) scores.push(moodScore);
    if (sleepScore !== null) scores.push(sleepScore);
    if (energyScore !== null) scores.push(energyScore);
    if (taskCompletionScore !== null) scores.push(taskCompletionScore);
    if (focusScore !== null) scores.push(focusScore);

    // Normalize: if we have at least one input, scale to 0-100
    let totalScore = 50; // Default neutral
    const inputCount = scores.length;

    if (inputCount > 0) {
      const sum = scores.reduce((a, b) => a + b, 0);
      // Max possible with available inputs
      const maxPossible = inputCount * 20;
      // Scale to 0-100
      totalScore = Math.round((sum / maxPossible) * 100);
    }

    return {
      date,
      moodScore,
      sleepScore,
      energyLevel: dayStore.energyLevel || null,
      energyScore,
      taskCompletionScore,
      focusScore,
      totalScore,
      inputCount,
    };
  };

  // Set energy level for a date
  const setEnergyLevel = (date: string, level: EnergyLevel) => {
    setStore(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        energyLevel: level,
      },
    }));
  };

  // Get the orb visual state based on score
  const getOrbStateFromScore = (score: number): 'neutral' | 'focused' | 'overwhelmed' | 'settled' => {
    if (score <= 25) return 'overwhelmed';
    if (score <= 50) return 'neutral';
    if (score <= 75) return 'focused';
    return 'settled';
  };

  // Get today's score
  const todayScore = useMemo(() => {
    return getScoreForDate(formatDate(new Date()));
  }, [store, getTasksForDate, getBlocksForDate, getSessionsForDate, getCheckInForDate, getEntryForDate]);

  return {
    getScoreForDate,
    setEnergyLevel,
    getOrbStateFromScore,
    todayScore,
    store,
  };
}
