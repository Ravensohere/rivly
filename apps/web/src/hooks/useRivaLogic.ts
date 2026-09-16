import { useState, useCallback, useRef, useEffect } from 'react';
import { useGeminiVoice, type GeminiFunctionCall, type GeminiFunctionResult } from './useGeminiVoice';
import { api } from '@/lib/api';
import { useTasks } from './useTasks';
import { useFocusTimer } from '@/contexts/FocusTimerContext';
import { useToast } from '@/hooks/use-toast';
import { getLocalDateKey } from '@/lib/dateUtils';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useOnboarding } from './useOnboarding';

import { useTimeBlocks } from './useTimeBlocks';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeMode } from './useTheme';
import { processOfflineCommand } from '@/lib/riva-offline';
import { useUserPreferences } from './useUserPreferences';
import { useLearningPaths } from './useLearningPaths';
import { useShoppingList } from './useShoppingList';
import { supabase } from '@/integrations/supabase/client';
import { extractTasksFromSpeech } from '@/lib/speechParser';
import { getUpcomingEvents, getTodayEvent, buildEventMorningMessage } from '@/lib/indianCalendar';
import { getRivaResponse, getLanguageCode } from '@/lib/rivaLanguage';
import { getGreetingWithName } from '@/lib/greeting';

/** Page names Riva understands → app routes (shared by text + voice paths) */
const NAV_ROUTES: Record<string, string> = {
  'settings': '/profile',
  'profile': '/profile',
  'insights': '/insights',
  'sleep': '/sleep',
  'focus': '/focus',
  'journal': '/reflect?tab=journal',
  'thoughts': '/reflect?tab=thoughts',
  'reflect': '/reflect?tab=reflect',
  'home': '/app'
};

