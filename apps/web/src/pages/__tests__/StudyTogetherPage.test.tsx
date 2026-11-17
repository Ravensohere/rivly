/**
 * StudyTogetherPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: study-together (redesign pipeline, Task 4).
 *
 * Audit finding (the thing this pipeline keeps checking for): is the
 * "together" part of "Study Together" real, or social-sounding UI over a
 * solo feature? Traced `useFocusRooms` (apps/web/src/hooks/useFocusRooms.ts)
 * and the generated `apps/web/src/integrations/supabase/types.ts`: there is
 * a real `focus_rooms` Postgres table, real `join_focus_room`/
 * `leave_focus_room` RPC functions (server-side atomic increment/decrement of
 * `active_users`), and a real Supabase Realtime `postgres_changes` UPDATE
 * subscription that pushes every room's live count to every connected
 * client. Joining/leaving is not a client-side cosmetic toggle — it round-
 * trips through the RPCs, and the "N people focusing with you" count is the
 * live DB value, broadcast to everyone in the room. This is a REAL presence
 * feature, not a facade (contrast with the sleep-sounds card's missing audio
 * files). Caveat: no committed .sql migration in this repo defines
 * `focus_rooms`/the RPCs (unlike `deduct_credits`, which is annotated
 * "Defined in supabase/migrations/..." in the same generated types file) —
 * the schema exists only on the live Supabase project. That's a migration-
 * history drift risk worth flagging, not a bug in this page, and out of
 * scope to fix here (we don't have the original RPC body to re-author a
 * migration from).
 *
 * There is no room-code/invite mechanism on this page at all — rooms are a
 * fixed named set ("Deep Work", "Study Hall", ...), not user-created rooms
 * with a share code. The page copy ("No chat. No video. Just shared focus.")
 * accurately describes the actual capability (an ambient live headcount),
 * so there's nothing to reconcile there.
 *
 * Two blocks, matching the pipeline's established test discipline:
 *  - "baseline contract" — real interactions against the mocked (but
 *    semantically faithful) useFocusRooms hook: lobby render with live
 *    counts, loading/empty/error states, join → session view → timer
 *    completion → completion view → rejoin/leave, back-button routing, and
 *    real `Audio` construction for the ambient-track selector. These pass
 *    against the pre-redesign code; they guard the regression this pipeline
 *    exists to prevent.
 *  - "redesign" — the shared `text-muted-foreground`-on-background AA
 *    contrast defect recurring across 29+ prior cards, swept here across
 *    plain, opacity-stacked, and bg-secondary/bg-muted sites. RED before the
 *    fix, GREEN after.
 */

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { FocusRoom } from '@/hooks/useFocusRooms';

// ── Mock react-router navigation ────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Mock useFocusRooms — a faithful stand-in for the real presence hook ────
// Mirrors the real hook's contract: activeRoomId is live React state that
// flips when joinRoom/leaveRoom resolve, exactly like the real hook flips it
// after its join_focus_room/leave_focus_room RPC calls settle.
const { mockJoinRoom, mockLeaveRoom, hookState } = vi.hoisted(() => ({
  mockJoinRoom: vi.fn().mockResolvedValue(undefined),
  mockLeaveRoom: vi.fn().mockResolvedValue(undefined),
  hookState: {
    loading: false as boolean,
    error: null as string | null,
    rooms: [
      { id: 'room-1', name: 'Deep Work', emoji: '🧠', description: 'Intense focus.', active_users: 128, timer_end_at: null },
      { id: 'room-2', name: 'Study Hall', emoji: '📚', description: 'Reading and learning.', active_users: 54, timer_end_at: null },
    ] as FocusRoom[],
  },
}));

vi.mock('@/hooks/useFocusRooms', () => ({
  useFocusRooms: () => {
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    return {
      rooms: hookState.rooms,
      loading: hookState.loading,
      error: hookState.error,
      activeRoomId,
      joinRoom: async (id: string) => {
        await mockJoinRoom(id);
        setActiveRoomId(id);
      },
      leaveRoom: async (id: string) => {
        await mockLeaveRoom(id);
        setActiveRoomId(null);
      },
    };
  },
}));

