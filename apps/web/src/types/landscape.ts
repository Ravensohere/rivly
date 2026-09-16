// Landscape & Growth System Types

export type FocusPurposeType = 'study' | 'work' | 'creative' | 'custom';
export type WakeIntentType = 'calm' | 'energized' | 'focused' | 'gentle';

// Individual focus seed - represents one focus session's contribution
export interface FocusSeed {
  id: string;
  date: string;
  durationMinutes: number;
  completed: boolean;
  endedEarly: boolean;
  purpose: string;
  growthLevel: number; // 0-1, based on duration/completion
}

// Daily growth tracking
export interface DailyGrowth {
  date: string;
  hasGrown: boolean;
  focusCompleted: boolean;
  reflectionDone: boolean;
  windDownUsed: boolean;
  seeds: string[]; // FocusSeed IDs for that day
}

// Collectible types and their unlock conditions
export type CollectibleCategory = 'focus' | 'calm' | 'rhythm';

export interface Collectible {
  id: string;
  name: string;
  description: string;
  category: CollectibleCategory;
  unlockedAt?: string; // date when unlocked
  visualType: string; // for rendering different SVG types
}

// Pre-defined collectibles
export const COLLECTIBLES: Omit<Collectible, 'unlockedAt'>[] = [
  // Focus Forms (Trees / Growth Structures)
  {
    id: 'deep-root',
    name: 'Deep Root',
    description: 'From a long, focused session',
    category: 'focus',
    visualType: 'tree-oak',
  },
  {
    id: 'bamboo-form',
    name: 'Bamboo Form',
    description: 'From consistent short sessions',
    category: 'focus',
    visualType: 'tree-bamboo',
  },
  {
    id: 'pine-form',
    name: 'Pine Form',
    description: 'From calm evening work',
    category: 'focus',
    visualType: 'tree-pine',
  },
  {
    id: 'willow-form',
    name: 'Willow Form',
    description: 'From gentle, balanced days',
    category: 'focus',
    visualType: 'tree-willow',
  },
  // Calm Elements (Water / Air)
  {
    id: 'gentle-stream',
    name: 'Gentle Stream',
    description: 'From using wind-down',
    category: 'calm',
    visualType: 'water-stream',
  },
  {
    id: 'morning-mist',
    name: 'Morning Mist',
    description: 'From parking anxious thoughts',
    category: 'calm',
    visualType: 'air-mist',
  },
  {
    id: 'still-water',
    name: 'Still Water',
    description: 'From restful days',
    category: 'calm',
    visualType: 'water-pond',
  },
  {
    id: 'light-rain',
    name: 'Light Rain',
    description: 'From quiet reflection',
    category: 'calm',
    visualType: 'water-rain',
  },
  // Rhythm Elements (Light / Sky)
  {
    id: 'soft-sunrise',
    name: 'Soft Sunrise',
    description: 'From consistent wake times',
    category: 'rhythm',
    visualType: 'light-sunrise',
  },
  {
    id: 'golden-light',
    name: 'Golden Light',
    description: 'From balanced days',
    category: 'rhythm',
    visualType: 'light-golden',
  },
  {
    id: 'clear-dusk',
    name: 'Clear Dusk',
    description: 'From peaceful evenings',
    category: 'rhythm',
    visualType: 'sky-dusk',
  },
  {
    id: 'starlight',
    name: 'Starlight',
    description: 'From deep rest',
    category: 'rhythm',
    visualType: 'sky-stars',
  },
];

// Weekly landscape state - environment evolution
export type SkyState = 'cloudy' | 'clearing' | 'clear' | 'golden';
export type WaterState = 'still' | 'rippling' | 'flowing';
export type LightState = 'dim' | 'soft' | 'warm' | 'radiant';

export interface LandscapeState {
  skyState: SkyState;
  waterState: WaterState;
  lightState: LightState;
  lastUpdated: string;
}

// Full landscape data stored in localStorage
export interface LandscapeData {
  seeds: FocusSeed[];
  dailyGrowth: DailyGrowth[];
  unlockedCollectibles: string[]; // collectible IDs
  landscapeState: LandscapeState;
  totalFocusMinutes: number;
  streak: number; // for internal calculation, not shown prominently
  lastActivityDate: string;
}

export const DEFAULT_LANDSCAPE_STATE: LandscapeState = {
  skyState: 'cloudy',
  waterState: 'still',
  lightState: 'dim',
  lastUpdated: '',
};

export const DEFAULT_LANDSCAPE_DATA: LandscapeData = {
  seeds: [],
  dailyGrowth: [],
  unlockedCollectibles: [],
  landscapeState: DEFAULT_LANDSCAPE_STATE,
  totalFocusMinutes: 0,
  streak: 0,
  lastActivityDate: '',
};
