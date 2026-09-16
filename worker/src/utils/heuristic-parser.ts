import { AIResponse } from '../types';

const BUZZWORDS = [
  'please', 'kindly', 'could you', 'can you', 'would you', 'will you',
  'i want to', 'i need to', 'i have to', 'i should', 'i must',
  'remind me to', 'remind me', 'remind', 'remember to', 'make sure to',
  'dont forget to', "don't forget to", 'forget to', 'forget',
  'add a', 'add an', 'add', 'create a', 'create an', 'create',
  'task', 'todo', 'to-do', 'note', 'note to self',
  'start', 'begin', 'finish', 'complete', 'end', 'stop',
  'going to', 'gonna', 'wanna', 'gotta',
  'hey', 'hi', 'hello', 'ok', 'okay', 'alright',
  'now', 'today', 'tomorrow', 'later', 'sometime',
  'asap', 'urgent', 'important', 'very', 'really', 'just',
  'about', 'regarding', 'concerning', 'related to',
  'stuff', 'things', 'something', 'anything',
  'my', 'the', 'a', 'an', 'this', 'that',
  'to', 'for', 'in', 'on', 'at', 'by', 'with', 'from'
];

const BUZZWORD_PATTERNS = [
  /\b(i|we|you|he|she|they|it)\b/gi,
  /\b(will|shall|must|should|can|could|would|may|might)\b/gi,
  /\b(very|really|quite|so|just)\b/gi,
  /\b(thing|things|stuff|matter|issue|job|work)\b/gi,
  /\b(need|want|like|hope|wish|plan|intend)\b/gi,
  /\bplease\b/gi, /\bkindly\b/gi, /\bthanks?\b/gi, /\bthank you\b/gi,
  /\bhey\b/gi, /\bhi\b/gi, /\bhello\b/gi,
  /\bokay\b/gi, /\bok\b/gi, /\byeah\b/gi, /\byep\b/gi, /\bnope\b/gi,
  /\bbasically\b/gi, /\bactually\b/gi, /\bliterally\b/gi, /\bhonestly\b/gi,
  /\banyway\b/gi, /\bso yeah\b/gi, /\byou know\b/gi,
  /\bfor sure\b/gi, /\bdefinitely\b/gi, /\babsolutely\b/gi,
  /\btry to\b/gi, /\battempt to\b/gi, /\bmaybe\b/gi,
  /\bsuper\b/gi, /\btotally\b/gi, /\bcompletely\b/gi,
  /\bi think\b/gi, /\bi feel\b/gi, /\bi believe\b/gi,
  /\boh\b/gi, /\bwow\b/gi, /\bugh\b/gi, /\bhm\b/gi, /\buh\b/gi,
  /\blike\b/gi, /\bjust\b/gi
];

export function cleanTaskTitle(title: string): string {
  if (!title || title.length < 2) return title;
  
  let cleaned = title;
  
  cleaned = cleaned.replace(/^(hey riva|okay|ok|sure|yeah|yep|nope|yes|no|please|kindly|thanks?|thank you|i will|i'll|i want|i need|i have|i should|i must|remind me|remind me to|don't forget|forget to|add a|add an|add|create a|create an|create|note to self|start|begin|finish|complete|end|stop)\s+/i, '');
  
  BUZZWORD_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, ' ');
  });
  
  const words = cleaned.split(/\s+/).filter(word => {
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    return lower.length > 1 && !BUZZWORDS.includes(lower);
  });
  
  cleaned = words.join(' ');
  
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-_\u0900-\u097F]/g, '');
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned || title;
}

export function cleanTaskTitlesInResponse(result: any): any {
  if (!result) return result;
  
  if (result.action === 'create_task' && result.data?.title) {
    result.data.title = cleanTaskTitle(result.data.title);
  }
  
  if (result.action === 'create_tasks' && result.data?.tasks) {
    result.data.tasks = result.data.tasks.map((task: any) => ({
      ...task,
      title: cleanTaskTitle(task.title)
    }));
  }
  
  return result;
}

/**
 * Offline/fallback heuristic parser for voice commands
 * Analyzes text to determine user intent without AI
 */
