// Journal Types

export type JournalTag = 'ideas' | 'gratitude' | 'vent' | 'plans' | 'general';

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  tags: JournalTag[];
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
}

export const JOURNAL_TAG_OPTIONS: { value: JournalTag; label: string; emoji: string }[] = [
  { value: 'ideas', label: 'Ideas', emoji: '💡' },
  { value: 'gratitude', label: 'Gratitude', emoji: '🙏' },
  { value: 'vent', label: 'Vent', emoji: '😤' },
  { value: 'plans', label: 'Plans', emoji: '📋' },
  { value: 'general', label: 'General', emoji: '✏️' },
];
