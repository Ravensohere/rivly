/**
 * useAchievements - Ledger-derived achievements system
 * 
 * ALL achievements are computed from ledger events:
 * - Focus: focus sessions from ledger
 * - Tasks: task events (completed - uncompleted)
 * - Reflect: close day entries
 * - Streaks: derived from activity days
 */

import { useLocalStorage } from './useLocalStorage';
import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useCloseDay } from './useCloseDay';
import { deriveActivityByDay, calculateActivityStreaks, countUniquReflectDays } from '@/lib/activityDerivation';
import { getLocalDateKey } from '@/lib/dateUtils';
import { toast } from 'sonner';

// ===== Achievement Definitions =====

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'focus' | 'tasks' | 'reflect' | 'streaks' | 'milestones';
  requirement: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  hint: string; // How to unlock
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string;
  seen: boolean;
  celebrationShown: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  // ===== Focus Session Achievements =====
  { 
    id: 'focus_1', 
    name: 'First Focus', 
    description: 'Complete your first focus session', 
    icon: '🎯', 
    category: 'focus', 
    requirement: 1, 
    tier: 'bronze',
    hint: 'Start a focus session and complete it'
  },
  { 
    id: 'focus_5', 
    name: 'Getting Started', 
    description: 'Complete 5 focus sessions', 
    icon: '🔥', 
    category: 'focus', 
    requirement: 5, 
    tier: 'bronze',
    hint: 'Keep building your focus habit'
  },
  { 
    id: 'focus_20', 
    name: 'Focus Champion', 
    description: 'Complete 20 focus sessions', 
    icon: '⚡', 
    category: 'focus', 
    requirement: 20, 
    tier: 'silver',
    hint: 'Consistency is key!'
  },
  { 
    id: 'focus_50', 
    name: 'Focus Master', 
    description: 'Complete 50 focus sessions', 
    icon: '🌟', 
    category: 'focus', 
    requirement: 50, 
    tier: 'silver',
    hint: 'You\'re becoming a pro'
  },
  { 
    id: 'focus_100', 
    name: 'Focus Legend', 
    description: 'Complete 100 focus sessions', 
    icon: '👑', 
    category: 'focus', 
    requirement: 100, 
    tier: 'gold',
    hint: 'Elite focus territory'
  },
  { 
    id: 'focus_250', 
    name: 'Unstoppable', 
    description: 'Complete 250 focus sessions', 
    icon: '💎', 
    category: 'focus', 
    requirement: 250, 
    tier: 'platinum',
    hint: 'True mastery unlocked'
  },

  // ===== Task Achievements =====
  { 
    id: 'tasks_1', 
    name: 'Task Starter', 
    description: 'Complete your first task', 
    icon: '✅', 
    category: 'tasks', 
    requirement: 1, 
    tier: 'bronze',
    hint: 'Check off any task'
  },
  { 
    id: 'tasks_25', 
    name: 'Productive', 
    description: 'Complete 25 tasks', 
    icon: '🚀', 
    category: 'tasks', 
    requirement: 25, 
    tier: 'bronze',
    hint: 'Keep completing tasks'
  },
  { 
    id: 'tasks_100', 
    name: 'Century Club', 
    description: 'Complete 100 tasks', 
    icon: '💯', 
    category: 'tasks', 
    requirement: 100, 
    tier: 'silver',
    hint: 'Big milestone ahead!'
  },
  { 
    id: 'tasks_250', 
    name: 'Task Warrior', 
    description: 'Complete 250 tasks', 
    icon: '⚔️', 
    category: 'tasks', 
    requirement: 250, 
    tier: 'gold',
    hint: 'Battle-tested productivity'
  },
  { 
    id: 'tasks_500', 
    name: 'Productivity Pro', 
    description: 'Complete 500 tasks', 
    icon: '🏆', 
    category: 'tasks', 
    requirement: 500, 
    tier: 'platinum',
    hint: 'Ultimate task master'
  },

  // ===== Reflect Achievements =====
  { 
    id: 'reflect_1', 
    name: 'First Reflection', 
    description: 'Close your day for the first time', 
    icon: '🌙', 
    category: 'reflect', 
    requirement: 1, 
    tier: 'bronze',
    hint: 'Use the "Close Your Day" feature'
  },
  { 
    id: 'reflect_7', 
    name: 'Week Reflector', 
    description: 'Close your day 7 times', 
    icon: '📝', 
    category: 'reflect', 
    requirement: 7, 
    tier: 'bronze',
    hint: 'Build the reflection habit'
  },
  { 
    id: 'reflect_14', 
    name: 'Fortnight Wisdom', 
    description: 'Close your day 14 times', 
    icon: '💭', 
    category: 'reflect', 
    requirement: 14, 
    tier: 'silver',
    hint: 'Two weeks of mindfulness'
  },
  { 
    id: 'reflect_30', 
    name: 'Monthly Mindful', 
    description: 'Close your day 30 times', 
    icon: '🧘', 
    category: 'reflect', 
    requirement: 30, 
    tier: 'gold',
    hint: 'A month of intentional endings'
  },
  { 
    id: 'reflect_100', 
    name: 'Reflection Master', 
    description: 'Close your day 100 times', 
    icon: '✨', 
    category: 'reflect', 
    requirement: 100, 
    tier: 'platinum',
    hint: 'Deep wisdom achieved'
  },

  // ===== Streak Achievements =====
  { 
    id: 'streak_3', 
    name: 'Hat Trick', 
    description: 'Stay active for 3 days in a row', 
    icon: '🎩', 
    category: 'streaks', 
    requirement: 3, 
    tier: 'bronze',
    hint: 'Be active 3 consecutive days'
  },
  { 
    id: 'streak_7', 
    name: 'Week Warrior', 
    description: 'Stay active for 7 days in a row', 
    icon: '📅', 
    category: 'streaks', 
    requirement: 7, 
    tier: 'silver',
    hint: 'One full week of activity'
  },
  { 
    id: 'streak_14', 
    name: 'Fortnight Focus', 
    description: 'Stay active for 14 days in a row', 
    icon: '🔮', 
    category: 'streaks', 
    requirement: 14, 
    tier: 'gold',
    hint: 'Two weeks strong!'
  },
  { 
    id: 'streak_30', 
    name: 'Monthly Master', 
    description: 'Stay active for 30 days in a row', 
    icon: '🗓️', 
    category: 'streaks', 
    requirement: 30, 
    tier: 'platinum',
    hint: 'A full month of dedication'
  },

  // ===== Focus Time Milestones =====
  { 
    id: 'time_60', 
    name: 'First Hour', 
    description: 'Accumulate 1 hour of focus time', 
    icon: '⏱️', 
    category: 'milestones', 
    requirement: 60, 
    tier: 'bronze',
    hint: 'Your first hour of deep work'
  },
  { 
    id: 'time_600', 
    name: 'Ten Hours', 
    description: 'Accumulate 10 hours of focus time', 
    icon: '🕐', 
    category: 'milestones', 
    requirement: 600, 
    tier: 'silver',
    hint: 'Double digits!'
  },
  { 
    id: 'time_3000', 
    name: 'Fifty Hours', 
    description: 'Accumulate 50 hours of focus time', 
    icon: '🧘', 
    category: 'milestones', 
    requirement: 3000, 
    tier: 'gold',
    hint: 'Serious commitment'
  },
  { 
    id: 'time_6000', 
    name: 'Time Titan', 
    description: 'Accumulate 100 hours of focus time', 
    icon: '⏰', 
    category: 'milestones', 
    requirement: 6000, 
    tier: 'platinum',
    hint: 'Legendary focus time'
  },
];

