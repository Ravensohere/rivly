// Morning Bridge hook - manages settings and daily state
// Uses Supabase if logged in, localStorage fallback otherwise

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getLocalDateKey } from '@/lib/dateUtils';
import {
  MorningBridgeSettings,
  MorningBridgeDayState,
  MorningBridgeAction,
  DEFAULT_MORNING_BRIDGE_SETTINGS,
  MAX_ACTIONS,
} from '@/types/morningBridge';

const SETTINGS_KEY = 'morning_bridge_settings_v1';
const DAY_STATE_KEY_PREFIX = 'morning_bridge_day_state_v1:';

export function useMorningBridge() {
  const { user } = useAuthContext();
  const [settings, setSettings] = useState<MorningBridgeSettings>(DEFAULT_MORNING_BRIDGE_SETTINGS);
  const [dayState, setDayState] = useState<MorningBridgeDayState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const today = getLocalDateKey(new Date());

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        if (user) {
          // Try Supabase first
          const { data, error } = await supabase
            .from('morning_bridge_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data && !error) {
            // Parse actions from Supabase steps table
            const { data: steps } = await supabase
              .from('morning_bridge_steps')
              .select('*')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .order('sort_order', { ascending: true })
              .limit(MAX_ACTIONS);
            
            const actions: MorningBridgeAction[] = (steps || []).map(step => ({
              id: step.id,
              title: step.title,
              subtitle: step.subtitle || undefined,
              iconKey: (step.action_kind === 'none' ? 'sparkles' : step.action_kind) as any,
              durationMins: step.duration_minutes,
              isCustom: step.step_type === 'custom',
            }));
            
            setSettings({
              enabled: data.is_enabled,
              wakeTime: data.window_start?.slice(0, 5) || '07:00',
              actions: actions.length > 0 ? actions : DEFAULT_MORNING_BRIDGE_SETTINGS.actions,
            });
          } else {
            // No Supabase data, try localStorage
            loadFromLocalStorage();
          }
        } else {
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('[MorningBridge] Error loading settings:', error);
        loadFromLocalStorage();
      }
      setIsLoading(false);
    }

    function loadFromLocalStorage() {
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch {
        // Use defaults
      }
    }

    loadSettings();
  }, [user]);

  // Load day state
  useEffect(() => {
    function loadDayState() {
      try {
        const stored = localStorage.getItem(DAY_STATE_KEY_PREFIX + today);
        if (stored) {
          setDayState(JSON.parse(stored));
        } else {
          setDayState({
            dayKey: today,
            doneActionIds: [],
            skippedActionIds: [],
          });
        }
      } catch {
        setDayState({
          dayKey: today,
          doneActionIds: [],
          skippedActionIds: [],
        });
      }
    }
    loadDayState();
  }, [today]);

  // Save settings
  const saveSettings = useCallback(async (newSettings: MorningBridgeSettings) => {
    setSettings(newSettings);
    
    // Always save to localStorage
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {}

    // Save to Supabase if logged in
    if (user) {
      try {
        // Upsert settings
        await supabase
          .from('morning_bridge_settings')
          .upsert({
            user_id: user.id,
            is_enabled: newSettings.enabled,
            window_start: newSettings.wakeTime + ':00',
            window_end: calculateWindowEnd(newSettings.wakeTime),
          }, { onConflict: 'user_id' });

        // Update steps - delete old and insert new
        await supabase
          .from('morning_bridge_steps')
          .delete()
          .eq('user_id', user.id);

        if (newSettings.actions.length > 0) {
          await supabase
            .from('morning_bridge_steps')
            .insert(
              newSettings.actions.map((action, index) => ({
                user_id: user.id,
                title: action.title,
                subtitle: action.subtitle || null,
                step_type: action.isCustom ? 'custom' : 'suggested',
                duration_minutes: action.durationMins || 2,
                action_kind: 'none',
                sort_order: index,
                is_active: true,
              }))
            );
        }
      } catch (error) {
        console.error('[MorningBridge] Error saving to Supabase:', error);
      }
    }
  }, [user]);

  // Toggle enabled
  const toggleEnabled = useCallback((enabled: boolean) => {
    saveSettings({ ...settings, enabled });
  }, [settings, saveSettings]);

  // Update wake time
  const setWakeTime = useCallback((wakeTime: string) => {
    saveSettings({ ...settings, wakeTime });
  }, [settings, saveSettings]);

  // Add action
  const addAction = useCallback((action: MorningBridgeAction) => {
    if (settings.actions.length >= MAX_ACTIONS) return false;
    const newAction = { ...action, id: action.id || crypto.randomUUID() };
    saveSettings({ ...settings, actions: [...settings.actions, newAction] });
    return true;
  }, [settings, saveSettings]);

  // Remove action
  const removeAction = useCallback((actionId: string) => {
    saveSettings({
      ...settings,
      actions: settings.actions.filter(a => a.id !== actionId),
    });
  }, [settings, saveSettings]);

  // Update action
  const updateAction = useCallback((actionId: string, updates: Partial<MorningBridgeAction>) => {
    saveSettings({
      ...settings,
      actions: settings.actions.map(a =>
        a.id === actionId ? { ...a, ...updates } : a
      ),
    });
  }, [settings, saveSettings]);

  // Mark action done
  const markActionDone = useCallback((actionId: string) => {
    const newState: MorningBridgeDayState = {
      ...dayState!,
      doneActionIds: [...(dayState?.doneActionIds || []), actionId],
    };
    setDayState(newState);
    try {
      localStorage.setItem(DAY_STATE_KEY_PREFIX + today, JSON.stringify(newState));
    } catch {}
  }, [dayState, today]);

  // Skip action
  const skipAction = useCallback((actionId: string) => {
    const newState: MorningBridgeDayState = {
      ...dayState!,
      skippedActionIds: [...(dayState?.skippedActionIds || []), actionId],
    };
    setDayState(newState);
    try {
      localStorage.setItem(DAY_STATE_KEY_PREFIX + today, JSON.stringify(newState));
    } catch {}
  }, [dayState, today]);

  // Mark shown
  const markShown = useCallback(() => {
    if (dayState?.shownAt) return; // Already shown today
    const newState: MorningBridgeDayState = {
      ...dayState!,
      shownAt: new Date().toISOString(),
    };
    setDayState(newState);
    try {
      localStorage.setItem(DAY_STATE_KEY_PREFIX + today, JSON.stringify(newState));
    } catch {}
  }, [dayState, today]);

  // Get next pending action
  const nextPendingAction = useMemo(() => {
    if (!dayState) return null;
    const processedIds = [...dayState.doneActionIds, ...dayState.skippedActionIds];
    return settings.actions.find(a => !processedIds.includes(a.id)) || null;
  }, [settings.actions, dayState]);

  // Check if all actions are done for today
  const allActionsDone = useMemo(() => {
    if (!dayState) return false;
    return settings.actions.every(a =>
      dayState.doneActionIds.includes(a.id) || dayState.skippedActionIds.includes(a.id)
    );
  }, [settings.actions, dayState]);

  // Check if we're in the wake window
  const isInWakeWindow = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentMinutes = hour * 60 + minute;

    const [wakeHour, wakeMin] = settings.wakeTime.split(':').map(Number);
    const wakeMinutes = wakeHour * 60 + wakeMin;
    const windowEndMinutes = wakeMinutes + 3 * 60; // 3 hour window

    // Also allow morning window fallback (4am - 12pm)
    const morningStart = 4 * 60;
    const morningEnd = 12 * 60;

    // If wake time is set and we're in the window
    if (currentMinutes >= wakeMinutes && currentMinutes <= windowEndMinutes) {
      return true;
    }

    // Fallback: if in morning hours
    if (currentMinutes >= morningStart && currentMinutes <= morningEnd) {
      return true;
    }

    return false;
  }, [settings.wakeTime]);

  // Should show Morning Bridge
  const shouldShow = useMemo(() => {
    if (!settings.enabled) return false;
    if (!isInWakeWindow) return false;
    if (allActionsDone) return false;
    return true;
  }, [settings.enabled, isInWakeWindow, allActionsDone]);

  return {
    // State
    settings,
    dayState,
    isLoading,
    
    // Computed
    nextPendingAction,
    allActionsDone,
    isInWakeWindow,
    shouldShow,
    
    // Settings actions
    toggleEnabled,
    setWakeTime,
    saveSettings,
    addAction,
    removeAction,
    updateAction,
    
    // Day actions
    markActionDone,
    skipAction,
    markShown,
  };
}

// Helper to calculate window end (3 hours after wake time)
function calculateWindowEnd(wakeTime: string): string {
  const [hour, min] = wakeTime.split(':').map(Number);
  const endHour = (hour + 3) % 24;
  return `${String(endHour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}
