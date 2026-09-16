/**
 * Hook for managing user-configurable audio URLs
 * Provides getters and setters for sleep sound URLs stored in localStorage
 */

import { useState, useCallback, useEffect } from 'react';

export interface AudioUrlConfig {
  forest: string;
  rain: string;
  ocean: string;
  mountains: string;
  night: string;
  whiteNoise: string;
  brownNoise: string;
}

const URL_KEYS = {
  forest: 'dailyRhythm_audioUrl_forest',
  rain: 'dailyRhythm_audioUrl_rain',
  ocean: 'dailyRhythm_audioUrl_ocean',
  mountains: 'dailyRhythm_audioUrl_mountains',
  night: 'dailyRhythm_audioUrl_night',
  whiteNoise: 'dailyRhythm_audioUrl_white_noise',
  brownNoise: 'dailyRhythm_audioUrl_brown_noise',
} as const;

export type AudioUrlKey = keyof typeof URL_KEYS;

export const AUDIO_URL_LABELS: Record<AudioUrlKey, string> = {
  forest: 'Forest',
  rain: 'Rain',
  ocean: 'Ocean',
  mountains: 'Mountains',
  night: 'Night',
  whiteNoise: 'White Noise',
  brownNoise: 'Brown Noise',
};

function loadUrls(): AudioUrlConfig {
  return {
    forest: localStorage.getItem(URL_KEYS.forest) || '',
    rain: localStorage.getItem(URL_KEYS.rain) || '',
    ocean: localStorage.getItem(URL_KEYS.ocean) || '',
    mountains: localStorage.getItem(URL_KEYS.mountains) || '',
    night: localStorage.getItem(URL_KEYS.night) || '',
    whiteNoise: localStorage.getItem(URL_KEYS.whiteNoise) || '',
    brownNoise: localStorage.getItem(URL_KEYS.brownNoise) || '',
  };
}

export function useAudioUrls() {
  const [urls, setUrls] = useState<AudioUrlConfig>(loadUrls);

  // Reload from localStorage on mount
  useEffect(() => {
    setUrls(loadUrls());
  }, []);

  const updateUrl = useCallback((key: AudioUrlKey, url: string) => {
    const storageKey = URL_KEYS[key];
    const trimmedUrl = url.trim();
    localStorage.setItem(storageKey, trimmedUrl);
    setUrls(prev => ({ ...prev, [key]: trimmedUrl }));
  }, []);

  const isValidUrl = useCallback((url: string): boolean => {
    if (!url || url.trim() === '') return false;
    if (url.includes('<') || url.includes('>')) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }, []);

  const getConfiguredCount = useCallback((): number => {
    return Object.values(urls).filter(url => isValidUrl(url)).length;
  }, [urls, isValidUrl]);

  return {
    urls,
    updateUrl,
    isValidUrl,
    getConfiguredCount,
    totalSounds: Object.keys(URL_KEYS).length,
  };
}
