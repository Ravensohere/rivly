import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Brain, Loader2, Volume2, VolumeX, CalendarClock, Wind, Plus, CalendarIcon, Sparkles, Trash2 } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/ui/PageTransition';
import { DayHeader } from '@/components/planner/DayHeader';
import { CalendarView } from '@/components/planner/CalendarView';
import { TimelineView } from '@/components/planner/TimelineView';
import { AnimatedBackground } from '@/components/planner/AnimatedBackground';
import { FloatingActionButton } from '@/components/planner/FloatingActionButton';
import { AddBlockDialog } from '@/components/planner/AddBlockDialog';
import { AddTaskDialog } from '@/components/planner/AddTaskDialog';
import { BlockDetailSheet } from '@/components/planner/BlockDetailSheet';
import { DailyCheckInModal } from '@/components/checkin/DailyCheckInModal';
import { OverwhelmedScreen } from '@/components/mental/OverwhelmedScreen';
import { ThoughtParkingSheet } from '@/components/mental/ThoughtParkingSheet';
import { SuggestionsTray } from '@/components/inbox/SuggestionsTray';
import { FirstActionNudge } from '@/components/onboarding/FirstActionNudge';
import { RhythmOrb } from '@/components/ui/RhythmOrb';
import { RivaGlobe } from '@/components/ui/RivaGlobe';
import { TimeGreeting } from '@/components/planner/TimeGreeting';
import { DateSelector } from '@/components/planner/DateSelector';
import { ViewToggle } from '@/components/planner/ViewToggle';
import { CalendarModal } from '@/components/calendar/CalendarModal';
import { EventFormModal } from '@/components/calendar/EventFormModal';
import { EventsList } from '@/components/calendar/EventsList';
import { MorningBridgeDisplayCard } from '@/components/sleep/MorningBridgeDisplayCard';
import { MorningVoicePrompt } from '@/components/sleep/MorningVoicePrompt';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useTasks } from '@/hooks/useTasks';
import { useCheckIn } from '@/hooks/useCheckIn';
import { useFocusSessions } from '@/hooks/useFocusSessions';
import { useParkedThoughts } from '@/hooks/useParkedThoughts';
import { useRhythmOrbContext } from '@/contexts/RhythmOrbContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useEvents, CalendarEvent } from '@/hooks/useEvents';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useMorningBridge } from '@/hooks/useMorningBridge';
import { TimeBlock, DailyCheckIn, Task } from '@/types';
import { useGoogleCalendarSimple } from '@/hooks/useGoogleCalendarSimple';
import { mapLegacyCategory } from '@/types/thoughts';
import { EditTaskDialog } from '@/components/planner/EditTaskDialog';
import { EditBlockDialog } from '@/components/planner/EditBlockDialog';
import { getLocalDateKey, parseDateKey, formatDateKeyDisplay } from '@/lib/dateUtils';
import { getPlanOptions, suggestPlanKind, type PlanKind } from '@/services/PlanningEngine';
import { getOverdueTasks, computeReschedule, RescheduleItem } from '@/services/SmartReschedule';
import { suggestFlowBlocks } from '@/services/FlowBlocksSuggestion';
import { BreathworkPauseModal } from '@/components/mental/BreathworkPauseModal';
import { NextBlockPanel } from '@/components/planner/NextBlockPanel';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

import { useRiva } from '@/hooks/useRiva';

