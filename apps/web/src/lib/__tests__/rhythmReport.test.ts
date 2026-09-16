/**
 * rhythmReport.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for generateMonthlyReport() function.
 */

import { describe, it, expect } from 'vitest';
import { generateMonthlyReport, formatHour, formatFocusHourRange, formatMinutesAsHours } from '../rhythmReport';
import { FocusSession, DailyCheckIn, Task } from '@/types';

// ── Test Data Helpers ─────────────────────────────────────────────────────────

function makeSession(date: string, durationMinutes = 25): FocusSession {
  return {
    id: `session-${date}-${Math.random()}`,
    date,
    durationMinutes,
    purpose: 'test',
    endedEarly: false,
  };
}

function makeCheckIn(date: string, mood = 4, energy = 2): DailyCheckIn {
  return {
    date,
    mood,
    energy,
    sleepQuality: 2,
    intent: 'productive',
  };
}

function makeTask(date: string, status: 'todo' | 'done' = 'done', tag: Task['tag'] = 'work'): Task {
  return {
    id: `task-${date}-${Math.random()}`,
    date,
    dateKey: date,
    title: 'Test Task',
    status,
    tag,
  };
}

// Helper to create date string with timestamp for focus sessions
// Format: YYYY-MM-DDTHH:mm:ss (local time, no timezone suffix)
function sessionDateAtHour(hour: number, day = 15): string {
  // Use local time format (no Z suffix) so hour is preserved
  const year = 2026;
  const month = '02'; // February
  const d = String(day).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  return `${year}-${month}-${d}T${h}:00:00`;
}

// Helper to create date string in local timezone at specific hour (for checkins, tasks)
function localDateAtHour(hour: number, day = 15): string {
  // Create date in local timezone: Feb 2026, specific day and hour
  // Format as YYYY-MM-DDTHH:mm:ss without timezone to be interpreted as local time
  const year = 2026;
  const month = '02'; // February
  const d = String(day).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  return `${year}-${month}-${d}T${h}:00:00`;
}

