/**
 * AudioController - Premium singleton service for sleep sounds
 * 
 * FEATURES:
 * - Single audio instance (no duplicates)
 * - Crossfade between track switches
 * - Favorites and recents management
 * - Background-safe timestamp-based timer
 * - Auto-fade before timer ends
 * - User-friendly error handling
 */

export type AudioState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export interface AudioControllerState {
  trackId: string | null;
  state: AudioState;
  volume: number; // 0-100
  timerMinutes: number | null;
  timerRemaining: number | null; // seconds (computed from endsAt)
  timerEndsAt: number | null; // timestamp when timer should end
  timerPausedRemaining: number | null; // remaining seconds when paused
  autoFade: boolean;
  error: string | null;
  favorites: string[];
  recents: string[];
}

type StateListener = (state: AudioControllerState) => void;

// Sound library configuration
export interface SoundConfig {
  id: string;
  name: string;
  category: 'nature' | 'noise' | 'night';
  icon: string;
  description: string;
}

// Default URLs for bundled audio files
const DEFAULT_AUDIO_URLS: Record<string, string> = {
  'forest-breeze': '/audio/forest.mp3',
  'light-rain': '/audio/rain.mp3',
  'ocean-waves': '/audio/ocean.mp3',
  'mountain-wind': '/audio/mountains.mp3',
  'night-crickets': '/audio/night-crickets.mp3',
  'brown-noise': '/audio/brown-noise.mp3',
};

const SOUND_LIBRARY: SoundConfig[] = [
  { id: 'forest-breeze', name: 'Forest Breeze', category: 'nature', icon: '🌲', description: 'Gentle birds and rustling leaves' },
  { id: 'light-rain', name: 'Light Rain', category: 'nature', icon: '🌧️', description: 'Soft raindrops on window' },
  { id: 'ocean-waves', name: 'Ocean Waves', category: 'nature', icon: '🌊', description: 'Rhythmic ocean surf' },
  { id: 'mountain-wind', name: 'Mountain Wind', category: 'nature', icon: '🏔️', description: 'High altitude breeze' },
  { id: 'night-crickets', name: 'Night Crickets', category: 'night', icon: '🌙', description: 'Summer night ambience' },
  { id: 'white-noise', name: 'White Noise', category: 'noise', icon: '📻', description: 'Constant static hum' },
  { id: 'brown-noise', name: 'Brown Noise', category: 'noise', icon: '📢', description: 'Deep rumbling texture' },
];

// Get sound config by ID
export function getSoundConfig(soundId: string): SoundConfig | undefined {
  return SOUND_LIBRARY.find(s => s.id === soundId);
}

// Get all sounds
export function getAllSounds(): SoundConfig[] {
  return SOUND_LIBRARY;
}

// Get sounds by category
export function getSoundsByCategory(category: 'nature' | 'noise' | 'night'): SoundConfig[] {
  return SOUND_LIBRARY.filter(s => s.category === category);
}

// Get URL for a sound - check localStorage first, then fall back to defaults
function getSoundUrl(soundId: string): string | null {
  const customUrlKey = `dailyRhythm_audioUrl_${soundId}`;
  const customUrl = localStorage.getItem(customUrlKey);
  
  if (customUrl && customUrl.trim() !== '' && !customUrl.includes('<') && !customUrl.includes('>')) {
    return customUrl.trim();
  }
  
  return DEFAULT_AUDIO_URLS[soundId] || null;
}

// Check if a sound is configured (has URL)
export function isSoundConfigured(soundId: string): boolean {
  return getSoundUrl(soundId) !== null;
}

// Timer options
export const TIMER_OPTIONS = [
  { value: null, label: 'Off' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '60m' },
];

const MAX_RECENTS = 5;
const CROSSFADE_DURATION = 600; // ms
const UI_REFRESH_INTERVAL = 500; // ms for timer UI updates

class AudioControllerClass {
  private audio: HTMLAudioElement | null = null;
  private fadeAudio: HTMLAudioElement | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<StateListener> = new Set();
  
  private state: AudioControllerState = {
    trackId: null,
    state: 'idle',
    volume: 70,
    timerMinutes: null,
    timerRemaining: null,
    timerEndsAt: null,
    timerPausedRemaining: null,
    autoFade: true,
    error: null,
    favorites: [],
    recents: [],
  };

