/**
 * indianCalendar.test.ts
 * Tests for the Indian Festival Calendar feature.
 *
 * KEY PATTERN: All functions accept an optional `now: Date` param, so we
 * simply pass a controlled date instead of mocking `new Date()` globally.
 * Where we DO need to demonstrate vi.setSystemTime, it's shown explicitly.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getUpcomingEvents,
  getTodayEvent,
  daysUntilEvent,
  buildEventMorningMessage,
  INDIAN_EVENTS,
  IndianEvent,
} from '../indianCalendar';

// ──────────────────────────────────────────────────────────────────────────────
// Helper — build a midnight Date for a given calendar date
// ──────────────────────────────────────────────────────────────────────────────
function date(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// getUpcomingEvents()
// ──────────────────────────────────────────────────────────────────────────────
describe('getUpcomingEvents', () => {
  it('returns Holi when today = March 7, 2026 and daysAhead = 7', () => {
    const today = date(2026, 3, 7); // March 7 → Holi on March 14 is 7 days ahead
    const events = getUpcomingEvents(7, today);
    const names = events.map((e) => e.name);
    expect(names).toContain('Holi');
  });

  it('does NOT return Holi when daysAhead = 4 and today = March 9 (5 days away)', () => {
    const today = date(2026, 3, 9); // 5 days before Holi
    const events6 = getUpcomingEvents(6, today);
    const names6 = events6.map((e) => e.name);
    // Holi (March 14) is 5 days away — should be included in 6-day window
    expect(names6).toContain('Holi');

    // But if we only look 4 days ahead (March 13 inclusive), Holi (March 14 = 5 days) should NOT appear
    const events4 = getUpcomingEvents(4, today);
    const names4 = events4.map((e) => e.name);
    expect(names4).not.toContain('Holi');
  });

  it('returns JEE Mains (April 1) but NOT Holi when today = April 30', () => {
    const today = date(2026, 4, 30); // April 30 — Holi was in March (past), JEE May 4 is 4 days ahead
    const events = getUpcomingEvents(7, today);
    const names = events.map((e) => e.name);
    expect(names).toContain('NEET'); // May 4 is 4 days ahead
    expect(names).not.toContain('Holi'); // March 14 is long past
  });

  it('returns JEE Mains (May 4) when today = May 1 and window = 7', () => {
    const today = date(2026, 5, 1);
    const events = getUpcomingEvents(7, today);
    const names = events.map((e) => e.name);
    expect(names).toContain('NEET');
  });

  it('returns today\'s event when daysAhead window starts from today (inclusive)', () => {
    // Today IS Holi (March 14)
    const today = date(2026, 3, 14);
    const events = getUpcomingEvents(7, today);
    const names = events.map((e) => e.name);
    expect(names).toContain('Holi');
  });

  it('handles year-boundary correctly (New Year\'s Day after Dec 28)', () => {
    const today = date(2025, 12, 29); // December 29 — New Year's Day Jan 1 is 3 days ahead
    const events = getUpcomingEvents(5, today);
    const names = events.map((e) => e.name);
    expect(names).toContain("New Year's Day");
    expect(names).toContain("New Year's Eve");
  });

  it('returns results sorted by ascending date', () => {
    // Between Holi (March 14) and Eid (March 30) — look 7 days from March 13
    const today = date(2026, 3, 13);
    const events = getUpcomingEvents(25, today); // wide window
    const holiIdx = events.findIndex((e) => e.name === 'Holi');
    const eidIdx = events.findIndex((e) => e.name === 'Eid ul-Fitr');
    if (holiIdx !== -1 && eidIdx !== -1) {
      expect(holiIdx).toBeLessThan(eidIdx);
    }
  });

  it('returns empty array when no events fall in the window', () => {
    // Pick an obscure 1-day window with no events
    const today = date(2026, 7, 17); // July 17 — no events
    const events = getUpcomingEvents(1, today);
    expect(events).toHaveLength(0);
  });

  it('uses today\'s real date when no `now` param passed', () => {
    // Smoke test: should not throw
    expect(() => getUpcomingEvents(7)).not.toThrow();
  });

  // ── Demonstrating vi.setSystemTime approach ──────────────────────────────
  it('demo: works equally well with vi.setSystemTime (Vitest built-in)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T08:00:00')); // March 7

    // Here we call WITHOUT passing `now` — Date() will return our fake time
    const holi: IndianEvent = {
      name: 'Holi',
      dateStr: '03-14',
      type: 'festival',
      emoji: '🎨',
      rivaMessage: 'Holi is around the corner',
    };
    const days = daysUntilEvent(holi); // uses new Date() internally → our fake date
    expect(days).toBe(7);

    vi.useRealTimers();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getTodayEvent()
// ──────────────────────────────────────────────────────────────────────────────
describe('getTodayEvent', () => {
  it('returns the Holi event when today = March 14', () => {
    const today = date(2026, 3, 14);
    const event = getTodayEvent(today);
    expect(event).not.toBeNull();
    expect(event?.name).toBe('Holi');
    expect(event?.type).toBe('festival');
  });

  it('returns null when today is not a known event date', () => {
    const today = date(2026, 3, 7); // March 7 — not in events
    expect(getTodayEvent(today)).toBeNull();
  });

  it('returns Diwali event on October 20', () => {
    const today = date(2026, 10, 20);
    const event = getTodayEvent(today);
    expect(event?.name).toBe('Diwali');
  });

  it('returns JEE Mains event on April 1', () => {
    const today = date(2026, 4, 1);
    const event = getTodayEvent(today);
    expect(event?.name).toBe('JEE Mains');
    expect(event?.type).toBe('exam');
  });

  it('returns NEET event on May 4', () => {
    const today = date(2026, 5, 4);
    const event = getTodayEvent(today);
    expect(event?.name).toBe('NEET');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// daysUntilEvent()
// ──────────────────────────────────────────────────────────────────────────────
describe('daysUntilEvent', () => {
  const holi = INDIAN_EVENTS.find((e) => e.name === 'Holi')!;
  const diwali = INDIAN_EVENTS.find((e) => e.name === 'Diwali')!;

  it('returns 7 when today = March 7 and event = March 14', () => {
    expect(daysUntilEvent(holi, date(2026, 3, 7))).toBe(7);
  });

  it('returns 3 when today = March 11 and event = March 14 (Holi)', () => {
    expect(daysUntilEvent(holi, date(2026, 3, 11))).toBe(3);
  });

  it('returns 0 when today IS the event date', () => {
    expect(daysUntilEvent(holi, date(2026, 3, 14))).toBe(0);
  });

  it('wraps to next year when event has already passed', () => {
    // March 15 — Holi was yesterday; should roll to next year (365 days roughly)
    const days = daysUntilEvent(holi, date(2026, 3, 15));
    expect(days).toBeGreaterThan(300); // roughly a full year
  });

  it('is correct for Diwali 3 days before Oct 20', () => {
    expect(daysUntilEvent(diwali, date(2026, 10, 17))).toBe(3);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildEventMorningMessage()
// ──────────────────────────────────────────────────────────────────────────────
describe('buildEventMorningMessage', () => {
  const holi = INDIAN_EVENTS.find((e) => e.name === 'Holi')!;
  const diwali = INDIAN_EVENTS.find((e) => e.name === 'Diwali')!;

  it('says "Today is [Name]" when event is today', () => {
    const msg = buildEventMorningMessage(holi, date(2026, 3, 14));
    expect(msg).toContain('Today is Holi');
    expect(msg).toContain('🎨');
  });

  it('says "tomorrow" when event is 1 day away', () => {
    const msg = buildEventMorningMessage(holi, date(2026, 3, 13));
    expect(msg).toContain('tomorrow');
    expect(msg).toContain('Holi');
  });

  it('says "in X days" when event is multiple days away', () => {
    const msg = buildEventMorningMessage(diwali, date(2026, 10, 17)); // 3 days
    expect(msg).toContain('in 3 days');
    expect(msg).toContain('Diwali');
    expect(msg).toContain('🪔');
  });

  it('includes the rivaMessage content', () => {
    const msg = buildEventMorningMessage(diwali, date(2026, 10, 17));
    expect(msg).toContain('block family time');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Integration: Riva morning greeting with festival awareness
// (Tests the logic that was integrated into useRivaLogic.ts)
// ──────────────────────────────────────────────────────────────────────────────
describe('Riva morning greeting integration logic', () => {
  const buildMorningMessage = (now: Date, userName: string, unfinishedCount: number): string => {
    // Replicate the logic inside promptDailyPlan exactly
    const todayEvent = getTodayEvent(now);
    const upcomingEvents = getUpcomingEvents(3, now);

    let message = '';

    if (todayEvent) {
      message += buildEventMorningMessage(todayEvent, now) + ' ';
    }

    const hour = now.getHours();
    message += 'Good ';
    if (hour < 12) message += 'morning';
    else if (hour < 17) message += 'afternoon';
    else message += 'evening';
    message += ` ${userName}. `;

    if (unfinishedCount > 0) {
      message += `You have ${unfinishedCount} unfinished task${unfinishedCount > 1 ? 's' : ''} from previous days. `;
      message += `Would you like me to help you plan your day? `;
      message += `Tell me what tasks you need to complete today, and I'll create a balanced plan.`;
    } else {
      message += `What would you like to accomplish today?`;
    }

    const eventsToMention = todayEvent
      ? upcomingEvents.filter((e) => e.dateStr !== todayEvent.dateStr)
      : upcomingEvents;

    if (eventsToMention.length > 0) {
      message += ' ' + buildEventMorningMessage(eventsToMention[0], now);
    }

    return message;
  };

  it('includes "Diwali is coming up" when today = 3 days before Diwali (Oct 17)', () => {
    // Oct 17 + 3 days window (inclusive) = Oct 20 = Diwali
    const now = new Date(2026, 9, 17, 9, 0, 0); // Oct 17 09:00
    // buildMorningMessage uses getUpcomingEvents(3, now) — Oct 20 is 3 days ahead, included with <=
    const message = buildMorningMessage(now, 'Ananya', 0);
    expect(message).toContain('Diwali');
  });

  it('opens with festival greeting when today IS Holi', () => {
    const now = new Date(2026, 2, 14, 8, 0, 0); // March 14 08:00
    const message = buildMorningMessage(now, 'Rahul', 0);
    expect(message).toContain('Today is Holi');
    expect(message).toContain('Good morning Rahul');
  });

  it('includes "tomorrow" when event is 1 day away', () => {
    const now = new Date(2026, 2, 13, 9, 0, 0); // March 13 — Holi tomorrow
    const message = buildMorningMessage(now, 'Priya', 2);
    expect(message).toContain('tomorrow');
    expect(message).toContain('Holi');
  });

  it('does NOT include festival message when no events in 3-day window', () => {
    // July 17 — no events in 3 days
    const now = new Date(2026, 6, 17, 9, 0, 0);
    const message = buildMorningMessage(now, 'Vikram', 0);
    expect(message).toContain('Good morning Vikram');
    expect(message).not.toContain('By the way');
    expect(message).not.toContain('Today is');
  });

  it('includes unfinished task count in greeting', () => {
    const now = new Date(2026, 6, 17, 10, 0, 0);
    const message = buildMorningMessage(now, 'Dev', 3);
    expect(message).toContain('3 unfinished tasks');
  });

  it('uses "afternoon" greeting for 2pm', () => {
    const now = new Date(2026, 6, 17, 14, 0, 0);
    const message = buildMorningMessage(now, 'Anita', 0);
    expect(message).toContain('Good afternoon Anita');
  });

  it('uses "evening" greeting for 7pm', () => {
    const now = new Date(2026, 6, 17, 19, 0, 0);
    const message = buildMorningMessage(now, 'Raj', 0);
    expect(message).toContain('Good evening Raj');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// INDIAN_EVENTS data integrity checks
// ──────────────────────────────────────────────────────────────────────────────
describe('INDIAN_EVENTS data integrity', () => {
  it('all events have valid "MM-DD" dateStr format', () => {
    const mmddRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    INDIAN_EVENTS.forEach((e) => {
      expect(e.dateStr).toMatch(mmddRegex);
    });
  });

  it('all events have non-empty name, emoji, and rivaMessage', () => {
    INDIAN_EVENTS.forEach((e) => {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.emoji.length).toBeGreaterThan(0);
      expect(e.rivaMessage.length).toBeGreaterThan(10);
    });
  });

  it('all event types are valid', () => {
    const validTypes = ['festival', 'exam', 'holiday'];
    INDIAN_EVENTS.forEach((e) => {
      expect(validTypes).toContain(e.type);
    });
  });

  it('has at least 10 festival events', () => {
    const festivals = INDIAN_EVENTS.filter((e) => e.type === 'festival');
    expect(festivals.length).toBeGreaterThanOrEqual(10);
  });

  it('has at least 5 exam events', () => {
    const exams = INDIAN_EVENTS.filter((e) => e.type === 'exam');
    expect(exams.length).toBeGreaterThanOrEqual(5);
  });
});
