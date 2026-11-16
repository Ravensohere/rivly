/**
 * FocusPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: focus (redesign pipeline, Task 4).
 *
 * FocusPage.tsx (272 lines, route `/focus`) is a thin state-machine orchestrator:
 * it switches between FocusSetup / FocusSessionActive / ActiveTimerDisplay (break)
 * / FocusFeedback based on `focusState` from FocusTimerContext and `activeTimer`
 * from the global BackgroundTimer, and wires the feedback/session-recording path
 * (useFocusSessions.addSession + EventsLedger start/end + landscape focus-seed).
 *
 * Every direct child component is stubbed to a minimal marker (same discipline
 * as DesktopControlPage.test.tsx / DayPlanner.test.tsx) so these tests exercise
 * this page's own orchestration logic — which UI shows for which state, and
 * what the feedback/session-recording path actually calls — not each child's
 * full rendered subtree.
 *
 * Fabrication check performed for this card (see focus.md handoff for detail):
 * `today`/`focusStreak`/`totalSessions` were destructured from the real
 * `useFocusTotals()` hook (a canonical, ledger-backed source — not a hardcoded
 * stat) but never read anywhere else in the file — dead code, not a false
 * claim, since nothing was ever displayed. Removed as a scoped cleanup; a test
 * below confirms the hook is no longer called at all (behavior-preserving).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mock every direct child component ───────────────────────────────────────
vi.mock('@/components/ui/PageTransition', () => ({
  PageTransition: ({ children, className }: any) => (
    <div data-testid="page-transition" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/focus/FocusSetup', () => ({
  FocusSetup: ({ onStartFocus }: any) => (
    <div data-testid="focus-setup">
      <button onClick={() => onStartFocus({ duration: 25, purpose: 'work', linkedTaskId: 't1' })}>
        Start Focus
      </button>
    </div>
  ),
}));

vi.mock('@/components/focus/FocusSessionActive', () => ({
  FocusSessionActive: ({ duration, purpose, linkedTaskId, onComplete, onCancel }: any) => (
    <div data-testid="focus-session-active">
      <span data-testid="session-duration">{duration}</span>
      <span data-testid="session-purpose">{purpose}</span>
      <span data-testid="session-linked-task">{linkedTaskId ?? 'none'}</span>
      <button onClick={() => onComplete(true, 10)}>End Early</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('@/components/focus/FocusFeedback', () => ({
  FocusFeedback: ({ duration, actualMinutes, endedEarly, onSubmit, onSkip }: any) => (
    <div data-testid="focus-feedback">
      <span data-testid="feedback-duration">{duration}</span>
      <span data-testid="feedback-actual-minutes">{actualMinutes}</span>
      <span data-testid="feedback-ended-early">{String(endedEarly)}</span>
      <button onClick={() => onSubmit('good')}>Good</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

vi.mock('@/components/focus/FocusDebugPanel', () => ({
  FocusDebugPanel: () => <div data-testid="focus-debug-panel" />,
}));

vi.mock('@/components/timer/ActiveTimerDisplay', () => ({
  ActiveTimerDisplay: ({ purpose }: any) => (
    <div data-testid="active-timer-display">break:{purpose}</div>
  ),
}));

vi.mock('@/components/mental/ThoughtParkingSheet', () => ({
  ThoughtParkingSheet: ({ open, onSave }: any) =>
    open ? (
      <div data-testid="thought-parking-sheet">
        <button onClick={() => onSave('a thought', 'idea', true)}>Save thought</button>
      </div>
    ) : null,
}));

// ── Mock hooks/contexts FocusPage calls directly ────────────────────────────
const addSessionMock = vi.fn();
vi.mock('@/hooks/useFocusSessions', () => ({
  useFocusSessions: () => ({ addSession: addSessionMock }),
}));

vi.mock('@/hooks/useTimeBlocks', () => ({
  useTimeBlocks: () => ({ getBlocksForDate: () => [{ id: 'b1', title: 'Block 1', status: 'pending' }] }),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ getTasksForDate: () => [{ id: 't1', title: 'Task 1', status: 'todo' }] }),
}));

vi.mock('@/hooks/useLandscape', () => ({
  useLandscape: () => ({ addFocusSeed: addFocusSeedMock, checkDailyGrowth: checkDailyGrowthMock }),
}));

vi.mock('@/contexts/RhythmOrbContext', () => ({
  useRhythmOrbContext: () => ({ triggerFocused: triggerFocusedMock }),
}));

const startFocusSessionMock = vi.fn();
const endFocusSessionMock = vi.fn().mockResolvedValue(undefined);
const reloadDataMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/contexts/EventsLedgerContext', () => ({
  useEventsLedgerContext: () => ({
    startFocusSession: startFocusSessionMock,
    endFocusSession: endFocusSessionMock,
    reloadData: reloadDataMock,
  }),
}));

// This hook is intentionally NOT imported by FocusPage.tsx post-cleanup (its
// result was dead code — destructured but never rendered). Mocking it anyway
// keeps this test file resilient if it's ever reintroduced; the dedicated
// test below asserts it is not actually called.
const useFocusTotalsMock = vi.fn(() => ({ today: { minutes: 0 }, focusStreak: 0, totalSessions: 0 }));
vi.mock('@/hooks/useFocusTotals', () => ({
  useFocusTotals: (...args: unknown[]) => useFocusTotalsMock(...args),
}));

vi.mock('@/hooks/useParkedThoughts', () => ({
  useParkedThoughts: () => ({ addThought: addThoughtMock }),
}));

// ── Controllable focus-timer / background-timer state ──────────────────────
let focusTimerState: any;
const startFocusMock = vi.fn();
const cancelFocusMock = vi.fn();
const endFocusEarlyMock = vi.fn();
const completeFeedbackMock = vi.fn();

function resetFocusTimerState() {
  focusTimerState = {
    focusState: 'idle',
    sessionConfig: null,
    sessionResult: null,
    startFocus: startFocusMock,
    cancelFocus: cancelFocusMock,
    endFocusEarly: endFocusEarlyMock,
    completeFeedback: completeFeedbackMock,
  };
}
vi.mock('@/contexts/FocusTimerContext', () => ({
  useFocusTimer: () => focusTimerState,
}));

let showCelebrationState = false;
vi.mock('@/contexts/TimerCompletionContext', () => ({
  useTimerCompletion: () => ({ showCelebration: showCelebrationState }),
}));

let backgroundTimerState: any;
function resetBackgroundTimerState() {
  backgroundTimerState = {
    activeTimer: null,
    formattedTime: '00:00',
    progress: 0,
    isPaused: false,
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  };
}
vi.mock('@/hooks/useBackgroundTimer', () => ({
  useBackgroundTimer: () => backgroundTimerState,
}));

const addFocusSeedMock = vi.fn();
const checkDailyGrowthMock = vi.fn();
const triggerFocusedMock = vi.fn();
const addThoughtMock = vi.fn().mockResolvedValue({ id: 'thought-1' });
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

import FocusPage from '../FocusPage';

describe('FocusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFocusTimerState();
    resetBackgroundTimerState();
    showCelebrationState = false;
  });

  it('renders FocusSetup when idle and no break is active', () => {
    render(<FocusPage />);
    expect(screen.getByTestId('focus-setup')).toBeInTheDocument();
    expect(screen.queryByTestId('focus-session-active')).not.toBeInTheDocument();
    expect(screen.queryByTestId('active-timer-display')).not.toBeInTheDocument();
  });

  it('starting a session calls startFocus, startFocusSession, and triggerFocused with real config', () => {
    render(<FocusPage />);
    fireEvent.click(screen.getByText('Start Focus'));

    expect(startFocusMock).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 25, purposeType: 'work', linkedTaskId: 't1' })
    );
    expect(startFocusSessionMock).toHaveBeenCalledWith({ taskId: 't1', blockId: undefined });
    expect(triggerFocusedMock).toHaveBeenCalledWith('focus_session');
  });

  it('renders FocusSessionActive with the real session config while running', () => {
    focusTimerState.focusState = 'running';
    focusTimerState.sessionConfig = {
      duration: 25,
      purpose: 'Work',
      purposeType: 'work',
      linkedTaskId: 'task-42',
    };
    render(<FocusPage />);

    expect(screen.getByTestId('focus-session-active')).toBeInTheDocument();
    expect(screen.getByTestId('session-duration')).toHaveTextContent('25');
    expect(screen.getByTestId('session-purpose')).toHaveTextContent('Work');
    expect(screen.getByTestId('session-linked-task')).toHaveTextContent('task-42');
    expect(screen.queryByTestId('focus-setup')).not.toBeInTheDocument();
  });

  it('renders FocusSessionActive while paused (same session UI, real paused state)', () => {
    focusTimerState.focusState = 'paused';
    focusTimerState.sessionConfig = { duration: 25, purpose: 'Work', purposeType: 'work' };
    render(<FocusPage />);
    expect(screen.getByTestId('focus-session-active')).toBeInTheDocument();
  });

  it('uses the custom purpose label when purposeType is custom', () => {
    focusTimerState.focusState = 'running';
    focusTimerState.sessionConfig = {
      duration: 25,
      purpose: 'custom',
      purposeType: 'custom',
      customPurpose: 'Reading',
    };
    render(<FocusPage />);
    expect(screen.getByTestId('session-purpose')).toHaveTextContent('Reading');
  });

  it('ending a session early calls endFocusEarly via onComplete', () => {
    focusTimerState.focusState = 'running';
    focusTimerState.sessionConfig = { duration: 25, purpose: 'Work', purposeType: 'work' };
    render(<FocusPage />);
    fireEvent.click(screen.getByText('End Early'));
    expect(endFocusEarlyMock).toHaveBeenCalled();
  });

  it('cancelling a session calls cancelFocus', () => {
    focusTimerState.focusState = 'running';
    focusTimerState.sessionConfig = { duration: 25, purpose: 'Work', purposeType: 'work' };
    render(<FocusPage />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(cancelFocusMock).toHaveBeenCalled();
  });

  it('shows the break timer (ActiveTimerDisplay) instead of setup when a custom-mode timer is running', () => {
    backgroundTimerState.activeTimer = { mode: 'custom', status: 'running', label: 'Break' };
    render(<FocusPage />);
    expect(screen.getByTestId('active-timer-display')).toBeInTheDocument();
    expect(screen.queryByTestId('focus-setup')).not.toBeInTheDocument();
  });

  it('renders real feedback data (duration/actualMinutes/endedEarly) when a session completes', () => {
    focusTimerState.focusState = 'feedback';
    focusTimerState.sessionConfig = { duration: 25, purpose: 'Work', purposeType: 'work' };
    focusTimerState.sessionResult = { endedEarly: true, actualMinutes: 12, startTime: '2026-01-01T00:00:00Z' };
    render(<FocusPage />);

    expect(screen.getByTestId('focus-feedback')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-duration')).toHaveTextContent('25');
    expect(screen.getByTestId('feedback-actual-minutes')).toHaveTextContent('12');
    expect(screen.getByTestId('feedback-ended-early')).toHaveTextContent('true');
  });

  it('submitting feedback records the real session result to addSession and the events ledger', async () => {
    focusTimerState.focusState = 'feedback';
    focusTimerState.sessionConfig = {
      duration: 25,
      purpose: 'Work',
      purposeType: 'work',
      linkedTaskId: 'task-7',
    };
    focusTimerState.sessionResult = { endedEarly: true, actualMinutes: 12, startTime: '2026-01-01T00:00:00Z' };
    render(<FocusPage />);

    fireEvent.click(screen.getByText('Good'));

    expect(addSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMinutes: 12,
        purpose: 'Work',
        linkedTaskId: 'task-7',
        outcome: 'good',
        endedEarly: true,
      })
    );
    await vi.waitFor(() => expect(completeFeedbackMock).toHaveBeenCalled());
    expect(endFocusSessionMock).toHaveBeenCalledWith({
      outcome: 'good',
      completed: false,
      durationMinutes: 12,
    });
    expect(addFocusSeedMock).toHaveBeenCalledWith(12, false, true, 'Work');
    expect(checkDailyGrowthMock).toHaveBeenCalled();
  });

  it('skipping feedback records outcome "some" instead of asking the user', () => {
    focusTimerState.focusState = 'feedback';
    focusTimerState.sessionConfig = { duration: 25, purpose: 'Work', purposeType: 'work' };
    focusTimerState.sessionResult = { endedEarly: false, actualMinutes: 25, startTime: '2026-01-01T00:00:00Z' };
    render(<FocusPage />);

    fireEvent.click(screen.getByText('Skip'));

    expect(addSessionMock).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'some' }));
  });

  it('auto-submits "good" feedback without user interaction when the global celebration overlay is showing', async () => {
    focusTimerState.focusState = 'feedback';
    focusTimerState.sessionConfig = { duration: 25, purpose: 'Work', purposeType: 'work' };
    focusTimerState.sessionResult = { endedEarly: false, actualMinutes: 25, startTime: '2026-01-01T00:00:00Z' };
    showCelebrationState = true;
    render(<FocusPage />);

    // Real behavior (FocusTimerContext comment: "avoids double screens"): the
    // feedback UI itself is suppressed while the celebration overlay is up...
    expect(screen.queryByTestId('focus-feedback')).not.toBeInTheDocument();
    // ...but the session is still recorded automatically, with outcome 'good'.
    await vi.waitFor(() => expect(completeFeedbackMock).toHaveBeenCalled());
    expect(addSessionMock).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'good' }));
  });

  it('opens the thought-parking sheet and navigates to /reflect when a thought is converted to a task', async () => {
    render(<FocusPage />);
    expect(screen.queryByTestId('thought-parking-sheet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Park a thought'));
    expect(screen.getByTestId('thought-parking-sheet')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save thought'));
    await vi.waitFor(() => expect(addThoughtMock).toHaveBeenCalledWith('a thought', expect.anything()));
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/reflect'));
  });

  it('always renders the debug panel mount point (it self-gates on ?debug=1 internally)', () => {
    render(<FocusPage />);
    expect(screen.getByTestId('focus-debug-panel')).toBeInTheDocument();
  });

  it('does not call the unused useFocusTotals hook (dead destructuring removed)', () => {
    render(<FocusPage />);
    expect(useFocusTotalsMock).not.toHaveBeenCalled();
  });
});
