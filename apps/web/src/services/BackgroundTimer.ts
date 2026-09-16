/**
 * BackgroundTimer - Timestamp-based timer that survives app backgrounding
 * 
 * Uses endsAt timestamp as source of truth, not interval ticks.
 * Persists to localStorage/IndexedDB for survival across reloads.
 * Handles visibility change events for accurate resume.
 */

export type TimerMode = 'focus' | 'sleep' | 'custom';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerState {
  id: string;
  mode: TimerMode;
  label?: string;
  durationSeconds: number;
  startedAt: number; // Date.now() when started
  pausedAt: number | null; // remaining seconds when paused
  endsAt: number; // startedAt + durationSeconds * 1000
  status: TimerStatus;
}

export interface BackgroundTimerState {
  activeTimer: TimerState | null;
  notificationsEnabled: boolean;
}

type StateListener = (state: BackgroundTimerState) => void;

const STORAGE_KEY = 'dailyRhythm_backgroundTimer_v1';
const UI_REFRESH_INTERVAL = 250; // ms - for smooth UI updates

class BackgroundTimerService {
  private state: BackgroundTimerState = {
    activeTimer: null,
    notificationsEnabled: false,
  };
  
  private listeners: Set<StateListener> = new Set();
  private uiInterval: ReturnType<typeof setInterval> | null = null;
  private completionCallback: ((timer: TimerState) => void) | null = null;

  constructor() {
    this.loadPersistedState();
    this.setupVisibilityListener();
    this.checkNotificationPermission();
    
    // On load, check if timer already completed or still running
    this.syncTimerState();
    
    // If timer is running, start UI refresh immediately
    if (this.state.activeTimer?.status === 'running') {
      this.startUIRefresh();
    }
  }

  // === Persistence ===
  
