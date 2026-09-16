import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/ui/PageTransition';
import { FocusSetup } from '@/components/focus/FocusSetup';
import { FocusSessionActive } from '@/components/focus/FocusSessionActive';
import { FocusFeedback } from '@/components/focus/FocusFeedback';
import { FocusDebugPanel } from '@/components/focus/FocusDebugPanel';
import { ActiveTimerDisplay } from '@/components/timer/ActiveTimerDisplay';
import { useFocusSessions, FocusOutcome } from '@/hooks/useFocusSessions';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useTasks } from '@/hooks/useTasks';
import { useLandscape } from '@/hooks/useLandscape';
import { useRhythmOrbContext } from '@/contexts/RhythmOrbContext';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useFocusTimer, FocusSessionConfig } from '@/contexts/FocusTimerContext';
import { useBackgroundTimer } from '@/hooks/useBackgroundTimer';
import { useTimerCompletion } from '@/contexts/TimerCompletionContext';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { useParkedThoughts } from '@/hooks/useParkedThoughts';
import { ThoughtParkingSheet } from '@/components/mental/ThoughtParkingSheet';
import { mapLegacyCategory } from '@/types/thoughts';
import { getLocalDateKey } from '@/lib/dateUtils';
import { useEffect, useCallback, useState } from 'react';
import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function FocusPage() {
  const navigate = useNavigate();
  const { addSession } = useFocusSessions();
  const { getBlocksForDate } = useTimeBlocks();
  const { getTasksForDate } = useTasks();
  const { addThought } = useParkedThoughts();
  const [showThoughtParking, setShowThoughtParking] = useState(false);
  const { addFocusSeed, checkDailyGrowth } = useLandscape();
  const { triggerFocused } = useRhythmOrbContext();
  
  // Events ledger for analytics tracking
  const { 
    startFocusSession, 
    endFocusSession, 
    reloadData,
  } = useEventsLedgerContext();
  
  // Use canonical focus totals hook - single source of truth
  const { today: todayFocus, focusStreak, totalSessions } = useFocusTotals();
  
  // Global focus timer context
  const {
    focusState,
    sessionConfig,
    sessionResult,
    startFocus,
    cancelFocus,
    endFocusEarly,
    completeFeedback,
  } = useFocusTimer();

  // Watch for global celebration state
  const { showCelebration } = useTimerCompletion();

  // Watch for any global active timer (including breaks)
  const { 
    activeTimer, 
    formattedTime, 
    progress, 
    isPaused,
    pause: pauseTimer,
    resume: resumeTimer,
    cancel: cancelTimer
  } = useBackgroundTimer();

  const today = getLocalDateKey();
  const todayBlocks = getBlocksForDate(today);
  const todayTasks = getTasksForDate(today);


  const handleStartFocus = (config: {
    duration: number;
    purpose: string;
    customPurpose?: string;
    linkedTaskId?: string;
    linkedBlockId?: string;
  }) => {
    // Map the purpose string to purposeType
    const purposeType = config.purpose as FocusSessionConfig['purposeType'];
    
    // Start the global timer
    startFocus({
      duration: config.duration,
      purpose: config.purpose.charAt(0).toUpperCase() + config.purpose.slice(1),
      purposeType,
      customPurpose: config.customPurpose,
      linkedTaskId: config.linkedTaskId,
      linkedBlockId: config.linkedBlockId,
    });
    
    // Start tracking in events ledger
    startFocusSession({
      taskId: config.linkedTaskId,
      blockId: config.linkedBlockId,
    });
    
    // Trigger focused state when focus session starts
    triggerFocused('focus_session');
  };

  const handleSessionComplete = (endedEarly: boolean, actualMinutes: number) => {
    // This is called from the active session component when manually ended early
    if (endedEarly) {
      endFocusEarly();
    }
    // Note: If not ended early, completion is handled by the context itself
  };

  const handleFeedback = useCallback(async (outcome: FocusOutcome) => {
    if (sessionConfig && sessionResult) {
      const purposeLabel = sessionConfig.purposeType === 'custom' 
        ? sessionConfig.customPurpose || 'Custom'
        : sessionConfig.purpose;

      // Record to legacy focus sessions (for backward compatibility)
      addSession({
        date: today,
        durationMinutes: sessionResult.actualMinutes,
        purpose: purposeLabel,
        linkedTaskId: sessionConfig.linkedTaskId,
        linkedBlockId: sessionConfig.linkedBlockId,
        outcome,
        endedEarly: sessionResult.endedEarly,
      });

      // Record to events ledger for analytics
      await endFocusSession({
        outcome,
        completed: !sessionResult.endedEarly,
        durationMinutes: sessionResult.actualMinutes,
      });
      
      // Reload ledger data to ensure UI updates
      await reloadData();

      // Add focus seed to landscape
      addFocusSeed(
        sessionResult.actualMinutes,
        !sessionResult.endedEarly,
        sessionResult.endedEarly,
        purposeLabel
      );
      checkDailyGrowth();
    } else {
      console.warn('[FocusPage] handleFeedback called without sessionConfig or sessionResult');
    }
    
    // Complete the feedback and reset to idle
    completeFeedback();
  }, [sessionConfig, sessionResult, today, addSession, endFocusSession, reloadData, addFocusSeed, checkDailyGrowth, completeFeedback]);

  // Auto-submit feedback if global celebration is shown (avoids double screens)
  useEffect(() => {
    // Determine which UI to show based on focus state
    const isFeedbackState = focusState === 'feedback' || focusState === 'completed';
    
    if (isFeedbackState && sessionConfig && sessionResult && showCelebration) {
      handleFeedback('good');
    }
  }, [focusState, sessionConfig, sessionResult, showCelebration, handleFeedback]);

  const handleSkipFeedback = async () => {
    // Skip feedback but still record the session with default 'some' outcome
    await handleFeedback('some');
  };

  const handleCancel = () => {
    cancelFocus();
  };

  const handleThoughtSave = useCallback(async (text: string, category: string, convertToTask: boolean) => {
    const thought = await addThought(text, mapLegacyCategory(category));
    if (convertToTask && thought) {
      navigate('/reflect');
    }
  }, [addThought, navigate]);

  const getPurposeLabel = () => {
    if (!sessionConfig) return '';
    return sessionConfig.purposeType === 'custom'
      ? sessionConfig.customPurpose || 'Focus'
      : sessionConfig.purpose;
  };

  // Determine if a break is active
  const showBreak = activeTimer?.mode === 'custom' && (activeTimer.status === 'running' || activeTimer.status === 'paused');

  // Determine which UI to show based on focus state
  const showSetup = focusState === 'idle' && !showBreak;
  const showSession = focusState === 'running' || focusState === 'paused';
  const showFeedback = (focusState === 'feedback' || focusState === 'completed') && !showCelebration;


  return (
    <PageTransition className="page-container">
      <AnimatePresence mode="wait">
        {showSetup && (
          <FocusSetup
            key="setup"
            blocks={todayBlocks}
            tasks={todayTasks}
            onStartFocus={handleStartFocus}
          />
        )}
        {showSession && sessionConfig && (
          <FocusSessionActive
            key="session"
            duration={sessionConfig.duration}
            purpose={getPurposeLabel()}
            linkedTaskId={sessionConfig.linkedTaskId}
            onComplete={handleSessionComplete}
            onCancel={handleCancel}
          />
        )}
        {showBreak && activeTimer && (
          <ActiveTimerDisplay
            key="break-session"
            purpose={activeTimer.label || 'Break'}
            formattedTime={formattedTime}
            progress={progress}
            isRunning={activeTimer.status === 'running'}
            isPaused={activeTimer.status === 'paused'}
            isCompleted={false}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onEndEarly={cancelTimer}
            onCancel={cancelTimer}
          />
        )}
      </AnimatePresence>
      
      {/* Park a thought - quick capture during focus */}
      <div className="fixed bottom-24 left-4 right-4 flex justify-center pointer-events-none z-30">
        <Button
          variant="secondary"
          size="sm"
          className="pointer-events-auto gap-2 shadow-lg"
          onClick={() => setShowThoughtParking(true)}
        >
          <Brain className="w-4 h-4" />
          Park a thought
        </Button>
      </div>
      <ThoughtParkingSheet
        open={showThoughtParking}
        onOpenChange={setShowThoughtParking}
        onSave={handleThoughtSave}
      />

      {/* Feedback is rendered outside AnimatePresence to ensure it's always on top */}
      {showFeedback && sessionConfig && sessionResult && (
        <FocusFeedback
          key="feedback"
          duration={sessionConfig.duration}
          actualMinutes={sessionResult.actualMinutes}
          endedEarly={sessionResult.endedEarly}
          onSubmit={handleFeedback}
          onSkip={handleSkipFeedback}
        />
      )}
      
      {/* Debug Panel - only visible with ?debug=1 */}
      <FocusDebugPanel />
    </PageTransition>
  );
}