export function useRivaLogic() {

  const [isProcessing, setIsProcessing] = useState(false);
  const [rivaResponse, setRivaResponse] = useState<{ message: string; action: string } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [learningPathIdToShow, setLearningPathIdToShow] = useState<string | null>(null);
  const [dailyPlanPrompted, setDailyPlanPrompted] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const {
    addPath: addLearningPath,
    paths: learningPaths,
    getPath: getLearningPath,
    findCheckpointByTitle,
    addCheckpointToPath,
    removeCheckpointFromPath,
    reorderCheckpoint,
    renameCheckpoint,
    updateCheckpointDescription,
    addNoteToCheckpoint,
    replaceCheckpointVideo,
    splitCheckpoint,
    mergeCheckpoints,
    updatePathMetadata,
  } = useLearningPaths();
  const { items: shoppingItems, addItem: addShoppingItem, removeByText: removeShoppingByText, clearAll: clearShoppingList } = useShoppingList();
  const [shoppingListOpen, setShoppingListOpen] = useState(false);

  const fetchCredits = useCallback(async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          const { data, error } = await supabase
              .from('profiles')
              .select('credits_balance')
              .eq('user_id', user.id)
              .single();
              
          if (error) {
              console.warn("[Riva] Credit fetch error:", error.code, error.message);
              // Profile missing (PGRST116) — try to create it
              if (error.code === 'PGRST116') {
                  const { error: insertErr } = await supabase
                      .from('profiles')
                      .insert({ user_id: user.id, name: 'User', credits_balance: 500 });
                  if (insertErr) {
                      console.warn("[Riva] Could not auto-create profile:", insertErr.message);
                  } else {
                      setCredits(500);
                  }
              }
              return;
          }
              
          if (data) {
              const balance = (data as { credits_balance?: number | null }).credits_balance;
              setCredits(typeof balance === 'number' ? balance : 0);
          }
      } catch (e) {
          console.error("Failed to fetch credits", e);
      }
  }, []);

  // Fetch credits on mount
  useEffect(() => {
      fetchCredits();
      
      // Subscribe to credit updates? Or just poll periodically/after action
      // Simple way: re-fetch after action
  }, [fetchCredits]);

  const { addTask, tasks } = useTasks();
  const { addBlock } = useTimeBlocks();
  const { startFocus, cancelFocus, isRunning, remaining } = useFocusTimer();
  const { toast } = useToast();
  const { recordTaskCreated, recordCheckIn, recordSleepRating, focusByDay, moodByDay, energyByDay } = useEventsLedgerContext();
  const { markFirstTaskAdded } = useOnboarding();
  const navigate = useNavigate();
  const { setTheme, themeMode } = useTheme();

  // Get language preference and user name
  // @ts-ignore
  const { firstName, rivaLanguage } = useUserPreferences();
  const userName = firstName || 'Friend';
  const language = rivaLanguage || 'english';

  // Proactive care messages
  const CARE_MESSAGES = {
    hydration: "Quick water break? Your brain needs it!",
    stretch: "You've been at it a while. Stand up and stretch for a minute!",
    lunchReminder: "Lunch time! Don't skip it — your future self will thank you.",
    dinnerReminder: "Dinner time! Take a proper break and eat well.",
    sleepNudge: "It's getting late. Want to wrap things up for tomorrow?",
  };
  const CELEBRATION_MESSAGES = [
    "That's awesome! You're making real progress today.",
    "Nice one! Crossed that off — keep the momentum going.",
    "Done and dusted! You're on a roll.",
    "Boom! Another one down. You've got this.",
    "Look at you getting things done!",
  ];
  const lastCareMessageRef = useRef<Record<string, number>>({});
  const appStartTimeRef = useRef(Date.now());
  const lastProcessedRef = useRef<string>('');
  const prevCompletedCountRef = useRef<number>(0);

  /* Speech Synthesis Ref to prevent garbage collection (Chrome bug) */
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /**
   * Browser-native TTS for command bar text responses (offline commands, REST API fallback).
   * Voice conversations use Gemini Live audio — this is only for non-live interactions.
   */
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const languageCode = getLanguageCode(language);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = languageCode;

    utteranceRef.current = utterance;
    utterance.onend = () => { utteranceRef.current = null; };
    utterance.onerror = (e) => { console.error('[Riva] Speech Error:', e); };

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Google English (India)') ||
      v.name.includes('Microsoft Ravi') ||
      v.name.includes('Lekha') ||
      v.lang === 'en-IN' ||
      v.name.includes('Samantha')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      if (preferredVoice.lang === 'en-IN') utterance.rate = 1.1;
    }

    window.speechSynthesis.speak(utterance);
  }, [language]);

  /** Schedule a browser-notification reminder (shared by text + voice paths) */
  const scheduleReminder = useCallback(async (reminderText: string, reminderTime: string, reminderDate?: string) => {
    try {
      const dateStr = reminderDate === 'today' || !reminderDate
        ? getLocalDateKey()
        : reminderDate;
      const reminderDt = new Date(`${dateStr}T${reminderTime}:00`);
      const delay = reminderDt.getTime() - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        // Request notification permission if not granted
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ Riva Reminder', { body: reminderText });
          } else {
            toast({ title: '⏰ Reminder', description: reminderText });
          }
        }, delay);
      }
    } catch (e) {
      console.warn('[Riva] Reminder scheduling failed:', e);
    }
  }, [toast]);

  const processTranscript = useCallback(async (text: string, opts?: { silent?: boolean }) => {
    console.log('[Riva] Processing transcript:', text);
    if (!text || text === lastProcessedRef.current) {
      console.warn('[Riva] Empty or duplicate transcript, skipping');
      return;
    }
    lastProcessedRef.current = text;
    
    setIsProcessing(true);
    setRivaResponse(null);

    // Check if user is responding to daily plan prompt.
    // Learning requests ("I want to learn React") must NOT be captured as
    // plain tasks here — let them flow to the normal command routing below.
    const isLearningIntent = /\b(learn|seekhn[ai]|sikhn[ai]|roadmap|teach me)\b/i.test(text);
    const isRespondingToPlanPrompt = rivaResponse?.action === 'prompt_daily_plan' && !isLearningIntent;

    if (isRespondingToPlanPrompt) {
      // User is telling us their tasks - parse and create them
      const taskList = extractTasksFromSpeech(text);
      
      if (taskList.length > 0) {
        // Add tasks to today's list
        const todayKey = getLocalDateKey();
        const addedTasks: any[] = [];
        
        for (const cleanTitle of taskList) {
          if (cleanTitle.length > 2) {
            const newTask = await addTask({
              title: cleanTitle,
              status: 'todo',
              dateKey: todayKey,
              tag: 'other',
            });
            
            if (newTask) {
              addedTasks.push(newTask);
              recordTaskCreated(newTask.id, todayKey);
            }
          }
        }
        
        // Now create the balanced plan
        await createBalancedPlan(addedTasks);
        
        setIsProcessing(false);
        return;
      }
    }

    try {
      console.log('[Riva] Processing offline first...');
      // Pass the raw preference: when the user has not chosen a language,
      // let the parser detect it from what they actually said.
      let plan = processOfflineCommand(text, tasks, addTask, rivaLanguage || undefined);

      if (!plan) {
        console.log('[Riva] No offline match, sending to backend...');
        
        // Build Rich Context
        const todayKey = getLocalDateKey();
        const pendingTasks = tasks.filter(t => t.dateKey === todayKey && t.status !== 'done');
        const completedTasks = tasks.filter(t => t.dateKey === todayKey && t.status === 'done');
        
        // Calculate recent focus stats
        const recentFocus = focusByDay?.[todayKey] || [];
        const todayMinutes = recentFocus.reduce((acc: number, s: any) => acc + (s.durationMin || 0), 0);
        
        const richContext = {
            view: window.location.pathname,
            user: { name: userName },
            date: new Date().toDateString(),
            time: new Date().toLocaleTimeString(),
            state: {
                tasks: {
                    pending: pendingTasks.length,
                    completed: completedTasks.length,
                    top3: pendingTasks.slice(0, 3).map((t: any) => t.title)
                },
                focus: {
                    isFocused: isRunning,
                    timeLeft: isRunning ? remaining : 0,
                    todayMinutes
                },
                rhythm: {
                    energy: energyByDay?.[todayKey] || 0,
                    mood: moodByDay?.[todayKey] || 0
                }
            }
        };

        try {
          // Always go to real AI — no mock intercept
          plan = await api.riva.plan(text, richContext);
        } catch (backendErr) {
          console.warn('[Riva] Backend failed, using deterministic fallback:', backendErr);
          // Deterministic fallback — never show a blank/confusing state
          const topTask = pendingTasks[0]?.title;
          plan = {
            message: topTask
              ? `Riva is unavailable right now. Your next task: "${topTask}". Focus on completing it.`
              : `Riva is unavailable right now. Add your tasks and I'll help you plan.`,
            action: 'online_response',
            data: { fallback: true }
          };
        }
      } else {
        console.log('[Riva] Offline match found:', plan);
      }
      
      console.log('[Riva] Final Plan:', plan);

      if (plan) {
        // Force new object reference so useEffect in RivaCommandBar always triggers
        setRivaResponse({ ...plan, _ts: Date.now() } as any);
        // Skip browser TTS when triggered from a live Gemini session (Gemini speaks itself)
        if (!opts?.silent) speak(plan.message);

        // Execute Action
        switch (plan.action) {
          case 'online_response':
            // Just speaking the message is enough
            break; 
          case 'create_task':
            console.log('[Riva] create_task action triggered. plan.data:', plan.data);
            if (plan.data && plan.data.title) {
               const dateKey = plan.data.date || getLocalDateKey();
               console.log('[Riva] Calling addTask with:', plan.data.title, dateKey);
               
               const newTask = await addTask({
                  title: plan.data.title,
                  status: 'todo',
                  dateKey: dateKey,
                  tag: (plan.data.tag as any) || 'other',
               });
               
               console.log('[Riva] Task added successfully:', newTask);
               if (newTask) recordTaskCreated(newTask.id, dateKey);
               markFirstTaskAdded();
            }
            break;

          case 'create_tasks':
            console.log('[Riva] create_tasks action triggered. plan.data:', plan.data);
            if (plan.data && plan.data.tasks && Array.isArray(plan.data.tasks)) {
              const dateKey = plan.data.date || getLocalDateKey();
              const tasksToAdd = plan.data.tasks;
              
              for (const taskData of tasksToAdd) {
                if (taskData && taskData.title) {
                  const newTask = await addTask({
                    title: taskData.title,
                    status: 'todo',
                    dateKey: taskData.date || dateKey,
                    tag: (taskData.tag as any) || 'other',
                  });
                  
                  console.log('[Riva] Task added:', newTask);
                  if (newTask) recordTaskCreated(newTask.id, taskData.date || dateKey);
                }
              }
              markFirstTaskAdded();
            }
            break;

          case 'create_time_block':
             if (plan.data && plan.data.title && plan.data.start && plan.data.end) {
                const dateKey = plan.data.date || getLocalDateKey();
                const endDateKey = plan.data.endDate || dateKey; // Support multi-day blocks
                
                console.log('[Riva] adding time block:', plan.data);
                
                await addBlock({
                    title: plan.data.title,
                    startTime: plan.data.start,
                    endTime: plan.data.end,
                    dateKey: dateKey,
                    endDateKey: endDateKey === dateKey ? undefined : endDateKey, // Only set if different
                    color: 'blue',
                    status: 'planned',
                    tasks: []
                });
                console.log('[Riva] Time block added successfully');
             }
             break;

          case 'start_focus':
            if (plan.data && plan.data.duration) {
              startFocus({
                duration: plan.data.duration,
                purpose: 'Focus Session',
                purposeType: 'custom',
                customPurpose: 'Quick Focus' 
              });
            }
            break;

          case 'stop_focus':
            cancelFocus();
            break;

          case 'open_journal':
            navigate('/reflect');
            break;

          case 'start_planning':
             promptDailyPlan();
             break;

          case 'open_reschedule':
             // handled by DayPlanner.tsx effect
             break;

          case 'set_theme':
             if (plan.data && plan.data.mode) {
                 setTheme(plan.data.mode as ThemeMode);
             }
             break;

          case 'navigate':
             if (plan.data && plan.data.page) {
                 const target = NAV_ROUTES[plan.data.page];
                 if (target) {
                     navigate(target);
                 }
             }
             break;

          case 'log_checkin':
             if (plan.data) {
                const today = getLocalDateKey();
                await recordCheckIn(today, {
                    mood: plan.data.mood || 3,
                    energy: plan.data.energy || 3,
                    sleepQuality: 2, // Default placeholder
                    intent: plan.data.note || 'Logged via voice'
                });
             }
             break;

          case 'log_sleep':
             if (plan.data && plan.data.quality) {
                 const today = getLocalDateKey();
                 await recordSleepRating(today, plan.data.quality, plan.data.hours);
             }
             break;

          case 'create_learning_path':
             if (plan.data?.topic && Array.isArray(plan.data.checkpoints)) {
                 const checkpoints = plan.data.checkpoints.map((c: any) => ({
                     title: c.title || '',
                     description: c.description || '',
                     estimatedHours: c.estimatedHours,
                     type: c.type,
                     difficulty: c.difficulty,
                     resources: c.resources,
                     videos: c.videos,
                     videoId: c.videoId || c.videos?.[0]?.videoId,
                     videoTitle: c.videoTitle || c.videos?.[0]?.title,
                     url: c.url || c.videos?.[0]?.url,
                 }));
                 addLearningPath(plan.data.topic, checkpoints, {
                     description: plan.data.description,
                     difficulty: plan.data.difficulty,
                     totalEstimatedHours: plan.data.totalEstimatedHours,
                     category: plan.data.category,
                 });
                 navigate('/learn');
             }
             break;

          case 'explain_concept':
             // Knowledge answer: message already contains the formatted explanation
             // The response card in RivaCommandBar will show "Go deeper →" button
             // No extra side-effects needed — the setRivaResponse above handles display
             break;

          case 'set_reminder': {
             const { text: reminderText, time: reminderTime, date: reminderDate } = plan.data || {};
             if (reminderText && reminderTime) {
               await scheduleReminder(reminderText, reminderTime, reminderDate);
             }
             break;
          }

          case 'edit_learning_path': {
            const { pathId, edit } = plan.data || {};
            const targetPathId = pathId || learningPathIdToShow || learningPaths[0]?.id;
            if (!targetPathId) {
              speak("You don't have any learning paths yet. Say 'I want to learn React' to create one!");
              break;
            }
            const path = getLearningPath(targetPathId);
            if (!path || !edit) break;

            switch (edit.type) {
              case 'add_checkpoint':
                addCheckpointToPath(targetPathId, edit.title, edit.description, edit.afterCheckpointId);
                break;
              case 'remove_checkpoint':
                removeCheckpointFromPath(targetPathId, edit.checkpointId, edit.checkpointTitle);
                break;
              case 'reorder': {
                let cpId = edit.checkpointId;
                if (!cpId && edit.checkpointTitle) {
                  cpId = findCheckpointByTitle(path, edit.checkpointTitle)?.id;
                }
                if (cpId) reorderCheckpoint(targetPathId, cpId, edit.newPosition);
                break;
              }
              case 'rename_checkpoint':
                renameCheckpoint(targetPathId, edit.checkpointId, edit.oldTitle, edit.newTitle);
                break;
              case 'update_description':
                updateCheckpointDescription(targetPathId, edit.checkpointId, edit.checkpointTitle, edit.newDescription);
                break;
              case 'add_note':
                if (edit.checkpointTitle || edit.checkpointId) {
                  let cpId = edit.checkpointId;
                  if (!cpId && edit.checkpointTitle) {
                    cpId = findCheckpointByTitle(path, edit.checkpointTitle)?.id;
                  }
                  if (cpId) addNoteToCheckpoint(targetPathId, cpId, edit.note);
                }
                break;
              case 'replace_video': {
                const searchQuery = edit.searchQuery || `${path.topic} ${edit.checkpointTitle || ''} tutorial`;
                try {
                  const result = await api.riva.searchVideo(searchQuery);
                  if (result.videos?.length) {
                    replaceCheckpointVideo(targetPathId, edit.checkpointId, edit.checkpointTitle, result.videos);
                  }
                } catch (e) {
                  console.warn('[Riva] Video search failed:', e);
                }
                break;
              }
              case 'change_difficulty':
                updatePathMetadata(targetPathId, { difficulty: edit.newDifficulty });
                break;
              case 'split_checkpoint':
                splitCheckpoint(targetPathId, edit.checkpointId, edit.checkpointTitle, edit.into);
                break;
              case 'merge_checkpoints':
                mergeCheckpoints(targetPathId, edit.checkpointIds, edit.checkpointTitles, edit.mergedTitle);
                break;
            }
            break;
          }

          case 'add_to_shopping_list': {
            const items = plan.data?.items || [];
            for (const item of items) {
              if (typeof item === 'string' && item.trim()) {
                addShoppingItem(item.trim());
              }
            }
            break;
          }

          case 'show_shopping_list': {
            setShoppingListOpen(true);
            break;
          }

          case 'remove_from_shopping_list': {
            const items = plan.data?.items || [];
            if (items.includes('__all__')) {
              clearShoppingList();
            } else {
              for (const item of items) {
                if (typeof item === 'string') {
                  removeShoppingByText(item);
                }
              }
            }
            break;
          }
        }
        
        // Refresh credits after action (deduction happened on backend)
        fetchCredits();
      }
    } catch (err: any) {
      console.error('[Riva] Error processing voice:', err);
      const errorMessage = !navigator.onLine
        ? "I'm offline right now. I can still add tasks and start focus — try those!"
        : err?.status === 429
        ? "I'm getting too many requests. Give me a moment and try again."
        : `I had trouble with "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}". Could you rephrase that?`;
      toast({ variant: "destructive", title: "Riva", description: errorMessage });
      speak(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [addTask, addBlock, startFocus, cancelFocus, toast, speak, recordTaskCreated, markFirstTaskAdded, navigate, setTheme, recordCheckIn, recordSleepRating, addLearningPath, addShoppingItem, removeShoppingByText, clearShoppingList, scheduleReminder]);

  const playMorningBriefing = useCallback(async (checkIn: any) => {
    try {
        setIsProcessing(true);
        const { text } = await api.riva.morningBriefing(checkIn, userName);

        if (text) {
            speak(text);
        }
    } catch (e) {
        console.error("Failed to play briefing:", e);
        speak(`Good morning ${userName}. I've logged your check-in.`);
    } finally {
        setIsProcessing(false);
    }
  }, [userName, speak]);

  // --- Proactive care timer ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const appRuntime = Date.now() - appStartTimeRef.current;

      const canShow = (type: string) => {
        const last = lastCareMessageRef.current[type] || 0;
        return Date.now() - last > 3 * 60 * 60 * 1000; // 3-hour cooldown
      };

      // Hydration: if focus running 45+ minutes
      if (isRunning && canShow('hydration') && appRuntime > 45 * 60 * 1000) {
        lastCareMessageRef.current.hydration = Date.now();
        toast({ title: "Riva", description: CARE_MESSAGES.hydration });
        speak(CARE_MESSAGES.hydration);
      }

      // Stretch: 90+ minutes of app usage
      if (canShow('stretch') && appRuntime > 90 * 60 * 1000) {
        lastCareMessageRef.current.stretch = Date.now();
        toast({ title: "Riva", description: CARE_MESSAGES.stretch });
        speak(CARE_MESSAGES.stretch);
      }

      // Lunch reminder: 12:30-1:30 PM
      if (canShow('lunch') && ((hour === 12 && minute >= 30) || (hour === 13 && minute <= 30))) {
        lastCareMessageRef.current.lunch = Date.now();
        toast({ title: "Riva", description: CARE_MESSAGES.lunchReminder });
      }

      // Dinner reminder: 7:30-8:30 PM
      if (canShow('dinner') && ((hour === 19 && minute >= 30) || (hour === 20 && minute <= 30))) {
        lastCareMessageRef.current.dinner = Date.now();
        toast({ title: "Riva", description: CARE_MESSAGES.dinnerReminder });
      }

      // Sleep nudge: after 11 PM
      if (canShow('sleep') && hour >= 23) {
        lastCareMessageRef.current.sleep = Date.now();
        toast({ title: "Riva", description: CARE_MESSAGES.sleepNudge });
      }
    }, 60000); // check every minute

    return () => clearInterval(interval);
  }, [isRunning, speak, toast]);

  // --- Task completion celebrations (30% chance) ---
  useEffect(() => {
    const todayKey = getLocalDateKey();
    const completedCount = tasks.filter(t => t.dateKey === todayKey && t.status === 'done').length;
    // Only celebrate if the count increased (a task was just completed)
    if (completedCount > prevCompletedCountRef.current && prevCompletedCountRef.current > 0) {
      if (Math.random() < 0.3) {
        const msg = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
        toast({ title: "Riva", description: msg });
        speak(msg);
      }
    }
    prevCompletedCountRef.current = completedCount;
  }, [tasks, speak, toast]);

  // --- Gemini Live: handle function calls from the AI ---
  const handleFunctionCall = useCallback((fc: GeminiFunctionCall) => {
    console.log('[Riva] Gemini function call:', fc.name, fc.args);
    // We'll execute the local side-effects when we get the result back
  }, []);

  const handleFunctionResult = useCallback((fr: GeminiFunctionResult) => {
    console.log('[Riva] Gemini function result:', fr.name, fr.result);
    const result = fr.result;

    // Execute local side-effects based on the function that was called
    switch (fr.name) {
      case 'create_task': {
        if (result.success && result.task) {
          const dateKey = getLocalDateKey();
          addTask({
            title: result.task.title,
            status: 'todo',
            dateKey,
            tag: result.task.tag || 'other',
          }).then((newTask) => {
            if (newTask) {
              recordTaskCreated(newTask.id, dateKey);
              markFirstTaskAdded();
            }
          });
        }
        break;
      }

      case 'create_tasks': {
        if (result.success && Array.isArray(result.tasks)) {
          const dateKey = getLocalDateKey();
          for (const t of result.tasks) {
            addTask({
              title: t.title,
              status: 'todo',
              dateKey,
              tag: t.tag || 'other',
            }).then((newTask) => {
              if (newTask) recordTaskCreated(newTask.id, dateKey);
            });
          }
          markFirstTaskAdded();
        }
        break;
      }

      case 'start_focus': {
        if (result.success) {
          startFocus({
            duration: result.duration || 25,
            purpose: 'Focus Session',
            purposeType: 'custom',
            customPurpose: 'Quick Focus',
          });
        }
        break;
      }

      case 'stop_focus': {
        if (result.success) cancelFocus();
        break;
      }

      case 'add_to_shopping_list': {
        if (result.success && Array.isArray(result.items)) {
          for (const item of result.items) {
            if (typeof item === 'string' && item.trim()) {
              addShoppingItem(item.trim());
            }
          }
        }
        break;
      }

      case 'show_shopping_list': {
        if (result.success) setShoppingListOpen(true);
        break;
      }

      case 'remove_from_shopping_list': {
        if (!result.success) break;
        if (result.all) {
          clearShoppingList();
        } else if (Array.isArray(result.items)) {
          for (const item of result.items) {
            if (typeof item === 'string') {
              removeShoppingByText(item);
            }
          }
        }
        break;
      }

      case 'create_learning_path': {
        // Generation is heavy (Groq + YouTube, costs credits) — reuse the REST
        // plan flow. silent: Gemini already confirms by voice.
        if (result.success && result.topic) {
          processTranscript(`Create a learning path for ${result.topic}`, { silent: true });
        }
        break;
      }

      case 'create_time_block': {
        if (result.success && result.title && result.start && result.end) {
          addBlock({
            title: result.title,
            startTime: result.start,
            endTime: result.end,
            dateKey: getLocalDateKey(),
            color: 'blue',
            status: 'planned',
            tasks: [],
          });
        }
        break;
      }

      case 'set_reminder': {
        if (result.success && result.text && result.time) {
          scheduleReminder(result.text, result.time, result.date);
        }
        break;
      }

      case 'log_checkin': {
        if (result.success) {
          recordCheckIn(getLocalDateKey(), {
            mood: result.mood || 3,
            energy: result.energy || 3,
            sleepQuality: 2,
            intent: result.note || 'Logged via voice',
          });
        }
        break;
      }

      case 'navigate': {
        if (result.success && result.page) {
          const target = NAV_ROUTES[result.page];
          if (target) navigate(target);
        }
        break;
      }

      // get_weather, search_web, search_youtube, get_news — these are informational.
      // Gemini speaks the answer via audio; no local side-effect needed.
      default:
        break;
    }
  }, [addTask, startFocus, cancelFocus, recordTaskCreated, markFirstTaskAdded, addShoppingItem, removeShoppingByText, clearShoppingList, setShoppingListOpen, processTranscript, addBlock, scheduleReminder, recordCheckIn, navigate]);

  const handleSessionEnd = useCallback((reason: string) => {
    console.log('[Riva] Gemini session ended:', reason);
    // Deduct 5 credits for a completed live session (unless it was an error before setup)
    if (reason !== 'unmount') {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.rpc('deduct_credits', { p_user_id: user.id, amount: 5 }).then(() => {
            fetchCredits();
          });
        }
      });
    }
  }, [fetchCredits]);

  const {
    isConnected: isGeminiConnected,
    isListening,
    isAISpeaking,
    transcript: geminiTranscript,
    error: geminiError,
    startSession,
    endSession,
    sendText: geminiSendText,
    stopPlayback,
    isSupported: isGeminiSupported,
  } = useGeminiVoice({
    onFunctionCall: handleFunctionCall,
    onFunctionResult: handleFunctionResult,
    onSessionEnd: handleSessionEnd,
    userName,
  });

  // Map Gemini state to the existing interface
  const transcript = geminiTranscript;
  const interimTranscript = ''; // Gemini streams final text, no interim needed
  const error = geminiError;
  const isSupported = isGeminiSupported;

  // Get all incomplete tasks from previous days
  const getUnfinishedTasks = useCallback(async () => {
    const todayKey = getLocalDateKey();
    const allTasks = tasks;
    
    const unfinishedPrevious = allTasks.filter(t => 
      t.status !== 'done' && 
      t.dateKey && 
      t.dateKey < todayKey
    );
    
    return unfinishedPrevious;
  }, [tasks]);

  // Get today's pending tasks
  const getTodaysTasks = useCallback(() => {
    const todayKey = getLocalDateKey();
    return tasks.filter(t => t.dateKey === todayKey && t.status !== 'done');
  }, [tasks]);

  // Check if user needs to plan their day
  const shouldPromptDailyPlan = useCallback(() => {
    const todayKey = getLocalDateKey();
    const todaysPending = tasks.filter(t => t.dateKey === todayKey && t.status !== 'done');
    // Prompt if no tasks for today and hasn't been prompted yet
    return todaysPending.length === 0 && !dailyPlanPrompted;
  }, [tasks, dailyPlanPrompted]);

  // Prompt user to add tasks for the day
  const promptDailyPlan = useCallback(async (isAutoLoad = false) => {
    if (dailyPlanPrompted) return;
    
    setDailyPlanPrompted(true);
    
    // Get unfinished tasks from previous days
    const unfinishedTasks = await getUnfinishedTasks();
    
    // ── Indian Calendar awareness ──────────────────────────────────────────
    const now = new Date();
    const todayEvent = getTodayEvent(now);
    const upcomingEvents = getUpcomingEvents(3, now); // Look 3 days ahead

    let message = '';

    // 1. If today IS a festival, open with it
    if (todayEvent) {
      message += buildEventMorningMessage(todayEvent, now) + ' ';
    }

    // 2. Time-of-day greeting
    message += `${getGreetingWithName(userName, now)}. `;

    // 3. Unfinished tasks nudge
    if (unfinishedTasks.length > 0) {
      message += `You have ${unfinishedTasks.length} unfinished task${unfinishedTasks.length > 1 ? 's' : ''} from previous days. `;
      message += `Would you like me to help you plan your day? `;
      message += `Tell me what tasks you need to complete today, and I'll create a balanced plan with light tasks, survival tasks, and rest breaks.`;
    } else {
      message += `What would you like to accomplish today? `;
      message += `Tell me your tasks, and I'll create a balanced plan with light tasks, survival tasks, and rest breaks.`;
    }

    // 4. Append upcoming event nudges (exclude today's event if already mentioned)
    const eventsToMention = todayEvent
      ? upcomingEvents.filter((e) => e.dateStr !== todayEvent.dateStr)
      : upcomingEvents;

    if (eventsToMention.length > 0) {
      // Pick the soonest upcoming event
      const nextEvent = eventsToMention[0];
      message += ' ' + buildEventMorningMessage(nextEvent, now);
    }
    
    setRivaResponse({ message, action: 'prompt_daily_plan' });
    
    // Only speak if this was manually triggered, or if the user has already interacted.
    // To be safe on auto-load, we just show the visually card.
    if (!isAutoLoad) {
      speak(message);
    }
    
    return message;
  }, [dailyPlanPrompted, getUnfinishedTasks, userName, speak]);

  // Create a balanced daily plan
  const createBalancedPlan = useCallback(async (userTasks: any[]) => {
    const todayKey = getLocalDateKey();
    const unfinishedPrevious = await getUnfinishedTasks();
    
    // Create tasks from user input
    const lightTasks: any[] = [];
    const survivalTasks: any[] = [];
    const otherTasks: any[] = [];
    
    // Simple categorization based on keywords
    userTasks.forEach(task => {
      const lower = task.title.toLowerCase();
      if (lower.includes('break') || lower.includes('rest') || lower.includes('walk') || lower.includes('stretch')) {
        lightTasks.push(task);
      } else if (lower.includes('urgent') || lower.includes('important') || lower.includes('deadline') || lower.includes('meeting')) {
        survivalTasks.push(task);
      } else {
        otherTasks.push(task);
      }
    });
    
    // Add previous unfinished tasks to the appropriate category
    unfinishedPrevious.forEach(t => {
      otherTasks.push(t);
    });
    
    // Create the plan message
    let message = "Here's your balanced plan for today:\n\n";
    
    if (survivalTasks.length > 0) {
      message += "SURVIVAL (Important/Urgent):\n";
      survivalTasks.forEach((t, i) => message += `${i + 1}. ${t.title}\n`);
      message += "\n";
    }

    if (otherTasks.length > 0) {
      message += "OTHER TASKS:\n";
      otherTasks.forEach((t, i) => message += `${survivalTasks.length + i + 1}. ${t.title}\n`);
      message += "\n";
    }

    if (lightTasks.length > 0) {
      message += "LIGHT TASKS (Breaks/Rest):\n";
      lightTasks.forEach((t, i) => message += `${survivalTasks.length + otherTasks.length + i + 1}. ${t.title}\n`);
    }

    message += "\nPro tip: Start with survival tasks when your energy is highest, then take light breaks between focused work!";

    // Estimate task duration
    const estimateTaskDuration = (title: string) => {
      const words = title.split(' ').length;
      if (words <= 3) return 15;
      if (words <= 6) return 30;
      return 60;
    };

    let currentTimeInMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    let currentSlotMin = Math.max(currentTimeInMinutes, 9 * 60);

    for (const task of survivalTasks) {
      const estimatedMin = estimateTaskDuration(task.title);
      const startH = Math.floor(currentSlotMin / 60).toString().padStart(2, '0');
      const startM = (currentSlotMin % 60).toString().padStart(2, '0');
      const slot = `${startH}:${startM}`;

      const endMin = currentSlotMin + estimatedMin;
      const endH = Math.floor(endMin % (24 * 60) / 60).toString().padStart(2, '0');
      const endM = (endMin % 60).toString().padStart(2, '0');
      const endTimeStr = `${endH}:${endM}`;

      await addBlock({
        title: task.title,
        startTime: slot,
        endTime: endTimeStr,
        dateKey: todayKey,
        color: 'rose',
        status: 'planned',
        tasks: [task.id],
        ...( { duration: estimatedMin, tag: task.tag } as any )
      });

      currentSlotMin += estimatedMin;
    }
    
    setRivaResponse({ message, action: 'daily_plan_created' });
    speak(message);
    
    return message;
  }, [getUnfinishedTasks, speak, addBlock]);

  // Trigger daily plan check when app loads
  const checkAndPromptDailyPlan = useCallback(async () => {
    // Wait for tasks to load
    setTimeout(async () => {
      if (shouldPromptDailyPlan()) {
        await promptDailyPlan(true); // pass true for auto-load to prevent speech crash
      }
    }, 2000); // Wait 2 seconds after app loads
  }, [shouldPromptDailyPlan, promptDailyPlan]);

  return {
    isListening,
    isProcessing,
    isAISpeaking,
    isGeminiConnected,
    transcript,
    interimTranscript,
    rivaResponse,
    isCommandBarOpen,
    setIsCommandBarOpen,
    startListening: startSession,
    stopListening: endSession,
    stopPlayback,
    processTranscript,
    playMorningBriefing,
    error,
    isSupported,
    credits,
    refreshCredits: fetchCredits,
    learningPathIdToShow,
    clearLearningPathToShow: () => setLearningPathIdToShow(null),
    checkAndPromptDailyPlan,
    promptDailyPlan,
    createBalancedPlan,
    shoppingItems,
    shoppingListOpen,
    setShoppingListOpen,
    addShoppingItem,
    removeShoppingByText,
    clearShoppingList,
  };
}
