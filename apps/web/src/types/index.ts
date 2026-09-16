export type UserType = 'student' | 'professional' | 'founder' | 'general';

export interface UserProfile {
  userType: UserType;
  preferences: {
    defaultView: 'calendar' | 'timeline';
    reminderBehavior: 'exact' | 'window';
  };
  wakeAnchorTime?: string;
}

export type BlockStatus = 'planned' | 'inProgress' | 'completed';
export type TaskStatus = 'todo' | 'done';
export type TaskTag = 'work' | 'study' | 'personal' | 'health' | 'other';

export interface TimeBlock {
  id: string;
  /** Local timezone date key in yyyy-MM-dd format */
  dateKey: string;
  endDateKey?: string;
  /** @deprecated Use dateKey instead */
  date?: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  status: BlockStatus;
  tasks: string[];
  reminder?: string;
  notes?: string;
  createdAt?: string;
  googleEventId?: string;
}

export interface Task {
  id: string;
  /** Local timezone date key in yyyy-MM-dd format */
  dateKey: string;
  /** @deprecated Use dateKey instead */
  date?: string;
  title: string;
  linkedBlockId?: string;
  reminder?: string;
  status: TaskStatus;
  tag: TaskTag;
  createdAt?: string;
  /** ISO timestamp when task was completed */
  completedAt?: string;
}

export interface FocusSession {
  id: string;
  date: string;
  durationMinutes: number;
  purpose: string;
  linkedTaskId?: string;
  linkedBlockId?: string;
  outcome?: 'good' | 'some' | 'notReally';
  endedEarly: boolean;
}

export interface DailyCheckIn {
  date: string;
  mood: number;
  energy: number;
  sleepQuality: number;
  intent: string;
}

export interface ReflectionEntry {
  date: string;
  questionId: string;
  text: string;
  emotionalScore: number;
  dailyWin?: string;
}

export interface ThoughtParking {
  id: string;
  date: string;
  text: string;
  category: 'worry' | 'idea' | 'reminder' | 'other';
}

export interface SleepEntry {
  date: string;
  windDownUsed: boolean;
  sleepIntent?: string;
  nightDumpText?: string;
}

export const BLOCK_COLORS = {
  sage: 'sage',
  lavender: 'lavender',
  peach: 'peach',
  sky: 'sky',
  mint: 'mint',
  rose: 'rose',
} as const;

export type BlockColor = keyof typeof BLOCK_COLORS;
