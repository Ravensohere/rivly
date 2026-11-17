/**
 * InsightsPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: insights (redesign pipeline, Task 4).
 *
 * InsightsPage is the app's stats/analytics page (route `/insights`,
 * protected in AnimatedRoutes.tsx). It is the second large (1000+ line),
 * no-prior-tests page in this pipeline — per the card's scope discipline,
 * no structural redesign was attempted; fixes are a dead import removal and
 * a set of concrete, hand-verified contrast fixes (see "redesign (contrast
 * fix)" describe block below).
 *
 * Every direct child component InsightsPage imports is stubbed to a minimal
 * marker (recharts included) so these tests exercise InsightsPage's OWN
 * container logic (stat computation from mocked hook/ledger data, view-range
 * switching, loading/guest gates) — not the full rendered subtree of each
 * feature component or chart library, which are each out of scope for this
 * card and would require deep mocking the brief warned against.
 *
 * The "computed values trace to real data" tests are the point of this file:
 * they feed concrete numbers into the mocked EventsLedgerContext/useFocusTotals
 * and assert the exact arithmetic InsightsPage performs on them (focus time
 * formatting, tasks-done/active-percent, sleep nights, streak) — proving the
 * summary cards are not hardcoded placeholders.
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
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: vi.fn() }));
vi.mock('@/hooks/useUserPreferences', () => ({ useUserPreferences: vi.fn() }));
vi.mock('@/contexts/EventsLedgerContext', () => ({ useEventsLedgerContext: vi.fn() }));
vi.mock('@/hooks/useFocusTotals', () => ({ useFocusTotals: vi.fn() }));
vi.mock('@/hooks/useFocusSessions', () => ({ useFocusSessions: vi.fn() }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: vi.fn() }));
vi.mock('@/hooks/useCheckIn', () => ({ useCheckIn: vi.fn() }));

// ── Child components — shallow stubs so this file tests InsightsPage's own logic ──
vi.mock('@/components/ui/PageTransition', () => ({
  PageTransition: ({ children, className }: any) => (
    <div data-testid="page-transition" className={className}>{children}</div>
  ),
}));
vi.mock('@/components/insights/GoalsSection', () => ({ GoalsSection: () => <div data-testid="goals-section" /> }));
vi.mock('@/components/insights/AchievementsSection', () => ({ AchievementsSection: () => <div data-testid="achievements-section" /> }));
vi.mock('@/components/insights/ActivityHeatmap', () => ({ ActivityHeatmap: () => <div data-testid="activity-heatmap" /> }));
vi.mock('@/components/insights/DebugPanel', () => ({ DebugPanel: () => <div data-testid="debug-panel" /> }));
vi.mock('@/components/settings/FeedbackModal', () => ({
  FeedbackModal: ({ open }: any) => (open ? <div data-testid="feedback-modal-open" /> : null),
}));
vi.mock('@/components/analytics/RhythmReportCard', () => ({
  RhythmReportCard: ({ onClose }: any) => (
    <div data-testid="rhythm-report-card"><button onClick={onClose}>close-report</button></div>
  ),
}));

// ── recharts — stubbed so chart internals (which need real DOM layout) never
//    run in jsdom; InsightsPage's own ChartCard/isEmpty branching is still exercised ──
vi.mock('recharts', () => {
  const Stub = ({ children }: any) => <div data-testid="chart-stub">{children}</div>;
  return {
    AreaChart: Stub, Area: Stub, BarChart: Stub, Bar: Stub,
    XAxis: Stub, YAxis: Stub, ResponsiveContainer: Stub, Tooltip: Stub,
    CartesianGrid: Stub, Cell: Stub,
  };
});

import InsightsPage from '@/pages/InsightsPage';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { useFocusSessions } from '@/hooks/useFocusSessions';
import { useTasks } from '@/hooks/useTasks';
import { useCheckIn } from '@/hooks/useCheckIn';

function mockDay(dateKey: string, value: number) {
  return { dateKey, value };
}

// Concrete ledger fixture used for the computed-value sanity checks below.
// focusByDay: 7 days, 3 with focus (d1, d3, d6) → daysWithFocus = {d1,d3,d6}
// tasksByDay: 7 days, 2 with tasks (d1, d4)     → daysWithTasks = {d1,d4}
// union = {d1,d3,d4,d6} → daysActive = 4, totalDays = 7 → activePercent = round(4/7*100) = 57
const FOCUS_BY_DAY = [
  mockDay('2026-11-04', 30), mockDay('2026-11-05', 0), mockDay('2026-11-06', 20),
  mockDay('2026-11-07', 0), mockDay('2026-11-08', 0), mockDay('2026-11-09', 45),
  mockDay('2026-11-10', 0),
];
const TASKS_BY_DAY = [
  mockDay('2026-11-04', 1), mockDay('2026-11-05', 0), mockDay('2026-11-06', 0),
  mockDay('2026-11-07', 2), mockDay('2026-11-08', 0), mockDay('2026-11-09', 0),
  mockDay('2026-11-10', 0),
];

function setupDefaultMocks(overrides: {
  isGuest?: boolean;
  isLoaded?: boolean;
} = {}) {
  (useAuthContext as any).mockReturnValue({ isGuest: overrides.isGuest ?? false });
  (useUserPreferences as any).mockReturnValue({ firstName: 'Ravi' });
  (useFocusTotals as any).mockReturnValue({
    today: { minutes: 0, formatted: '0m' },
    week: { minutes: 125, formatted: '2h 5m' },
    focusStreak: 4,
  });
  (useFocusSessions as any).mockReturnValue({ sessions: [] });
  (useTasks as any).mockReturnValue({ tasks: [] });
  (useCheckIn as any).mockReturnValue({ checkIns: [] });
  (useEventsLedgerContext as any).mockReturnValue({
    isLoaded: overrides.isLoaded ?? true,
    timeRange: 'week',
    setTimeRange: vi.fn(),
    focusByDay: FOCUS_BY_DAY,
    tasksByDay: TASKS_BY_DAY,
    sleepByDay: [],
    totalCompletedTasks: 7,
    totalCreatedTasks: 10,
    sleepDistribution: { good: 3, okay: 1, poor: 1 },
    focusSessions: [{ dateKey: '2026-11-04' }, { dateKey: '2026-11-06' }, { dateKey: '2026-11-09' }, { dateKey: '2026-11-10' }],
    todayCompletedTasks: 2,
    todayCreatedTasks: 3,
    todaySleepEvent: undefined,
    moodByDay: [],
    energyByDay: [],
    todayCheckInEvent: undefined,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <InsightsPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

describe('InsightsPage — baseline rendering', () => {
  it('renders without crashing for an authenticated (non-guest) user', () => {
    renderPage();
    expect(screen.getByText('Weekly Insights')).toBeInTheDocument();
    expect(screen.getByText('Your rhythm at a glance')).toBeInTheDocument();
  });

  it('shows a loading state and nothing else while the ledger has not loaded', () => {
    setupDefaultMocks({ isLoaded: false });
    renderPage();
    expect(screen.getByText('Loading insights...')).toBeInTheDocument();
    expect(screen.queryByText('Weekly Insights')).not.toBeInTheDocument();
  });

  it('renders the key landmark sections', () => {
    renderPage();
    expect(screen.getAllByText('Focus Time').length).toBeGreaterThan(0); // chart title + summary card title
    expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
    expect(screen.getByText('Sleep & Recovery')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('achievements-section')).toBeInTheDocument();
    expect(screen.getByTestId('goals-section')).toBeInTheDocument();
    expect(screen.getByText('Settings & Preferences →')).toBeInTheDocument();
    expect(screen.getByText('Send Feedback')).toBeInTheDocument();
  });

  it('shows the guest lock overlay (and blurs content) when isGuest is true', () => {
    setupDefaultMocks({ isGuest: true });
    renderPage();
    expect(screen.getByText('Insights are Locked')).toBeInTheDocument();
    expect(screen.getByText('Sign in to Unlock')).toBeInTheDocument();
  });

  it('does not show the guest overlay for a signed-in (non-guest) user', () => {
    renderPage();
    expect(screen.queryByText('Insights are Locked')).not.toBeInTheDocument();
  });
});

describe('InsightsPage — computed stats trace to real ledger data, not placeholders', () => {
  it('Focus Time card formats week minutes (125) as "2h 5m"', () => {
    renderPage();
    expect(screen.getByText('2h 5m')).toBeInTheDocument();
  });

  it('Tasks Done card shows the real totalCompletedTasks and the computed active-days percent', () => {
    renderPage();
    // totalTasksCompleted = totalCompletedTasks = 7
    expect(screen.getByText('7')).toBeInTheDocument();
    // daysActive = |{d1,d3,d6} ∪ {d1,d4}| = 4; totalDays = focusByDay.length = 7
    // activePercent = round(4/7*100) = 57
    expect(screen.getByText('57% days active')).toBeInTheDocument();
  });

  it('Good Sleep card shows sleepDistribution.good nights out of the real total nights rated', () => {
    renderPage();
    // goodSleepDays = sleepDistribution.good = 3; daysWithSleepData = 3+1+1 = 5
    expect(screen.getByText('3 nights')).toBeInTheDocument();
    expect(screen.getByText('of 5 nights rated good')).toBeInTheDocument();
  });

  it('Focus Streak card shows the real focusStreak value and the "on fire" trend at >=3', () => {
    renderPage();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('on fire!')).toBeInTheDocument();
  });

  it('shows 0 nights / no sleep data copy when sleepDistribution is all zero', () => {
    (useEventsLedgerContext as any).mockReturnValue({
      isLoaded: true,
      timeRange: 'week',
      setTimeRange: vi.fn(),
      focusByDay: FOCUS_BY_DAY,
      tasksByDay: TASKS_BY_DAY,
      sleepByDay: [],
      totalCompletedTasks: 0,
      totalCreatedTasks: 0,
      sleepDistribution: { good: 0, okay: 0, poor: 0 },
      focusSessions: [],
      todayCompletedTasks: 0,
      todayCreatedTasks: 0,
      todaySleepEvent: undefined,
      moodByDay: [],
      energyByDay: [],
      todayCheckInEvent: undefined,
    });
    renderPage();
    expect(screen.getByText('0 nights')).toBeInTheDocument();
    expect(screen.getByText('no sleep data logged')).toBeInTheDocument();
  });
});

describe('InsightsPage — primary interaction (view-range toggle)', () => {
  it('switches ledger timeRange to "month" when the Month tab is clicked', () => {
    const setTimeRange = vi.fn();
    (useEventsLedgerContext as any).mockReturnValue({
      isLoaded: true,
      timeRange: 'week',
      setTimeRange,
      focusByDay: FOCUS_BY_DAY,
      tasksByDay: TASKS_BY_DAY,
      sleepByDay: [],
      totalCompletedTasks: 7,
      totalCreatedTasks: 10,
      sleepDistribution: { good: 3, okay: 1, poor: 1 },
      focusSessions: [],
      todayCompletedTasks: 2,
      todayCreatedTasks: 3,
      todaySleepEvent: undefined,
      moodByDay: [],
      energyByDay: [],
      todayCheckInEvent: undefined,
    });
    renderPage();

    fireEvent.click(screen.getByText('Month'));

    expect(screen.getByText('Monthly Insights')).toBeInTheDocument();
    expect(setTimeRange).toHaveBeenCalledWith('month');
  });

  it('opens the Rhythm Report modal from "See Your Month"', () => {
    renderPage();
    fireEvent.click(screen.getByText('See Your Month'));
    expect(screen.getByTestId('rhythm-report-card')).toBeInTheDocument();
  });
});

describe('InsightsPage — redesign (contrast fix)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('header range label uses the AA-passing muted color, not the failing shared token', () => {
    renderPage();
    const node = screen.getByText('Last 7 days');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('header subtitle ("Your rhythm at a glance") uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText('Your rhythm at a glance');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('"Settings & Preferences" link text uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText('Settings & Preferences →');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the inactive Day/Week/Month tab label uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText('Day'); // 'week' is the default active tab, so 'Day' starts inactive
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the InsightCard subtitle no longer uses the severely-failing opacity-reduced muted color', () => {
    renderPage();
    const node = screen.getByText('4 sessions');
    expect(node.className).not.toContain('text-muted-foreground/70');
  });
});
