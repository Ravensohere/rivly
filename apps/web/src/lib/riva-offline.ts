import { addDays, format, nextMonday, nextSunday, parse } from 'date-fns';
import { getPlanOptions } from '@/services/PlanningEngine';
import { getLocalDateKey } from '@/lib/dateUtils';
import { getRivaResponse, detectLanguage, RivaLanguage, RivaResponseMap } from '@/lib/rivaLanguage';


export type RivaAction = {
  message: string;
  action: string;
  data?: any;
};

// English buzzwords
const ENGLISH_BUZZWORDS = [
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

// Hindi/Hinglish buzzwords to filter out
const HINDI_BUZZWORDS = [
  'kripya', 'please', 'mera', 'meri', 'mere', 'hai', 'ho', 'hain',
  'karna', 'karna hai', 'chahiye', 'banana', 'banado', 'kar do',
  'yaad', 'reminder', ' remind', 'mat bhoolna', 'bhool',
  'add', 'jod', 'bana', 'create', 'shuru', 'khatam',
  'aaj', 'kal', 'parso', 'abhi', 'baad mein', 'jaldi',
  'bahut', 'zyada', 'kam', 'thoda', 'jara',
  'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'par', 'tak',
  'ye', 'woh', 'yeh', 'us', 'is', 'mera', 'tera',
  'haan', 'nahi', 'ji', 'are', 'arre', 'yaar', 'bhai',
  'okay', 'ok', 'thik', 'accha', 'badhiya'
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

function cleanTaskTitle(title: string, language?: RivaLanguage): string {
  if (!title || title.length < 2) return title;

  let cleaned = title;
  const isHindi = language === 'hindi' || language === 'hinglish';
  
  // Use appropriate buzzwords based on language
  const buzzwordsToFilter = isHindi ? HINDI_BUZZWORDS : ENGLISH_BUZZWORDS;

  BUZZWORD_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, ' ');
  });

  const words = cleaned.split(/\s+/).filter(word => {
    const lower = word.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gu, '');
    // Keep numbers and words with numbers (e.g., "2", "5kg", "3pm")
    if (/\d/.test(word)) return true;
    return lower.length > 1 && !buzzwordsToFilter.includes(lower);
  });

  cleaned = words.join(' ');

  // Preserve Hindi script characters, numbers, and parenthetical notes
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-_\u0900-\u097F()]/gu, '');

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned || title;
}

// --- Helper Functions ---

const extractDate = (text: string): string => {
  const lower = text.toLowerCase();
  const today = new Date();
  
  if (lower.includes('tomorrow')) return format(addDays(today, 1), 'yyyy-MM-dd');
  if (lower.includes('next week') || lower.includes('next monday')) return format(nextMonday(today), 'yyyy-MM-dd');
  if (lower.includes('this sunday')) return format(nextSunday(today), 'yyyy-MM-dd');
  
  // Specific days (simplified)
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < 7; i++) {
      if (lower.includes(`on ${days[i]}`)) {
          // Find next occurrence of this day
          const todayDay = today.getDay();
          const targetDay = i;
          let diff = targetDay - todayDay;
          if (diff <= 0) diff += 7;
          return format(addDays(today, diff), 'yyyy-MM-dd');
      }
  }

  return format(today, 'yyyy-MM-dd');
};

