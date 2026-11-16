/**
 * ProfilePage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: profile (redesign pipeline, Task 4).
 *
 * ProfilePage is the authenticated user-profile/stats page (route `/profile`,
 * protected in AnimatedRoutes.tsx: `user ? <ProfilePage /> : <Navigate to="/login">`).
 * Per the card's scope discipline, no structural redesign was attempted. Fixes
 * are: 2 dead-code removals (unused `Calendar`/`Zap` icon imports, unused
 * `dailyFocusGoal`/`dailyTaskGoal` destructured hook fields — never read in
 * this file, the real values live inside EditProfileSheet's own hook call)
 * and 2 hand-verified AA-contrast fixes (see "redesign (contrast fix)" below).
 *
 * The three sheet children (EditProfileSheet/ShareProgressCard/
 * AchievementDetailSheet) are stubbed to minimal open/closed markers so this
 * file exercises ProfilePage's OWN container logic (stat computation from
 * mocked hook data, showcase/motivation branching, sheet-open wiring) — each
 * sheet's own internals are out of this card's scope (no card exists for
 * them individually; they are private to this page).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-router-dom ─────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Hooks / contexts (module mocks; configured per-test) ────────────────────
vi.mock('@/hooks/useAchievements', () => ({ useAchievements: vi.fn() }));
vi.mock('@/hooks/useFocusTotals', () => ({ useFocusTotals: vi.fn() }));
vi.mock('@/contexts/EventsLedgerContext', () => ({ useEventsLedgerContext: vi.fn() }));
vi.mock('@/hooks/useUserPreferences', () => ({ useUserPreferences: vi.fn() }));

// ── Child sheets — shallow stubs so this file tests ProfilePage's own logic ──
vi.mock('@/components/profile/EditProfileSheet', () => ({
  EditProfileSheet: ({ open }: any) => (open ? <div data-testid="edit-profile-sheet-open" /> : null),
}));
vi.mock('@/components/profile/ShareProgressCard', () => ({
  ShareProgressCard: ({ open }: any) => (open ? <div data-testid="share-progress-open" /> : null),
}));
vi.mock('@/components/profile/AchievementDetailSheet', () => ({
  AchievementDetailSheet: ({ achievement, open }: any) =>
    open ? <div data-testid="achievement-detail-open">{achievement?.name}</div> : null,
}));

import ProfilePage from '@/pages/ProfilePage';
import { useAchievements } from '@/hooks/useAchievements';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';

// Build a dateKey N days before "now" (same shape ProfilePage's own
// weekTasksCompleted memo produces) so the fixture stays valid no matter
// what day the suite actually runs on.
function dateKeyDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function makeAchievement(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'focus_1',
    name: 'First Focus',
    description: 'Complete your first focus session',
    icon: '🎯',
    category: 'focus',
    requirement: 1,
    tier: 'bronze',
    hint: 'Start a focus session and complete it',
    isUnlocked: true,
    unlockedAt: '2026-01-01T00:00:00.000Z',
    seen: true,
    progress: 100,
    currentValue: 5,
    ...overrides,
  };
}

const DEFAULT_ALL_ACHIEVEMENTS = [
  makeAchievement({ id: 'focus_1', name: 'First Focus', tier: 'bronze', isUnlocked: true, icon: '🎯' }),
  makeAchievement({ id: 'focus_100', name: 'Focus Legend', tier: 'gold', isUnlocked: true, icon: '👑' }),
];

// taskEvents fixture: 3 completed + 1 uncompleted this week (net 2), plus 5
// completed 10 days ago that must NOT count (outside the 7-day window) —
// proves weekTasksCompleted is computed from real ledger data, not hardcoded.
const DEFAULT_TASK_EVENTS = [
  { type: 'completed', taskId: 't1', dateKey: dateKeyDaysAgo(0) },
  { type: 'completed', taskId: 't2', dateKey: dateKeyDaysAgo(1) },
  { type: 'completed', taskId: 't3', dateKey: dateKeyDaysAgo(2) },
  { type: 'uncompleted', taskId: 't4', dateKey: dateKeyDaysAgo(0) },
  { type: 'completed', taskId: 't5', dateKey: dateKeyDaysAgo(10) },
  { type: 'completed', taskId: 't6', dateKey: dateKeyDaysAgo(10) },
  { type: 'completed', taskId: 't7', dateKey: dateKeyDaysAgo(10) },
  { type: 'completed', taskId: 't8', dateKey: dateKeyDaysAgo(10) },
  { type: 'completed', taskId: 't9', dateKey: dateKeyDaysAgo(10) },
];

function setupDefaultMocks(overrides: {
  firstName?: string | null;
  tagline?: string | null;
  createdAt?: string | null;
  allAchievements?: any[];
  unlockedCount?: number;
  totalCount?: number;
  totalSessions?: number;
} = {}) {
  (useUserPreferences as any).mockReturnValue({
    firstName: 'firstName' in overrides ? overrides.firstName : 'Ravi',
    tagline: 'tagline' in overrides ? overrides.tagline : 'Focused creator',
    createdAt: 'createdAt' in overrides ? overrides.createdAt : '2026-03-10T00:00:00.000Z',
    dailyFocusGoal: 60,
    dailyTaskGoal: 5,
  });
  (useAchievements as any).mockReturnValue({
    allAchievements: overrides.allAchievements ?? DEFAULT_ALL_ACHIEVEMENTS,
    unlockedCount: overrides.unlockedCount ?? 2,
    totalCount: overrides.totalCount ?? 24,
    stats: {
      totalFocusMinutes: 150,
      totalSessions: overrides.totalSessions ?? 12,
      totalTasksCompleted: 40,
      longestStreak: 9,
    },
  });
  (useFocusTotals as any).mockReturnValue({
    week: { formatted: '3h 20m', sessions: 5 },
    focusStreak: 7,
  });
  (useEventsLedgerContext as any).mockReturnValue({
    taskEvents: DEFAULT_TASK_EVENTS,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

describe('ProfilePage — baseline rendering', () => {
  it('renders the first name as the heading and the tagline', () => {
    renderPage();
    expect(screen.getByText('Ravi')).toBeInTheDocument();
    expect(screen.getByText('Focused creator')).toBeInTheDocument();
  });

  it('falls back to "Your Profile" when firstName is not set', () => {
    setupDefaultMocks({ firstName: null });
    renderPage();
    expect(screen.getByText('Your Profile')).toBeInTheDocument();
  });

  it('renders "Member since <Month Year>" from the real createdAt date', () => {
    renderPage();
    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('falls back to "Welcome to Rivly" when createdAt is not set', () => {
    setupDefaultMocks({ createdAt: null });
    renderPage();
    expect(screen.getByText('Welcome to Rivly')).toBeInTheDocument();
  });

  it('renders the Lifetime Stats section with the real stats values', () => {
    renderPage();
    expect(screen.getByText('2h 30m')).toBeInTheDocument(); // 150 min -> 2h 30m
    expect(screen.getByText('40')).toBeInTheDocument(); // totalTasksCompleted
    expect(screen.getByText('9 days')).toBeInTheDocument(); // longestStreak
  });

  it('renders the Achievements progress summary from real unlocked/total counts', () => {
    renderPage();
    expect(screen.getByText('2 / 24')).toBeInTheDocument();
    // Math.round((2/24)*100) = 8
    expect(screen.getByText('8% complete • 22 more to unlock')).toBeInTheDocument();
  });

  it('hides the Trophy Case when no achievements are unlocked', () => {
    setupDefaultMocks({ allAchievements: [makeAchievement({ isUnlocked: false })], unlockedCount: 0 });
    renderPage();
    expect(screen.queryByText('Trophy Case')).not.toBeInTheDocument();
  });

  it('shows the Trophy Case when at least one achievement is unlocked', () => {
    renderPage();
    expect(screen.getByText('Trophy Case')).toBeInTheDocument();
  });
});

describe('ProfilePage — computed stats trace to real ledger data, not placeholders', () => {
  it('weekTasksCompleted nets completed-minus-uncompleted events within the last 7 days, excluding older ones', () => {
    renderPage();
    // 3 completed + 1 uncompleted in-window (net 2); 5 completed 10 days ago excluded
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows the real week focus time and session count from useFocusTotals', () => {
    renderPage();
    expect(screen.getByText('3h 20m')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows the real focus streak from useFocusTotals', () => {
    renderPage();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

describe('ProfilePage — motivation message branches on real totalSessions', () => {
  it('shows the beginner message when totalSessions < 10', () => {
    setupDefaultMocks({ totalSessions: 3 });
    renderPage();
    expect(screen.getByText("Every session counts. You're building something amazing.")).toBeInTheDocument();
  });

  it('shows the consistency message when totalSessions is between 10 and 49', () => {
    setupDefaultMocks({ totalSessions: 15 });
    renderPage();
    expect(screen.getByText('Great progress! Consistency is your superpower.')).toBeInTheDocument();
  });

  it('shows the master message when totalSessions >= 50', () => {
    setupDefaultMocks({ totalSessions: 60 });
    renderPage();
    expect(screen.getByText("You're a focus master! Keep pushing your limits.")).toBeInTheDocument();
  });
});

describe('ProfilePage — primary interactions', () => {
  it('opens the Edit Profile sheet when "Edit Profile" is clicked', () => {
    renderPage();
    expect(screen.queryByTestId('edit-profile-sheet-open')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Edit Profile'));
    expect(screen.getByTestId('edit-profile-sheet-open')).toBeInTheDocument();
  });

  it('opens the Share Progress sheet when "Share Week" is clicked', () => {
    renderPage();
    expect(screen.queryByTestId('share-progress-open')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Share Week'));
    expect(screen.getByTestId('share-progress-open')).toBeInTheDocument();
  });

  it('navigates to /settings when the settings icon button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '' })); // settings icon-only button has no accessible text
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('opens the Achievement Detail sheet for the clicked showcase badge', () => {
    renderPage();
    fireEvent.click(screen.getByText('🎯'));
    expect(screen.getByTestId('achievement-detail-open')).toBeInTheDocument();
    expect(screen.getByText('First Focus')).toBeInTheDocument();
  });
});

describe('ProfilePage — redesign (contrast fix)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('the Quick Stat label (flat page background, not a card) uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText('Streak');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the "Member since" line (flat page background) uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText('March 2026');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('leaves the already-passing bg-card sites (e.g. "Total Focus Time" label) untouched', () => {
    renderPage();
    const node = screen.getByText('Total Focus Time');
    expect(node.className).toContain('text-muted-foreground');
    expect(node.className).not.toContain(FIXED_MUTED);
  });
});