  constructor() {
    this.loadPersistedState();
    this.setupVisibilityListener();
  }

  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.syncTimerState();
      });
      
      window.addEventListener('focus', () => {
        this.syncTimerState();
      });
    }
  }

  /**
   * Sync timer state with current time (for background resume)
   */
  private syncTimerState() {
    if (this.state.timerEndsAt && this.state.state === 'playing') {
      const remaining = this.calculateRemaining();
      
      if (remaining <= 0) {
        // Timer completed while backgrounded
        this.stop();
      } else {
        // Update remaining and continue
        this.updateState({ timerRemaining: remaining });
      }
    }
  }

  /**
   * Calculate remaining seconds from timestamp (source of truth)
   */
  private calculateRemaining(): number {
    if (this.state.timerPausedRemaining !== null) {
      return this.state.timerPausedRemaining;
    }
    if (!this.state.timerEndsAt) return 0;
    return Math.max(0, Math.floor((this.state.timerEndsAt - Date.now()) / 1000));
  }

  private loadPersistedState() {
    try {
      const saved = localStorage.getItem('dailyRhythm_audioController_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          ...this.state,
          trackId: parsed.trackId || null,
          volume: parsed.volume ?? 70,
          timerMinutes: parsed.timerMinutes ?? null,
          timerEndsAt: parsed.timerEndsAt ?? null,
          timerPausedRemaining: parsed.timerPausedRemaining ?? null,
          autoFade: parsed.autoFade ?? true,
          favorites: parsed.favorites || [],
          recents: parsed.recents || [],
          state: 'idle',
          timerRemaining: null,
          error: null,
        };
        
        // Check if there was an active timer
        if (parsed.timerEndsAt && parsed.wasPlaying) {
          const remaining = Math.max(0, Math.floor((parsed.timerEndsAt - Date.now()) / 1000));
          if (remaining > 0) {
            this.state.timerRemaining = remaining;
          } else {
            // Timer expired while closed
            this.state.timerEndsAt = null;
            this.state.timerMinutes = null;
          }
        }
      }
    } catch (e) {
      console.error('[AudioController] Failed to load state:', e);
    }
  }

  private persistState() {
    try {
      const toPersist = {
        trackId: this.state.trackId,
        volume: this.state.volume,
        timerMinutes: this.state.timerMinutes,
        timerEndsAt: this.state.timerEndsAt,
        timerPausedRemaining: this.state.timerPausedRemaining,
        autoFade: this.state.autoFade,
        favorites: this.state.favorites,
        recents: this.state.recents,
        wasPlaying: this.state.state === 'playing',
      };
      localStorage.setItem('dailyRhythm_audioController_v3', JSON.stringify(toPersist));
    } catch (e) {
      console.error('[AudioController] Failed to persist state:', e);
    }
  }

  private updateState(updates: Partial<AudioControllerState>) {
    this.state = { ...this.state, ...updates };
    this.persistState();
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  getState(): AudioControllerState {
    return { ...this.state };
  }

  // Add track to recents
  private addToRecents(trackId: string) {
    const recents = [trackId, ...this.state.recents.filter(id => id !== trackId)].slice(0, MAX_RECENTS);
    this.updateState({ recents });
  }

  // Toggle favorite
  toggleFavorite(trackId: string) {
    const favorites = this.state.favorites.includes(trackId)
      ? this.state.favorites.filter(id => id !== trackId)
      : [...this.state.favorites, trackId];
    this.updateState({ favorites });
  }

  isFavorite(trackId: string): boolean {
    return this.state.favorites.includes(trackId);
  }

  // Select and load a track (with optional crossfade)
  async selectTrack(trackId: string): Promise<boolean> {
    const sound = getSoundConfig(trackId);
    if (!sound) {
      this.updateState({ error: 'Track not found' });
      return false;
    }

    const url = getSoundUrl(trackId);
    if (!url) {
      this.updateState({ 
        trackId,
        error: 'Audio not configured. Add URL in Settings.',
        state: 'error',
      });
      return false;
    }

    if (this.state.trackId === trackId && this.audio) {
      return true;
    }
    
    // Crossfade from current track
    if (this.audio && this.state.state === 'playing') {
      await this.crossfadeTo(url, trackId);
    } else {
      await this.loadTrack(url, trackId);
    }

    this.addToRecents(trackId);
    return this.state.state !== 'error';
  }

  private async loadTrack(url: string, trackId: string): Promise<void> {
    this.stopInternal(false);
    
    this.updateState({ 
      trackId, 
      state: 'loading', 
      error: null,
    });

    return new Promise((resolve) => {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.volume = this.state.volume / 100;
      this.audio.preload = 'auto';

      const timeoutId = setTimeout(() => {
        this.updateState({ 
          error: 'Audio load timeout', 
          state: 'error' 
        });
        resolve();
      }, 10000);

      this.audio.oncanplaythrough = () => {
        clearTimeout(timeoutId);
        this.updateState({ state: 'ready', error: null });
        resolve();
      };

      this.audio.onerror = () => {
        clearTimeout(timeoutId);
        this.updateState({ 
          error: 'Cannot load audio. Check URL in Settings.',
          state: 'error',
        });
        resolve();
      };

      this.audio.src = url;
      this.audio.load();
    });
  }

  private async crossfadeTo(newUrl: string, newTrackId: string): Promise<void> {
    const oldAudio = this.audio;
    const startVolume = this.state.volume / 100;
    
    this.updateState({ 
      trackId: newTrackId, 
      state: 'loading', 
      error: null,
    });

    // Create new audio
    this.fadeAudio = new Audio();
    this.fadeAudio.loop = true;
    this.fadeAudio.volume = 0;
    this.fadeAudio.preload = 'auto';

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.updateState({ error: 'Audio load timeout', state: 'error' });
        resolve();
      }, 10000);

      this.fadeAudio!.oncanplaythrough = async () => {
        clearTimeout(timeoutId);
        
        try {
          await this.fadeAudio!.play();
        } catch {
          // Autoplay blocked, continue anyway
        }

        // Crossfade animation
        const steps = 20;
        const stepTime = CROSSFADE_DURATION / steps;
        let step = 0;

        const fadeTimer = setInterval(() => {
          step++;
          const progress = step / steps;
          
          if (oldAudio) {
            oldAudio.volume = Math.max(0, startVolume * (1 - progress));
          }
          if (this.fadeAudio) {
            this.fadeAudio.volume = startVolume * progress;
          }

          if (step >= steps) {
            clearInterval(fadeTimer);
            if (oldAudio) {
              oldAudio.pause();
              oldAudio.src = '';
            }
            this.audio = this.fadeAudio;
            this.fadeAudio = null;
            this.updateState({ state: 'playing', error: null });
            resolve();
          }
        }, stepTime);
      };

      this.fadeAudio!.onerror = () => {
        clearTimeout(timeoutId);
        this.updateState({ 
          error: 'Cannot load audio. Check URL in Settings.',
          state: 'error',
        });
        resolve();
      };

      this.fadeAudio!.src = newUrl;
      this.fadeAudio!.load();
    });
  }

  async play(): Promise<void> {
    if (!this.audio) {
      if (this.state.trackId) {
        const url = getSoundUrl(this.state.trackId);
        if (url) {
          await this.loadTrack(url, this.state.trackId);
        }
      }
      if (!this.audio) return;
    }

    if (this.state.state === 'playing') return;

    try {
      await this.audio.play();
      this.updateState({ state: 'playing', error: null });
      
      // Start/resume timer using timestamp-based approach
      if (this.state.timerMinutes && !this.state.timerEndsAt && !this.state.timerPausedRemaining) {
        this.startTimerInternal(this.state.timerMinutes);
      } else if (this.state.timerPausedRemaining && this.state.timerPausedRemaining > 0) {
        this.resumeTimerInternal();
      } else if (this.state.timerEndsAt) {
        // Timer was already running, just restart UI refresh
        this.startUIRefresh();
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        this.updateState({ error: 'Tap play to start audio', state: 'ready' });
      } else {
        this.updateState({ error: 'Playback failed', state: 'error' });
      }
    }
  }

  pause(): void {
    if (!this.audio || this.state.state !== 'playing') return;

    this.audio.pause();
    
    // Save remaining time when pausing (timestamp-based)
    const remaining = this.calculateRemaining();
    this.clearTimerInterval();
    
    this.updateState({ 
      state: 'paused',
      timerPausedRemaining: remaining > 0 ? remaining : null,
      timerEndsAt: null, // Clear endsAt, will recalculate on resume
    });
  }

  async togglePlayPause(): Promise<void> {
    if (this.state.state === 'playing') {
      this.pause();
    } else if (this.state.state === 'ready' || this.state.state === 'paused') {
      await this.play();
    } else if (this.state.trackId) {
      const success = await this.selectTrack(this.state.trackId);
      // State may have changed to 'ready' after selectTrack
      if (success && (this.state.state as AudioState) === 'ready') {
        await this.play();
      }
    }
  }

  private stopInternal(resetTrack: boolean = true) {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.fadeAudio) {
      this.fadeAudio.pause();
      this.fadeAudio.src = '';
      this.fadeAudio = null;
    }
    
    this.clearTimerInterval();
    this.clearFadeInterval();
    
    if (resetTrack) {
      this.updateState({
        state: 'idle',
        trackId: null,
        timerRemaining: null,
        timerEndsAt: null,
        timerPausedRemaining: null,
        error: null,
      });
    }
  }

  stop(): void {
    this.stopInternal(true);
  }

  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(100, volume));
    if (this.audio) {
      this.audio.volume = clamped / 100;
    }
    this.updateState({ volume: clamped });
  }

  setTimer(minutes: number | null): void {
    this.clearTimerInterval();
    
    this.updateState({ 
      timerMinutes: minutes, 
      timerRemaining: null,
      timerEndsAt: null,
      timerPausedRemaining: null,
    });
    
    if (minutes && this.state.state === 'playing') {
      this.startTimerInternal(minutes);
    }
  }

  /**
   * Start timer using timestamp-based approach (background-safe)
   */
  private startTimerInternal(minutes: number) {
    const now = Date.now();
    const totalSeconds = minutes * 60;
    const endsAt = now + totalSeconds * 1000;
    
    this.updateState({ 
      timerRemaining: totalSeconds,
      timerEndsAt: endsAt,
      timerPausedRemaining: null,
    });
    
    this.startUIRefresh();
  }

  /**
   * Resume timer from paused state
   */
  private resumeTimerInternal() {
    const remaining = this.state.timerPausedRemaining;
    if (!remaining || remaining <= 0) return;
    
    const now = Date.now();
    const endsAt = now + remaining * 1000;
    
    this.updateState({ 
      timerRemaining: remaining,
      timerEndsAt: endsAt,
      timerPausedRemaining: null,
    });
    
    this.startUIRefresh();
  }

  /**
   * UI refresh interval - updates remaining time from timestamp
   */
  private startUIRefresh() {
    this.clearTimerInterval();
    
    this.timerInterval = setInterval(() => {
      const remaining = this.calculateRemaining();
      
      if (remaining <= 0) {
        this.stop();
        return;
      }
      
      // Auto-fade in last 60 seconds
      if (this.state.autoFade && remaining <= 60 && !this.fadeInterval) {
        this.startAutoFade(remaining);
      }
      
      this.updateState({ timerRemaining: remaining });
    }, UI_REFRESH_INTERVAL);
  }

  private startAutoFade(remainingSeconds: number) {
    const startVolume = this.audio?.volume ?? this.state.volume / 100;
    const fadeSteps = Math.min(remainingSeconds, 60);
    const volumeDecrement = startVolume / fadeSteps;
    
    this.fadeInterval = setInterval(() => {
      if (this.audio) {
        const newVolume = Math.max(0, this.audio.volume - volumeDecrement);
        this.audio.volume = newVolume;
        
        if (newVolume <= 0) {
          this.clearFadeInterval();
        }
      }
    }, 1000);
  }

  private clearTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private clearFadeInterval() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  setAutoFade(enabled: boolean): void {
    this.updateState({ autoFade: enabled });
  }

  // Format timer remaining as mm:ss
  formatTimeRemaining(): string {
    if (this.state.timerRemaining === null) return '';
    const mins = Math.floor(this.state.timerRemaining / 60);
    const secs = this.state.timerRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Singleton export
export const AudioController = new AudioControllerClass();
