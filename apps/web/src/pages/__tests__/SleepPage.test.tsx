/**
 * SleepPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: sleep (redesign pipeline, Task 4).
 *
 * SleepPage is the authenticated sleep/wind-down page (route `/sleep`,
 * protected in AnimatedRoutes.tsx: `user ? <SleepPage /> : <Navigate to="/login">`).
 *
 * Audit finding (confirms + extends the `settings` card's finding): the
 * dead `defaultSleepSound`/`defaultSleepTimer`/`defaultAutoFade` preferences
 * written by SettingsPage are read NOWHERE in this page's component tree —
 * repo-wide grep confirms they are read only by `SettingsPage.tsx` and
 * `useUserPreferences.ts` itself. This page's OWN "Wind Down" sound/timer
 * feature (`WinddownContext` + `WinddownCard` + `WinddownPlayer`) is a
 * completely separate, REAL system: a real `Audio` element and a real
 * `setInterval` countdown, with zero wiring to the dead settings defaults.
 * `useSleep()` was also called here but its `prefs`/`updatePrefs` were never
 * used anywhere in the file — dead destructure, removed as part of this
 * card (zero-blast-radius: `useSleep` has no side effects on mount, and
 * `SleepSoundsSection`/`SleepEnvironmentSection`, the only other consumers of
 * that hook's sound/volume/timer API, are themselves unreferenced/orphaned
 * components not rendered anywhere, confirmed by repo-wide grep).
 *
 * Real bug found and fixed here: the Winddown Player's volume slider
 * (`WinddownPlayer.tsx`) held its own local `useState(70)` that was never
 * applied to the actual `Audio` element — moving it changed nothing audible.
 * Fixed by lifting volume into `WinddownContext` and applying it to the real
 * `audioRef.current.volume`. The test below ("moving the volume slider...")
 * is expected to FAIL against the original, unmodified code and PASS after
 * the fix — this is the RED/GREEN pair for that bug.
 *
 * Also escalated (not fixed, outside this card's scope): 10 of the 12
 * `WINDDOWN_SOUNDS` entries in `types/winddown.ts` point to `/audio/*.mp3`
 * files that do not exist in `public/audio` (only `brown-noise.mp3` exists)
 * — including every sound in the default "calm" pack. See card handoff.
 *
 * `WinddownProvider`/`WinddownCard`/`WinddownPlayer`/`SleepCheckInCard`/
 * `MorningBridgeSettingsSection` are rendered REAL (not stubbed) so the
 * sound/timer/volume assertions below exercise actual production logic,
 * per the card brief's instruction to verify real behavior, not just UI.
 * `window.Audio` is replaced with a recording stub (jsdom has no real media
 * playback) so we can assert on real constructor args, `.play()`/`.pause()`
 * calls, and `.volume` writes without a browser.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Hooks / contexts (module mocks; configured per-test) ────────────────────
vi.mock('@/hooks/useUserPreferences', () => ({ useUserPreferences: vi.fn() }));
vi.mock('@/hooks/useMorningBridge', () => ({ useMorningBridge: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: vi.fn() }));
vi.mock('@/contexts/EventsLedgerContext', () => ({ useEventsLedgerContext: vi.fn() }));

import SleepPage from '@/pages/SleepPage';
import { WinddownProvider } from '@/contexts/WinddownContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useMorningBridge } from '@/hooks/useMorningBridge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { DEFAULT_MORNING_BRIDGE_SETTINGS } from '@/types/morningBridge';

// ── Real-Audio recording stub ───────────────────────────────────────────────
class MockAudio {
  static instances: MockAudio[] = [];
  src: string;
  loop = false;
  volume = 1;
  paused = true;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  constructor(src?: string) {
    this.src = src ?? '';
    MockAudio.instances.push(this);
  }
}

function setupDefaultMocks(overrides: { isGuest?: boolean } = {}) {
  (useUserPreferences as any).mockReturnValue({ firstName: 'Riley' });
  (useAuthContext as any).mockReturnValue({ isGuest: overrides.isGuest ?? false });
  (useMorningBridge as any).mockReturnValue({
    settings: DEFAULT_MORNING_BRIDGE_SETTINGS,
    toggleEnabled: vi.fn(),
    setWakeTime: vi.fn(),
    addAction: vi.fn(),
    removeAction: vi.fn(),
  });
  (useEventsLedgerContext as any).mockReturnValue({
    todaySleepEvent: undefined,
    recordSleepRating: vi.fn().mockResolvedValue(undefined),
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WinddownProvider>
        <SleepPage />
      </WinddownProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  MockAudio.instances = [];
  vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);
  vi.spyOn(Math, 'random').mockReturnValue(0); // deterministic sound pick (first in pack)
  setupDefaultMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SleepPage — baseline rendering', () => {
  it('greets the user by first name and shows no guest overlay when authenticated', () => {
    renderPage();
    expect(screen.getByText('Rest well, Riley')).toBeInTheDocument();
    expect(screen.queryByText('Sleep Insights are Locked')).not.toBeInTheDocument();
  });

  it('shows the guest lock overlay (and blurs content) when isGuest is true', () => {
    setupDefaultMocks({ isGuest: true });
    renderPage();
    expect(screen.getByText('Sleep Insights are Locked')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in to Unlock/i })).toHaveAttribute('href', '/login');
  });
});

describe('SleepPage — real wind-down sound/timer behavior', () => {
  it('starting a wind-down session creates a real Audio element for the selected sound and plays it', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Start Wind Down/i }));

    // Real Audio object was constructed and told to play — not a stub/no-op.
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toContain('/audio/rain.mp3');
    expect(MockAudio.instances[0].play).toHaveBeenCalled();

    // Player shows the real selected sound name and the default 10-minute countdown.
    expect(screen.getByText('Gentle Rain')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('the timer counts down in real seconds while playing', () => {
    vi.useFakeTimers();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Start Wind Down/i }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('9:58')).toBeInTheDocument();
  });

  it('moving the volume slider updates the real audio element volume, not just local UI state', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Start Wind Down/i }));

    const slider = screen.getByRole('slider');
    slider.focus();
    // Step is 1; move it up by 5 from the default 70.
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
    }

    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].volume).toBeCloseTo(0.75, 2);
  });

  it('pausing the session pauses the real audio element', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Start Wind Down/i }));

    // Icon-only play/pause toggle — distinguish from the icon-only close (X) button by its class.
    const pauseButton = screen
      .getAllByRole('button', { name: '' })
      .find((btn) => btn.className.includes('w-16'))!;
    fireEvent.click(pauseButton);

    expect(MockAudio.instances[0].pause).toHaveBeenCalled();
  });

  it('ending the session early stops the real audio and closes the player', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Start Wind Down/i }));

    fireEvent.click(screen.getByRole('button', { name: /End & Save/i }));

    expect(MockAudio.instances[0].pause).toHaveBeenCalled();
  });
});

describe('SleepPage — redesign (AA contrast fixes)', () => {
  const SECONDARY_FIX = 'text-[hsl(230,10%,40%)] dark:text-[hsl(230,10%,60%)]';

  it('inactive duration pills (bg-secondary) use the bg-secondary-specific AA-passing color', () => {
    renderPage();
    const node = screen.getByText('5m').closest('button')!;
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(SECONDARY_FIX);
  });

  it('inactive sound-pack pills (bg-secondary) use the bg-secondary-specific AA-passing color', () => {
    renderPage();
    const node = screen.getByText('Energized').closest('button')!;
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(SECONDARY_FIX);
  });

  it('inactive sleep-quality buttons (bg-secondary) use the bg-secondary-specific AA-passing color', () => {
    renderPage();
    const node = screen.getByText('Okay').closest('button')!;
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(SECONDARY_FIX);
  });

  it('Morning Bridge wake-window caption (bg-secondary) uses the bg-secondary-specific AA-passing color', () => {
    renderPage();
    const node = screen.getByText('Morning Bridge shows within 3 hours of this time');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(SECONDARY_FIX);
  });

  it('guest-lock overlay drops the opacity-stacked /90 modifier that failed AA in both themes', () => {
    setupDefaultMocks({ isGuest: true });
    renderPage();
    const node = screen.getByText('Sleep Insights are Locked').closest('div')!;
    expect(node.className).not.toContain('bg-card/90');
    expect(node.className).toContain('bg-card');
  });
});
