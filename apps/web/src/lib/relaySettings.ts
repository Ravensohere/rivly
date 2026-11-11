/**
 * Phone/web-side pairing info for the Cloudflare-native desktop relay (see
 * worker/src/routes/relay.ts, F:\Personal Assistant\app\backend\desktop_relay.py). The desktop
 * agent generates the device secret (via its own /desktop-relay/pair call) and the user pastes
 * the three values it returns — worker URL, device id, secret — in here once. Persisted to
 * localStorage per device/browser; there is deliberately no cross-device sync of this value
 * (pasting it IS the sync step, same as pairing a Bluetooth device).
 */
import { useEffect, useState } from 'react';

export interface RelaySettings {
  workerUrl: string;
  deviceId: string;
  secret: string;
}

const STORAGE_KEY = 'rivly-relay-pairing';

/** One-tap pairing: the desktop's pair page (QR/link) puts the three values in the URL fragment
 * (`#pair=<base64url JSON>`) — fragments never leave the browser. Returns the decoded settings and
 * strips the fragment from the address bar so the secret doesn't linger in history/screenshots. */
export function consumePairingFromHash(): RelaySettings | null {
  try {
    const match = window.location.hash.match(/^#pair=([A-Za-z0-9_-]+)$/);
    if (!match) return null;
    const padded = match[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const parsed = JSON.parse(json) as RelaySettings;
    if (!parsed.workerUrl || !parsed.deviceId || !parsed.secret) return null;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return { workerUrl: String(parsed.workerUrl).replace(/\/$/, ''), deviceId: String(parsed.deviceId), secret: String(parsed.secret) };
  } catch {
    return null;
  }
}

function readSettings(): RelaySettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RelaySettings;
    if (!parsed.workerUrl || !parsed.deviceId || !parsed.secret) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSettings(settings: RelaySettings | null): void {
  try {
    if (settings) localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — pairing just won't persist this session */
  }
}

export function useRelaySettings(): [RelaySettings | null, (s: RelaySettings | null) => void] {
  const [settings, setSettings] = useState<RelaySettings | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fromLink = consumePairingFromHash();
    if (fromLink) writeSettings(fromLink);
    setSettings(fromLink ?? readSettings());
    setLoaded(true);
  }, []);

  function update(next: RelaySettings | null) {
    setSettings(next);
    writeSettings(next);
  }

  return [loaded ? settings : null, update];
}
