import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface ScheduledReminder {
  id: string;
  entryId: string;
  date: string;
  fireAt: Date;
  title: string;
  body: string;
}

export interface ReminderSettings {
  enabled: boolean;
  preferPush: boolean;
  quietHoursStart: string | null; // HH:MM
  quietHoursEnd: string | null;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  preferPush: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [settings, setSettings] = useLocalStorage<ReminderSettings>('reminder-settings', DEFAULT_SETTINGS);
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>([]);
  const [activeReminder, setActiveReminder] = useState<ScheduledReminder | null>(null);
  const [snoozedUntil, setSnoozedUntil] = useState<Date | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check notification support and permission
  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as NotificationPermissionState);
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result as NotificationPermissionState;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, []);

  // Check if current time is in quiet hours
  const isInQuietHours = useCallback((): boolean => {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
    const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }, [settings.quietHoursStart, settings.quietHoursEnd]);

  // Schedule a reminder
  const scheduleReminder = useCallback((
    entryId: string,
    date: string,
    startTime: string,
    reminderMinutes: number,
    title: string
  ): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const fireAt = new Date(date);
    fireAt.setHours(hours, minutes - reminderMinutes, 0, 0);

    const id = `${entryId}-${date}`;

    const reminder: ScheduledReminder = {
      id,
      entryId,
      date,
      fireAt,
      title,
      body: `Starting in ${reminderMinutes} minutes`,
    };

    setScheduledReminders(prev => {
      // Remove existing reminder for same entry+date
      const filtered = prev.filter(r => r.id !== id);
      return [...filtered, reminder];
    });

    return id;
  }, []);

  // Cancel a specific reminder
  const cancelReminder = useCallback((id: string) => {
    setScheduledReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  // Cancel all reminders for an entry
  const cancelEntryReminders = useCallback((entryId: string) => {
    setScheduledReminders(prev => prev.filter(r => r.entryId !== entryId));
  }, []);

  // Show push notification
  const showPushNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permission !== 'granted') return false;

    try {
      new Notification(title, {
        body,
        icon: icon || '/icon-512.png',
        tag: 'app-reminder',
      });
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [permission]);

  // Snooze current reminder
  const snoozeReminder = useCallback((minutes: number = 5) => {
    const until = new Date();
    until.setMinutes(until.getMinutes() + minutes);
    setSnoozedUntil(until);
    setActiveReminder(null);
  }, []);

  // Dismiss current reminder
  const dismissReminder = useCallback(() => {
    if (activeReminder) {
      setScheduledReminders(prev => prev.filter(r => r.id !== activeReminder.id));
    }
    setActiveReminder(null);
  }, [activeReminder]);

  // Check for due reminders
  useEffect(() => {
    if (!settings.enabled) return;

    const checkReminders = () => {
      const now = new Date();

      // Skip if in quiet hours
      if (isInQuietHours()) return;

      // Skip if snoozed
      if (snoozedUntil && now < snoozedUntil) return;

      // Check for reminders that are due (within 1 minute window)
      for (const reminder of scheduledReminders) {
        const diff = now.getTime() - reminder.fireAt.getTime();
        
        // Fire if within 0-60 seconds of scheduled time
        if (diff >= 0 && diff < 60000) {
          // Try push notification first
          if (settings.preferPush && permission === 'granted') {
            showPushNotification(reminder.title, reminder.body);
          }
          
          // Always show in-app banner
          setActiveReminder(reminder);
          break;
        }
      }
    };

    // Check every 10 seconds
    checkIntervalRef.current = setInterval(checkReminders, 10000);
    checkReminders(); // Initial check

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [settings.enabled, settings.preferPush, permission, scheduledReminders, snoozedUntil, isInQuietHours, showPushNotification]);

  // Update settings
  const updateSettings = useCallback((updates: Partial<ReminderSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, [setSettings]);

  return {
    permission,
    settings,
    activeReminder,
    requestPermission,
    scheduleReminder,
    cancelReminder,
    cancelEntryReminders,
    snoozeReminder,
    dismissReminder,
    updateSettings,
    isInQuietHours,
    canUsePush: permission === 'granted',
  };
}