import StudyTogetherPage from '../StudyTogetherPage';

// ── Real-Audio recording stub (ambient track player) ───────────────────────
class MockAudio {
  static instances: MockAudio[] = [];
  src: string;
  loop = false;
  muted = false;
  paused = true;
  play = vi.fn(() => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn(() => { this.paused = true; });
  constructor(src?: string) {
    this.src = src ?? '';
    MockAudio.instances.push(this);
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/study']}>
      <StudyTogetherPage />
    </MemoryRouter>
  );
}

function findButtonWithIcon(iconClass: string) {
  return screen.getAllByRole('button').find((b) => b.querySelector(`svg.${iconClass}`));
}

// Click a room card and wait for the async join (await joinRoom → setView)
// plus the AnimatePresence lobby→session exit/enter transition to land on
// the session view, instead of racing React's microtasks and framer-motion's
// rAF-driven transition. Real timers only — see joinRoomWithFakeTimers for
// why this doesn't mix with vi.useFakeTimers().
async function joinRoomAndWaitForSession(name: string) {
  fireEvent.click(screen.getByText(name));
  await waitFor(() => expect(screen.queryByText('Pick Your Room')).not.toBeInTheDocument());
}

// Same join, for tests running under `vi.useFakeTimers()` to fast-forward
// the 25-minute pomodoro countdown. `waitFor`'s real-timer polling and
// framer-motion's rAF-driven AnimatePresence transition don't settle once
// any fake timers are installed (confirmed empirically — even scoping
// `toFake` to just setInterval reproduces it), so drive the join's
// microtask chain by hand instead. Keep any fake-timer test last in its
// describe block: real-timer tests placed after one intermittently fail.
async function joinRoomWithFakeTimers(name: string) {
  fireEvent.click(screen.getByText(name));
  for (let i = 0; i < 5; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
  }
}

// Let any trailing real-timer animation from a previous test's unmount
// settle on the real clock before switching to fake timers in this one —
// vi.useFakeTimers() also fakes requestAnimationFrame, which orphans
// anything still mid-flight and breaks the join below.
async function settleThenUseFakeTimers() {
  await act(async () => { await new Promise((r) => { setTimeout(r, 50); }); });
  vi.useFakeTimers();
}

beforeEach(() => {
  hookState.loading = false;
  hookState.error = null;
  hookState.rooms = [
    { id: 'room-1', name: 'Deep Work', emoji: '🧠', description: 'Intense focus.', active_users: 128, timer_end_at: null },
    { id: 'room-2', name: 'Study Hall', emoji: '📚', description: 'Reading and learning.', active_users: 54, timer_end_at: null },
  ];
  mockJoinRoom.mockClear();
  mockLeaveRoom.mockClear();
  mockNavigate.mockClear();
  MockAudio.instances = [];
  vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

// ═════════════════════════════════════════════════════════════════════════
describe('StudyTogetherPage — baseline contract (current behavior)', () => {
  it('renders the lobby with real per-room counts and a global total derived from them, not a fabricated number', () => {
    renderPage();

    expect(screen.getByText('Deep Work')).toBeInTheDocument();
    expect(screen.getByText('Study Hall')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
    // 128 + 54 = 182, the real sum of the mocked rooms' active_users
    expect(screen.getByText('182')).toBeInTheDocument();
  });

  it('shows loading skeletons while rooms are loading, not stale/fallback room content', () => {
    hookState.loading = true;
    renderPage();

    expect(screen.queryByText('Deep Work')).not.toBeInTheDocument();
  });

  it('shows the empty state when the backend returns no rooms', () => {
    hookState.rooms = [];
    renderPage();

    expect(screen.getByText(/No rooms available/)).toBeInTheDocument();
  });

  it('surfaces a non-blocking error banner while still rendering the room list', () => {
    hookState.error = 'Could not load focus rooms. Showing cached data.';
    renderPage();

    expect(screen.getByText(/Could not load focus rooms/)).toBeInTheDocument();
    expect(screen.getByText('Deep Work')).toBeInTheDocument();
  });

  it('joining a room calls the real join_focus_room RPC pathway (via useFocusRooms.joinRoom) and switches to the live session view', async () => {
    renderPage();

    await joinRoomAndWaitForSession('Deep Work');

    expect(mockJoinRoom).toHaveBeenCalledWith('room-1');
    expect(screen.getByText(/focusing with you right now/)).toBeInTheDocument();
    // The session view shows the room's real live count, not a placeholder.
    expect(screen.getByText('128')).toBeInTheDocument();
  });

  it('leaving the active room calls the real leave_focus_room RPC pathway and returns to the lobby', async () => {
    renderPage();
    await joinRoomAndWaitForSession('Deep Work');

    const leaveBtn = findButtonWithIcon('lucide-x')!;
    fireEvent.click(leaveBtn);

    await waitFor(() => expect(screen.getByText('Pick Your Room')).toBeInTheDocument());
    expect(mockLeaveRoom).toHaveBeenCalledWith('room-1');
  });

  it('the back button navigates away when in the lobby, but leaves the room first when in a session', async () => {
    renderPage();

    // In the lobby: back goes to the previous route.
    const backBtn = findButtonWithIcon('lucide-arrow-left')!;
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);

    // Join a room, then use the header back button again.
    mockNavigate.mockClear();
    await joinRoomAndWaitForSession('Deep Work');

    const backBtnInSession = findButtonWithIcon('lucide-arrow-left')!;
    fireEvent.click(backBtnInSession);

    await waitFor(() => expect(screen.getByText('Pick Your Room')).toBeInTheDocument());
    expect(mockLeaveRoom).toHaveBeenCalledWith('room-1');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('switching the ambient track constructs a real Audio element for the newly selected track URL', async () => {
    renderPage();
    await joinRoomAndWaitForSession('Deep Work');

    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toContain('SoundHelix-Song-1');

    fireEvent.click(screen.getByText('Rain & Thunder'));

    expect(MockAudio.instances[0].src).toContain('SoundHelix-Song-2');
  });

  it('muting toggles the real audio element, not just an icon', async () => {
    renderPage();
    await joinRoomAndWaitForSession('Deep Work');
    expect(MockAudio.instances).toHaveLength(1);

    const muteBtn = findButtonWithIcon('lucide-volume2')!;
    fireEvent.click(muteBtn);

    expect(MockAudio.instances[0].muted).toBe(true);
  });

});

// ═════════════════════════════════════════════════════════════════════════
describe('StudyTogetherPage — contrast fix (recurring text-muted-foreground-on-background defect)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('the room card description uses the AA-passing muted color, not the raw token', () => {
    renderPage();

    const node = screen.getByText('Intense focus.');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the live-count badge ("now") on an unjoined room card uses the AA-passing color with no extra opacity stacking', () => {
    renderPage();

    const now = screen.getAllByText('now')[0];
    expect(now.className).not.toContain('opacity-70');
    // Color lives on the badge wrapper (shared with the icon/count), not an inline unsafe token.
    const badge = now.closest('div')!;
    expect((badge as HTMLElement).style.color).not.toBe('hsl(var(--muted-foreground))');
    expect(badge.className).toContain(FIXED_MUTED);
  });

  it('the "Tap to join" bg-secondary pill uses the AA-passing color, not the raw inline token', () => {
    renderPage();

    const pill = screen.getAllByText('Tap to join')[0];
    expect((pill as HTMLElement).style.color).not.toBe('hsl(var(--muted-foreground))');
    expect(pill.className).toContain(FIXED_MUTED);
  });

  it('the global live-count subtitle in the header uses the AA-passing muted color', () => {
    renderPage();

    const node = screen.getByText(/people focusing globally/);
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the empty-state body paragraph uses the AA-passing muted color', () => {
    hookState.rooms = [];
    renderPage();

    const node = screen.getByText(/Check back soon/);
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the back button (icon-only, over the page background) uses the AA-passing muted color', () => {
    renderPage();

    const backBtn = findButtonWithIcon('lucide-arrow-left')!;
    expect(backBtn.className).not.toContain('text-muted-foreground');
    expect(backBtn.className).toContain(FIXED_MUTED);
  });

  it('the "remaining" label under the session timer uses the AA-passing muted color', async () => {
    renderPage();
    await joinRoomAndWaitForSession('Deep Work');

    const node = screen.getByText('remaining');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the live-user-count sentence in the active session uses the AA-passing muted color', async () => {
    renderPage();
    await joinRoomAndWaitForSession('Deep Work');

    const node = screen.getByText(/focusing with you right now/).closest('div')!;
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the mute/leave icon buttons (bg-muted/50) use the AA-passing muted color', async () => {
    renderPage();
    await joinRoomAndWaitForSession('Deep Work');

    const muteBtn = findButtonWithIcon('lucide-volume2')!;
    expect(muteBtn.className).not.toContain('text-muted-foreground');
    expect(muteBtn.className).toContain(FIXED_MUTED);

    const leaveBtn = findButtonWithIcon('lucide-x')!;
    expect(leaveBtn.className).not.toContain('text-muted-foreground');
    expect(leaveBtn.className).toContain(FIXED_MUTED);
  });

  it('the lobby hero subtext ("No chat. No video. Just shared focus.") uses the AA-passing muted color', () => {
    renderPage();

    const node = screen.getByText('No chat. No video. Just shared focus.');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the "Ambient Sound" label and unselected track pills use the AA-passing muted color', async () => {
    renderPage();
    await joinRoomAndWaitForSession('Deep Work');

    const label = screen.getByText('Ambient Sound').closest('p')!;
    expect(label.className).not.toContain('text-muted-foreground');
    expect(label.className).toContain(FIXED_MUTED);

    const unselectedPill = screen.getByText('Rain & Thunder');
    expect((unselectedPill as HTMLElement).style.color).not.toBe('hsl(var(--muted-foreground))');
    expect(unselectedPill.className).toContain(FIXED_MUTED);
  });

});

// ═════════════════════════════════════════════════════════════════════════
// Fake-timer scenarios, isolated in their own describe block and placed last
// in the file: vi.useFakeTimers() (needed to fast-forward the 25-minute
// pomodoro countdown) also fakes requestAnimationFrame, which orphans any
// framer-motion AnimatePresence transition still mid-flight from an earlier
// real-timer test and breaks real-timer `waitFor` polling in any test that
// runs after — confirmed empirically. Keeping both scenarios here, after
// every real-timer test, avoids that entirely instead of chasing it test by
// test.
describe('StudyTogetherPage — fake-timer scenarios (pomodoro completion)', () => {
  // Single test, single vi.useFakeTimers() activation: a second one later in
  // the same file leaves the first one's state behind and breaks (confirmed
  // empirically — each passes alone, not back to back). Covers the
  // completion-view behavior, its AA contrast, and the "Another Round"
  // rejoin together in one fake-timer session.
  it('completing the pomodoro timer shows an AA-contrast-passing completion view, and "Another Round" re-joins the same room via the real join pathway', async () => {
    const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';
    await settleThenUseFakeTimers();
    renderPage();
    await joinRoomWithFakeTimers('Deep Work');

    act(() => { vi.advanceTimersByTime(25 * 60 * 1000); });

    expect(screen.getByText('Session Complete! 🎉')).toBeInTheDocument();
    const summary = screen.getByText(/You focused alongside/);
    expect(summary).toBeInTheDocument();
    expect(summary.textContent).toContain('128');
    expect(summary.closest('p')!.className).not.toContain('text-muted-foreground');
    expect(summary.closest('p')!.className).toContain(FIXED_MUTED);

    const leaveRoomBtn = screen.getByText('Leave Room').closest('button')!;
    expect(leaveRoomBtn.className).not.toContain('text-muted-foreground');
    expect(leaveRoomBtn.className).toContain('text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,60%)]');

    mockJoinRoom.mockClear();
    fireEvent.click(screen.getByText('Another Round'));
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });
    }

    expect(screen.getByText(/focusing with you right now/)).toBeInTheDocument();
    expect(mockJoinRoom).toHaveBeenCalledWith('room-1');
  });
});
