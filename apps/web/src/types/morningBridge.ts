// Morning Bridge Types

export interface MorningBridgeAction {
  id: string;
  title: string;
  subtitle?: string;
  iconKey: MorningBridgeIcon;
  durationMins?: number;
  isCustom?: boolean;
}

export type MorningBridgeIcon = 
  | 'droplet' 
  | 'stretch' 
  | 'sun' 
  | 'wind' 
  | 'book' 
  | 'pen' 
  | 'list' 
  | 'footprints'
  | 'heart'
  | 'coffee'
  | 'sparkles';

export interface MorningBridgeSettings {
  enabled: boolean;
  wakeTime: string; // HH:mm format
  actions: MorningBridgeAction[];
}

export interface MorningBridgeDayState {
  dayKey: string;
  doneActionIds: string[];
  skippedActionIds: string[];
  shownAt?: string; // ISO timestamp
}

export const DEFAULT_MORNING_BRIDGE_SETTINGS: MorningBridgeSettings = {
  enabled: true,
  wakeTime: '07:00',
  actions: [
    { id: 'default-water', title: 'Drink a glass of water', subtitle: 'Hydrate to start fresh', iconKey: 'droplet', durationMins: 1 },
    { id: 'default-stretch', title: 'Stretch for 2 minutes', subtitle: 'Wake up your body', iconKey: 'stretch', durationMins: 2 },
  ],
};

export const SUGGESTED_ACTIONS: MorningBridgeAction[] = [
  { id: 'sug-water', title: 'Drink water', subtitle: 'Start hydrated', iconKey: 'droplet', durationMins: 1 },
  { id: 'sug-stretch', title: 'Stretch 2 mins', subtitle: 'Wake up your body', iconKey: 'stretch', durationMins: 2 },
  { id: 'sug-sunlight', title: 'Sunlight 5 mins', subtitle: 'Set your circadian rhythm', iconKey: 'sun', durationMins: 5 },
  { id: 'sug-breathe', title: '10 deep breaths', subtitle: 'Center yourself', iconKey: 'wind', durationMins: 2 },
  { id: 'sug-read', title: 'Read 10 mins', subtitle: 'Start with intention', iconKey: 'book', durationMins: 10 },
  { id: 'sug-journal', title: 'Journal 2 lines', subtitle: 'Set your intention', iconKey: 'pen', durationMins: 3 },
  { id: 'sug-plan', title: 'Plan top 1 task', subtitle: 'Focus on priority', iconKey: 'list', durationMins: 2 },
  { id: 'sug-walk', title: 'Short walk', subtitle: 'Get moving', iconKey: 'footprints', durationMins: 10 },
];

// Maximum 3 actions allowed
export const MAX_ACTIONS = 3;
