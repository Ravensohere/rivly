/**
 * AlarmRingingPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Baseline-contract tests for the full-screen alarm ringing page
 * (`apps/web/src/pages/AlarmRingingPage.tsx`, route `/alarm/ringing`).
 *
 * Covers (RED before the redesign fix, GREEN after):
 *  - Found-alarm rendering via `?test=true` and via a real `alarms` lookup
 *  - The "alarm not found" empty state (direct navigation without id/test)
 *  - Dismiss behavior (stop sound, disable one-time alarm, navigate home)
 *  - Snooze behavior (stop sound, hide actions, show snoozed state)
 *  - The light-mode muted-text contrast fix (`alarm-ringing` card)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AlarmRingingPage from '../AlarmRingingPage';
import type { Alarm } from '@/types/sleep';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUpdateAlarm = vi.fn();
let mockAlarms: Alarm[] = [];
vi.mock('@/hooks/useSleep', () => ({
  useSleep: () => ({
    alarms: mockAlarms,
    updateAlarm: mockUpdateAlarm,
  }),
}));

const mockPlay = vi.fn();
const mockStop = vi.fn();
const mockIsNativeAlarmAvailable = vi.fn(() => false);
vi.mock('@/services/NativeAlarmBridge', () => ({
  alarmSoundPlayer: {
    play: (...args: unknown[]) => mockPlay(...args),
    stop: (...args: unknown[]) => mockStop(...args),
  },
  isNativeAlarmAvailable: () => mockIsNativeAlarmAvailable(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const storedAlarm: Alarm = {
  id: 'alarm-1',
  time: '07:30',
  label: 'Morning Run',
  type: 'regular',
  repeat: 'daily',
  sound: 'soft-chime',
  fadeInSeconds: 0,
  snoozeMinutes: 10,
  enabled: true,
  vibration: false,
};

const oneTimeAlarm: Alarm = {
  id: 'alarm-2',
  time: '06:00',
  label: 'Flight',
  type: 'gentle',
  repeat: 'once',
  sound: 'morning-breeze',
  fadeInSeconds: 3,
  snoozeMinutes: 5,
  enabled: true,
  vibration: false,
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AlarmRingingPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAlarms = [storedAlarm, oneTimeAlarm];
  mockIsNativeAlarmAvailable.mockReturnValue(false);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AlarmRingingPage', () => {
  describe('found alarm (test mode)', () => {
    it('renders the test alarm label, time, type and sound', () => {
      renderAt('/alarm/ringing?test=true');

      expect(screen.getByText('Test Alarm')).toBeInTheDocument();
      expect(screen.getByText('gentle')).toBeInTheDocument();
      expect(screen.getByText('morning breeze')).toBeInTheDocument();
      expect(screen.getByText(/Test Mode - Alarm UI Preview/i)).toBeInTheDocument();
    });

    it('renders the snooze and dismiss controls', () => {
      renderAt('/alarm/ringing?test=true');

      expect(screen.getByRole('button', { name: '5m' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '10m' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '15m' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });

    it('starts playing the alarm sound on mount', () => {
      renderAt('/alarm/ringing?test=true');

      expect(mockPlay).toHaveBeenCalledWith('morning-breeze', 3);
    });
  });

  describe('found alarm (real alarms lookup by id)', () => {
    it('renders the matching stored alarm', () => {
      renderAt('/alarm/ringing?id=alarm-1');

      expect(screen.getByText('Morning Run')).toBeInTheDocument();
      expect(screen.getByText('regular')).toBeInTheDocument();
      expect(screen.getByText('soft chime')).toBeInTheDocument();
    });

    it('plays without fade-in for a non-gentle alarm type', () => {
      renderAt('/alarm/ringing?id=alarm-1');

      expect(mockPlay).toHaveBeenCalledWith('soft-chime', 0);
    });
  });

  describe('alarm not found (direct navigation, no id/test param)', () => {
    it('shows the empty state with a way back home', () => {
      renderAt('/alarm/ringing');

      expect(screen.getByText(/Alarm not found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();
    });

    it('navigates home when "Go Home" is clicked', () => {
      renderAt('/alarm/ringing');

      fireEvent.click(screen.getByRole('button', { name: /Go Home/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('dismiss behavior', () => {
    it('stops the sound and navigates home', () => {
      renderAt('/alarm/ringing?id=alarm-1');

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      expect(mockStop).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('disables a one-time alarm once dismissed', () => {
      renderAt('/alarm/ringing?id=alarm-2');

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      expect(mockUpdateAlarm).toHaveBeenCalledWith('alarm-2', { enabled: false });
    });

    it('does not try to disable the test alarm', () => {
      renderAt('/alarm/ringing?test=true');

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      expect(mockUpdateAlarm).not.toHaveBeenCalled();
    });
  });

  describe('snooze behavior', () => {
    it('stops the sound and shows the snoozed state', () => {
      renderAt('/alarm/ringing?id=alarm-1');

      fireEvent.click(screen.getByRole('button', { name: '10m' }));

      expect(mockStop).toHaveBeenCalled();
      expect(screen.getByText(/Snoozed - will ring again soon/i)).toBeInTheDocument();
    });

    it('hides the snooze/dismiss controls once snoozed', () => {
      renderAt('/alarm/ringing?id=alarm-1');

      fireEvent.click(screen.getByRole('button', { name: '5m' }));

      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    });
  });

  describe('redesign: light-mode muted-text contrast fix', () => {
    it('renders the alarm label with the darkened, AA-passing muted color', () => {
      renderAt('/alarm/ringing?id=alarm-1');

      const label = screen.getByText('Morning Run');
      expect(label.className).toContain('text-[hsl(230,10%,42%)]');
      expect(label.className).toContain('dark:text-[hsl(230,10%,55%)]');
    });

    it('renders the "Set for" time row with the darkened, AA-passing muted color', () => {
      renderAt('/alarm/ringing?id=alarm-1');

      const row = screen.getByText(/Set for/i);
      expect(row.className).toContain('text-[hsl(230,10%,42%)]');
      expect(row.className).toContain('dark:text-[hsl(230,10%,55%)]');
    });

    it('renders the sound indicator with the darkened, AA-passing muted color', () => {
      renderAt('/alarm/ringing?id=alarm-1');

      const sound = screen.getByText('soft chime');
      const row = sound.closest('div');
      expect(row?.className).toContain('text-[hsl(230,10%,42%)]');
      expect(row?.className).toContain('dark:text-[hsl(230,10%,55%)]');
    });
  });
});
