import { useLocalStorage } from './useLocalStorage';
import { useCallback, useMemo } from 'react';
import { useFocusSessions } from './useFocusSessions';
import { useTasks } from './useTasks';
import { getLocalDateKey } from '@/lib/dateUtils';
import { subDays, startOfWeek, eachDayOfInterval } from 'date-fns';

export interface WeeklyGoals {
  focusMinutesTarget: number;
  tasksCompletedTarget: number;
  focusSessionsTarget: number;
  windDownNightsTarget: number;
}

export interface GoalHistory {
  weekStart: string;
  goals: WeeklyGoals;
  achieved: {
    focusMinutes: number;
    tasksCompleted: number;
    focusSessions: number;
    windDownNights: number;
  };
}

const GOALS_KEY = 'dailyRhythm_weeklyGoals';
const HISTORY_KEY = 'dailyRhythm_goalHistory';

const defaultGoals: WeeklyGoals = {
  focusMinutesTarget: 300, // 5 hours
  tasksCompletedTarget: 20,
  focusSessionsTarget: 10,
  windDownNightsTarget: 5,
};

export function useGoals() {
  const [goals, setGoals] = useLocalStorage<WeeklyGoals>(GOALS_KEY, defaultGoals);
  const [history, setHistory] = useLocalStorage<GoalHistory[]>(HISTORY_KEY, []);
  const { sessions } = useFocusSessions();
  const { tasks } = useTasks();

  // Get the last 7 days
  const last7Days = useMemo(() => {
    const today = new Date();
    return eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    });
  }, []);

  // Calculate current progress
  const currentProgress = useMemo(() => {
    const focusMinutes = last7Days.reduce((sum, day) => {
      const dateKey = getLocalDateKey(day);
      const daySessions = sessions.filter(s => s.date === dateKey);
      return sum + daySessions.reduce((s, session) => s + session.durationMinutes, 0);
    }, 0);

    const focusSessions = last7Days.reduce((sum, day) => {
      const dateKey = getLocalDateKey(day);
      return sum + sessions.filter(s => s.date === dateKey).length;
    }, 0);

    const tasksCompleted = last7Days.reduce((sum, day) => {
      const dateKey = getLocalDateKey(day);
      // Support both dateKey (new) and date (legacy) fields
      return sum + tasks.filter(t => (t.dateKey === dateKey || t.date === dateKey) && t.status === 'done').length;
    }, 0);

    return {
      focusMinutes,
      focusSessions,
      tasksCompleted,
      windDownNights: 0, // Would need sleep data integration
    };
  }, [last7Days, sessions, tasks]);

  // Calculate progress percentages
  const progressPercentages = useMemo(() => ({
    focusMinutes: Math.min(100, Math.round((currentProgress.focusMinutes / goals.focusMinutesTarget) * 100)),
    tasksCompleted: Math.min(100, Math.round((currentProgress.tasksCompleted / goals.tasksCompletedTarget) * 100)),
    focusSessions: Math.min(100, Math.round((currentProgress.focusSessions / goals.focusSessionsTarget) * 100)),
    windDownNights: Math.min(100, Math.round((currentProgress.windDownNights / goals.windDownNightsTarget) * 100)),
  }), [currentProgress, goals]);

  // Update a specific goal
  const updateGoal = useCallback(<K extends keyof WeeklyGoals>(key: K, value: WeeklyGoals[K]) => {
    setGoals(prev => ({ ...prev, [key]: value }));
  }, [setGoals]);

  // Update all goals at once
  const updateGoals = useCallback((newGoals: Partial<WeeklyGoals>) => {
    setGoals(prev => ({ ...prev, ...newGoals }));
  }, [setGoals]);

  // Reset goals to defaults
  const resetGoals = useCallback(() => {
    setGoals(defaultGoals);
  }, [setGoals]);

  // Check if a specific goal is achieved
  const isGoalAchieved = useCallback((key: keyof WeeklyGoals) => {
    return progressPercentages[key.replace('Target', '') as keyof typeof progressPercentages] >= 100;
  }, [progressPercentages]);

  // Get overall completion percentage
  const overallProgress = useMemo(() => {
    const percentages = Object.values(progressPercentages);
    return Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
  }, [progressPercentages]);

  return {
    goals,
    currentProgress,
    progressPercentages,
    overallProgress,
    updateGoal,
    updateGoals,
    resetGoals,
    isGoalAchieved,
    history,
  };
}
