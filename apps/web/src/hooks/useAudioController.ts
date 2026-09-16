/**
 * React hook for the AudioController singleton
 * Provides reactive state and convenient methods
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  AudioController, 
  AudioControllerState, 
  getSoundConfig,
  isSoundConfigured,
  TIMER_OPTIONS,
} from '@/services/AudioController';

export function useAudioController() {
  const [state, setState] = useState<AudioControllerState>(() => AudioController.getState());

  useEffect(() => {
    const unsubscribe = AudioController.subscribe(setState);
    return unsubscribe;
  }, []);

  const selectTrack = useCallback(async (trackId: string) => {
    await AudioController.selectTrack(trackId);
  }, []);

  const togglePlayPause = useCallback(async () => {
    await AudioController.togglePlayPause();
  }, []);

  const setVolume = useCallback((volume: number) => {
    AudioController.setVolume(volume);
  }, []);

  const setTimer = useCallback((minutes: number | null) => {
    AudioController.setTimer(minutes);
  }, []);

  const setAutoFade = useCallback((enabled: boolean) => {
    AudioController.setAutoFade(enabled);
  }, []);

  const toggleFavorite = useCallback((trackId: string) => {
    AudioController.toggleFavorite(trackId);
  }, []);

  const stop = useCallback(() => {
    AudioController.stop();
  }, []);

  // Derived state
  const currentTrack = state.trackId ? getSoundConfig(state.trackId) : null;
  const isPlaying = state.state === 'playing';
  const isPaused = state.state === 'paused';
  const isReady = state.state === 'ready';
  const isLoading = state.state === 'loading';
  const hasError = state.state === 'error';
  const timeRemaining = AudioController.formatTimeRemaining();

  return {
    // State
    trackId: state.trackId,
    currentTrack,
    audioState: state.state,
    isPlaying,
    isPaused,
    isReady,
    isLoading,
    hasError,
    volume: state.volume,
    timerMinutes: state.timerMinutes,
    timerRemaining: state.timerRemaining,
    timeRemaining,
    autoFade: state.autoFade,
    error: state.error,
    favorites: state.favorites,
    recents: state.recents,

    // Actions
    selectTrack,
    togglePlayPause,
    setVolume,
    setTimer,
    setAutoFade,
    toggleFavorite,
    stop,
    
    // Helpers
    isFavorite: (trackId: string) => state.favorites.includes(trackId),
    isConfigured: isSoundConfigured,
    timerOptions: TIMER_OPTIONS,
  };
}
