/**
 * indianCalendar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Indian festival, holiday, and exam-season awareness for Riva.
 *
 * Events are stored as "MM-DD" strings so they repeat every year.
 * The lookup window respects year boundaries (Dec 28 → Jan 3 = valid 7-day range).
 */

export interface IndianEvent {
  name: string;
  /** Annual date in "MM-DD" format, e.g. "10-20" for 20th October */
  dateStr: string;
  type: 'festival' | 'exam' | 'holiday';
  emoji: string;
  rivaMessage: string;
}

// ── Master Calendar ────────────────────────────────────────────────────────────
export const INDIAN_EVENTS: IndianEvent[] = [
  // ── Festivals ────────────────────────────────────────────────
  {
    name: 'Makar Sankranti',
    dateStr: '01-14',
    type: 'festival',
    emoji: '🪁',
    rivaMessage: 'Makar Sankranti is tomorrow! Shall I add some family time to your schedule?',
  },
  {
    name: 'Republic Day',
    dateStr: '01-26',
    type: 'holiday',
    emoji: '🇮🇳',
    rivaMessage: 'Republic Day is coming up — want me to plan a lighter day for you?',
  },
  {
    name: 'Holi',
    dateStr: '03-14',
    type: 'festival',
    emoji: '🎨',
    rivaMessage: 'Holi is around the corner — shall I add a relaxed plan for that day?',
  },
  {
    name: 'Eid ul-Fitr',
    dateStr: '03-30',
    type: 'festival',
    emoji: '🌙',
    rivaMessage: 'Eid Mubarak is coming. Want to plan a light day with family time?',
  },
  {
    name: 'Ram Navami',
    dateStr: '04-06',
    type: 'festival',
    emoji: '🏹',
    rivaMessage: 'Ram Navami is approaching! Shall I block some devotional time in your schedule?',
  },
  {
    name: 'Independence Day',
    dateStr: '08-15',
    type: 'holiday',
    emoji: '🇮🇳',
    rivaMessage: 'Independence Day is coming! Want me to plan something meaningful for the day?',
  },
  {
    name: 'Janmashtami',
    dateStr: '08-26',
    type: 'festival',
    emoji: '🪈',
    rivaMessage: 'Janmashtami is coming up! Shall I add a lighter workload for that evening?',
  },
  {
    name: 'Ganesh Chaturthi',
    dateStr: '09-02',
    type: 'festival',
    emoji: '🐘',
    rivaMessage: 'Ganesh Chaturthi is around the corner — shall I plan a celebratory light day?',
  },
  {
    name: 'Navratri',
    dateStr: '10-02',
    type: 'festival',
    emoji: '🪔',
    rivaMessage: 'Navratri starts soon! Want me to add evening free time for celebrations?',
  },
  {
    name: 'Dussehra',
    dateStr: '10-12',
    type: 'festival',
    emoji: '🏹',
    rivaMessage: 'Dussehra is coming up! Want me to block family time in your schedule?',
  },
  {
    name: 'Diwali',
    dateStr: '10-20',
    type: 'festival',
    emoji: '🪔',
    rivaMessage: 'Diwali is coming up! Want me to block family time and reduce work tasks that week?',
  },
  {
    name: 'Bhai Dooj',
    dateStr: '10-23',
    type: 'festival',
    emoji: '🤝',
    rivaMessage: 'Bhai Dooj is coming! Shall I keep your afternoon free for family?',
  },
  {
    name: 'Christmas',
    dateStr: '12-25',
    type: 'holiday',
    emoji: '🎄',
    rivaMessage: 'Christmas is coming! Want a lighter plan to enjoy the holiday season?',
  },
  {
    name: 'New Year\'s Eve',
    dateStr: '12-31',
    type: 'festival',
    emoji: '🎆',
    rivaMessage: 'New Year\'s Eve is almost here! Want to plan a reflection session and set intentions for next year?',
  },
  {
    name: 'New Year\'s Day',
    dateStr: '01-01',
    type: 'holiday',
    emoji: '🎇',
    rivaMessage: 'Happy New Year! Want me to help you set your intentions and goals for the year?',
  },

  // ── Exams ─────────────────────────────────────────────────────
  {
    name: 'JEE Mains',
    dateStr: '04-01',
    type: 'exam',
    emoji: '📐',
    rivaMessage: 'JEE Mains season is here! Want me to set up an intensive study plan with revision blocks?',
  },
  {
    name: 'NEET',
    dateStr: '05-04',
    type: 'exam',
    emoji: '🩺',
    rivaMessage: 'NEET is approaching. Need a focused revision schedule for the next few days?',
  },
  {
    name: 'JEE Advanced',
    dateStr: '05-20',
    type: 'exam',
    emoji: '📐',
    rivaMessage: 'JEE Advanced is just around the corner! Want me to build a last-mile intensive plan?',
  },
  {
    name: 'UPSC Prelims',
    dateStr: '05-25',
    type: 'exam',
    emoji: '🏛️',
    rivaMessage: 'UPSC Prelims season! Want me to set up a focused revision schedule with timed practice sessions?',
  },
  {
    name: 'CA Final',
    dateStr: '11-01',
    type: 'exam',
    emoji: '📊',
    rivaMessage: 'CA Final exams are approaching. Want me to build a strict revision block plan?',
  },
  {
    name: 'CAT',
    dateStr: '11-24',
    type: 'exam',
    emoji: '📝',
    rivaMessage: 'CAT exam is coming up! Want me to create a high-intensity preparation schedule?',
  },
  {
    name: 'GATE',
    dateStr: '02-01',
    type: 'exam',
    emoji: '🔬',
    rivaMessage: 'GATE exam season! Shall I build a focused study plan with mock-test blocks?',
  },
  {
    name: 'Board Exams Season',
    dateStr: '03-01',
    type: 'exam',
    emoji: '📚',
    rivaMessage: 'Board exam season is here! Want me to set up a revision-focused daily plan?',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse a "MM-DD" dateStr into { month (1-12), day (1-31) } */
function parseDateStr(dateStr: string): { month: number; day: number } {
  const [mm, dd] = dateStr.split('-').map(Number);
  return { month: mm, day: dd };
}

/** Given a base Date, return a Date object for the event in the same or next calendar year */
function eventDateForYear(dateStr: string, fromDate: Date): Date {
  const { month, day } = parseDateStr(dateStr);
  const year = fromDate.getFullYear();

  const candidate = new Date(year, month - 1, day, 0, 0, 0, 0);
  // If the date has already passed this year, push to next year
  if (candidate < fromDate) {
    return new Date(year + 1, month - 1, day, 0, 0, 0, 0);
  }
  return candidate;
}

/**
 * Returns Indian events whose date falls within the next `daysAhead` calendar days
 * (inclusive of today, exclusive of today + daysAhead).
 *
 * @param daysAhead - number of days to look ahead (default 7)
 * @param now       - override today's date (useful for tests)
 */
export function getUpcomingEvents(daysAhead = 7, now: Date = new Date()): IndianEvent[] {
  // Normalise "now" to midnight so day arithmetic is clean
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const windowEnd = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return INDIAN_EVENTS.filter((event) => {
    const eventDate = eventDateForYear(event.dateStr, today);
    return eventDate >= today && eventDate <= windowEnd; // inclusive end
  }).sort((a, b) => {
    const dateA = eventDateForYear(a.dateStr, today);
    const dateB = eventDateForYear(b.dateStr, today);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Returns the event if today exactly matches an event date, otherwise null.
 *
 * @param now - override today's date (useful for tests)
 */
export function getTodayEvent(now: Date = new Date()): IndianEvent | null {
  const todayMM = String(now.getMonth() + 1).padStart(2, '0');
  const todayDD = String(now.getDate()).padStart(2, '0');
  const todayStr = `${todayMM}-${todayDD}`;

  return INDIAN_EVENTS.find((e) => e.dateStr === todayStr) ?? null;
}

/**
 * Returns how many days until the given event (0 = today).
 */
export function daysUntilEvent(event: IndianEvent, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const eventDate = eventDateForYear(event.dateStr, today);
  return Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Build a Riva morning message suffix for upcoming events.
 * e.g. "By the way, 🎨 Holi is in 2 days — Holi is around the corner — shall I add a relaxed plan?"
 */
export function buildEventMorningMessage(event: IndianEvent, now: Date = new Date()): string {
  const days = daysUntilEvent(event, now);
  if (days === 0) {
    return `${event.emoji} Today is ${event.name}! ${event.rivaMessage}`;
  }
  if (days === 1) {
    return `By the way, ${event.emoji} ${event.name} is tomorrow! ${event.rivaMessage}`;
  }
  return `By the way, ${event.emoji} ${event.name} is in ${days} days — ${event.rivaMessage}`;
}
