/**
 * Persisted avatar customization — "make it yours" (color + motion), the thing that most stood
 * out from Nixi per the merge request. Per-device only right now (localStorage): no real
 * Supabase project exists yet to sync this across the user's own devices (see MERGE_LOG.md).
 * Swapping to a Supabase-backed `avatar_settings` row is a drop-in replacement for this module's
 * get/set once that project exists — DesktopControlPage/AvatarCustomizer only depend on the
 * exported shape, not on localStorage specifically.
 */
import { useEffect, useState } from 'react';

export type MotionIntensity = 'calm' | 'normal' | 'energetic';

export interface AvatarSettings {
  pillColor: string;
  eyeColor: string;
  motionIntensity: MotionIntensity;
  trackCursor: boolean;
}

export interface AvatarPreset {
  id: string;
  label: string;
  pillColor: string;
  eyeColor: string;
}

// One Rivly-native option, one Flowzo-inspired option (the Figma reference's orange-on-dark
// language), and a few extra Nixi-style "various colors" choices — genuine choice, not a
// single reskin forced on the user.
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'rivly-indigo', label: 'Rivly Indigo', pillColor: '#1a1a2e', eyeColor: '#8b85f0' },
  { id: 'flowzo-orange', label: 'Flowzo Orange', pillColor: '#141414', eyeColor: '#ff7a1a' },
  { id: 'nixi-classic', label: 'Classic', pillColor: '#14141c', eyeColor: '#ffffff' },
  { id: 'teal', label: 'Teal', pillColor: '#0f1f1d', eyeColor: '#2dd4bf' },
  { id: 'rose', label: 'Rose', pillColor: '#1f1316', eyeColor: '#fb7185' },
];

const DEFAULT_SETTINGS: AvatarSettings = {
  pillColor: AVATAR_PRESETS[0].pillColor,
  eyeColor: AVATAR_PRESETS[0].eyeColor,
  motionIntensity: 'normal',
  trackCursor: true,
};

const STORAGE_KEY = 'rivly-avatar-settings';

function readSettings(): AvatarSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    // Private browsing / blocked storage — fall back to defaults rather than crash.
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: AvatarSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — customization just won't persist this session */
  }
}

export function useAvatarSettings(): [AvatarSettings, (patch: Partial<AvatarSettings>) => void] {
  const [settings, setSettings] = useState<AvatarSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  function update(patch: Partial<AvatarSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeSettings(next);
      return next;
    });
  }

  return [settings, update];
}
