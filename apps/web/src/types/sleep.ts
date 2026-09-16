// Sleep Mode Types

export type WakeIntent = 'calm' | 'energized' | 'focused' | 'gentle';
export type SleepQuality = 'poor' | 'okay' | 'good';
export type SleepHelper = 'sounds' | 'winddown' | 'parking' | 'early' | 'unsure';

export interface SleepEntry {
  date: string;
  windDownUsed: boolean;
  windDownCompleted: boolean;
  ritual?: {
    didWell?: string;
    handleTomorrow?: string;
    gratefulFor?: string;
  };
  nightDumpText?: string;
  remindTomorrow: boolean;
  reminderTime?: string;
  sleepQuality?: SleepQuality;
  sleepHelper?: SleepHelper;
  wakeIntent?: WakeIntent;
}

export type SoundCategory = 'forest' | 'rain' | 'ocean' | 'mountains' | 'night' | 'noise';

export interface SoundOption {
  id: string;
  name: string;
  category: SoundCategory;
  icon: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'forest-breeze', name: 'Forest Breeze', category: 'forest', icon: '🌲' },
  { id: 'light-rain', name: 'Light Rain', category: 'rain', icon: '🌧️' },
  { id: 'ocean-waves', name: 'Ocean Waves', category: 'ocean', icon: '🌊' },
  { id: 'mountain-wind', name: 'Mountain Wind', category: 'mountains', icon: '🏔️' },
  { id: 'night-crickets', name: 'Night Crickets', category: 'night', icon: '🌙' },
  { id: 'white-noise', name: 'White Noise', category: 'noise', icon: '📻' },
  { id: 'brown-noise', name: 'Brown Noise', category: 'noise', icon: '📢' },
];

export interface SoundPlaybackState {
  selectedSound: string | null;
  isPlaying: boolean;
  volume: number;
  sleepTimerMinutes: number | null;
  autoFade: boolean;
}

export type AlarmType = 'gentle' | 'regular' | 'focus';
export type AlarmRepeat = 'once' | 'daily' | 'weekdays' | 'custom';

export interface Alarm {
  id: string;
  time: string;
  label?: string;
  type: AlarmType;
  repeat: AlarmRepeat;
  customDays?: number[]; // 0-6 for Sun-Sat
  sound: string;
  fadeInSeconds: number;
  snoozeMinutes: number;
  enabled: boolean;
  vibration?: boolean;
}

// Days of week for repeat selector
export const DAYS_OF_WEEK = [
  { id: 0, label: 'Sun', short: 'S' },
  { id: 1, label: 'Mon', short: 'M' },
  { id: 2, label: 'Tue', short: 'T' },
  { id: 3, label: 'Wed', short: 'W' },
  { id: 4, label: 'Thu', short: 'T' },
  { id: 5, label: 'Fri', short: 'F' },
  { id: 6, label: 'Sat', short: 'S' },
];

export interface SleepPreferences {
  windDownScheduleEnabled: boolean;
  windDownTime: string;
  morningBridgeEnabled: boolean;
  selectedSoundCategory: SoundCategory;
}

export const GENTLE_SOUNDS = [
  { id: 'morning-breeze', name: 'Morning Breeze' },
  { id: 'soft-chime', name: 'Soft Chime' },
  { id: 'gentle-bells', name: 'Gentle Bells' },
  { id: 'dawn-chorus', name: 'Dawn Chorus' },
];

export const REGULAR_SOUNDS = [
  { id: 'classic-alarm', name: 'Classic Alarm' },
  { id: 'bright-tone', name: 'Bright Tone' },
  { id: 'digital-beep', name: 'Digital Beep' },
];

export const TIMER_OPTIONS = [
  { value: null, label: 'Off' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];