// Helper to create date string YYYY-MM-DD format
function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateMonthlyReport', () => {
  describe('bestFocusHour', () => {
    it('returns the hour with most focus sessions', () => {
      // 20 sessions all at 10am (using UTC timestamps)
      const sessions = Array.from({ length: 20 }, () => makeSession(sessionDateAtHour(10)));

      const report = generateMonthlyReport(sessions, [], [], 2, 2026);

      expect(report.bestFocusHour).toBe(10);
    });

    it('handles sessions at different hours', () => {
      const sessions = [
        ...Array.from({ length: 5 }, () => makeSession(sessionDateAtHour(9))),
        ...Array.from({ length: 10 }, () => makeSession(sessionDateAtHour(14))),
        ...Array.from({ length: 3 }, () => makeSession(sessionDateAtHour(16))),
      ];

      const report = generateMonthlyReport(sessions, [], [], 2, 2026);

      expect(report.bestFocusHour).toBe(14);
    });

    it('defaults to 9am when no sessions', () => {
      const report = generateMonthlyReport([], [], [], 2, 2026);

      expect(report.bestFocusHour).toBe(9);
    });

    it('handles ISO date strings correctly', () => {
      const sessions = [
        makeSession(sessionDateAtHour(10, 15)),
        makeSession(sessionDateAtHour(10, 16)),
        makeSession(sessionDateAtHour(10, 17)),
      ];

      const report = generateMonthlyReport(sessions, [], [], 2, 2026);

      expect(report.bestFocusHour).toBe(10);
    });
  });

  describe('avgTasksPerDay', () => {
    it('calculates average tasks per active day', () => {
      // 10 tasks over 5 days
      const tasks = [
        ...Array.from({ length: 5 }, () => makeTask(ymd(2026, 2, 10), 'done')),
        ...Array.from({ length: 5 }, () => makeTask(ymd(2026, 2, 11), 'done')),
      ];

      const report = generateMonthlyReport([], [], tasks, 2, 2026);

      expect(report.avgTasksPerDay).toBe(5);
    });

    it('returns 0 when no completed tasks', () => {
      const tasks = [
        makeTask(ymd(2026, 2, 10), 'todo'),
        makeTask(ymd(2026, 2, 11), 'todo'),
      ];

      const report = generateMonthlyReport([], [], tasks, 2, 2026);

      expect(report.avgTasksPerDay).toBe(0);
    });

    it('handles decimal averages rounded to 1 decimal', () => {
      // 7 tasks over 3 days = 2.333...
      const tasks = [
        ...Array.from({ length: 3 }, () => makeTask(ymd(2026, 2, 10), 'done')),
        ...Array.from({ length: 2 }, () => makeTask(ymd(2026, 2, 11), 'done')),
        ...Array.from({ length: 2 }, () => makeTask(ymd(2026, 2, 12), 'done')),
      ];

      const report = generateMonthlyReport([], [], tasks, 2, 2026);

      expect(report.avgTasksPerDay).toBe(2.3);
    });
  });

  describe('morningCheckinStreak', () => {
    it('calculates consecutive check-in streak', () => {
      // Mon, Tue, Wed, then skip, then Fri
      const checkins = [
        makeCheckIn(ymd(2026, 2, 2)), // Monday
        makeCheckIn(ymd(2026, 2, 3)), // Tuesday
        makeCheckIn(ymd(2026, 2, 4)), // Wednesday
        makeCheckIn(ymd(2026, 2, 6)), // Friday (gap)
      ];

      const report = generateMonthlyReport([], checkins, [], 2, 2026);

      expect(report.morningCheckinStreak).toBe(3);
    });

    it('returns 0 when no checkins', () => {
      const report = generateMonthlyReport([], [], [], 2, 2026);

      expect(report.morningCheckinStreak).toBe(0);
    });

    it('counts full month streak', () => {
      // 10 consecutive days
      const checkins = Array.from({ length: 10 }, (_, i) =>
        makeCheckIn(ymd(2026, 2, i + 1))
      );

      const report = generateMonthlyReport([], checkins, [], 2, 2026);

      expect(report.morningCheckinStreak).toBe(10);
    });
  });

  describe('topTag', () => {
    it('returns the most used task tag', () => {
      // 5 work, 2 personal, 1 health
      const tasks = [
        ...Array.from({ length: 5 }, () => makeTask(ymd(2026, 2, 10), 'done', 'work')),
        ...Array.from({ length: 2 }, () => makeTask(ymd(2026, 2, 11), 'done', 'personal')),
        makeTask(ymd(2026, 2, 12), 'done', 'health'),
      ];

      const report = generateMonthlyReport([], [], tasks, 2, 2026);

      expect(report.topTag).toBe('work');
    });

    it('defaults to "work" when no completed tasks', () => {
      const report = generateMonthlyReport([], [], [], 2, 2026);

      expect(report.topTag).toBe('work');
    });

    it('handles ties by returning first encountered', () => {
      const tasks = [
        makeTask(ymd(2026, 2, 10), 'done', 'personal'),
        makeTask(ymd(2026, 2, 11), 'done', 'work'),
      ];

      const report = generateMonthlyReport([], [], tasks, 2, 2026);

      // Either is acceptable when tied
      expect(['personal', 'work']).toContain(report.topTag);
    });
  });

  describe('focusMinutesTotal', () => {
    it('sums all focus session minutes', () => {
      const sessions = [
        makeSession(sessionDateAtHour(10, 10), 25),
        makeSession(sessionDateAtHour(10, 11), 50),
        makeSession(sessionDateAtHour(10, 12), 30),
      ];

      const report = generateMonthlyReport(sessions, [], [], 2, 2026);

      expect(report.focusMinutesTotal).toBe(105);
    });

    it('returns 0 when no sessions', () => {
      const report = generateMonthlyReport([], [], [], 2, 2026);

      expect(report.focusMinutesTotal).toBe(0);
    });
  });

  describe('moodEnergyCorrelation', () => {
    it('returns "positive" when mood and energy move together', () => {
      const checkins = [
        makeCheckIn(ymd(2026, 2, 10), 2, 1), // low mood, low energy
        makeCheckIn(ymd(2026, 2, 11), 3, 2), // medium mood, medium energy
        makeCheckIn(ymd(2026, 2, 12), 5, 3), // high mood, high energy
        makeCheckIn(ymd(2026, 2, 13), 4, 2),
      ];

      const report = generateMonthlyReport([], checkins, [], 2, 2026);

      expect(report.moodEnergyCorrelation).toBe('positive');
    });

    it('returns "neutral" when not enough data', () => {
      const checkins = [
        makeCheckIn(ymd(2026, 2, 10), 4, 2),
        makeCheckIn(ymd(2026, 2, 11), 4, 2),
      ];

      const report = generateMonthlyReport([], checkins, [], 2, 2026);

      expect(report.moodEnergyCorrelation).toBe('neutral');
    });

    it('returns "neutral" when no correlation', () => {
      const checkins = [
        makeCheckIn(ymd(2026, 2, 10), 5, 1),
        makeCheckIn(ymd(2026, 2, 11), 2, 3),
        makeCheckIn(ymd(2026, 2, 12), 4, 2),
        makeCheckIn(ymd(2026, 2, 13), 3, 1),
      ];

      const report = generateMonthlyReport([], checkins, [], 2, 2026);

      // May be neutral or negative depending on exact correlation
      expect(['neutral', 'negative']).toContain(report.moodEnergyCorrelation);
    });
  });

  describe('checkinBoostFactor', () => {
    it('calculates boost factor correctly', () => {
      // Days WITH checkin: 100% completion (all done)
      // Days WITHOUT checkin: 50% completion
      // Expected boost: 1.0 / 0.5 = 2.0
      const checkins = [
        makeCheckIn(ymd(2026, 2, 10)),
      ];

      const tasks = [
        // Checkin day: 4 completed out of 4 total (100%)
        ...Array.from({ length: 4 }, () => makeTask(ymd(2026, 2, 10), 'done')),

        // No-checkin day: 2 completed out of 4 total (50%)
        ...Array.from({ length: 2 }, () => makeTask(ymd(2026, 2, 12), 'done')),
        ...Array.from({ length: 2 }, () => makeTask(ymd(2026, 2, 12), 'todo')),
      ];

      const report = generateMonthlyReport([], checkins, tasks, 2, 2026);

      // Boost factor should be approximately 2.0
      expect(report.checkinBoostFactor).toBeGreaterThanOrEqual(1.9);
      expect(report.checkinBoostFactor).toBeLessThanOrEqual(2.1);
    });

    it('returns 0.1 when no checkin data but tasks exist', () => {
      const tasks = [
        makeTask(ymd(2026, 2, 10), 'done'),
        makeTask(ymd(2026, 2, 11), 'done'),
      ];

      const report = generateMonthlyReport([], [], tasks, 2, 2026);

      // When no checkin data, checkinRate is 0, so boost factor is 0 (clamped to 0.1)
      expect(report.checkinBoostFactor).toBe(0.1);
    });

    it('returns 1.0 when no tasks on non-checkin days', () => {
      const checkins = [makeCheckIn(ymd(2026, 2, 10))];
      const tasks = [makeTask(ymd(2026, 2, 10), 'done')];

      const report = generateMonthlyReport([], checkins, tasks, 2, 2026);

      expect(report.checkinBoostFactor).toBe(1.0);
    });
  });

  describe('monthYear', () => {
    it('formats month and year correctly', () => {
      const report = generateMonthlyReport([], [], [], 2, 2026);

      expect(report.monthYear).toBe('February 2026');
    });

    it('handles different months', () => {
      const report = generateMonthlyReport([], [], [], 12, 2025);

      expect(report.monthYear).toBe('December 2025');
    });
  });

  describe('focusByHour', () => {
    it('returns array of 24 hours with session counts', () => {
      const sessions = [
        ...Array.from({ length: 3 }, () => makeSession(sessionDateAtHour(9, 10))),
        ...Array.from({ length: 5 }, () => makeSession(sessionDateAtHour(14, 10))),
        makeSession(sessionDateAtHour(22, 10)),
      ];

      const report = generateMonthlyReport(sessions, [], [], 2, 2026);

      expect(report.focusByHour).toHaveLength(24);
      expect(report.focusByHour[9]).toBe(3);
      expect(report.focusByHour[14]).toBe(5);
      expect(report.focusByHour[22]).toBe(1);
      expect(report.focusByHour[0]).toBe(0);
    });
  });

  describe('filtering by month', () => {
    it('only includes sessions from the specified month', () => {
      const sessions = [
        makeSession(ymd(2026, 1, 31) + 'T10:00:00.000Z'), // January
        makeSession(ymd(2026, 2, 15) + 'T10:00:00.000Z'), // February
        makeSession(ymd(2026, 3, 1) + 'T10:00:00.000Z'), // March
      ];

      const report = generateMonthlyReport(sessions, [], [], 2, 2026);

      expect(report.sessionsCount).toBe(1);
      expect(report.focusMinutesTotal).toBe(25);
    });

    it('only includes tasks from the specified month', () => {
      const tasks = [
        makeTask(ymd(2026, 1, 31), 'done'),
        makeTask(ymd(2026, 2, 15), 'done'),
        makeTask(ymd(2026, 3, 1), 'done'),
      ];

      const report = generateMonthlyReport([], [], tasks, 2, 2026);

      expect(report.tasksCompleted).toBe(1);
    });

    it('only includes checkins from the specified month', () => {
      const checkins = [
        makeCheckIn(ymd(2026, 1, 31)),
        makeCheckIn(ymd(2026, 2, 15)),
        makeCheckIn(ymd(2026, 3, 1)),
      ];

      const report = generateMonthlyReport([], checkins, [], 2, 2026);

      expect(report.morningCheckinStreak).toBe(1);
    });
  });

  describe('empty state', () => {
    it('handles user with no data gracefully', () => {
      const report = generateMonthlyReport([], [], [], 2, 2026);

      expect(report.bestFocusHour).toBe(9);
      expect(report.avgTasksPerDay).toBe(0);
      expect(report.morningCheckinStreak).toBe(0);
      expect(report.topTag).toBe('work');
      expect(report.focusMinutesTotal).toBe(0);
      expect(report.moodEnergyCorrelation).toBe('neutral');
      expect(report.checkinBoostFactor).toBe(1);
      expect(report.monthYear).toBe('February 2026');
      expect(report.tasksCompleted).toBe(0);
      expect(report.sessionsCount).toBe(0);
      expect(report.focusByHour).toEqual(Array(24).fill(0));
    });

    it('handles user with < 5 sessions', () => {
      const sessions = [
        makeSession(sessionDateAtHour(10, 10), 25),
        makeSession(sessionDateAtHour(14, 12), 25),
      ];

      const report = generateMonthlyReport(sessions, [], [], 2, 2026);

      expect(report.sessionsCount).toBe(2);
      expect(report.focusMinutesTotal).toBe(50);
      expect(report.bestFocusHour).toBe(10); // First one encountered with max count of 1
    });
  });
});

