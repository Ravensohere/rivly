/**
 * Weekday Labels - Centralized, unique, readable labels
 * 
 * Ensures Sat and Sun are distinguishable (Sa/Su instead of S/S)
 */

// Short unique labels for heatmaps and compact views
export const WEEKDAY_LABELS_SHORT = ['M', 'T', 'W', 'T', 'F', 'Sa', 'Su'] as const;

// Full 3-letter labels for calendars
export const WEEKDAY_LABELS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// Sunday-first order (used by JS Date.getDay())
export const WEEKDAY_LABELS_SHORT_SUNDAY_FIRST = ['Su', 'M', 'T', 'W', 'T', 'F', 'Sa'] as const;
export const WEEKDAY_LABELS_FULL_SUNDAY_FIRST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Get label for a date (Monday = 0 indexed)
export function getWeekdayLabelShort(dayIndex: number): string {
  return WEEKDAY_LABELS_SHORT[dayIndex] || '';
}

// Get label from JS Date.getDay() result (Sunday = 0)
export function getWeekdayLabelFromDate(date: Date, short = true): string {
  const labels = short ? WEEKDAY_LABELS_FULL_SUNDAY_FIRST : WEEKDAY_LABELS_FULL_SUNDAY_FIRST;
  return labels[date.getDay()] || '';
}

// Convert Sunday-first index to Monday-first
export function sundayToMondayIndex(sundayIndex: number): number {
  return sundayIndex === 0 ? 6 : sundayIndex - 1;
}
