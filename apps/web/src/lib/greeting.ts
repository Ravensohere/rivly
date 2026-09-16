/**
 * Single source of truth for time-of-day greetings and display names.
 *
 * Previously TimeGreeting, DailyCheckInModal and useRivaLogic each had their own
 * hour boundaries, so at 21:00 the header said "Good night" while the Riva bar on
 * the same screen said "Good evening".
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** Boundaries: 5-12 morning, 12-17 afternoon, 17-21 evening, 21-5 night. */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

const GREETINGS: Record<TimeOfDay, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
};

/** "Good evening" — no name, no punctuation. */
export function getGreeting(date: Date = new Date()): string {
  return GREETINGS[getTimeOfDay(date)];
}

/** "Good evening, Ravi" — falls back to the bare greeting when there's no name. */
export function getGreetingWithName(name?: string | null, date: Date = new Date()): string {
  const first = firstNameOf(name);
  const greeting = getGreeting(date);
  return first ? `${greeting}, ${first}` : greeting;
}

/** First name only. We never show a full name in-product. */
export function firstNameOf(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}