const parseTime = (timeStr: string): string | null => {
    // try 12h format "5pm", "5:30pm", "5 pm"
    const match12 = timeStr.match(/(\d{1,2})(:(\d{2}))?\s*(am|pm)/i);
    if (match12) {
        let hours = parseInt(match12[1]);
        const minutes = match12[3] || '00';
        const meridian = match12[4].toLowerCase();
        
        if (meridian === 'pm' && hours < 12) hours += 12;
        if (meridian === 'am' && hours === 12) hours = 0;
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    // try 24h format "14:00", "14.00"
    const match24 = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    if (match24) {
        return `${match24[1].padStart(2, '0')}:${match24[2]}`;
    }
    
    // try simple number "at 5" -> assume PM if < 8, AM if > 8? No, risky. 
    // Context might function better.
    // For now, return null if no clear time
    return null;
};

const extractTimeRange = (text: string): { start?: string; end?: string; duration?: number } => {
    const lower = text.toLowerCase();
    
    // Duration pattern: "for 20 mins"
    const durationMatch = lower.match(/for (\d+)\s*(min|minute|hour|hr)/);
    if (durationMatch) {
        let duration = parseInt(durationMatch[1]);
        if (durationMatch[2].startsWith('h')) duration *= 60;
        return { duration };
    }

    // Range pattern: "from 2pm to 4pm", "2 to 4pm", "2-4pm"
    // Regex to capture two time-like strings
    // This is hard to do perfectly with one regex.
    // Let's find all time-like strings.
    
    const timeRegex = /(\d{1,2}(:\d{2})?\s*(am|pm)?)/gi;
    const matches = [...lower.matchAll(timeRegex)];
    
    if (matches.length >= 2) {
        // Assume first two matches are start and end if "to" or "-" is between them?
        // Or just take first two found.
        const t1 = matches[0][0];
        const t2 = matches[1][0];
        
        // Smart inference for "2 to 4pm" -> 2pm to 4pm
        let start = parseTime(t1);
        let end = parseTime(t2);
        
        // If t1 has no am/pm but t2 does
        if (!t1.match(/(am|pm)/i) && t2.match(/(am|pm)/i)) {
             const t2Meridian = t2.match(/(am|pm)/i)![0];
             start = parseTime(`${t1}${t2Meridian}`); // borrow meridian
        }
        
        if (!start) {
             // fallback for "at 2" -> 02:00 or 14:00?
             // default to 24h lookup if just number?
             // if just "2", treat as 2pm?
             if (t1.match(/^\d+$/)) {
                 const h = parseInt(t1);
                 start = `${(h < 7 ? h + 12 : h).toString().padStart(2, '0')}:00`; // Assume PM if small number
             }
        }

        if (start && end) return { start, end };
    }
    else if (matches.length === 1) {
        // specific time "at 5pm"
        const t1 = matches[0][0];
        let start = parseTime(t1);
        
        // fallback for "at 5" -> 5pm
        if (!start && t1.match(/^\d+$/)) {
            const h = parseInt(t1);
             // heuristic: 7-11 is AM, 1-6 is PM, 12 is PM
            const isPM = (h >= 1 && h <= 6) || h === 12;
            const hour = isPM && h < 12 ? h + 12 : h;
            start = `${hour.toString().padStart(2, '0')}:00`;
        }
        
        if (start) return { start };
    }

    return {};
};


// ── Main Processor ───────────────────────────────────────────────────────────

export function processOfflineCommand(
  text: string,
  tasks: any[] = [],
  addTask?: any,
  /** The user's explicit language preference. Omit to auto-detect from `text`. */
  language?: RivaLanguage
): RivaAction | null {
  const lower = text.toLowerCase().trim();

  // An explicit preference wins; otherwise read the language off what was said.
  const lang: RivaLanguage = language ?? detectLanguage(text);

  // Helper to get localized response
  const getResponse = (key: keyof RivaResponseMap) => {
    return getRivaResponse(key, lang);
  };

  // ── P0 COMMAND GUARDS ──────────────────────────────────────────────────────
  // These must be checked FIRST to prevent leaking into task creation.
  // If matched, they immediately return — no falling through.

  // 1. "add task [x]" offline handling
  if (lower.startsWith('add task ') || lower.startsWith('task add ') || 
      (lang !== 'english' && (lower.includes('task') || lower.includes('kaam')))) {
    const titleMatch = text.match(/(?:add task|task add|task bana|kaam add) (.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : text.replace(/(?:add task|task add|task bana|kaam add)/i, '').trim();
    if (title && addTask) {
      const cleanTitle = cleanTaskTitle(title, lang);
      addTask({
        title: cleanTitle,
        status: 'todo',
        dateKey: getLocalDateKey(),
        tag: 'other'
      });
      return { 
        message: getResponse('taskAdded'), 
        action: 'online_response',
        data: { taskTitle: cleanTitle }
      };
    }
  }

  // 2. "plan my day" offline handling
  if (lower.match(/\b(plan my day|help me plan|schedule my day|what should i do today)\b/)) {
    const todayKey = getLocalDateKey();
    const options = getPlanOptions({
      dateKey: todayKey,
      tasks: tasks,
      blocks: [],
      checkIn: undefined
    });
    const firstOption = options[0];
    if (firstOption && firstOption.taskIds.length > 0) {
      const taskNames = firstOption.taskIds
        .map(id => tasks.find(t => t.id === id)?.title)
        .filter(Boolean);
      
      let summary = `Here is your plan. You have ${taskNames.length} tasks: ${taskNames.slice(0, 3).join(', ')}`;
      if (taskNames.length > 3) summary += ', and more';
      summary += '.';
      
      return { message: summary, action: "online_response", data: {} };
    }
    return { message: "You have no tasks to plan for today.", action: "online_response", data: {} };
  }

  // 3. "what's my next task" offline handling
  if (lower.match(/\bwhat'?s next\b|\bwhat should i do now\b|\bwhat('s| is) my next\b|\bnext task\b/)) {
    const nextTask = tasks.find(t => t.dateKey === getLocalDateKey() && t.status !== 'done');
    if (nextTask) {
      return { message: `Your next task is: ${nextTask.title}`, action: 'online_response' };
    }
    return { message: "You have no incomplete tasks for today.", action: 'online_response' };
  }

  // Guard: explain / what is / tell me about — always send to AI
  if (lower.match(/^(explain|what is|what are|tell me about|how does|eli5|how do)\b/)) {
    return null; // Let AI handle
  }

  // Guard: weather queries — always send to AI (get_weather action)
  if (lower.match(/\b(weather|temperature|mausam|barish|rain|garmi|thand|forecast|sunny|cloudy)\b/)) {
    return null; // Let AI handle via get_weather
  }

  // Guard: search / lookup / news queries — always send to AI
  if (lower.match(/\b(search for|look up|google|find out|what'?s happening|news|headlines|score|khabar)\b/)) {
    return null; // Let AI handle via search_web / get_news
  }

  // Guard: YouTube / video queries — always send to AI
  if (lower.match(/\b(find a video|youtube|play video|tutorial video|video dikha)\b/)) {
    return null; // Let AI handle via search_youtube
  }

  // Guard: set reminder / remind me at [time]
  if (lower.match(/\bset reminder\b|\bremind me at\b|\balert me at\b/)) {
    return null; // Let AI parse time + text
  }

  // Guard: replan / running late / energy crashed
  if (lower.match(/\b(replan|running late|energy crashed|add a meeting|cancel my)\b/)) {
    return null; // Let AI handle reschedule
  }

  // ── FOCUS ──────────────────────────────────────────────────────────────────
  // 1. FOCUS
  if (lower.match(/\b(focus|pomodoro|timer)\b/) || (lang !== 'english' && lower.match(/\b(focus|dhyan|kaam)\b/))) {
      if (lower.match(/\b(stop|cancel|end|break)\b/)) {
          return { message: getResponse('focusStopped'), action: "stop_focus" };
      }

      const { duration } = extractTimeRange(lower);
      return {
          message: getResponse('focusStarted'),
          action: "start_focus",
          data: { duration: duration || 25 }
      };
  }

  // 2. TIME BLOCKING — require explicit 'block' keyword + time (not 'plan' alone)
  if (lower.match(/\b(block)\b/) || (lower.match(/\b(schedule|event)\b/) && lower.match(/\d/))) {
      const { start, end } = extractTimeRange(lower);
      
      if (start) {
           let title = lower
              .replace(/\b(block time|schedule|plan|for|at|from|to|block)\b/g, ' ')
              .replace(/\d{1,2}(:\d{2})?\s*(am|pm)?/g, ' ')
              .replace(/\s+/g, ' ').trim();
           
           if (!title) title = "Focus Block";

           return {
               message: `Blocked: ${title} at ${start}`,
               action: "create_time_block",
               data: {
                   title,
                   date: extractDate(lower),
                   start,
                   end: end || format(addDays(parse(start, 'HH:mm', new Date()), 0).setHours(parseInt(start.split(':')[0]) + 1), 'HH:mm')
               }
           };
      }
  }

  // 3. LEGACY planning guards (belt-and-suspenders)
  if (lower.match(/\b(plan my day|help me plan|schedule my day|what should i do)\b/)) {
      return { message: "Let's plan your day.", action: "start_planning", data: {} };
  }

  if (lower.match(/\b(reschedule|move my tasks|push my tasks|postpone)\b/)) {
      return { message: "Opening the reschedule view.", action: "open_reschedule" };
  }

  // 4. NAVIGATION
  if (lower.match(/\b(go to|open|show|navigate)\b/)) {
      const map: Record<string, string> = {
          'setting': 'settings', 'profile': 'profile', 'config': 'settings',
          'journal': 'journal', 'reflect': 'journal', 'writing': 'journal',
          'sleep': 'sleep', 'dream': 'sleep',
          'home': 'home', 'main': 'home', 'dashboard': 'home',
          'focus': 'focus', 'timer': 'focus',
          'insight': 'insights', 'stat': 'insights', 'data': 'insights',
          'idea': 'thoughts', 'thought': 'thoughts', 'brain': 'thoughts'
      };
      
      for (const [key, value] of Object.entries(map)) {
          if (lower.includes(key)) {
              return { message: `Opening ${value}.`, action: "navigate", data: { page: value } };
          }
      }
  }

  // 4. THEME
  if (lower.match(/\b(dark|light|system)\s*(mode|theme)\b/)) {
      if (lower.includes('dark')) return { message: "Dark mode on.", action: "set_theme", data: { mode: 'dark' } };
      if (lower.includes('light')) return { message: "Light mode on.", action: "set_theme", data: { mode: 'light' } };
  }

  // 5. CHECK-IN / MOOD
  if (lower.match(/\b(i feel|feeling|mood|energy)\b/)) {
      let mood = 3;
      if (lower.match(/\b(great|good|awesome|happy|energized)\b/)) mood = 5;
      else if (lower.match(/\b(tired|bad|sad|annoyed|low)\b/)) mood = 1;
      
      return { 
          message: "Mood logged.", 
          action: "log_checkin", 
          data: { mood, note: text } 
      };
  }
  
  // 6. SLEEP
  if (lower.match(/\b(slept|sleep)\b/) && lower.match(/\d/)) {
      const hMatch = lower.match(/(\d+(\.\d+)?)/); // find number
      const hours = hMatch ? parseFloat(hMatch[1]) : 0;
      let quality = 3;
      if (lower.match(/\b(well|good|great)\b/)) quality = 5;
      if (lower.match(/\b(bad|poorly|terrible)\b/)) quality = 1;
      
      if (hours > 0) {
          return {
              message: `Logged ${hours}h sleep.`,
              action: "log_sleep",
              data: { hours, quality }
          };
      }
  }
  
  // ── SHOPPING LIST ──────────────────────────────────────────────────────────
  // "Add milk to shopping list" / "Shopping list mein milk add karo"
  const shoppingAddMatch = lower.match(/(?:add|put)\s+(.+?)\s+(?:to|in|on)\s+(?:my\s+)?shopping\s*list/i)
    || lower.match(/shopping\s*list\s+(?:mein|me)\s+(.+?)\s+(?:add|dal|daal)/i);
  if (shoppingAddMatch) {
    const items = shoppingAddMatch[1].split(/,\s*|\s+and\s+/).map(i => i.trim()).filter(Boolean);
    return {
      message: `Added ${items.join(', ')} to your shopping list.`,
      action: 'add_to_shopping_list',
      data: { items }
    };
  }

  // "What's on my shopping list?" / "Show shopping list"
  if (lower.match(/(?:what'?s on|show|open|dikhao|dikha)\s+(?:my\s+)?shopping\s*list/i)
    || lower.match(/(?:meri|my)\s+shopping\s*list\s+(?:dikhao|dikha|batao)/i)) {
    return { message: "Here's your shopping list.", action: 'show_shopping_list', data: {} };
  }

  // "Remove eggs from shopping list"
  const shoppingRemoveMatch = lower.match(/(?:remove|delete|hata|nikal)\s+(.+?)\s+(?:from|se)\s+(?:my\s+)?shopping\s*list/i);
  if (shoppingRemoveMatch) {
    const items = shoppingRemoveMatch[1].split(/,\s*|\s+and\s+/).map(i => i.trim()).filter(Boolean);
    return {
      message: `Removed ${items.join(', ')} from your shopping list.`,
      action: 'remove_from_shopping_list',
      data: { items }
    };
  }

  // "Clear shopping list" / "Shopping list clear karo"
  if (lower.match(/(?:clear|empty|reset)\s+(?:my\s+)?shopping\s*list/i)
    || lower.match(/shopping\s*list\s+(?:clear|saaf|khaali)\s*(?:karo|kar|kardo)?/i)) {
    return {
      message: "Shopping list cleared.",
      action: 'remove_from_shopping_list',
      data: { items: ['__all__'] }
    };
  }

  // ── QUICK MATH ──────────────────────────────────────────────────────────────
  // "What's 15% of 2400" or "15 percent of 2400"
  const percentMatch = lower.match(/(?:what(?:'?s| is)\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent)\s+(?:of\s+)?(\d+(?:\.\d+)?)/);
  if (percentMatch) {
    const pct = parseFloat(percentMatch[1]);
    const num = parseFloat(percentMatch[2]);
    const result = (pct / 100) * num;
    return { message: `${pct}% of ${num} is ${result}`, action: 'online_response', data: {} };
  }

  // Basic arithmetic: "what is 245 + 30" or "245 times 3"
  const mathMatch = lower.match(/(?:what(?:'?s| is)\s+)?(\d+(?:\.\d+)?)\s*([\+\-\*\/×÷]|plus|minus|times|divided by|into)\s*(\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let result = 0;
    if (op === '+' || op === 'plus') result = a + b;
    else if (op === '-' || op === 'minus') result = a - b;
    else if (op === '*' || op === '×' || op === 'times' || op === 'into') result = a * b;
    else if (op === '/' || op === '÷' || op === 'divided by') result = b !== 0 ? a / b : 0;
    return { message: `${a} ${op} ${b} = ${result}`, action: 'online_response', data: {} };
  }

  // ── UNIT CONVERSION ─────────────────────────────────────────────────────────
  const convMatch = lower.match(/convert\s+(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|kg|kilograms?|pounds?|lbs?|celsius|fahrenheit|cm|inches?|meters?|feet|foot|liters?|gallons?)\s+(?:to|in|into)\s+(km|kilometers?|miles?|kg|kilograms?|pounds?|lbs?|celsius|fahrenheit|cm|inches?|meters?|feet|foot|liters?|gallons?)/i);
  if (convMatch) {
    const val = parseFloat(convMatch[1]);
    const from = convMatch[2].toLowerCase().replace(/s$/, '');
    const to = convMatch[3].toLowerCase().replace(/s$/, '');
    const conversions: Record<string, Record<string, (n: number) => number>> = {
      km: { mile: n => n * 0.621371 }, kilometer: { mile: n => n * 0.621371 },
      mile: { km: n => n * 1.60934, kilometer: n => n * 1.60934 },
      kg: { pound: n => n * 2.20462, lb: n => n * 2.20462 },
      kilogram: { pound: n => n * 2.20462, lb: n => n * 2.20462 },
      pound: { kg: n => n * 0.453592, kilogram: n => n * 0.453592 },
      lb: { kg: n => n * 0.453592, kilogram: n => n * 0.453592 },
      celsius: { fahrenheit: n => (n * 9/5) + 32 },
      fahrenheit: { celsius: n => (n - 32) * 5/9 },
      cm: { inch: n => n * 0.393701, inche: n => n * 0.393701 },
      inch: { cm: n => n * 2.54 }, inche: { cm: n => n * 2.54 },
      meter: { feet: n => n * 3.28084, foot: n => n * 3.28084 },
      feet: { meter: n => n * 0.3048 }, foot: { meter: n => n * 0.3048 },
      liter: { gallon: n => n * 0.264172 }, gallon: { liter: n => n * 3.78541 },
    };
    const fn = conversions[from]?.[to];
    if (fn) {
      const result = fn(val).toFixed(2);
      return { message: `${val} ${from} = ${result} ${to}`, action: 'online_response', data: {} };
    }
  }

  // ── DAY COUNTER ─────────────────────────────────────────────────────────────
  const daysMatch = lower.match(/how many days\s+(?:until|till|to|before|left)\s+(.+)/i)
    || lower.match(/(\w+ \d{1,2}(?:,?\s*\d{4})?)\s+(?:tak|tak kitne din|kitne din)/i);
  if (daysMatch) {
    try {
      const target = new Date(daysMatch[1]);
      if (!isNaN(target.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const msg = diff > 0 ? `${diff} days until ${daysMatch[1]}.`
          : diff === 0 ? `That's today!`
          : `That was ${Math.abs(diff)} days ago.`;
        return { message: msg, action: 'online_response', data: {} };
      }
    } catch { /* fall through to AI */ }
  }

  // ── MOTIVATIONAL BOOST ──────────────────────────────────────────────────────
  if (lower.match(/\b(motivat|inspire|cheer me|boost|encourage|i need a push|give me strength|himmat|hosla)\b/i)) {
    const motivations = [
      "You've already done the hardest part — you showed up. Now just take one step.",
      "Progress isn't always visible, but every small effort compounds. Keep going.",
      "You don't have to be perfect. You just have to start. The rest will follow.",
      "Remember why you started. That spark is still in you.",
      "Tough days make strong people. You're tougher than you think.",
      "Every expert was once a beginner. You're closer than you feel.",
    ];
    const msg = motivations[Math.floor(Math.random() * motivations.length)];
    return { message: msg, action: 'online_response', data: {} };
  }

  // 7. TASKS — only when EXPLICIT add/task/remind/buy/call keywords are present
  // Deliberately exclude: 'plan', 'schedule', 'what', 'explain', 'how', 'why'
  if (lower.match(/\b(remind me to|add task|new task|todo|buy|call|email|write)\b/)) {
      // Check for multiple tasks - look for "and" or commas
      const taskSeparator = lower.includes(' and ') ? ' and ' : ', ';
      const taskParts = text.split(taskSeparator).filter((t: string) => t.length > 2);
      
      if (taskParts.length > 1) {
          // Multiple tasks
          const tasks = taskParts.map((title: string) => {
              title = title.replace(/^(remind me to|add task|new task|add|create|please|,)\s+/i, '');
              title = title.replace(/\b(tomorrow|next week|today|on \w+day)\b/gi, '').trim();
              title = title.replace(/at \d+(:\d+)?(am|pm)?/gi, '').trim();
              title = title.replace(/^,/, '').trim();
              title = cleanTaskTitle(title);
              
              return {
                  title: title.charAt(0).toUpperCase() + title.slice(1),
                  date: extractDate(lower),
                  tag: lower.match(/\b(work|home|project)\b/) ? lower.match(/\b(work|home|project)\b/)![0] : 'other'
              };
          });
          
          return {
              message: `Added ${tasks.length} tasks`,
              action: "create_tasks",
              data: {
                  tasks,
                  date: extractDate(lower)
              }
          };
      } else {
          // Single task (original logic)
          let title = text;
          title = title.replace(/^(remind me to|add task|new task|add|create|please)\s+/i, '');
          title = title.replace(/\b(tomorrow|next week|today|on \w+day)\b/gi, '').trim();
          title = title.replace(/at \d+(:\d+)?(am|pm)?/gi, '').trim();
          title = cleanTaskTitle(title);

          if (title.length > 2) {
              return {
                  message: `Added: ${title}`,
                  action: "create_task",
                  data: {
                      title,
                      date: extractDate(lower),
                      // "tag" inference could be added here
                      tag: lower.match(/\b(work|home|project)\b/) ? lower.match(/\b(work|home|project)\b/)![0] : 'other'
                  }
              };
          }
      }
  }

  return null;
}