export function parseCommandHeuristically(text: string): AIResponse {
  const lowerText = text.toLowerCase();

  // "Stop focus", "Cancel timer", "End session"
  if (
    (lowerText.includes('stop') || lowerText.includes('cancel') || lowerText.includes('end')) &&
    (lowerText.includes('focus') || lowerText.includes('timer') || lowerText.includes('session'))
  ) {
    return {
      message: 'Offline: Stopping focus timer.',
      action: 'stop_focus',
      data: {}
    };
  }

  // "Focus for 25", "Start a 20 min session", "Pomodoro"
  if (lowerText.includes('focus') || lowerText.includes('timer') || lowerText.includes('pomodoro') || (lowerText.includes('start') && lowerText.includes('minute'))) {
    const numbers = lowerText.match(/(\d+)\s*(?:min|m\b|minute)/i);
    const duration = numbers ? parseInt(numbers[1]) : 25;

    return {
      message: `Offline: Starting ${duration} minutes focus.`,
      action: 'start_focus',
      data: { duration }
    };
  }

  // Time Blocking
  const isTimeBlockRequest =
    lowerText.includes('block') ||
    lowerText.includes('schedule') ||
    lowerText.includes('deep work') ||
    (lowerText.includes('session') && !lowerText.includes('focus')) ||
    (lowerText.includes('from') && (lowerText.includes('to') || lowerText.includes('until')));

  if (isTimeBlockRequest && !lowerText.includes('task') && !lowerText.includes('remind') && !lowerText.includes("don't forget")) {
    return parseTimeBlock(lowerText);
  }

  // "Add task buy milk", "Remind me to...", "I need to...", "Note to self..."
  if (lowerText.includes('task') || lowerText.includes('remind') || lowerText.includes('add') || lowerText.includes('need to') || lowerText.includes('note')) {
    return parseTask(lowerText);
  }

  // Navigation
  if (lowerText.includes('open') || lowerText.includes('go to') || lowerText.includes('navigate') || lowerText.includes('show') || lowerText.includes('take me')) {
    const navResult = parseNavigation(lowerText);
    if (navResult) return navResult;
  }

  // Theme
  if (lowerText.includes('mode') || lowerText.includes('theme')) {
    const themeResult = parseTheme(lowerText);
    if (themeResult) return themeResult;
  }

  // Wellbeing - Check-in
  if (lowerText.includes('feeling') || lowerText.includes('mood') || lowerText.includes('energy') || lowerText.includes('i feel')) {
    return parseCheckIn(lowerText);
  }

  // Sleep
  if (lowerText.includes('sleep') || lowerText.includes('slept')) {
    return parseSleep(lowerText);
  }

  return {
    message: "I heard you, but I'm having trouble understanding exactly what to do. Try using keywords like 'add task', 'focus', or 'navigate'.",
    action: 'unknown'
  };
}

/**
 * Parse time block commands
 */
