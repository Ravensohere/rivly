/**
 * Pattern recognition (Memory Engine): derive insight strings from ledger data.
 * e.g. "You usually feel drained on Thursdays", "You skip workouts when >4h meetings"
 */

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface PatternInsight {
  id: string;
  text: string;
  type: 'mood' | 'energy' | 'focus' | 'sleep' | 'tasks';
}

/**
 * Build simple pattern insights from aggregated by-day data.
 * focusByDay, moodByDay, energyByDay are arrays of { dateKey, value }.
 */
export function getPatternInsights(
  focusByDay: { dateKey: string; value: number }[],
  moodByDay: { dateKey: string; value: number }[],
  energyByDay: { dateKey: string; value: number }[],
  sleepByDay: { dateKey: string; value: number }[]
): PatternInsight[] {
  const insights: PatternInsight[] = [];

  // By weekday: low energy / low mood
  if (energyByDay.length >= 7) {
    const byWeekday = new Map<number, number[]>();
    energyByDay.forEach((d) => {
      const day = new Date(d.dateKey + 'T12:00:00').getDay();
      if (!byWeekday.has(day)) byWeekday.set(day, []);
      byWeekday.get(day)!.push(d.value);
    });
    let worstDay: number | null = null;
    let worstAvg = 10;
    byWeekday.forEach((vals, day) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg < worstAvg && vals.length >= 2) {
        worstAvg = avg;
        worstDay = day;
      }
    });
    if (worstDay !== null && worstAvg <= 4) {
      insights.push({
        id: 'energy-weekday',
        text: `You often have lower energy on ${WEEKDAY_NAMES[worstDay]}s.`,
        type: 'energy',
      });
    }
  }

  if (moodByDay.length >= 7) {
    const byWeekday = new Map<number, number[]>();
    moodByDay.forEach((d) => {
      const day = new Date(d.dateKey + 'T12:00:00').getDay();
      if (!byWeekday.has(day)) byWeekday.set(day, []);
      byWeekday.get(day)!.push(d.value);
    });
    let worstDay: number | null = null;
    let worstAvg = 10;
    byWeekday.forEach((vals, day) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg < worstAvg && vals.length >= 2) {
        worstAvg = avg;
        worstDay = day;
      }
    });
    if (worstDay !== null && worstAvg <= 3) {
      insights.push({
        id: 'mood-weekday',
        text: `You usually feel more drained on ${WEEKDAY_NAMES[worstDay]}s.`,
        type: 'mood',
      });
    }
  }

  // Focus: best day
  if (focusByDay.length >= 5) {
    const byWeekday = new Map<number, number[]>();
    focusByDay.forEach((d) => {
      const day = new Date(d.dateKey + 'T12:00:00').getDay();
      if (!byWeekday.has(day)) byWeekday.set(day, []);
      byWeekday.get(day)!.push(d.value);
    });
    let bestDay: number | null = null;
    let bestAvg = 0;
    byWeekday.forEach((vals, day) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg > bestAvg && vals.length >= 2) {
        bestAvg = avg;
        bestDay = day;
      }
    });
    if (bestDay !== null && bestAvg >= 30) {
      insights.push({
        id: 'focus-weekday',
        text: `You tend to focus best on ${WEEKDAY_NAMES[bestDay]}s.`,
        type: 'focus',
      });
    }
  }

  // Sleep: poor sleep next-day impact (simplified: if we had sleep + next day focus, correlate)
  if (sleepByDay.length >= 5) {
    const poorSleepDays = sleepByDay.filter((d) => d.value === 1).length;
    const total = sleepByDay.length;
    if (total >= 5 && poorSleepDays >= 2) {
      insights.push({
        id: 'sleep-impact',
        text: 'On nights with poor sleep, consider a lighter plan the next day.',
        type: 'sleep',
      });
    }
  }

  return insights.slice(0, 5); // Max 5 insights
}
