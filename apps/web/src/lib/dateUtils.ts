/**
 * Date utilities using LOCAL timezone consistently.
 * NEVER use UTC conversions that shift dates across midnight.
 */

/**
 * Get today's date key in local timezone (yyyy-MM-dd format)
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date key string back to a Date object at midnight local time
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Get date key for a specific offset from today
 */
export function getDateKeyOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
}

/**
 * Check if two date keys are the same day
 */
export function isSameDateKey(dateKey1: string, dateKey2: string): boolean {
  return dateKey1 === dateKey2;
}

/**
 * Format date key for display (e.g., "Mon, Jan 13")
 */
export function formatDateKeyDisplay(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if a date key is today
 */
export function isToday(dateKey: string): boolean {
  return dateKey === getLocalDateKey();
}

/**
 * Check if a date key is in the past
 */
export function isPast(dateKey: string): boolean {
  return dateKey < getLocalDateKey();
}

/**
 * Check if a date key is in the future
 */
export function isFuture(dateKey: string): boolean {
  return dateKey > getLocalDateKey();
}
