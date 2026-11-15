/**
 * DayPlanner.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: day-planner (redesign pipeline, Task 4).
 *
 * DayPlanner is the app's primary authenticated landing page (route `/app`,
 * protected in AnimatedRoutes.tsx). It is the largest, most functionally
 * complex page touched by this pipeline so far, and had no test file of its
 * own before this card. Per the card's scope discipline, no structural
 * redesign was attempted here — the fixes are dead-code removal only (unused
 * imports, an unused sub-component pair, an unused responsive-size effect,
 * two unused destructured hook fields). None of that is visually observable,
 * so unlike `calendar-callback`/`alarm-ringing` there is no RED-before/
 * GREEN-after contrast assertion in this file — these tests exist to prove
 * the dead-code removal is behavior-preserving (same baseline passes before
 * and after), which is the real risk on a page this size.
 *
 * Every direct child component DayPlanner imports is stubbed to a minimal
 * marker so these tests exercise DayPlanner's OWN container logic (data
 * wiring, conditional branches, the global 'q' hotkey, the loading gate) —
 * not the full rendered subtree of ~20 feature components, each with its own
 * hook/context dependencies that are out of scope for this card.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-router-dom ─────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Hooks (module mocks; configured per-test via vi.mocked(...).mockReturnValue) ──
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useRiva', () => ({ useRiva: vi.fn() }));
vi.mock('@/hooks/useTimeBlocks', () => ({ useTimeBlocks: vi.fn() }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: vi.fn() }));
vi.mock('@/hooks/useCheckIn', () => ({ useCheckIn: vi.fn() }));
vi.mock('@/hooks/useFocusSessions', () => ({ useFocusSessions: vi.fn() }));
vi.mock('@/hooks/useParkedThoughts', () => ({ useParkedThoughts: vi.fn() }));
vi.mock('@/contexts/RhythmOrbContext', () => ({ useRhythmOrbContext: vi.fn() }));
vi.mock('@/hooks/useOnboarding', () => ({ useOnboarding: vi.fn() }));
vi.mock('@/hooks/useEvents', () => ({ useEvents: vi.fn() }));
vi.mock('@/contexts/EventsLedgerContext', () => ({ useEventsLedgerContext: vi.fn() }));
vi.mock('@/hooks/useMorningBridge', () => ({ useMorningBridge: vi.fn() }));
vi.mock('@/hooks/useGoogleCalendarSimple', () => ({ useGoogleCalendarSimple: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: vi.fn() }));

// ── Child components — shallow stubs so this file tests DayPlanner's own logic ──
vi.mock('@/components/ui/PageTransition', () => ({
  PageTransition: ({ children, className }: any) => (
    <div data-testid="page-transition" className={className}>{children}</div>
  ),
}));
vi.mock('@/components/planner/DayHeader', () => ({ DayHeader: () => <div data-testid="day-header" /> }));
vi.mock('@/components/planner/CalendarView', () => ({
  CalendarView: ({ blocks, events }: any) => (
    <div data-testid="calendar-view">blocks:{blocks.length} events:{events.length}</div>
  ),
}));
vi.mock('@/components/planner/TimelineView', () => ({
  TimelineView: ({ blocks, unlinkedTasks }: any) => (
    <div data-testid="timeline-view">blocks:{blocks.length} tasks:{unlinkedTasks.length}</div>
  ),
}));
vi.mock('@/components/planner/AnimatedBackground', () => ({ AnimatedBackground: () => <div data-testid="animated-background" /> }));
vi.mock('@/components/planner/FloatingActionButton', () => ({
  FloatingActionButton: ({ onAddBlock, onAddTask }: any) => (
    <div data-testid="fab">
      <button onClick={onAddTask}>fab-add-task</button>
      <button onClick={onAddBlock}>fab-add-block</button>
    </div>
  ),
}));
vi.mock('@/components/planner/AddBlockDialog', () => ({
  AddBlockDialog: ({ open }: any) => (open ? <div data-testid="add-block-dialog-open" /> : null),
}));
vi.mock('@/components/planner/AddTaskDialog', () => ({
  AddTaskDialog: ({ open }: any) => (open ? <div data-testid="add-task-dialog-open" /> : null),
}));
vi.mock('@/components/planner/BlockDetailSheet', () => ({
  BlockDetailSheet: ({ open }: any) => (open ? <div data-testid="block-detail-open" /> : null),
}));
vi.mock('@/components/checkin/DailyCheckInModal', () => ({
  DailyCheckInModal: ({ open }: any) => (open ? <div data-testid="checkin-modal-open" /> : null),
}));
vi.mock('@/components/mental/OverwhelmedScreen', () => ({
  OverwhelmedScreen: ({ open }: any) => (open ? <div data-testid="overwhelmed-open" /> : null),
}));
vi.mock('@/components/mental/ThoughtParkingSheet', () => ({
  ThoughtParkingSheet: ({ open }: any) => (open ? <div data-testid="thought-parking-open" /> : null),
}));
vi.mock('@/components/inbox/SuggestionsTray', () => ({ SuggestionsTray: () => <div data-testid="suggestions-tray" /> }));
vi.mock('@/components/onboarding/FirstActionNudge', () => ({
  FirstActionNudge: ({ type, show }: any) => (show ? <div data-testid={`nudge-${type}`} /> : null),
}));
vi.mock('@/components/planner/DayPlannerAvatar', () => ({
  DayPlannerAvatar: ({ size }: any) => <div data-testid="day-planner-avatar">{size}</div>,
}));
vi.mock('@/components/ui/RivaGlobe', () => ({ RivaGlobe: () => <div data-testid="riva-globe" /> }));
vi.mock('@/components/planner/TimeGreeting', () => ({
  TimeGreeting: ({ hasCheckedIn }: any) => (
    <div data-testid="time-greeting">{hasCheckedIn ? 'checked-in' : 'not-checked-in'}</div>
  ),
}));
vi.mock('@/components/planner/DateSelector', () => ({ DateSelector: () => <div data-testid="date-selector" /> }));
vi.mock('@/components/planner/ViewToggle', () => ({
  ViewToggle: ({ viewMode, onViewModeChange }: any) => (
    <div data-testid="view-toggle">
      <span>{viewMode}</span>
      <button onClick={() => onViewModeChange('plan')}>switch-to-plan</button>
      <button onClick={() => onViewModeChange('flow')}>switch-to-flow</button>
    </div>
  ),
}));
vi.mock('@/components/calendar/CalendarModal', () => ({
  CalendarModal: ({ open }: any) => (open ? <div data-testid="calendar-modal-open" /> : null),
}));
vi.mock('@/components/calendar/EventFormModal', () => ({
  EventFormModal: ({ open }: any) => (open ? <div data-testid="event-form-open" /> : null),
}));
vi.mock('@/components/calendar/EventsList', () => ({ EventsList: () => <div data-testid="events-list" /> }));
vi.mock('@/components/sleep/MorningBridgeDisplayCard', () => ({
  MorningBridgeDisplayCard: () => <div data-testid="morning-bridge-card" />,
}));
vi.mock('@/components/sleep/MorningVoicePrompt', () => ({ MorningVoicePrompt: () => <div data-testid="morning-voice-prompt" /> }));
vi.mock('@/components/planner/EditTaskDialog', () => ({
  EditTaskDialog: ({ open }: any) => (open ? <div data-testid="edit-task-open" /> : null),
}));
vi.mock('@/components/planner/EditBlockDialog', () => ({
  EditBlockDialog: ({ open }: any) => (open ? <div data-testid="edit-block-open" /> : null),
}));
vi.mock('@/components/mental/BreathworkPauseModal', () => ({
  BreathworkPauseModal: ({ open }: any) => (open ? <div data-testid="breathwork-open" /> : null),
}));
vi.mock('@/components/planner/NextBlockPanel', () => ({
  NextBlockPanel: ({ block }: any) => <div data-testid="next-block-panel">{block ? block.title : 'none'}</div>,
}));

import { useAuth } from '@/hooks/useAuth';
import { useRiva } from '@/hooks/useRiva';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { useTasks } from '@/hooks/useTasks';
import { useCheckIn } from '@/hooks/useCheckIn';
import { useFocusSessions } from '@/hooks/useFocusSessions';
import { useParkedThoughts } from '@/hooks/useParkedThoughts';
import { useRhythmOrbContext } from '@/contexts/RhythmOrbContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useEvents } from '@/hooks/useEvents';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useMorningBridge } from '@/hooks/useMorningBridge';
import { useGoogleCalendarSimple } from '@/hooks/useGoogleCalendarSimple';
import { useToast } from '@/hooks/use-toast';
import DayPlanner from '../DayPlanner';
import { getLocalDateKey } from '@/lib/dateUtils';

function renderPlanner() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <DayPlanner />
    </MemoryRouter>
  );
}

const baseTasksHook = {
  tasks: [] as any[],
  isLoaded: true,
  getTasksForBlock: () => [],
  getUnlinkedTasks: () => [],
  getCompletedTasksForDate: () => [],
  addTask: vi.fn().mockResolvedValue({ id: 'task-1' }),
  toggleTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  cleanupCompletedTasks: vi.fn(),
};

const baseBlocksHook = {
  getBlocksForDate: () => [],
  addBlock: vi.fn().mockResolvedValue({ id: 'block-1' }),
  updateBlock: vi.fn(),
  deleteBlock: vi.fn(),
  completeBlock: vi.fn(),
  startBlock: vi.fn(),
  isLoaded: true,
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useAuth).mockReturnValue({
    session: { access_token: 'tok-123', user: { id: 'user-1' } },
  } as any);
  vi.mocked(useRiva).mockReturnValue({ rivaResponse: null } as any);
  vi.mocked(useTimeBlocks).mockReturnValue({ ...baseBlocksHook } as any);
  vi.mocked(useTasks).mockReturnValue({ ...baseTasksHook } as any);
  vi.mocked(useCheckIn).mockReturnValue({
    hasCheckedInToday: () => false,
    saveCheckIn: vi.fn(),
    getCheckInForDate: () => null,
  } as any);
  vi.mocked(useFocusSessions).mockReturnValue({
    getCompletedSessionsCount: () => 0,
    sessions: [],
  } as any);
  vi.mocked(useParkedThoughts).mockReturnValue({ addThought: vi.fn() } as any);
  vi.mocked(useRhythmOrbContext).mockReturnValue({
    setSelectedDate: vi.fn(),
    triggerFocused: vi.fn(),
    triggerOverwhelmed: vi.fn(),
    clearOverwhelmed: vi.fn(),
  } as any);
  vi.mocked(useOnboarding).mockReturnValue({
    shouldShowAddTaskNudge: false,
    shouldShowTaskAddedNudge: false,
    dismissAddTaskNudge: vi.fn(),
    dismissTaskAddedNudge: vi.fn(),
    markFirstTaskAdded: vi.fn(),
  } as any);
  vi.mocked(useEvents).mockReturnValue({
    getEventsForDate: () => [],
    isLoading: false,
  } as any);
  vi.mocked(useEventsLedgerContext).mockReturnValue({
    recordTaskCreated: vi.fn(),
    recordTaskCompleted: vi.fn(),
    recordTaskUncompleted: vi.fn(),
    recordTaskDeleted: vi.fn(),
  } as any);
  vi.mocked(useMorningBridge).mockReturnValue({
    shouldShow: false,
    nextPendingAction: null,
    allActionsDone: false,
    markActionDone: vi.fn(),
    skipAction: vi.fn(),
    markShown: vi.fn(),
  } as any);
  vi.mocked(useGoogleCalendarSimple).mockReturnValue({
    isConnected: false,
    fetchGoogleEvents: vi.fn(),
    createGoogleEvent: vi.fn(),
    googleEvents: [],
  } as any);
  vi.mocked(useToast).mockReturnValue({ toast: vi.fn() } as any);
});

describe('DayPlanner — baseline contract', () => {
  it('renders the main dashboard without crashing for a logged-in user', () => {
    renderPlanner();
    expect(screen.getByTestId('page-transition')).toBeInTheDocument();
  });

  it('shows the loading spinner (not the dashboard) while tasks/blocks have not loaded yet', () => {
    vi.mocked(useTasks).mockReturnValue({ ...baseTasksHook, isLoaded: false } as any);
    renderPlanner();

    expect(screen.queryByTestId('page-transition')).not.toBeInTheDocument();
    expect(screen.queryByTestId('time-greeting')).not.toBeInTheDocument();
  });

  it('renders the key landmark sections once data has loaded', () => {
    renderPlanner();

    expect(screen.getByTestId('time-greeting')).toBeInTheDocument();
    expect(screen.getByTestId('date-selector')).toBeInTheDocument();
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('day-planner-avatar')).toBeInTheDocument();
    expect(screen.getByTestId('suggestions-tray')).toBeInTheDocument();
    expect(screen.getByTestId('fab')).toBeInTheDocument();
  });

  it('defaults to the flow (Timeline) view', () => {
    renderPlanner();
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument();
    expect(screen.queryByTestId('calendar-view')).not.toBeInTheDocument();
  });

  it('switches to the Plan (Calendar) view when the view toggle requests it', () => {
    renderPlanner();
    fireEvent.click(screen.getByText('switch-to-plan'));

    expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-view')).not.toBeInTheDocument();
  });

  it('reflects hasCheckedInToday() in the greeting', () => {
    vi.mocked(useCheckIn).mockReturnValue({
      hasCheckedInToday: () => true,
      saveCheckIn: vi.fn(),
      getCheckInForDate: () => null,
    } as any);
    renderPlanner();

    expect(screen.getByTestId('time-greeting').textContent).toBe('checked-in');
  });

  it('passes the real block/task counts for the selected day through to TimelineView, not placeholder data', () => {
    vi.mocked(useTimeBlocks).mockReturnValue({
      ...baseBlocksHook,
      getBlocksForDate: () => [
        { id: 'b1', title: 'Block 1', startTime: '09:00', endTime: '10:00', status: 'planned', tasks: [] },
      ],
    } as any);
    vi.mocked(useTasks).mockReturnValue({
      ...baseTasksHook,
      getUnlinkedTasks: () => [{ id: 't1', title: 'Task 1', status: 'todo' }],
    } as any);
    renderPlanner();

    expect(screen.getByTestId('timeline-view').textContent).toBe('blocks:1 tasks:1');
  });

  it('shows the overdue badge only when getOverdueTasks (real logic) finds an overdue todo task', async () => {
    const todayKey = getLocalDateKey();
    vi.mocked(useTasks).mockReturnValue({
      ...baseTasksHook,
      tasks: [{ id: 'overdue-1', title: 'Old task', status: 'todo', dateKey: '2000-01-01', tag: 'personal' }],
    } as any);
    renderPlanner();

    expect(await screen.findByText('1 overdue')).toBeInTheDocument();
  });

  it('does not show the overdue badge when there are no overdue tasks', () => {
    renderPlanner();
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
  });

  it('opens AddTaskDialog when the "Q" hotkey is pressed outside of any input', () => {
    renderPlanner();
    expect(screen.queryByTestId('add-task-dialog-open')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'q' });

    expect(screen.getByTestId('add-task-dialog-open')).toBeInTheDocument();
  });

  it('ignores the "Q" hotkey while the user is typing in a text input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    renderPlanner();

    fireEvent.keyDown(input, { key: 'q' });

    expect(screen.queryByTestId('add-task-dialog-open')).not.toBeInTheDocument();
    document.body.removeChild(input);
  });

  it('opens AddTaskDialog via the floating action button', () => {
    renderPlanner();
    fireEvent.click(screen.getByText('fab-add-task'));
    expect(screen.getByTestId('add-task-dialog-open')).toBeInTheDocument();
  });

  it('opens AddBlockDialog via the floating action button', () => {
    renderPlanner();
    fireEvent.click(screen.getByText('fab-add-block'));
    expect(screen.getByTestId('add-block-dialog-open')).toBeInTheDocument();
  });
});
