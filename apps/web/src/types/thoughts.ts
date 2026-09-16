// Parked Thoughts Types

export type ThoughtCategory = 'needs_action' | 'can_wait' | 'out_of_my_control' | 'other';

export type ThoughtStatus = 'active' | 'archived' | 'converted';

export interface ParkedThought {
  id: string;
  userId?: string; // null for local-only (anonymous users)
  text: string;
  category: ThoughtCategory;
  status: ThoughtStatus;
  linkedTaskId?: string;
  tags?: string[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export const THOUGHT_CATEGORY_OPTIONS: {
  value: ThoughtCategory;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { value: 'needs_action', label: 'Needs action', emoji: '🔴', color: 'bg-rose-500/15 text-rose-600' },
  { value: 'can_wait', label: 'Can wait', emoji: '🟡', color: 'bg-amber-500/15 text-amber-600' },
  { value: 'out_of_my_control', label: 'Out of my control', emoji: '🔵', color: 'bg-sky-500/15 text-sky-600' },
  { value: 'other', label: 'Other', emoji: '⚪', color: 'bg-muted text-muted-foreground' },
];

// Map old categories to new ones (for migration from useThoughtParking)
export function mapLegacyCategory(oldCategory: string): ThoughtCategory {
  switch (oldCategory) {
    case 'worry':
      return 'needs_action';
    case 'idea':
      return 'can_wait';
    case 'reminder':
      return 'out_of_my_control';
    default:
      return 'other';
  }
}
