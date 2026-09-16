import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import { useRhythmOrb, RhythmOrbState, OrbStateEntry } from '@/hooks/useRhythmOrb';
import { useRhythmScore } from '@/hooks/useRhythmScore';
import { formatDate } from '@/hooks/useLocalStorage';
import { useTasks } from '@/hooks/useTasks';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { TaskTag, BlockColor } from '@/types';

interface RhythmOrbContextValue {
  // Current state for selected date
  currentState: RhythmOrbState;
  currentStateEntry: OrbStateEntry;
  selectedDate: string;
  
  // Score-based data
  rhythmScore: number;
  inputCount: number;
  
  // Dynamic colors from tasks and blocks
  dayColors: string[];
  
  // Date selection (affects which date's orb state is shown)
  setSelectedDate: (date: string) => void;
  
  // State triggers
  triggerFocused: (reason: 'focus_session' | 'task_completed' | 'block_completed') => void;
  triggerOverwhelmed: () => void;
  clearOverwhelmed: (reason: 'breathing_complete' | 'feel_better' | 'manual_toggle') => void;
  triggerSettled: () => void;
  resetToNeutral: () => void;
  
  // Utility
  getTooltipMessage: () => string;
  
  // Transition animation trigger
  isTransitioning: boolean;
}

const RhythmOrbContext = createContext<RhythmOrbContextValue | undefined>(undefined);

export function RhythmOrbProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const {
    getOrbStateForDate,
    triggerFocused: baseTriggerFocused,
    triggerOverwhelmed: baseTriggerOverwhelmed,
    clearOverwhelmed: baseClearOverwhelmed,
    triggerSettled: baseTriggerSettled,
    resetToNeutral: baseResetToNeutral,
  } = useRhythmOrb();

  const { getScoreForDate, getOrbStateFromScore } = useRhythmScore();
  const { tasks } = useTasks();
  const { getBlocksForDate } = useTimeBlocks();

  // Color mapping for task tags and block colors
  const TASK_TAG_COLORS: Record<TaskTag, string> = {
    work: '200 80% 65%',      // sky blue
    study: '260 60% 70%',     // lavender
    personal: '20 80% 75%',   // peach
    health: '150 45% 75%',    // mint
    other: '0 0% 60%',        // muted gray
  };

  const BLOCK_COLORS: Record<BlockColor, string> = {
    sage: '165 28% 88%',
    lavender: '260 60% 70%',
    peach: '20 80% 75%',
    sky: '200 80% 65%',
    mint: '150 45% 75%',
    rose: '340 60% 75%',
  };

  // Calculate unique colors from tasks and blocks for the selected date
  const dayColors = useMemo(() => {
    const colors = new Set<string>();
    
    // Get colors from tasks
    const dateTasks = tasks.filter(task => task.dateKey === selectedDate);
    
    dateTasks.forEach(task => {
      if (task.tag && TASK_TAG_COLORS[task.tag]) {
        colors.add(TASK_TAG_COLORS[task.tag]);
      }
    });
    
    // Get colors from time blocks
    const dateBlocks = getBlocksForDate(selectedDate);
    
    dateBlocks.forEach(block => {
      if (block.color && BLOCK_COLORS[block.color as BlockColor]) {
        colors.add(BLOCK_COLORS[block.color as BlockColor]);
      }
    });
    
    const colorArray = Array.from(colors);
    return colorArray;
  }, [selectedDate, tasks, getBlocksForDate]);

  // Get the data-driven score for the selected date
  const scoreData = useMemo(() => getScoreForDate(selectedDate), [selectedDate, getScoreForDate]);
  
  // Determine current state: prefer score-based state if we have inputs, otherwise fall back to manual state
  const manualStateEntry = getOrbStateForDate(selectedDate);
  
  // If user triggered overwhelmed manually, respect that. Otherwise use score-based state.
  const currentState: RhythmOrbState = useMemo(() => {
    // Manual overwhelmed takes precedence
    if (manualStateEntry.state === 'overwhelmed') {
      return 'overwhelmed';
    }
    
    // If we have score inputs, use score-based state
    if (scoreData.inputCount > 0) {
      return getOrbStateFromScore(scoreData.totalScore);
    }
    
    // Fall back to manual state
    return manualStateEntry.state;
  }, [manualStateEntry.state, scoreData.inputCount, scoreData.totalScore, getOrbStateFromScore]);

  const currentStateEntry: OrbStateEntry = {
    ...manualStateEntry,
    state: currentState,
  };

  // Trigger transition animation on state change
  const [prevState, setPrevState] = useState(currentState);
  useEffect(() => {
    if (prevState !== currentState) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 800);
      setPrevState(currentState);
      return () => clearTimeout(timer);
    }
  }, [currentState, prevState]);

  // Wrap triggers to use selected date
  const triggerFocused = React.useCallback((reason: 'focus_session' | 'task_completed' | 'block_completed') => {
    baseTriggerFocused(selectedDate, reason);
  }, [baseTriggerFocused, selectedDate]);

  const triggerOverwhelmed = React.useCallback(() => {
    baseTriggerOverwhelmed(selectedDate);
  }, [baseTriggerOverwhelmed, selectedDate]);

  const clearOverwhelmed = React.useCallback((reason: 'breathing_complete' | 'feel_better' | 'manual_toggle') => {
    baseClearOverwhelmed(selectedDate, reason);
  }, [baseClearOverwhelmed, selectedDate]);

  const triggerSettled = React.useCallback(() => {
    baseTriggerSettled(selectedDate);
  }, [baseTriggerSettled, selectedDate]);

  const resetToNeutral = React.useCallback(() => {
    baseResetToNeutral(selectedDate);
  }, [baseResetToNeutral, selectedDate]);

  const getTooltipMessage = (): string => {
    // If we have score data, show a more meaningful message
    if (scoreData.inputCount > 0) {
      const score = scoreData.totalScore;
      if (score <= 25) return "Taking it slow today...";
      if (score <= 50) return "Finding your rhythm...";
      if (score <= 75) return "Good momentum today!";
      return "You're in a great flow!";
    }
    
    // Fall back to state-based messages
    switch (currentState) {
      case 'neutral': return "Ready when you are";
      case 'focused': return "Deep in flow";
      case 'overwhelmed': return "Take a breath...";
      case 'settled': return "Day complete";
      default: return "How are you today?";
    }
  };

  return (
    <RhythmOrbContext.Provider value={{
      currentState,
      currentStateEntry,
      selectedDate,
      rhythmScore: scoreData.totalScore,
      inputCount: scoreData.inputCount,
      dayColors,
      setSelectedDate,
      triggerFocused,
      triggerOverwhelmed,
      clearOverwhelmed,
      triggerSettled,
      resetToNeutral,
      getTooltipMessage,
      isTransitioning,
    }}>
      {children}
    </RhythmOrbContext.Provider>
  );
}

export function useRhythmOrbContext() {
  const context = useContext(RhythmOrbContext);
  if (!context) {
    throw new Error('useRhythmOrbContext must be used within a RhythmOrbProvider');
  }
  return context;
}