function parseTimeBlock(text: string): AIResponse {
  let title = text.replace(/\b(block|schedule|add|create|from|to|until|at|on)\b/gi, ' ').trim();
  title = title.replace(/\bon\s+\w+\b/gi, ' ');

  const now = new Date();
  let start = '09:00';
  let end = '10:00';
  let date = now.toISOString().split('T')[0];
  let endDate = undefined;

  // Check for "Tomorrow"
  if (text.includes('tomorrow')) {
    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);
    const tmrStr = tmr.toISOString().split('T')[0];

    if (text.includes('until tomorrow') || text.includes('to tomorrow')) {
      endDate = tmrStr;
    } else {
      date = tmrStr;
    }
  }

  // Extract Times
  const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/gi;
  const times = text.match(timeRegex) || [];

  // Normalize time helper
  const normalizeTime = (t: string) => {
    let time = t.toLowerCase().replace(/\./g, '').trim();
    let isPM = time.includes('pm');
    let isAM = time.includes('am');
    let clean = time.replace(/[^0-9:]/g, '');

    let [h, m] = clean.split(':').map(n => parseInt(n));
    if (isNaN(m)) m = 0;

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;

    if (!isPM && !isAM && h > 0 && h <= 6) {
      h += 12;
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Assign Start/End
  if (text.includes('now')) {
    start = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (times.length > 0) {
      end = normalizeTime(times[times.length - 1]);
    }
  } else if (times.length >= 2) {
    start = normalizeTime(times[0]);
    end = normalizeTime(times[1]);
  } else if (times.length === 1) {
    if (text.includes('until') || text.includes('ending at') || text.includes('til')) {
      start = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      end = normalizeTime(times[0]);
    } else {
      start = normalizeTime(times[0]);
      let [h, m] = start.split(':').map(Number);
      end = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // Cleanup Title
  title = title.replace(timeRegex, '');
  title = title.replace(/\b(now|tomorrow|today)\b/gi, '');
  title = title.replace(/\s+/g, ' ').trim();
  if (title) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    message: `Offline: Added block "${title || 'New Block'}"`,
    action: 'create_time_block',
    data: {
      title: title || 'New Block',
      start,
      end,
      date,
      endDate: endDate
    }
  };
}

/**
 * Parse task creation commands
 */
function parseTask(text: string): AIResponse {
  let title = text.replace(/add|task|remind|me|to|i|need|note|self|don't|start|forget/gi, '');

  // Determine Tag
  let tag = 'other';
  if (text.includes('work')) {
    tag = 'work';
  } else if (text.includes('personal')) {
    tag = 'personal';
  } else if (text.includes('study')) {
    tag = 'study';
  } else if (text.includes('health')) {
    tag = 'health';
  }

  // Determine Date
  const now = new Date();
  let date = now.toISOString().split('T')[0];

  const lowerText = text.toLowerCase();

  if (lowerText.includes('tomorrow')) {
    const tmr = new Date(now);
    tmr.setDate(now.getDate() + 1);
    date = tmr.toISOString().split('T')[0];
    title = title.replace(/tomorrow/gi, '');
  } else if (lowerText.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    date = nextWeek.toISOString().split('T')[0];
    title = title.replace(/next week/gi, '');
  }

  // Day of week detection
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = days.findIndex(d => lowerText.includes(d));
  if (dayIndex !== -1) {
    const targetDay = dayIndex;
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysToAdd);
    date = targetDate.toISOString().split('T')[0];

    title = title.replace(new RegExp(days[targetDay], 'gi'), '');
    title = title.replace(/on\s*$/gi, '');
  }

  title = title.replace('today', '');
  title = title.replace('task', '');
  title = title.trim();

  // Capitalize
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  if (title.length > 2) {
    return {
      message: `Offline: Added ${tag} task "${title}"${text.includes('tomorrow') ? ' for tomorrow' : ''}`,
      action: 'create_task',
      data: { title: title, status: 'todo', tag, date }
    };
  }

  return {
    message: "I heard you, but couldn't extract a task title.",
    action: 'unknown'
  };
}

/**
 * Parse navigation commands
 */
function parseNavigation(text: string): AIResponse | null {
  let page = '';
  if (text.includes('settings')) page = 'settings';
  else if (text.includes('profile') || text.includes('account')) page = 'profile';
  else if (text.includes('journal') || text.includes('diary')) page = 'journal';
  else if (text.includes('thoughts') || text.includes('ideas')) page = 'thoughts';
  else if (text.includes('reflect')) page = 'reflect';
  else if (text.includes('insights') || text.includes('stats') || text.includes('analytics')) page = 'insights';
  else if (text.includes('sleep')) page = 'sleep';
  else if (text.includes('focus') || text.includes('timer')) page = 'focus';
  else if (text.includes('home') || text.includes('dashboard') || text.includes('planner')) page = 'home';

  if (page) {
    return {
      message: `Offline: Opening ${page}.`,
      action: 'navigate',
      data: { page }
    };
  }

  return null;
}

/**
 * Parse theme commands
 */
function parseTheme(text: string): AIResponse | null {
  if (text.includes('dark') || text.includes('night')) {
    return { message: 'Offline: Switching to Dark Mode.', action: 'set_theme', data: { mode: 'dark' } };
  } else if (text.includes('light') || text.includes('day')) {
    return { message: 'Offline: Switching to Light Mode.', action: 'set_theme', data: { mode: 'light' } };
  } else if (text.includes('system') || text.includes('auto')) {
    return { message: 'Offline: Switching to System Theme.', action: 'set_theme', data: { mode: 'system' } };
  }

  return null;
}

/**
 * Parse check-in commands
 */
function parseCheckIn(text: string): AIResponse {
  let mood = 3;
  let energy = 3;

  if (text.includes('great') || text.includes('good') || text.includes('awesome') || text.includes('happy')) mood = 4;
  if (text.includes('amazing') || text.includes('excellent') || text.includes('fantastic')) mood = 5;
  if (text.includes('bad') || text.includes('sad') || text.includes('tired') || text.includes('low')) mood = 2;
  if (text.includes('terrible') || text.includes('awful') || text.includes('angry')) mood = 1;

  if (text.includes('high energy') || text.includes('energetic')) energy = 5;
  if (text.includes('tired') || text.includes('exhausted') || text.includes('drained')) energy = 1;
  if (text.includes('sleepy')) energy = 2;

  return {
    message: `Offline: Logged check-in (Mood: ${mood}/5).`,
    action: 'log_checkin',
    data: { mood, energy, note: text }
  };
}

/**
 * Parse sleep logging commands
 */
function parseSleep(text: string): AIResponse {
  let quality = 'okay';
  if (text.includes('good') || text.includes('great') || text.includes('well') || text.includes('amazing')) quality = 'good';
  if (text.includes('bad') || text.includes('poor') || text.includes('terrible') || text.includes('restless')) quality = 'poor';

  // Extract hours
  const hourMatch = text.match(/(\d+)\s*(?:h|hr|hours)/);
  const hours = hourMatch ? parseInt(hourMatch[1]) : undefined;

  return {
    message: 'Offline: Logged sleep data.',
    action: 'log_sleep',
    data: { quality, hours }
  };
}
