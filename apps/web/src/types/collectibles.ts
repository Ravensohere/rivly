// Collectibles System Types

export type CollectibleCategory = 'focus' | 'sleep' | 'rhythm' | 'streak';

export type CollectibleRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface CollectibleDefinition {
  id: string;
  name: string;
  description: string;
  category: CollectibleCategory;
  rarity: CollectibleRarity;
  icon: string; // Emoji or icon name
  ruleKey: string; // Unique key for the unlock rule
}

export interface UnlockedCollectible {
  collectibleId: string;
  unlockedAt: string; // ISO timestamp
  ruleKey: string;
}

// All available collectibles
export const COLLECTIBLE_DEFINITIONS: CollectibleDefinition[] = [
  // Focus achievements
  {
    id: 'first-focus',
    name: 'First Bloom',
    description: 'Completed your first focus session',
    category: 'focus',
    rarity: 'common',
    icon: '🌱',
    ruleKey: 'first_focus_completed',
  },
  {
    id: 'focus-hour',
    name: 'Hour of Power',
    description: 'Focused for 60 minutes in a day',
    category: 'focus',
    rarity: 'uncommon',
    icon: '⏰',
    ruleKey: 'focus_60_min_day',
  },
  {
    id: 'focus-marathon',
    name: 'Deep Focus',
    description: 'Completed a 45+ minute session',
    category: 'focus',
    rarity: 'rare',
    icon: '🎯',
    ruleKey: 'focus_session_45_min',
  },
  {
    id: 'focus-five',
    name: 'High Five',
    description: 'Completed 5 focus sessions total',
    category: 'focus',
    rarity: 'uncommon',
    icon: '✋',
    ruleKey: 'focus_sessions_5_total',
  },
  {
    id: 'focus-ten',
    name: 'Focus Master',
    description: 'Completed 10 focus sessions total',
    category: 'focus',
    rarity: 'rare',
    icon: '🏆',
    ruleKey: 'focus_sessions_10_total',
  },
  
  // Streak achievements
  {
    id: 'streak-3',
    name: 'On a Roll',
    description: '3-day focus streak',
    category: 'streak',
    rarity: 'uncommon',
    icon: '🔥',
    ruleKey: 'streak_3_days',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: '7-day focus streak',
    category: 'streak',
    rarity: 'rare',
    icon: '⚡',
    ruleKey: 'streak_7_days',
  },
  {
    id: 'streak-14',
    name: 'Fortnight Force',
    description: '14-day focus streak',
    category: 'streak',
    rarity: 'epic',
    icon: '💎',
    ruleKey: 'streak_14_days',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: '30-day focus streak',
    category: 'streak',
    rarity: 'legendary',
    icon: '👑',
    ruleKey: 'streak_30_days',
  },
  
  // Sleep achievements
  {
    id: 'first-sleep',
    name: 'Sweet Dreams',
    description: 'Logged your first sleep',
    category: 'sleep',
    rarity: 'common',
    icon: '🌙',
    ruleKey: 'first_sleep_logged',
  },
  {
    id: 'sleep-week',
    name: 'Sleep Tracker',
    description: 'Logged sleep for 7 nights',
    category: 'sleep',
    rarity: 'uncommon',
    icon: '📊',
    ruleKey: 'sleep_logged_7_nights',
  },
  {
    id: 'good-sleep-streak',
    name: 'Well Rested',
    description: '3 nights of good sleep in a row',
    category: 'sleep',
    rarity: 'rare',
    icon: '😊',
    ruleKey: 'good_sleep_streak_3',
  },
  
  // Rhythm achievements
  {
    id: 'balanced-day',
    name: 'Balance',
    description: 'Completed focus and logged sleep same day',
    category: 'rhythm',
    rarity: 'common',
    icon: '⚖️',
    ruleKey: 'balanced_day',
  },
  {
    id: 'morning-person',
    name: 'Early Bird',
    description: 'Completed a focus session before 9am',
    category: 'rhythm',
    rarity: 'uncommon',
    icon: '🌅',
    ruleKey: 'focus_before_9am',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Completed a focus session after 9pm',
    category: 'rhythm',
    rarity: 'uncommon',
    icon: '🦉',
    ruleKey: 'focus_after_9pm',
  },
];

// Get a collectible definition by ID
export function getCollectibleById(id: string): CollectibleDefinition | undefined {
  return COLLECTIBLE_DEFINITIONS.find(c => c.id === id);
}

// Get all collectibles by category
export function getCollectiblesByCategory(category: CollectibleCategory): CollectibleDefinition[] {
  return COLLECTIBLE_DEFINITIONS.filter(c => c.category === category);
}

// Get rarity color
export function getRarityColor(rarity: CollectibleRarity): string {
  switch (rarity) {
    case 'common': return 'hsl(var(--muted-foreground))';
    case 'uncommon': return 'hsl(142 71% 45%)'; // Green
    case 'rare': return 'hsl(217 91% 60%)'; // Blue
    case 'epic': return 'hsl(271 91% 65%)'; // Purple
    case 'legendary': return 'hsl(45 93% 47%)'; // Gold
    default: return 'hsl(var(--muted-foreground))';
  }
}

// Get rarity background color (for badges)
export function getRarityBgColor(rarity: CollectibleRarity): string {
  switch (rarity) {
    case 'common': return 'hsl(var(--muted) / 0.5)';
    case 'uncommon': return 'hsl(142 71% 45% / 0.15)';
    case 'rare': return 'hsl(217 91% 60% / 0.15)';
    case 'epic': return 'hsl(271 91% 65% / 0.15)';
    case 'legendary': return 'hsl(45 93% 47% / 0.15)';
    default: return 'hsl(var(--muted) / 0.5)';
  }
}