const STORAGE_KEY = 'flowday_achievements_v1';

export function useAchievements() {
  const [unlockedAchievements, setUnlockedAchievements] = useLocalStorage<UnlockedAchievement[]>(STORAGE_KEY, []);
  const { focusSessions, taskEvents, sleepEvents } = useEventsLedgerContext();
  const { entries: reflectEntries } = useCloseDay();
  const hasCheckedRef = useRef(false);

  // Calculate all stats from ledger (single source of truth)
  const stats = useMemo(() => {
    // Focus stats
    const totalSessions = focusSessions.length;
    const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);

    // Task stats - use last-event-wins
    const taskMap = new Map<string, boolean>();
    taskEvents.forEach(event => {
      if (event.type === 'completed') {
        taskMap.set(event.taskId, true);
      } else if (event.type === 'uncompleted') {
        taskMap.set(event.taskId, false);
      } else if (event.type === 'deleted') {
        taskMap.delete(event.taskId);
      }
    });
    let totalTasksCompleted = 0;
    taskMap.forEach(isCompleted => {
      if (isCompleted) totalTasksCompleted++;
    });

    // Reflect stats - unique days
    const totalReflectDays = countUniquReflectDays(reflectEntries);

    // Streak calculation from activity
    const activityMap = deriveActivityByDay(
      focusSessions,
      taskEvents,
      sleepEvents,
      reflectEntries,
      [], // morning bridge days
      { start: '2020-01-01', end: getLocalDateKey() }
    );
    const { currentStreak, longestStreak } = calculateActivityStreaks(activityMap);

    return {
      totalSessions,
      totalTasksCompleted,
      totalFocusMinutes,
      totalReflectDays,
      longestStreak,
      currentStreak,
    };
  }, [focusSessions, taskEvents, sleepEvents, reflectEntries]);

  // Check which achievements should be unlocked
  const checkAchievements = useCallback(() => {
    const newUnlocks: UnlockedAchievement[] = [];

    ACHIEVEMENTS.forEach(achievement => {
      const isAlreadyUnlocked = unlockedAchievements.some(u => u.achievementId === achievement.id);
      if (isAlreadyUnlocked) return;

      let shouldUnlock = false;

      switch (achievement.category) {
        case 'focus':
          shouldUnlock = stats.totalSessions >= achievement.requirement;
          break;
        case 'tasks':
          shouldUnlock = stats.totalTasksCompleted >= achievement.requirement;
          break;
        case 'reflect':
          shouldUnlock = stats.totalReflectDays >= achievement.requirement;
          break;
        case 'streaks':
          shouldUnlock = stats.longestStreak >= achievement.requirement;
          break;
        case 'milestones':
          shouldUnlock = stats.totalFocusMinutes >= achievement.requirement;
          break;
      }

      if (shouldUnlock) {
        newUnlocks.push({
          achievementId: achievement.id,
          unlockedAt: new Date().toISOString(),
          seen: false,
          celebrationShown: false,
        });
      }
    });

    if (newUnlocks.length > 0) {
      setUnlockedAchievements(prev => [...prev, ...newUnlocks]);

      // Show celebration toast for new achievements
      newUnlocks.forEach(unlock => {
        const achievement = ACHIEVEMENTS.find(a => a.id === unlock.achievementId);
        if (achievement) {
          toast.success(
            `${achievement.icon} Achievement Unlocked!`,
            { description: achievement.name }
          );
        }
      });
    }

    return newUnlocks;
  }, [stats, unlockedAchievements, setUnlockedAchievements]);

  // Check achievements when stats change (but only after initial load)
  useEffect(() => {
    // Skip on first render to avoid double-checking
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      // Still check once on mount
      checkAchievements();
      return;
    }
    checkAchievements();
  }, [stats.totalSessions, stats.totalTasksCompleted, stats.totalReflectDays, stats.longestStreak, stats.totalFocusMinutes]);

  // Get achievement with unlock status and progress
  const getAchievementWithStatus = useCallback((achievement: Achievement) => {
    const unlock = unlockedAchievements.find(u => u.achievementId === achievement.id);
    let progress = 0;
    let currentValue = 0;

    switch (achievement.category) {
      case 'focus':
        currentValue = stats.totalSessions;
        progress = Math.min(100, (stats.totalSessions / achievement.requirement) * 100);
        break;
      case 'tasks':
        currentValue = stats.totalTasksCompleted;
        progress = Math.min(100, (stats.totalTasksCompleted / achievement.requirement) * 100);
        break;
      case 'reflect':
        currentValue = stats.totalReflectDays;
        progress = Math.min(100, (stats.totalReflectDays / achievement.requirement) * 100);
        break;
      case 'streaks':
        currentValue = stats.longestStreak;
        progress = Math.min(100, (stats.longestStreak / achievement.requirement) * 100);
        break;
      case 'milestones':
        currentValue = stats.totalFocusMinutes;
        progress = Math.min(100, (stats.totalFocusMinutes / achievement.requirement) * 100);
        break;
    }

    return {
      ...achievement,
      isUnlocked: !!unlock,
      unlockedAt: unlock?.unlockedAt,
      seen: unlock?.seen ?? false,
      celebrationShown: unlock?.celebrationShown ?? false,
      progress,
      currentValue,
    };
  }, [unlockedAchievements, stats]);

  // Mark achievement as seen
  const markAsSeen = useCallback((achievementId: string) => {
    setUnlockedAchievements(prev =>
      prev.map(u => u.achievementId === achievementId ? { ...u, seen: true } : u)
    );
  }, [setUnlockedAchievements]);

  // Mark celebration as shown
  const markCelebrationShown = useCallback((achievementId: string) => {
    setUnlockedAchievements(prev =>
      prev.map(u => u.achievementId === achievementId ? { ...u, celebrationShown: true } : u)
    );
  }, [setUnlockedAchievements]);

  // Mark all as seen
  const markAllAsSeen = useCallback(() => {
    setUnlockedAchievements(prev => prev.map(u => ({ ...u, seen: true })));
  }, [setUnlockedAchievements]);

  // Get all achievements with status
  const allAchievements = useMemo(() =>
    ACHIEVEMENTS.map(getAchievementWithStatus),
    [getAchievementWithStatus]
  );

  // Get new (unseen) achievements
  const newAchievements = useMemo(() =>
    allAchievements.filter(a => a.isUnlocked && !a.seen),
    [allAchievements]
  );

  // Get unlocked count
  const unlockedCount = useMemo(() =>
    allAchievements.filter(a => a.isUnlocked).length,
    [allAchievements]
  );

  // Get achievements by category
  const achievementsByCategory = useMemo(() => ({
    focus: allAchievements.filter(a => a.category === 'focus'),
    tasks: allAchievements.filter(a => a.category === 'tasks'),
    reflect: allAchievements.filter(a => a.category === 'reflect'),
    streaks: allAchievements.filter(a => a.category === 'streaks'),
    milestones: allAchievements.filter(a => a.category === 'milestones'),
  }), [allAchievements]);

  return {
    allAchievements,
    achievementsByCategory,
    unlockedCount,
    totalCount: ACHIEVEMENTS.length,
    newAchievements,
    stats,
    markAsSeen,
    markCelebrationShown,
    markAllAsSeen,
    checkAchievements,
  };
}
