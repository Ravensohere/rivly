/**
 * useOnboarding - Global onboarding state management
 *
 * Critical behavior:
 * - Single source of truth for completion: localStorage key "onboardingCompleted"
 * - Onboarding never auto-starts once completed, unless user explicitly replays
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Completion key (REQUIRED)
const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';

// Legacy key (migration only)
const LEGACY_ONBOARDING_KEY = 'dailyRhythm_onboarding';

// Nudges are persisted separately
const ONBOARDING_NUDGES_KEY = 'onboardingNudges';

interface NudgesState {
  hasAddedFirstTask: boolean;
  hasSeenAddTaskNudge: boolean;
  hasSeenTaskAddedNudge: boolean;
  hasPlayedFirstSound: boolean;
  hasSeenSleepNudge: boolean;
  showAddTaskNudge: boolean;
  showTaskAddedNudge: boolean;
  showSleepNudge: boolean;
}

const defaultNudges: NudgesState = {
  hasAddedFirstTask: false,
  hasSeenAddTaskNudge: false,
  hasSeenTaskAddedNudge: false,
  hasPlayedFirstSound: false,
  hasSeenSleepNudge: false,
  showAddTaskNudge: false,
  showTaskAddedNudge: false,
  showSleepNudge: false,
};

function readCompletedFromStorage(): boolean {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;

    // Migration path: if legacy onboarding says completed, honor it.
    const legacyRaw = window.localStorage.getItem(LEGACY_ONBOARDING_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy?.hasCompletedOnboarding === true) {
        window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function writeCompletedToStorage(value: boolean) {
  try {
    window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, value ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function useOnboarding() {
  // Single source of truth for completion
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean>(() => readCompletedFromStorage());

  // Keep in-memory state in sync if another tab changes it
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === ONBOARDING_COMPLETED_KEY) {
        setOnboardingCompletedState(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setOnboardingCompleted = useCallback((value: boolean) => {
    writeCompletedToStorage(value);
    setOnboardingCompletedState(value);
  }, []);

  // Required state var
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);

  // Persist nudges separately (never affects whether onboarding shows)
  const [nudges, setNudges] = useLocalStorage<NudgesState>(ONBOARDING_NUDGES_KEY, defaultNudges);

  // Behavior rule: only show onboarding when not completed
  const shouldShowOnboarding = useMemo(() => !onboardingCompleted, [onboardingCompleted]);

  // Complete onboarding (finish OR skip)
  const completeOnboarding = useCallback(() => {
    setOnboardingCompleted(true);
    setOnboardingStepIndex(0);
  }, [setOnboardingCompleted]);

  // Settings: replay tutorial
  const replayTutorial = useCallback(() => {
    setOnboardingCompleted(false);
    setOnboardingStepIndex(0);
  }, [setOnboardingCompleted]);

  // Settings: reset tips only
  const resetOnboardingTips = useCallback(() => {
    setNudges(defaultNudges);
  }, [setNudges]);

  // Backwards-compatible aliases
  const resetTutorialOnly = replayTutorial;
  const resetOnboarding = useCallback(() => {
    replayTutorial();
    resetOnboardingTips();
  }, [replayTutorial, resetOnboardingTips]);

  // === First Action Nudges ===

  const triggerAddTaskNudge = useCallback(() => {
    if (!nudges.hasAddedFirstTask && !nudges.hasSeenAddTaskNudge) {
      setNudges((prev) => ({ ...prev, showAddTaskNudge: true }));
    }
  }, [nudges.hasAddedFirstTask, nudges.hasSeenAddTaskNudge, setNudges]);

  const dismissAddTaskNudge = useCallback(() => {
    setNudges((prev) => ({
      ...prev,
      showAddTaskNudge: false,
      hasSeenAddTaskNudge: true,
    }));
  }, [setNudges]);

  const markFirstTaskAdded = useCallback(() => {
    if (!nudges.hasAddedFirstTask) {
      setNudges((prev) => ({
        ...prev,
        hasAddedFirstTask: true,
        showAddTaskNudge: false,
        showTaskAddedNudge: true,
      }));
      return true;
    }
    return false;
  }, [nudges.hasAddedFirstTask, setNudges]);

  const dismissTaskAddedNudge = useCallback(() => {
    setNudges((prev) => ({
      ...prev,
      showTaskAddedNudge: false,
      hasSeenTaskAddedNudge: true,
    }));
  }, [setNudges]);

  const markFirstSoundPlayed = useCallback(() => {
    if (!nudges.hasPlayedFirstSound) {
      setNudges((prev) => ({
        ...prev,
        hasPlayedFirstSound: true,
        showSleepNudge: true,
      }));
      return true;
    }
    return false;
  }, [nudges.hasPlayedFirstSound, setNudges]);

  const dismissSleepNudge = useCallback(() => {
    setNudges((prev) => ({
      ...prev,
      showSleepNudge: false,
      hasSeenSleepNudge: true,
    }));
  }, [setNudges]);

  const shouldShowAddTaskNudge = useMemo(
    () => nudges.showAddTaskNudge && !nudges.hasAddedFirstTask && !nudges.hasSeenAddTaskNudge,
    [nudges.showAddTaskNudge, nudges.hasAddedFirstTask, nudges.hasSeenAddTaskNudge]
  );

  const shouldShowTaskAddedNudge = useMemo(
    () => nudges.showTaskAddedNudge && !nudges.hasSeenTaskAddedNudge,
    [nudges.showTaskAddedNudge, nudges.hasSeenTaskAddedNudge]
  );

  const shouldShowSleepNudge = useMemo(
    () => nudges.showSleepNudge && !nudges.hasSeenSleepNudge,
    [nudges.showSleepNudge, nudges.hasSeenSleepNudge]
  );

  return {
    // Required core state
    hasCompletedOnboarding: onboardingCompleted,
    onboardingStepIndex,

    // Rendering rule
    shouldShowOnboarding,

    // Completion controls
    setOnboardingCompleted,
    completeOnboarding,

    // Settings controls
    replayTutorial,
    resetOnboardingTips,

    // Back-compat exports (used by SettingsPage currently)
    resetTutorialOnly,
    resetOnboarding,
    setOnboardingStep: setOnboardingStepIndex,

    // Nudge state + computed visibility
    ...nudges,
    shouldShowAddTaskNudge,
    shouldShowTaskAddedNudge,
    shouldShowSleepNudge,

    // Nudge actions
    triggerAddTaskNudge,
    dismissAddTaskNudge,
    markFirstTaskAdded,
    dismissTaskAddedNudge,
    markFirstSoundPlayed,
    dismissSleepNudge,
  };
}
