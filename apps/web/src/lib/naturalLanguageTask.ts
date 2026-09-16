import { addDays, format, nextDay, Day, parse } from 'date-fns';

export interface ParsedTask {
  title: string;
  dateKey?: string;    // ISO format: "2026-03-07"
  time?: string;       // 24h format: "17:00"
  tag?: 'work' | 'personal' | 'health' | 'study' | 'other';
  priority?: 1 | 2 | 3;
  isMultiLine?: boolean;
  tasks?: ParsedTask[];  // for multi-line paste
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'
];

/**
 * Parses natural language input to extract task details like date, time, tag, and priority.
 * Designed to support Hinglish patterns like 'kal', 'parso', 'aaj', 'shaam ko'.
 */
export function parseNaturalTask(input: string, baseDate: Date = new Date()): ParsedTask {
  // 0. Multi-line detection
  if (input.includes('\n')) {
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return {
        title: 'Multiple parsed tasks',
        isMultiLine: true,
        tasks: lines.map(line => parseNaturalTask(line, baseDate))
      };
    }
  }

  let title = input.trim();
  let dateKey: string | undefined;
  let time: string | undefined;
  let tag: 'work' | 'personal' | 'health' | 'study' | 'other' | undefined;
  let priority: 1 | 2 | 3 | undefined;

  // Helper to extract a regex match and remove it from the title
  const extract = (regex: RegExp, onMatch: (match: RegExpMatchArray) => void) => {
    const match = title.match(regex);
    if (match) {
      onMatch(match);
      // Remove the matched snippet and clean up whitespace
      title = title.replace(regex, ' ').replace(/\s+/g, ' ').trim();
      return true;
    }
    return false;
  };

  // 1. Date Extraction
  const datePatterns = [
    { regex: /\b(today|aaj)\b/i, get: () => baseDate },
    { regex: /\b(tomorrow|kal)\b/i, get: () => addDays(baseDate, 1) },
    { regex: /\b(day after tomorrow|parso)\b/i, get: () => addDays(baseDate, 2) },
    { regex: /\bnext week\b/i, get: () => addDays(baseDate, 7) },
    { 
      regex: new RegExp(`\\bnext\\s(${DAYS.join('|')})\\b`, 'i'), 
      get: (m: RegExpMatchArray) => {
        const dayName = m[1].toLowerCase();
        const dayIndex = DAYS.findIndex(d => d === dayName) as Day;
        return nextDay(baseDate, dayIndex);
      }
    },
    {
      regex: new RegExp(`\\b(?:on\\s)?(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?\\s(${MONTHS.join('|')})\\b`, 'i'),
      get: (m: RegExpMatchArray) => {
        const day = parseInt(m[1], 10);
        const monthStr = m[2];
        const year = baseDate.getFullYear();
        
        // Try parsing different formats
        let parsedDate = parse(`${day} ${monthStr} ${year}`, 'd MMMM yyyy', baseDate);
        if (isNaN(parsedDate.getTime())) {
          parsedDate = parse(`${day} ${monthStr} ${year}`, 'd MMM yyyy', baseDate);
        }
        return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
      }
    }
  ];

  for (const pattern of datePatterns) {
    if (extract(pattern.regex, (m) => {
      const d = pattern.get(m);
      if (d) dateKey = format(d, 'yyyy-MM-dd');
    })) {
      break; 
    }
  }

  // 2. Time Extraction
  const timePatterns = [
    { regex: /\b(?:at\s)?([01]?[0-9]|2[0-3]):([0-5][0-9])\b/, get: (m: RegExpMatchArray) => `${m[1].padStart(2, '0')}:${m[2]}` },
    { regex: /\b(?:at\s)?(1[0-2]|0?[1-9])\s?(am|pm)\b/i, get: (m: RegExpMatchArray) => {
        let h = parseInt(m[1], 10);
        const isPm = m[2].toLowerCase() === 'pm';
        if (isPm && h < 12) h += 12;
        if (!isPm && h === 12) h = 0;
        return `${h.toString().padStart(2, '0')}:00`;
    }},
    { regex: /\bat\s(1[0-2]|0?[1-9])\b/i, get: (m: RegExpMatchArray) => {
        let h = parseInt(m[1], 10);
        if (h >= 1 && h <= 6) h += 12; 
        return `${h.toString().padStart(2, '0')}:00`;
    }},
    { regex: /\b(?:in the\s)?(morning)\b/i, get: () => '09:00' },
    { regex: /\b(?:in the\s)?(evening|shaam ko)\b/i, get: () => '18:00' },
    { regex: /\b(?:at\s)?(night)\b/i, get: () => '21:00' }
  ];

  for (const pattern of timePatterns) {
    if (extract(pattern.regex, (m) => {
      const t = pattern.get(m);
      if (t) time = t;
    })) {
      break;
    }
  }

  // 3. Tags Extraction
  extract(/#(work|personal|health|study|other)\b/i, (m) => {
    tag = m[1].toLowerCase() as ParsedTask['tag'];
  });

  // 4. Priority Extraction (Ordered from highest specificity to lowest)
  if (extract(/\b(?:urgent|asap|p1)\b|!!!/i, () => priority = 1)) {
     // match found
  } else if (extract(/\bp2\b|!!/i, () => priority = 2)) {
     // match found
  } else if (extract(/\bp3\b|!/i, () => priority = 3)) {
     // match found
  }

  // Fallback cleanup if any odd spaces remain
  title = title.replace(/\s+/g, ' ').trim();

  return {
    title,
    ...(dateKey && { dateKey }),
    ...(time && { time }),
    ...(tag && { tag }),
    ...(priority && { priority })
  };
}