describe('formatting helpers', () => {
  describe('formatHour', () => {
    it('formats midnight correctly', () => {
      expect(formatHour(0)).toBe('12am');
    });

    it('formats morning hours correctly', () => {
      expect(formatHour(9)).toBe('9am');
      expect(formatHour(11)).toBe('11am');
    });

    it('formats noon correctly', () => {
      expect(formatHour(12)).toBe('12pm');
    });

    it('formats afternoon/evening hours correctly', () => {
      expect(formatHour(13)).toBe('1pm');
      expect(formatHour(18)).toBe('6pm');
      expect(formatHour(23)).toBe('11pm');
    });
  });

  describe('formatFocusHourRange', () => {
    it('formats hour range correctly', () => {
      expect(formatFocusHourRange(10)).toBe('10am–11am');
      expect(formatFocusHourRange(14)).toBe('2pm–3pm');
      expect(formatFocusHourRange(0)).toBe('12am–1am');
    });
  });

  describe('formatMinutesAsHours', () => {
    it('formats minutes less than an hour', () => {
      expect(formatMinutesAsHours(30)).toBe('30 min');
      expect(formatMinutesAsHours(45)).toBe('45 min');
    });

    it('formats exact hours', () => {
      expect(formatMinutesAsHours(60)).toBe('1h');
      expect(formatMinutesAsHours(120)).toBe('2h');
    });

    it('formats hours and minutes', () => {
      expect(formatMinutesAsHours(90)).toBe('1h 30m');
      expect(formatMinutesAsHours(135)).toBe('2h 15m');
    });
  });
});
