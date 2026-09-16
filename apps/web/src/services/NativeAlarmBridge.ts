/**
 * NativeAlarmBridge - Interface for native alarm scheduling
 * 
 * In a web-only environment, this provides stubs that show appropriate
 * warnings to users. When running in a Capacitor wrapper, the native
 * layer implements window.NativeAlarm to schedule real OS-level alarms.
 */

import { Alarm } from '@/types/sleep';

export interface NativeAlarmInterface {
  schedule(alarm: Alarm): Promise<boolean>;
  cancel(alarmId: string): Promise<boolean>;
  list(): Promise<Alarm[]>;
  isAvailable(): boolean;
}

// Extend window type for native bridge
declare global {
  interface Window {
    NativeAlarm?: NativeAlarmInterface;
  }
}

/**
 * Check if native alarm support is available
 */
export function isNativeAlarmAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Explicitly check for Capacitor container to avoid false positives on web
  // @ts-ignore
  const isCapacitorNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  
  return !!(isCapacitorNative && 
         window.NativeAlarm && 
         typeof window.NativeAlarm.schedule === 'function');
}

/**
 * Schedule an alarm
 * Returns true if scheduled successfully (native). Alarms are only supported in native apps.
 */
export async function scheduleAlarm(alarm: Alarm): Promise<{ success: boolean; message: string }> {
  if (isNativeAlarmAvailable()) {
    try {
      const success = await window.NativeAlarm!.schedule(alarm);
      return {
        success,
        message: success ? 'Alarm scheduled' : 'Failed to schedule alarm',
      };
    } catch (error) {
      console.error('[NativeAlarmBridge] Schedule error:', error);
      return {
        success: false,
        message: 'Failed to schedule alarm',
      };
    }
  }

  // No web fallback
  return {
    success: false,
    message: 'Alarms are only available in the Rivly mobile app.',
  };
}

/**
 * Cancel a scheduled alarm
 */
export async function cancelAlarm(alarmId: string): Promise<boolean> {
  if (isNativeAlarmAvailable()) {
    try {
      return await window.NativeAlarm!.cancel(alarmId);
    } catch (error) {
      console.error('[NativeAlarmBridge] Cancel error:', error);
      return false;
    }
  }
  return true; // Web only stores locally, so "canceling" is just removing from storage
}

/**
 * List all scheduled native alarms
 */
export async function listNativeAlarms(): Promise<Alarm[]> {
  if (isNativeAlarmAvailable()) {
    try {
      return await window.NativeAlarm!.list();
    } catch (error) {
      console.error('[NativeAlarmBridge] List error:', error);
      return [];
    }
  }
  return [];
}

/**
 * Get ICS calendar event string for alarm (export to phone calendar)
 */
export function generateAlarmICS(alarm: Alarm): string {
  const now = new Date();
  const [hours, minutes] = alarm.time.split(':').map(Number);
  
  // Set alarm for tomorrow if time has passed today
  const alarmDate = new Date();
  alarmDate.setHours(hours, minutes, 0, 0);
  if (alarmDate <= now) {
    alarmDate.setDate(alarmDate.getDate() + 1);
  }

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startDate = formatICSDate(alarmDate);
  const endDate = formatICSDate(new Date(alarmDate.getTime() + 5 * 60 * 1000)); // 5 min duration
  const uid = `alarm-${alarm.id}@rivly.in`;
  const label = alarm.label || 'Alarm';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Rivly//Alarm//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatICSDate(now)}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:⏰ ${label}
DESCRIPTION:Wake up! ${alarm.type === 'gentle' ? '(Gentle wake)' : ''}
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:AUDIO
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

/**
 * Download ICS file for alarm
 */
export function downloadAlarmICS(alarm: Alarm): void {
  const ics = generateAlarmICS(alarm);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `alarm-${alarm.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


/**
 * Alarm sound player for web testing
 */
class AlarmSoundPlayer {
  private audio: HTMLAudioElement | null = null;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;

  private getSoundUrl(soundId: string): string {
    // Map alarm sounds to available audio files
    const soundMap: Record<string, string> = {
      'morning-breeze': '/audio/forest.mp3',
      'soft-chime': '/audio/rain.mp3',
      'gentle-bells': '/audio/ocean.mp3',
      'dawn-chorus': '/audio/forest.mp3',
      'classic-alarm': '/audio/rain.mp3',
      'bright-tone': '/audio/ocean.mp3',
      'digital-beep': '/audio/mountains.mp3',
    };
    return soundMap[soundId] || '/audio/forest.mp3';
  }

  async play(soundId: string, fadeInSeconds: number = 0): Promise<void> {
    this.stop();
    
    this.audio = new Audio(this.getSoundUrl(soundId));
    this.audio.loop = true;

    if (fadeInSeconds > 0) {
      this.audio.volume = 0;
      try {
        await this.audio.play();
      } catch (e) {
        console.error('[AlarmSound] Autoplay blocked:', e);
        return;
      }
      
      // Fade in
      const steps = 20;
      const stepTime = (fadeInSeconds * 1000) / steps;
      let step = 0;
      
      this.fadeInterval = setInterval(() => {
        step++;
        if (this.audio) {
          this.audio.volume = Math.min(1, step / steps);
        }
        if (step >= steps && this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
      }, stepTime);
    } else {
      this.audio.volume = 1;
      try {
        await this.audio.play();
      } catch (e) {
        console.error('[AlarmSound] Autoplay blocked:', e);
      }
    }
  }

  stop(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
  }

  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }
}

export const alarmSoundPlayer = new AlarmSoundPlayer();
