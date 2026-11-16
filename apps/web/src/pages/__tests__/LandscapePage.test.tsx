/**
 * LandscapePage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: landscape (redesign pipeline, Task 4).
 *
 * LandscapePage is the "Living Landscape" feature the landing page's
 * FeaturesSection advertises (card '01': "A world that grows with your focus
 * sessions — not your streaks. Miss a day? The landscape waits, patient as
 * nature itself. Plant Focus Seeds, watch them bloom."). Route `/landscape`,
 * protected in AnimatedRoutes.tsx.
 *
 * Audit cross-check against that marketing claim: `useLandscape()` derives
 * every seed from real Events-Ledger focus sessions (not streak counters),
 * and `PremiumLandscapeScene` renders a tree per seed sized/typed by real
 * session duration/completion — no decay logic punishes a missed day. The
 * claim matches the real implementation; no fabrication found there.
 *
 * `PremiumLandscapeScene`, `CollectionSheet`, and `FocusDebugPanel` are
 * stubbed to minimal markers so these tests exercise LandscapePage's OWN
 * container logic (view-mode switching, date navigation, stat aggregation
 * from mocked hook data, collection-sheet wiring) — matching the established
 * pattern from InsightsPage.test.tsx for this pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useLandscape', () => ({ useLandscape: vi.fn() }));
vi.mock('@/contexts/CollectiblesContext', () => ({ useCollectiblesContext: vi.fn() }));
vi.mock('@/hooks/useFocusTotals', () => ({ useFocusTotals: vi.fn() }));

vi.mock('@/components/landscape/PremiumLandscapeScene', () => ({
  PremiumLandscapeScene: ({ seeds, viewMode }: any) => (
    <div data-testid="landscape-scene" data-view-mode={viewMode} data-seed-count={seeds.length} />
  ),
}));
vi.mock('@/components/collectibles/CollectionSheet', () => ({
  CollectionSheet: ({ open, unlockedCount }: any) =>
    open ? <div data-testid="collection-sheet-open" data-unlocked={unlockedCount} /> : null,
}));
vi.mock('@/components/focus/FocusDebugPanel', () => ({
  FocusDebugPanel: () => <div data-testid="focus-debug-panel" />,
}));

import LandscapePage from '@/pages/LandscapePage';
import { useLandscape } from '@/hooks/useLandscape';
import { useCollectiblesContext } from '@/contexts/CollectiblesContext';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { formatDate } from '@/hooks/useLocalStorage';

function seed(overrides: Partial<{ id: string; date: string; durationMinutes: number; xPosition: number; completed: boolean }> = {}) {
  return {
    id: 'seed-1',
    date: formatDate(new Date()),
    durationMinutes: 25,
    completed: true,
    endedEarly: false,
    purpose: 'Focus',
    growthLevel: 1,
    xPosition: 0.5,
    ...overrides,
  };
}

function setupLandscapeMock({
  seedsForDate = [] as any[],
  landscapeState = { skyState: 'clear', waterState: 'rippling', lightState: 'warm', lastUpdated: formatDate(new Date()) },
  message = 'Clear skies reflect your rhythm.',
} = {}) {
  const getSeedsForDate = vi.fn((dateKey: string) =>
    seedsForDate.filter((s: any) => s.date === dateKey),
  );
  const checkDailyGrowth = vi.fn();
  const updateLandscapeState = vi.fn();
  const getLandscapeMessage = vi.fn(() => message);

  (useLandscape as any).mockReturnValue({
    landscapeState,
    getSeedsForDate,
    getSessionsByDateRange: vi.fn(),
    unlockedCollectibles: [],
    getLandscapeMessage,
    updateLandscapeState,
    checkDailyGrowth,
  });

  return { getSeedsForDate, checkDailyGrowth, updateLandscapeState, getLandscapeMessage };
}

function setupCollectiblesMock(overrides: Partial<{ unlockedCount: number; totalCount: number }> = {}) {
  const checkAndUnlock = vi.fn();
  (useCollectiblesContext as any).mockReturnValue({
    allCollectibles: [],
    unlockedCount: overrides.unlockedCount ?? 0,
    totalCount: overrides.totalCount ?? 12,
    checkAndUnlock,
  });
  return { checkAndUnlock };
}

function setupFocusTotalsMock(overrides: Partial<{ focusStreak: number }> = {}) {
  (useFocusTotals as any).mockReturnValue({
    today: { minutes: 0, sessions: 0, formatted: '0h 0m' },
    week: { minutes: 0, sessions: 0, formatted: '0h 0m' },
    focusStreak: overrides.focusStreak ?? 3,
    isLoaded: true,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LandscapePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LandscapePage — rendering & real data wiring', () => {
  it('renders the header, streak, and collection badge from real hook data', () => {
    setupLandscapeMock();
    setupCollectiblesMock({ unlockedCount: 4, totalCount: 12 });
    setupFocusTotalsMock({ focusStreak: 7 });

    renderPage();

    expect(screen.getByText('My Landscape')).toBeInTheDocument();
    expect(screen.getByText('7 day streak')).toBeInTheDocument();
    expect(screen.getByText('4/12')).toBeInTheDocument();
  });

  it('calls checkDailyGrowth, updateLandscapeState and checkAndUnlock on mount (real growth/collectible pipeline, not a no-op)', () => {
    const { checkDailyGrowth, updateLandscapeState } = setupLandscapeMock();
    const { checkAndUnlock } = setupCollectiblesMock();
    setupFocusTotalsMock();

    renderPage();

    expect(checkDailyGrowth).toHaveBeenCalledTimes(1);
    expect(updateLandscapeState).toHaveBeenCalledTimes(1);
    expect(checkAndUnlock).toHaveBeenCalledTimes(1);
  });

  it('passes today\'s real seeds (not a hardcoded count) to the landscape scene', () => {
    const today = formatDate(new Date());
    setupLandscapeMock({ seedsForDate: [seed({ id: 'a', date: today }), seed({ id: 'b', date: today, durationMinutes: 50 })] });
    setupCollectiblesMock();
    setupFocusTotalsMock();

    renderPage();

    const scene = screen.getByTestId('landscape-scene');
    expect(scene).toHaveAttribute('data-seed-count', '2');
    expect(scene).toHaveAttribute('data-view-mode', 'day');
  });
});

describe('LandscapePage — stat aggregation (traces to real seed data)', () => {
  it('day view: sums real durationMinutes across today\'s seeds, not a placeholder', () => {
    const today = formatDate(new Date());
    setupLandscapeMock({ seedsForDate: [seed({ id: 'a', date: today, durationMinutes: 25 }), seed({ id: 'b', date: today, durationMinutes: 40 })] });
    setupCollectiblesMock();
    setupFocusTotalsMock();

    renderPage();

    // 25 + 40 = 65 minutes -> "1h 5m"
    expect(screen.getByText('1h 5m')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  it('singularizes the session label when exactly one session is in view', () => {
    const today = formatDate(new Date());
    setupLandscapeMock({ seedsForDate: [seed({ id: 'a', date: today, durationMinutes: 25 })] });
    setupCollectiblesMock();
    setupFocusTotalsMock();

    renderPage();

    expect(screen.getByText('Session')).toBeInTheDocument();
  });

  it('shows the zero-state message and 0 sessions when there are no seeds today', () => {
    setupLandscapeMock({ seedsForDate: [] });
    setupCollectiblesMock();
    setupFocusTotalsMock();

    renderPage();

    expect(screen.getByText('Start a focus session to grow your landscape')).toBeInTheDocument();
    expect(screen.getByText('0h 0m')).toBeInTheDocument();
  });
});

describe('LandscapePage — view mode & date navigation (real interactive state)', () => {
  it('switching to Week view re-renders the scene in week mode and aggregates across the week', () => {
    const today = formatDate(new Date());
    setupLandscapeMock({ seedsForDate: [seed({ id: 'a', date: today, durationMinutes: 30 })] });
    setupCollectiblesMock();
    setupFocusTotalsMock();

    renderPage();
    fireEvent.click(screen.getByText('Week'));

    const scene = screen.getByTestId('landscape-scene');
    expect(scene).toHaveAttribute('data-view-mode', 'week');
    // getSeedsForDate is called once per day of the week (7x) when aggregating
    expect((useLandscape as any).mock.results[0].value.getSeedsForDate).toHaveBeenCalled();
  });

  it('disables the next-date button on today in day view, and navigating back enables "Go to Today"', () => {
    setupLandscapeMock();
    setupCollectiblesMock();
    setupFocusTotalsMock();

    renderPage();

    const [prevBtn, nextBtn] = screen.getAllByRole('button').filter(
      (b) => b.querySelector('svg.lucide-chevron-left') || b.querySelector('svg.lucide-chevron-right'),
    );
    expect(nextBtn).toBeDisabled();
    expect(screen.queryByText('Go to Today')).not.toBeInTheDocument();

    fireEvent.click(prevBtn);
    expect(screen.getByText('Go to Today')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Go to Today'));
    expect(screen.queryByText('Go to Today')).not.toBeInTheDocument();
  });
});

describe('LandscapePage — collection sheet wiring', () => {
  it('opens the Collection Sheet from the trophy badge', () => {
    setupLandscapeMock();
    setupCollectiblesMock({ unlockedCount: 2, totalCount: 12 });
    setupFocusTotalsMock();

    renderPage();

    expect(screen.queryByTestId('collection-sheet-open')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('2/12'));
    expect(screen.getByTestId('collection-sheet-open')).toHaveAttribute('data-unlocked', '2');
  });

  it('opens the Collection Sheet from the "collectibles discovered" hint when any are unlocked', () => {
    setupLandscapeMock();
    setupCollectiblesMock({ unlockedCount: 3, totalCount: 12 });
    setupFocusTotalsMock();

    renderPage();

    const hint = screen.getByText('3 collectibles discovered — tap to view');
    fireEvent.click(hint);
    expect(screen.getByTestId('collection-sheet-open')).toBeInTheDocument();
  });

  it('does not render the collectibles hint when nothing is unlocked yet', () => {
    setupLandscapeMock();
    setupCollectiblesMock({ unlockedCount: 0, totalCount: 12 });
    setupFocusTotalsMock();

    renderPage();

    expect(screen.queryByText(/discovered — tap to view/)).not.toBeInTheDocument();
  });
});

describe('LandscapePage — redesign (contrast fix)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('header subtitle ("Your focus journey visualized") uses the AA-passing muted color, not the failing shared token', () => {
    setupLandscapeMock();
    setupCollectiblesMock();
    setupFocusTotalsMock();
    renderPage();

    const node = screen.getByText('Your focus journey visualized');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the streak badge text uses the AA-passing muted color (bg-muted/50 composite failed at ~4.2:1)', () => {
    setupLandscapeMock();
    setupCollectiblesMock();
    setupFocusTotalsMock({ focusStreak: 5 });
    renderPage();

    const node = screen.getByText('5 day streak').closest('div')!;
    expect(node.className).not.toContain('text-muted-foreground ');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the inactive Week/Month view-mode tab label uses the AA-passing muted color', () => {
    setupLandscapeMock();
    setupCollectiblesMock();
    setupFocusTotalsMock();
    renderPage();

    const node = screen.getByText('Week'); // 'day' is the default active tab
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the empty-state / landscape message paragraph uses the AA-passing muted color', () => {
    setupLandscapeMock({ seedsForDate: [] });
    setupCollectiblesMock();
    setupFocusTotalsMock();
    renderPage();

    const node = screen.getByText('Start a focus session to grow your landscape');
    expect(node.className).not.toContain('text-muted-foreground ');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the collectibles-discovered hint no longer uses the severely-failing opacity-reduced muted color', () => {
    setupLandscapeMock();
    setupCollectiblesMock({ unlockedCount: 1 });
    setupFocusTotalsMock();
    renderPage();

    const node = screen.getByText('1 collectible discovered — tap to view');
    expect(node.className).not.toContain('text-muted-foreground/60');
  });
});
