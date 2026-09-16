/**
 * Reflect (Close Your Day) Types
 * 
 * Each CloseDayEntry represents a single immutable daily record.
 * Only one entry is allowed per date.
 */

export type DayRating = 'hard' | 'okay' | 'good';

export type DailyWin = 'completed' | 'showedUp' | 'selfCare' | 'learned' | string;

export interface CloseDayEntry {
  /** Unique date key in YYYY-MM-DD format */
  date: string;
  /** Overall day rating */
  dayRating: DayRating;
  /** Free text about what to do differently tomorrow */
  tomorrowIntent: string;
  /** Array of win types for the day */
  wins: DailyWin[];
  /** ISO timestamp when day was closed */
  closedAt: string;
  /** Optional: Link to continue in journal */
  linkedJournalId?: string;
}

export const DAY_RATING_OPTIONS: { value: DayRating; label: string; emoji: string }[] = [
  { value: 'hard', label: 'Hard day', emoji: '😔' },
  { value: 'okay', label: 'Okay day', emoji: '😐' },
  { value: 'good', label: 'Good day', emoji: '😊' },
];

export const DAILY_WIN_OPTIONS: { value: DailyWin; label: string; emoji: string }[] = [
  { value: 'completed', label: 'Completed tasks', emoji: '✅' },
  { value: 'showedUp', label: 'Showed up', emoji: '💪' },
  { value: 'selfCare', label: 'Took care of myself', emoji: '🧘' },
  { value: 'learned', label: 'Learned something', emoji: '📚' },
];

// Helper functions
export function getDayRatingEmoji(rating: DayRating): string {
  return DAY_RATING_OPTIONS.find(o => o.value === rating)?.emoji || '😐';
}

export function getDayRatingLabel(rating: DayRating): string {
  return DAY_RATING_OPTIONS.find(o => o.value === rating)?.label || 'Day';
}

export function getDailyWinLabel(win: DailyWin): string {
  return DAILY_WIN_OPTIONS.find(o => o.value === win)?.label || win;
}