export default function DayPlanner() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { rivaResponse } = useRiva();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'flow' | 'plan'>('flow');
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [showBlockDetail, setShowBlockDetail] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showOverwhelmed, setShowOverwhelmed] = useState(false);
  const [showThoughtParking, setShowThoughtParking] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditTask, setShowEditTask] = useState(false);
  const [showEditBlock, setShowEditBlock] = useState(false);
  const [checkInDismissed, setCheckInDismissed] = useState(false);
  const [selectedPlanKind, setSelectedPlanKind] = useState<PlanKind>('full');
  const [checkInData, setCheckInData] = useState<{ mood?: number; energy?: number; sleepQuality?: number; intent?: string } | null>(null);
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [showBreathwork, setShowBreathwork] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);

  // Monitor voice commands to open panels
  useEffect(() => {
    if (rivaResponse?.action === 'open_reschedule') {
      setShowRescheduleSheet(true);
    }
  }, [rivaResponse]);

  // Global 'Q' hotkey for AddTaskDialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setShowAddTask(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Responsive globe size � must be before any early return
  const [globeSize, setGlobeSize] = useState(260);
  useEffect(() => {
    const update = () => setGlobeSize(Math.min(400, Math.max(240, Math.round(window.innerWidth * 0.22))));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Onboarding nudges
  const { 
    shouldShowAddTaskNudge,
    shouldShowTaskAddedNudge,
    dismissAddTaskNudge,
    dismissTaskAddedNudge,
    markFirstTaskAdded,
  } = useOnboarding();
  
  // Use rhythm orb context for functional state
  const { 
    setSelectedDate: setOrbSelectedDate, 
    triggerFocused, 
    triggerOverwhelmed,
    clearOverwhelmed,
  } = useRhythmOrbContext();
  
  const [prevSessionCount, setPrevSessionCount] = useState<number | null>(null);

  const { 
    getBlocksForDate, 
    addBlock, 
    updateBlock, 
    deleteBlock, 
    completeBlock, 
    startBlock,
    isLoaded: blocksLoaded
  } = useTimeBlocks();
  
  
  const { 
    tasks,
    isLoaded: tasksLoaded,
    getTasksForBlock, 
    getUnlinkedTasks,
    getCompletedTasksForDate,
    addTask, 
    toggleTask,
    updateTask,
    deleteTask,
    cleanupCompletedTasks,
  } = useTasks();

  const { toast } = useToast();

  // Track loading state for debugging
  useEffect(() => {
    if (tasksLoaded && blocksLoaded) {
      console.log('[DayPlanner] All data loaded. Tasks:', tasks.length);
    }
  }, [tasksLoaded, blocksLoaded, tasks.length]);

  // Handle Quick Actions from Local Notifications
  useEffect(() => {
    const handleNotificationAction = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, taskId, blockId } = customEvent.detail;
      
      console.log('[DayPlanner] Received notification action:', type, taskId, blockId);
      
      if (type === 'mark_task_done' && taskId) {
          await toggleTask(taskId);
          toast({ title: 'Task Completed', description: 'Task marked as done from notification.' });
      } else if (type === 'start_block' && blockId) {
          await startBlock(blockId);
          toast({ title: 'Block Started', description: 'Time block started from notification.' });
      } else if (type === 'open_task' && taskId) {
          const t = tasks.find(tsk => tsk.id === taskId);
          if (t) {
             setEditingTask(t);
             setShowEditTask(true);
          }
      }
    };
    
    window.addEventListener('notification-action', handleNotificationAction);
    return () => window.removeEventListener('notification-action', handleNotificationAction);
  }, [toggleTask, startBlock, tasks, toast]);

  const { hasCheckedInToday, saveCheckIn, getCheckInForDate } = useCheckIn();
  const { addThought, activeCount: parkedThoughtsCount } = useParkedThoughts();
  const { getCompletedSessionsCount, sessions: focusSessions } = useFocusSessions();
  const { getEventsForDate, isLoading: eventsLoading } = useEvents();
  const { isConnected, fetchGoogleEvents, createGoogleEvent, googleEvents } = useGoogleCalendarSimple();
  
  // Events ledger for analytics tracking
  const { recordTaskCreated, recordTaskCompleted, recordTaskUncompleted, recordTaskDeleted } = useEventsLedgerContext();
  
  // Morning Bridge
  const {
    shouldShow: shouldShowMorningBridge,
    nextPendingAction,
    allActionsDone,
    markActionDone,
    skipAction,
    markShown,
  } = useMorningBridge();

  // --- Insight & Audio State ---
  const [isGettingInsight, setIsGettingInsight] = useState(false);
  const [insightResult, setInsightData] = useState<{insight: string, audioUrl: string | null} | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  // Stop audio when modal closes
  useEffect(() => {
    if (!insightResult && audioRef) {
      audioRef.pause();
      setIsPlaying(false);
    }
  }, [insightResult, audioRef]);

  const handleOrbClick = async () => {
    if (isGettingInsight) return;
    
    // Check setting
    let isOnlineAiEnabled = false;
    try {
        const item = localStorage.getItem('rivly_online_ai_enabled');
        isOnlineAiEnabled = item ? JSON.parse(item) : false;
    } catch (e) { console.error(e); }

    if (!isOnlineAiEnabled) {
          toast({ title: "AI Companion Disabled", description: "Enable 'AI Companion' in Settings to activate.", });
         // Simplified Offline Fallback
         setInsightData({
            insight: "Your rhythm is steady. Trust your intuition today.",
            audioUrl: null // No audio for offline fallback
        });
        return;
    }

    setIsGettingInsight(true);
    toast({ title: "Connecting...", description: "Rivly is sensing your flow." });

    try {
        // 1. Gather Context (Focus History & Calendar)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const recentFocus = focusSessions.filter(s => new Date(s.date) >= threeDaysAgo);
        
        // 2. Call Backend API (Cloudflare Worker)
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        
        let userName = "Friend";
        try {
            const storedName = localStorage.getItem('user_first_name');
            if (storedName) userName = JSON.parse(storedName);
        } catch(e) {}

        const response = await fetch(`${apiUrl}/orb-guide`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
                focusHistory: recentFocus,
                sleepHistory: [],
                userName: userName
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Guide unavailable");
        }
        
        const data = await response.json();
        const insightText = data.insight || "Breathe and find your flow.";
        
        // 3. Play Audio
        if (data.audioBase64) {
            // Audio from Gemini Live — play the base64 PCM/WAV returned by the backend
            const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
            setInsightData({ insight: insightText, audioUrl: audioSrc });
            
            const audio = new Audio(audioSrc);
            audio.onended = () => setIsPlaying(false);
            audio.onplay = () => setIsPlaying(true);
            audio.onpause = () => setIsPlaying(false);
            setAudioRef(audio);
            audio.play().catch(console.error);
        } else {
            // Fallback: Browser Native TTS (Free)
            setInsightData({ insight: insightText, audioUrl: null });
            
            // Cancel any current speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(insightText);
            
            // Try to find a good voice (prioritize Indian English if available, or just English)
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.includes('IN')) || voices.find(v => v.lang.includes('en'));
            if (preferredVoice) utterance.voice = preferredVoice;
            
            utterance.rate = 0.9; // Slightly slower for calmness
            utterance.pitch = 1.0;
            
            utterance.onstart = () => setIsPlaying(true);
            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);
            
            window.speechSynthesis.speak(utterance);
        }
        
    } catch (e: any) {
        console.error(e);
        toast({ 
            title: "Guide unavailable", 
            description: e.message || "Could not connect to the Rhythm Guide.",
            variant: "destructive" 
        });
        // Offline Fallback
        setInsightData({ insight: "The flow is within you. Keep going.", audioUrl: null });
    } finally {
        setIsGettingInsight(false);
    }
  };

  const toggleAudio = () => {
      if (!audioRef) return;
      if (isPlaying) audioRef.pause();
      else audioRef.play();
  };
  // -----------------------------

  // Use local timezone date key - CRITICAL for persistence across midnight
  const dateKey = getLocalDateKey(selectedDate);
  const blocks = getBlocksForDate(dateKey);
  const unlinkedTasks = getUnlinkedTasks(dateKey);
  const completedTasks = getCompletedTasksForDate(dateKey);
  const allTasks = tasks.filter(t => t.dateKey === dateKey);
  const completedSessionsToday = getCompletedSessionsCount(dateKey);
  const localEvents = getEventsForDate(dateKey);
  
  // Map Google Events to UI format (CalendarEvent)
  const mappedGoogleEvents: CalendarEvent[] = googleEvents.map(ge => ({
    id: ge.id,
    user_id: '', // Not needed for display
    title: ge.title,
    date: ge.start.split('T')[0],
    time: ge.isAllDay ? null : ge.start.split('T')[1].slice(0, 8),
    all_day: ge.isAllDay,
    category: 'work',
    notes: ge.meetLink 
      ? `${ge.location ? `Location: ${ge.location}\\n` : ''}Google Meet: ${ge.meetLink}${ge.description ? `\\n\\n${ge.description}` : ''}`
      : ge.location ? `Location: ${ge.location}${ge.description ? `\\n\\n${ge.description}` : ''}` : ge.description,
    reminder_option: 'none',
    recurring_yearly: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_google_event: true,
    meet_link: ge.meetLink, // Add Meet link for easy access
  }));

  // Deduplicate: Remove local events that have the same title and are within 5 minutes of a Google event
  const deduplicatedLocalEvents = localEvents.filter(localEvent => {
    const isDuplicate = mappedGoogleEvents.some(googleEvent => {
      // Normalize titles for comparison
      const localTitle = localEvent.title.toLowerCase().trim();
      const googleTitle = googleEvent.title.toLowerCase().trim();
      
      if (localTitle !== googleTitle) return false;
      if (localEvent.date !== googleEvent.date) return false;
      
      // If both are all-day, consider them duplicates
      if (localEvent.all_day && googleEvent.all_day) {
        return true;
      }
      
      // If times are close (within 5 minutes), consider them duplicates
      if (localEvent.time && googleEvent.time) {
        const localTime = localEvent.time.slice(0, 5);
        const googleTime = googleEvent.time.slice(0, 5);
        if (localTime === googleTime) {
          return true;
        }
      }
      
      return false;
    });
    
    return !isDuplicate;
  });

  const eventsForDay = [...deduplicatedLocalEvents, ...mappedGoogleEvents];

  // Get today's check-in data
  const todayCheckIn = getCheckInForDate(dateKey);

  // Smart planning: 3 plan options for the day
  const planOptions = getPlanOptions({ dateKey, tasks: allTasks, blocks, checkIn: todayCheckIn });
  
  // Auto-select plan based on check-in data (only on first load for today)
  useEffect(() => {
    if (todayCheckIn && dateKey === getLocalDateKey() && !checkInData) {
      const suggested = suggestPlanKind(todayCheckIn);
      setCheckInData(todayCheckIn);
      setSelectedPlanKind(suggested);
    }
  }, [todayCheckIn, dateKey, checkInData]);
  
  const currentPlan = planOptions.find((p) => p.id === selectedPlanKind);
  const visibleUnlinkedTasks = currentPlan
    ? unlinkedTasks.filter((t) => currentPlan.taskIds.includes(t.id))
    : unlinkedTasks;

  // Smart reschedule: overdue tasks
  const overdueTasks = getOverdueTasks(tasks);
  const [reschedulePlan, setReschedulePlan] = useState<RescheduleItem[]>([]);

  useEffect(() => {
    if (showRescheduleSheet) {
      setReschedulePlan(computeReschedule(overdueTasks));
    }
  }, [showRescheduleSheet]); // deliberately omit overdueTasks to prevent reset tracking mid-edit



  // Fetch Google events when date changes
  useEffect(() => {
    if (isConnected) {
      fetchGoogleEvents(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, isConnected]); // Don't include fetchGoogleEvents - it's stable but triggers re-renders


  // Cleanup completed tasks on mount and periodically
  useEffect(() => {
    cleanupCompletedTasks();
    const interval = setInterval(cleanupCompletedTasks, 60000); // Every minute
    return () => clearInterval(interval);
  }, [cleanupCompletedTasks]);

  // Sync orb context with selected date
  useEffect(() => {
    setOrbSelectedDate(dateKey);
  }, [dateKey, setOrbSelectedDate]);

  // Show check-in modal on first load if not done today AND not dismissed
  useEffect(() => {
    const hasCheckedIn = hasCheckedInToday();
    // Check if dismissed for this specific date
    const dismissedKey = `rivly_checkin_dismissed_${dateKey}`;
    const isDismissed = localStorage.getItem(dismissedKey) === 'true';
    
    // Update local state if it was persisted
    if (isDismissed && !checkInDismissed) {
      setCheckInDismissed(true);
    }

    if (!hasCheckedIn && !isDismissed && !checkInDismissed) {
      const timer = setTimeout(() => setShowCheckIn(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasCheckedInToday, checkInDismissed, dateKey]);

  // Track focus session completions for orb state
  useEffect(() => {
    if (prevSessionCount !== null && completedSessionsToday > prevSessionCount) {
      triggerFocused('focus_session');
    }
    setPrevSessionCount(completedSessionsToday);
  }, [completedSessionsToday, prevSessionCount, triggerFocused]);

  // update orb state effect removed to prevent infinite loop

  const handleAddBlock = useCallback(async (blockData: { title: string; startTime: string; endTime: string; color: string; endDateKey?: string }) => {
    const newBlock = await addBlock({
      ...blockData,
      dateKey: dateKey,
      status: 'planned',
      tasks: schedulingTask ? [schedulingTask.id] : [],
    });

    // If scheduling a task, link it to the block and mark complete
    if (schedulingTask) {
      await updateTask(schedulingTask.id, { status: 'done' });
      recordTaskCompleted(schedulingTask.id, schedulingTask.dateKey);
      setSchedulingTask(null);
    }

    // Push to Google Calendar if connected
    if (isConnected) {
      const [startH, startM] = blockData.startTime.split(':');
      const [endH, endM] = blockData.endTime.split(':');
      
      const start = new Date(selectedDate);
      start.setHours(parseInt(startH), parseInt(startM), 0);
      
      // Use endDateKey if present, otherwise default to same day
      const end = blockData.endDateKey ? parseDateKey(blockData.endDateKey) : new Date(selectedDate);
      end.setHours(parseInt(endH), parseInt(endM), 0);

      const result = await createGoogleEvent({
        title: blockData.title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        description: 'Scheduled Time Block in Rivly',
      });

      if (result?.id) {
        updateBlock(newBlock.id, { googleEventId: result.id });
      }
    }
  }, [addBlock, dateKey, isConnected, selectedDate, createGoogleEvent, updateBlock, schedulingTask, updateTask, recordTaskCompleted]);

  const handleAddTask = useCallback(async (taskData: { 
    title: string; 
    tag: string; 
    dateKey?: string; 
    time?: string; 
    priority?: 1|2|3; 
    isMultiLine?: boolean; 
    tasks?: any[] 
  }) => {
    console.log('[DayPlanner] handleAddTask called', { taskData, dateKey, hasAddTask: !!addTask });
    
    // Multi-line support
    if (taskData.isMultiLine && taskData.tasks) {
      for (const t of taskData.tasks) {
        const newTask = await addTask({
           title: t.title,
           dateKey: t.dateKey || dateKey,
           status: 'todo',
           tag: (t.tag as any) || taskData.tag,
           ...(t.time && { time: t.time }),
           ...(t.priority && { priority: t.priority })
        });
        if (newTask) recordTaskCreated(newTask.id, t.dateKey || dateKey);
      }
      markFirstTaskAdded();
      toast({ title: 'Tasks Added', description: `Added ${taskData.tasks.length} tasks successfully.` });
      return;
    }

    const newTask = await addTask({
      title: taskData.title,
      dateKey: taskData.dateKey || dateKey,
      status: 'todo',
      tag: taskData.tag as any,
      ...(taskData.time && { time: taskData.time }),
      ...(taskData.priority && { priority: taskData.priority })
    });
    // Record task created event to ledger for analytics with correct dateKey
    if (newTask) {
      recordTaskCreated(newTask.id, taskData.dateKey || dateKey);
    }
    // Mark first task added for nudge
    markFirstTaskAdded();
  }, [addTask, dateKey, recordTaskCreated, markFirstTaskAdded, toast]);

  const handleBlockClick = (block: TimeBlock) => {
    setSelectedBlock(block);
    setShowBlockDetail(true);
  };


  const handleCompleteBlock = (blockId?: string) => {
    console.log('[DayPlanner] handleCompleteBlock called with:', blockId);
    const id = blockId || selectedBlock?.id;
    if (id) {
      console.log('[DayPlanner] Completing block:', id);
      completeBlock(id);
      if (selectedBlock && selectedBlock.id === id) {
        setSelectedBlock({ ...selectedBlock, status: 'completed' });
      }
      // Trigger focused state when block is completed
      triggerFocused('block_completed');
    } else {
      console.log('[DayPlanner] No block ID available to complete');
    }
  };

  const handleStartBlock = () => {
    if (selectedBlock) {
      startBlock(selectedBlock.id);
      setSelectedBlock({ ...selectedBlock, status: 'inProgress' });
    }
  };

  const handleDeleteBlock = () => {
    if (selectedBlock) {
      deleteBlock(selectedBlock.id);
      setShowBlockDetail(false);
      setShowEditBlock(false);
      setSelectedBlock(null);
    }
  };

  const handleEditBlock = () => {
    setShowEditBlock(true);
  };

  const handleSaveBlock = (updates: Partial<TimeBlock>) => {
    if (selectedBlock) {
      updateBlock(selectedBlock.id, updates);
      setSelectedBlock({ ...selectedBlock, ...updates });
    }
  };

  const handleCheckInComplete = (checkIn: DailyCheckIn) => {
    saveCheckIn(checkIn);
    setShowCheckIn(false);
  };

  const handleApplyReschedule = useCallback(async () => {
    for (const item of reschedulePlan) {
      await updateTask(item.taskId, { dateKey: item.newDateKey });
    }
    setShowRescheduleSheet(false);
    toast({ title: 'Rescheduled', description: `${reschedulePlan.length} overdue tasks spread across the next few days.` });
  }, [reschedulePlan, updateTask, toast]);

  const handleThoughtSave = async (text: string, legacyCategory: string, convertToTask: boolean) => {
    // Map legacy category to new category system
    const category = mapLegacyCategory(legacyCategory);
    const thought = await addThought(text, category);
    
    if (convertToTask && thought) {
      // Navigate to thoughts tab where user can convert
      navigate('/reflect');
    }
  };

  const handleOverwhelmedCreateTask = async (title: string) => {
    const newTask = await addTask({
      title,
      dateKey: dateKey,
      status: 'todo',
      tag: 'personal',
    });
    if (newTask) {
      recordTaskCreated(newTask.id, dateKey);
    }
    markFirstTaskAdded();
  };

  const handleOverwhelmedClose = () => {
    setShowOverwhelmed(false);
    // Clear overwhelmed state when user closes the screen (feel better)
    clearOverwhelmed('feel_better');
  };

  // Handle task toggle with focused state trigger and ledger tracking
  const handleTaskToggle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    toggleTask(taskId);
    
    // Track completion/uncompletion in ledger with task's dateKey
    if (task.status === 'todo') {
      // Was incomplete, now completing
      recordTaskCompleted(taskId, task.dateKey);
      triggerFocused('task_completed');
    } else {
      // Was complete, now uncompleting
      recordTaskUncompleted(taskId, task.dateKey);
    }
  };

  // Handle task tap for editing
  const handleTaskTap = (task: Task) => {
    setEditingTask(task);
    setShowEditTask(true);
  };

  // Handle task edit save
  const handleTaskEditSave = (updates: Partial<Task>) => {
    if (editingTask) {
      updateTask(editingTask.id, updates);
    }
    setShowEditTask(false);
    setEditingTask(null);
  };

  // Handle task delete
  const handleTaskDelete = () => {
    if (editingTask) {
      deleteTask(editingTask.id);
      recordTaskDeleted(editingTask.id, editingTask.dateKey);
    }
    setShowEditTask(false);
    setEditingTask(null);
  };

  // Handle task toggle from edit dialog
  const handleTaskToggleFromEdit = () => {
    if (editingTask) {
      const wasNotDone = editingTask.status !== 'done';
      toggleTask(editingTask.id);
      // Record completion/uncompletion to ledger with task's dateKey
      if (wasNotDone) {
        recordTaskCompleted(editingTask.id, editingTask.dateKey);
      } else {
        recordTaskUncompleted(editingTask.id, editingTask.dateKey);
      }
      // Update local state to reflect change
      setEditingTask(prev => prev ? { ...prev, status: prev.status === 'done' ? 'todo' : 'done' } : null);
    }
  };

  // Handle scheduling a task (opens AddBlock dialog with pre-filled title)
  const handleScheduleTask = (task: Task) => {
    setSchedulingTask(task);
    setShowAddBlock(true);
  };

  // Handle event click - prevent editing Google Calendar events
  const handleEventClick = (event: CalendarEvent) => {
    if (event.is_google_event) {
      toast({
        title: 'Google Calendar Event',
        description: 'This event is from Google Calendar and can only be edited there.',
        variant: 'default',
      });
      return;
    }
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const blockTasks = selectedBlock ? getTasksForBlock(selectedBlock.id) : [];

  if (!tasksLoaded || !blocksLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/50 backdrop-blur-sm">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
         >
           <Loader2 className="w-8 h-8 text-primary" />
         </motion.div>
      </div>
    );
  }
  // Aliases for the new layout
  const blocksForDay = blocks;
  const tasksForDay  = unlinkedTasks;
  const completedTasksForDay = completedTasks;
  const handleGetInsight = handleOrbClick;

  return (
    <PageTransition className="flex flex-col flex-1 relative pb-[180px] md:pb-[220px]" style={{ minHeight: '100dvh', background: 'var(--gradient-calm)' }}>
      {/* ═══════════════════════════════════════════════
          AMBIENT DEPTH LAYER
      ═══════════════════════════════════════════════ */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {/* Aurora blob — upper left, warm indigo */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], x: [0, 18, 0], y: [0, -10, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-12vw', left: '-12vw',
            width: '70vw', height: '70vw', maxWidth: '34rem', maxHeight: '34rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(235 40% 60% / 0.13) 0%, hsl(260 35% 65% / 0.07) 45%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Aurora blob — lower right, lavender */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], x: [0, -14, 0], y: [0, 12, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          style={{
            position: 'absolute', bottom: '8vh', right: '-14vw',
            width: '65vw', height: '65vw', maxWidth: '32rem', maxHeight: '32rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(260 35% 72% / 0.1) 0%, hsl(220 40% 70% / 0.06) 50%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        {/* Soft centre pulse — behind the orb */}
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{
            position: 'absolute', top: '16%', left: '50%', transform: 'translateX(-50%)',
            width: '50vw', height: '50vw', maxWidth: '24rem', maxHeight: '24rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(235 45% 62% / 0.09) 0%, transparent 65%)',
            filter: 'blur(32px)',
          }}
        />
        {/* Grain texture */}
        <div className="grain-overlay" />
      </div>

      {/* ═══════════════════════════════════════════════
          TOP NAV STRIP  (sticky, glass)
      ═══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 w-full" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div
          style={{
            background: 'hsl(var(--background) / 0.82)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            borderBottom: '1px solid hsl(var(--border) / 0.2)',
          }}
        >
          {/* Greeting row */}
          <TimeGreeting hasCheckedIn={hasCheckedInToday()} onOpenCheckIn={() => { setCheckInDismissed(false); setShowCheckIn(true); }} />

          {/* Date strip */}
          <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} onOpenCalendar={() => setShowCalendar(true)} />

          {/* Date label + view toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '0.5rem' }}>
            <motion.span
              key={format(selectedDate, 'yyyy-MM-dd')}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle:  'normal',
                fontSize:   isToday(selectedDate) ? '1rem' : '0.8rem',
                fontWeight: 700,
                color: isToday(selectedDate) ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.6)',
              }}
            >
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}
            </motion.span>
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </div>

        {/* Accent line */}
        <motion.div style={{ height: '1px' }} animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.4) 40%, hsl(260 35% 65% / 0.3) 65%, transparent 100%)' }} />
        </motion.div>
      </header>


      {/* ═══════════════════════════════════════════════
          ORB HERO STAGE   (premium 3D redesign)
      ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: '0.5rem', paddingBottom: '0',
          gap: '0',
        }}
      >
        {/* Giant diffuse radial behind orb */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(260px, 70vw, 400px)',
          height: 'clamp(200px, 55vw, 320px)',
          background: 'radial-gradient(ellipse, hsl(235 40% 60% / 0.16) 0%, hsl(260 35% 65% / 0.07) 45%, transparent 70%)',
          filter: 'blur(28px)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* ORB */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '-0.25rem' }}>
          <RhythmOrb size="md" />
        </div>

        {/* FLOW SCORE — elegant italic display beneath the orb */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginTop: '0.1rem' }}
        >
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 'clamp(0.8rem, 2.2vw, 1.05rem)',
            color: 'hsl(var(--muted-foreground) / 0.55)',
            letterSpacing: '0.03em',
          }}>
            {viewMode === 'flow' ? 'your flow' : 'your plan'}
            <span style={{
              marginLeft: '0.55rem',
              fontFamily: "'DM Mono', monospace",
              fontStyle: 'normal',
              fontSize: 'clamp(0.65rem, 1.6vw, 0.8rem)',
              color: 'hsl(var(--muted-foreground) / 0.32)',
              letterSpacing: '0.08em',
            }}>
              {format(selectedDate, 'dd.MM')}
            </span>
          </span>
        </motion.div>

        {/* OVERDUE badge — centred below the score */}
        <AnimatePresence>
          {overdueTasks.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => setShowRescheduleSheet(true)}
              style={{
                marginTop: '0.55rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.38rem',
                padding: '0.28rem 0.9rem', borderRadius: '999px',
                border: '1px solid hsl(38 90% 55% / 0.35)',
                background: 'hsl(38 90% 55% / 0.07)',
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.57rem', letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: 'hsl(38 70% 42%)',
                position: 'relative', zIndex: 1,
              }}
            >
              <CalendarClock style={{ width: '0.68rem', height: '0.68rem' }} />
              {overdueTasks.length} overdue
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          CONTEXTUAL CARDS ROW  (horizontal scroll carousel)
      ═══════════════════════════════════════════════ */}
      {shouldShowMorningBridge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{
            display: 'flex', gap: '0.65rem',
            padding: '0.65rem 1.25rem 0.5rem',
            overflowX: 'auto', position: 'relative', zIndex: 1,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
          }}
        >
          {/* Morning Bridge card */}
          {shouldShowMorningBridge && nextPendingAction && !allActionsDone && (
            <div className="w-full sm:w-[320px] shrink-0" style={{ scrollSnapAlign: 'center' }}>
              <MorningBridgeDisplayCard
                nextAction={nextPendingAction} allDone={allActionsDone}
                onMarkDone={(id) => { markActionDone(id); markShown(); }}
                onSkip={(id) => skipAction(id)}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          DIVIDER — refined thin gradient hairline
      ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.72, duration: 0.55 }}
        style={{ padding: '0 1.25rem 0.3rem', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, transparent 0%, hsl(var(--border) / 0.5) 25%, hsl(var(--primary) / 0.2) 50%, hsl(var(--border) / 0.5) 75%, transparent 100%)',
        }} />
      </motion.div>

      <SuggestionsTray />

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT — Flow / Plan
      ═══════════════════════════════════════════════ */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {viewMode === 'plan' ? (
            <CalendarView
              key="calendar"
              blocks={blocksForDay}
              events={eventsForDay}
              onBlockClick={handleBlockClick}
              onEventClick={handleEventClick}
            />
          ) : (
            <TimelineView
              key="timeline"
              blocks={blocksForDay}
              unlinkedTasks={tasksForDay}
              events={eventsForDay}
              completedTasks={completedTasksForDay}
              onBlockClick={handleBlockClick}
              onBlockComplete={handleCompleteBlock}
              onTaskToggle={handleTaskToggle}
              onTaskTap={handleTaskTap}
              onEventClick={handleEventClick}
              onScheduleTask={handleScheduleTask}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════
          NEXT BLOCK PANEL — Alexa-style "what to do now"
      ═══════════════════════════════════════════════ */}
      {(() => {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const nextBlock = blocksForDay
          .filter(b => b.status !== 'completed')
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .find(b => {
            const [h, m] = b.endTime.split(':').map(Number);
            return (h * 60 + m) >= nowMinutes;
          }) || null;
        return isToday(selectedDate) ? (
          <NextBlockPanel
            block={nextBlock}
            onDelay={(blockId, minutes) => {
              const blk = blocksForDay.find(b => b.id === blockId);
              if (!blk) return;
              const addMins = (t: string, m: number) => {
                const [h, min] = t.split(':').map(Number);
                const total = h * 60 + min + m;
                return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
              };
              updateBlock(blockId, {
                startTime: addMins(blk.startTime, minutes),
                endTime: addMins(blk.endTime, minutes),
              });
            }}
            onOverwhelmed={() => setShowOverwhelmed(true)}
            onReplan={() => setShowRescheduleSheet(true)}
          />
        ) : null;
      })()}

      {/* ═══════════════════════════════════════════════
          FAB + NUDGES
      ═══════════════════════════════════════════════ */}
      <FloatingActionButton
        onAddBlock={() => { setSchedulingTask(null); setShowAddBlock(true); }}
        onAddTask={() => { console.log('[DayPlanner] FAB onAddTask clicked'); setShowAddTask(true); }}
      />

      <FirstActionNudge type="add-task"       show={shouldShowAddTaskNudge}   onDismiss={dismissAddTaskNudge}   />
      <FirstActionNudge type="first-task-added" show={shouldShowTaskAddedNudge} onDismiss={dismissTaskAddedNudge} />

      {/* ═══════════════════════════════════════════════
          MODALS & DIALOGS (unchanged)
      ═══════════════════════════════════════════════ */}
      <AddBlockDialog open={showAddBlock} onOpenChange={(open) => { setShowAddBlock(open); if (!open) setSchedulingTask(null); }} onAdd={handleAddBlock} defaultDate={dateKey} defaultTitle={schedulingTask?.title} />
      <AddTaskDialog  open={showAddTask}  onOpenChange={setShowAddTask}  onAdd={handleAddTask}  />

      <BlockDetailSheet
        block={selectedBlock} tasks={blockTasks} open={showBlockDetail} onOpenChange={setShowBlockDetail}
        onComplete={handleCompleteBlock} onEdit={handleEditBlock} onDelete={handleDeleteBlock} onTaskToggle={handleTaskToggle}
      />
      <EditBlockDialog open={showEditBlock} onOpenChange={setShowEditBlock} block={selectedBlock} onSave={handleSaveBlock} onDelete={handleDeleteBlock} onComplete={handleCompleteBlock} />
      <DailyCheckInModal open={showCheckIn} onClose={() => { setShowCheckIn(false); setCheckInDismissed(true); localStorage.setItem(`rivly_checkin_dismissed_${dateKey}`, 'true'); }} onComplete={handleCheckInComplete} />
      <OverwhelmedScreen open={showOverwhelmed} onClose={handleOverwhelmedClose} tasks={allTasks} onSelectTask={(taskId) => { handleTaskToggle(taskId); handleOverwhelmedClose(); }} onCreateTask={handleOverwhelmedCreateTask} />

      <Dialog open={showRescheduleSheet} onOpenChange={setShowRescheduleSheet}>
        <DialogContent className="sm:max-w-[440px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold font-serif text-foreground">Smart reschedule</DialogTitle>
            <DialogDescription className="text-[14px]">Spread {reschedulePlan.length} overdue task{reschedulePlan.length !== 1 ? 's' : ''} across the next few days by priority.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden space-y-3 py-2 px-1 scrollbar-hide">
            {reschedulePlan.map((item) => {
              const dateObj = parseDateKey(item.newDateKey);
              return (
              <div key={item.taskId} className="flex items-center justify-between gap-2 rounded-[2rem] border border-border/50 bg-card p-1.5 pl-5 text-sm relative transition-colors hover:border-border/80 shadow-sm">
                <span className="flex-1 pr-2 text-foreground/90 font-medium line-clamp-2 leading-tight text-left break-words">{item.title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-auto justify-start text-left font-medium shrink-0 h-9 rounded-full px-4 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors text-primary/80",
                          !item.newDateKey && "text-muted-foreground"
                        )}
                      >
                        <CalendarClock className="mr-2 h-4 w-4" />
                        {item.newDateKey ? format(dateObj, "MMMM d") : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[10005]" align="end">
                      <Calendar
                        mode="single"
                        selected={dateObj}
                        onSelect={(date) => {
                          if (date) {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            setReschedulePlan(prev => prev.map(p => p.taskId === item.taskId ? { ...p, newDateKey: dateStr } : p));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => {
                      deleteTask(item.taskId);
                      setReschedulePlan(prev => prev.filter(p => p.taskId !== item.taskId));
                      if (recordTaskDeleted) recordTaskDeleted(item.taskId, item.oldDateKey);
                      toast({ title: 'Task deleted', description: `Deleted "${item.title}"` });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )})}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" className="rounded-full px-6" onClick={() => setShowRescheduleSheet(false)}>Cancel</Button>
            <Button className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleApplyReschedule}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      <BreathworkPauseModal open={showBreathwork} onClose={() => setShowBreathwork(false)} />
      <ThoughtParkingSheet  open={showThoughtParking} onOpenChange={setShowThoughtParking} onSave={handleThoughtSave} />
      <CalendarModal open={showCalendar} onOpenChange={setShowCalendar} selectedDate={selectedDate} onDateSelect={(date) => { setSelectedDate(date); }} onAddEvent={(date) => { setSelectedDate(date); setEditingEvent(null); setShowEventForm(true); }} />
      <EventFormModal open={showEventForm} onOpenChange={setShowEventForm} date={selectedDate} editEvent={editingEvent} />
      <EditTaskDialog open={showEditTask} onOpenChange={setShowEditTask} task={editingTask} onSave={handleTaskEditSave} onDelete={handleTaskDelete} onToggle={handleTaskToggleFromEdit} />

      <Dialog open={!!insightResult} onOpenChange={(open) => !open && setInsightData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RivaGlobe size={28} />
              Rhythm Guide
            </DialogTitle>
            <DialogDescription className="sr-only">Personalized rhythmic insights and guidance.</DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <RivaGlobe size={72} />
            <p className="text-lg font-medium leading-relaxed">{insightResult?.insight}</p>
            {insightResult?.audioUrl && (
              <Button variant="outline" size="sm" onClick={toggleAudio} className="mt-2 text-primary">
                {isPlaying ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {isPlaying ? 'Pause Voice' : 'Play Voice'}
              </Button>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setInsightData(null)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

/* ════════════════════════════════════════════════════
   SUB-COMPONENTS (scoped to this page)
════════════════════════════════════════════════════ */

/** Floating stat card */
function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.03 }}
      style={{
        flex: 1, borderRadius: '1rem',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border) / 0.35)',
        boxShadow: 'var(--shadow-soft)',
        padding: 'clamp(0.85rem, 1.6vh, 1.4rem) clamp(0.7rem, 1.2vw, 1.1rem)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(0.15rem, 0.4vh, 0.3rem)',
        transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <span style={{ fontSize: 'clamp(0.9rem, 1.4vw, 1.2rem)', color, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontFamily: "Roboto, sans-serif", fontSize: 'clamp(1.5rem, 2.8vw, 2.4rem)', fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1 }}>{value}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground) / 0.6)' }}>{label}</span>
    </motion.div>
  );
}

/** Quick action pill */
function QuickActionPill({ icon, label, tint, bg, border, onClick, pulse, rotate, badge }: {
  icon: React.ReactNode; label: string; tint: string; bg: string; border: string;
  onClick: () => void; pulse?: boolean; rotate?: boolean; badge?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(0.42rem, 0.8vw, 0.65rem)',
        padding: 'clamp(0.8rem, 1.4vh, 1.2rem) clamp(0.6rem, 1vw, 0.9rem)', borderRadius: 'clamp(0.85rem, 1.2vw, 1.1rem)',
        background: bg, border: `1px solid ${border}`,
        position: 'relative', cursor: 'pointer', transition: 'all 0.28s ease',
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: '-0.4rem', right: '-0.4rem',
          width: '1rem', height: '1rem', borderRadius: '50%',
          background: 'hsl(var(--primary))', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'DM Mono', monospace", fontSize: '0.45rem',
        }}>{badge}</span>
      )}
      <motion.span
        style={{ color: tint, display: 'flex' }}
        animate={pulse ? { scale: [1, 1.2, 1] } : rotate ? { rotate: [0, 8, -8, 0] } : {}}
        transition={{ duration: pulse ? 3 : 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icon}
      </motion.span>
      <span style={{ fontFamily: "Roboto, sans-serif", fontSize: 'clamp(0.78rem, 1.1vw, 1rem)', fontWeight: 500, color: tint }}>{label}</span>
    </motion.button>
  );
}
