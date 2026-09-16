// Winddown Types

export type WinddownSoundPack = 'calm' | 'energized' | 'focused' | 'gentle';

export interface WinddownSound {
  id: string;
  name: string;
  pack: WinddownSoundPack;
  icon: string;
  audioUrl?: string;
}

export interface WinddownSession {
  id: string;
  date: string; // YYYY-MM-DD
  startedAt: string; // ISO timestamp
  endedAt?: string; // ISO timestamp
  durationMinutes: number;
  soundPack: WinddownSoundPack;
  soundId: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface WinddownPreferences {
  defaultDuration: number;
  defaultSoundPack: WinddownSoundPack;
  scheduledTime?: string; // HH:mm
  scheduleEnabled: boolean;
}

// Sound definitions for each pack
export const WINDDOWN_SOUNDS: WinddownSound[] = [
  // Calm pack - slow, peaceful
  { id: 'calm-rain', name: 'Gentle Rain', pack: 'calm', icon: '🌧️', audioUrl: '/audio/rain.mp3' },
  { id: 'calm-ocean', name: 'Ocean Waves', pack: 'calm', icon: '🌊', audioUrl: '/audio/ocean.mp3' },
  { id: 'calm-forest', name: 'Forest Breeze', pack: 'calm', icon: '🌲', audioUrl: '/audio/forest.mp3' },
  
  // Energized pack - uplifting nature
  { id: 'energized-birds', name: 'Morning Birds', pack: 'energized', icon: '🐦', audioUrl: '/audio/forest.mp3' },
  { id: 'energized-stream', name: 'Flowing Stream', pack: 'energized', icon: '💧', audioUrl: '/audio/mountains.mp3' },
  { id: 'energized-meadow', name: 'Sunny Meadow', pack: 'energized', icon: '🌻', audioUrl: '/audio/ocean.mp3' },
  
  // Focused pack - ambient noise
  { id: 'focused-brown', name: 'Brown Noise', pack: 'focused', icon: '📢', audioUrl: '/audio/brown-noise.mp3' },
  { id: 'focused-white', name: 'White Noise', pack: 'focused', icon: '📻', audioUrl: '/audio/brown-noise.mp3' },
  { id: 'focused-pink', name: 'Pink Noise', pack: 'focused', icon: '🔊', audioUrl: '/audio/rain.mp3' },
  
  // Gentle pack - nighttime
  { id: 'gentle-crickets', name: 'Night Crickets', pack: 'gentle', icon: '🌙', audioUrl: '/audio/night-crickets.mp3' },
  { id: 'gentle-wind', name: 'Soft Wind', pack: 'gentle', icon: '🍃', audioUrl: '/audio/mountains.mp3' },
  { id: 'gentle-rain', name: 'Light Rain', pack: 'gentle', icon: '☔', audioUrl: '/audio/rain.mp3' },
];

export const WINDDOWN_DURATIONS = [5, 10, 15, 20] as const;

export const SOUND_PACK_INFO: Record<WinddownSoundPack, { label: string; icon: string; description: string }> = {
  calm: { label: 'Calm', icon: '🌿', description: 'Peaceful natural sounds' },
  energized: { label: 'Energized', icon: '⚡', description: 'Uplifting morning sounds' },
  focused: { label: 'Focused', icon: '🎯', description: 'Ambient noise for focus' },
  gentle: { label: 'Gentle', icon: '🌙', description: 'Soft nighttime sounds' },
};

export function getSoundsForPack(pack: WinddownSoundPack): WinddownSound[] {
  return WINDDOWN_SOUNDS.filter(s => s.pack === pack);
}

export function getSoundById(id: string): WinddownSound | undefined {
  return WINDDOWN_SOUNDS.find(s => s.id === id);
}