  private loadPersistedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          activeTimer: parsed.activeTimer || null,
          notificationsEnabled: parsed.notificationsEnabled ?? false,
        };
      }
    } catch (e) {
      console.error('[BackgroundTimer] Failed to load state:', e);
    }
  }

  private persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('[BackgroundTimer] Failed to persist state:', e);
    }
  }

  // === State Management ===

  private updateState(updates: Partial<BackgroundTimerState>) {
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

  getState(): BackgroundTimerState {
    return { ...this.state };
  }

  // === Visibility Handling ===

  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.syncTimerState();
      });
      
      // Also handle window focus/blur for additional reliability
      window.addEventListener('focus', () => {
        this.syncTimerState();
      });
    }
  }

  /**
   * Sync timer state with current time
   * Called on visibility change, window focus, and periodically
   */
  syncTimerState() {
    const timer = this.state.activeTimer;
    if (!timer) return;
    
    if (timer.status === 'running') {
      const remaining = this.getRemainingSeconds();
      
      if (remaining <= 0) {
        // Timer completed while backgrounded
        this.handleCompletion();
      } else {
        // Timer still running, just notify listeners with updated remaining time
        this.notifyListeners();
      }
    }
  }

  // === Timer Operations ===

  /**
   * Start a new timer
   */
  start(mode: TimerMode, durationSeconds: number, label?: string): string {
    // Cancel any existing timer for this mode
    if (this.state.activeTimer?.mode === mode) {
      this.cancel();
    }

    const now = Date.now();
    const id = `${mode}_${now}`;
    
    const timer: TimerState = {
      id,
      mode,
      label,
      durationSeconds,
      startedAt: now,
      pausedAt: null,
      endsAt: now + durationSeconds * 1000,
      status: 'running',
    };

    this.updateState({ activeTimer: timer });
    this.startUIRefresh();
    this.scheduleNotification(timer);
    
    return id;
  }

  /**
   * Pause the active timer
   */
  pause() {
    const timer = this.state.activeTimer;
    if (!timer || timer.status !== 'running') return;

    const remaining = this.getRemainingSeconds();
    
    const pausedTimer: TimerState = {
      ...timer,
      pausedAt: remaining,
      status: 'paused',
    };

    this.updateState({ activeTimer: pausedTimer });
    this.stopUIRefresh();
    this.cancelNotification();
  }

  /**
   * Resume a paused timer
   */
  resume() {
    const timer = this.state.activeTimer;
    if (!timer || timer.status !== 'paused' || timer.pausedAt === null) return;

    const now = Date.now();
    
    const resumedTimer: TimerState = {
      ...timer,
      startedAt: now,
      pausedAt: null,
      endsAt: now + timer.pausedAt * 1000,
      status: 'running',
    };

    this.updateState({ activeTimer: resumedTimer });
    this.startUIRefresh();
    this.scheduleNotification(resumedTimer);
  }

  /**
   * Cancel the active timer
   */
  cancel() {
    if (!this.state.activeTimer) return;

    this.stopUIRefresh();
    this.cancelNotification();
    this.updateState({ activeTimer: null });
  }

  /**
   * Complete the timer (called internally when time expires)
   */
  private handleCompletion() {
    const timer = this.state.activeTimer;
    if (!timer) return;

    const completedTimer: TimerState = {
      ...timer,
      status: 'completed',
    };

    this.stopUIRefresh();
    this.updateState({ activeTimer: completedTimer });
    
    // Trigger completion callback
    if (this.completionCallback) {
      this.completionCallback(completedTimer);
    }

    // Play completion sound if foreground
    if (document.visibilityState === 'visible') {
      this.playCompletionSound();
    }
  }

  /**
   * Acknowledge completion and clear the timer
   * Also clears any timer in 'idle' status for cleanup
   */
  acknowledge() {
    const status = this.state.activeTimer?.status;
    if (status === 'completed' || status === 'idle' || this.state.activeTimer === null) {
      this.updateState({ activeTimer: null });
    }
  }

  /**
   * Set callback for timer completion
   */
  onComplete(callback: (timer: TimerState) => void) {
    this.completionCallback = callback;
  }

  // === Time Calculations ===

  /**
   * Get remaining seconds (source of truth calculation)
   */
  getRemainingSeconds(): number {
    const timer = this.state.activeTimer;
    if (!timer) return 0;

    if (timer.status === 'paused' && timer.pausedAt !== null) {
      return timer.pausedAt;
    }

    if (timer.status === 'completed') {
      return 0;
    }

    const remaining = Math.max(0, Math.floor((timer.endsAt - Date.now()) / 1000));
    return remaining;
  }

  /**
   * Get progress (0 to 1)
   */
  getProgress(): number {
    const timer = this.state.activeTimer;
    if (!timer) return 0;

    const remaining = this.getRemainingSeconds();
    const elapsed = timer.durationSeconds - remaining;
    return Math.min(1, Math.max(0, elapsed / timer.durationSeconds));
  }

  /**
   * Format remaining time as MM:SS or HH:MM:SS
   */
  formatRemaining(): string {
    const seconds = this.getRemainingSeconds();
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // === UI Refresh ===

  private startUIRefresh() {
    this.stopUIRefresh();
    
    this.uiInterval = setInterval(() => {
      const remaining = this.getRemainingSeconds();
      
      if (remaining <= 0 && this.state.activeTimer?.status === 'running') {
        this.handleCompletion();
      } else {
        // Just notify listeners to update UI
        this.notifyListeners();
      }
    }, UI_REFRESH_INTERVAL);
  }

  private stopUIRefresh() {
    if (this.uiInterval) {
      clearInterval(this.uiInterval);
      this.uiInterval = null;
    }
  }

  // === Notifications ===

  private async checkNotificationPermission() {
    if ('Notification' in window) {
      const permission = Notification.permission;
      this.state.notificationsEnabled = permission === 'granted';
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    this.updateState({ notificationsEnabled: enabled });
    return enabled;
  }

  private scheduleNotification(timer: TimerState) {
    if (!this.state.notificationsEnabled) return;

    // For PWA, we can't truly schedule future notifications
    // But we can show one when the timer completes
    // Service worker integration would be needed for true background notifications
  }

  private cancelNotification() {
    // Cancel any pending notification
  }

  private playCompletionSound() {
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
    }
  }

  // === Mode-specific helpers ===

  isRunning(mode?: TimerMode): boolean {
    const timer = this.state.activeTimer;
    if (!timer) return false;
    if (mode && timer.mode !== mode) return false;
    return timer.status === 'running';
  }

  isPaused(mode?: TimerMode): boolean {
    const timer = this.state.activeTimer;
    if (!timer) return false;
    if (mode && timer.mode !== mode) return false;
    return timer.status === 'paused';
  }

  isCompleted(mode?: TimerMode): boolean {
    const timer = this.state.activeTimer;
    if (!timer) return false;
    if (mode && timer.mode !== mode) return false;
    return timer.status === 'completed';
  }

  getActiveMode(): TimerMode | null {
    return this.state.activeTimer?.mode ?? null;
  }
}

// Singleton export
export const BackgroundTimer = new BackgroundTimerService();
