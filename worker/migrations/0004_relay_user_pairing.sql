-- Phase 1 of the stranger-safe relay redesign: a device row is no longer anonymous. Every device
-- is now tied to the Rivly (Supabase) user who paired it, via a one-time pairing code — the shared
-- device secret still protects the desktop<->worker link itself, but ownership of *which device*
-- a given logged-in user may see/command is now enforced in application code against user_id.

ALTER TABLE desktop_devices ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS desktop_devices_user_idx ON desktop_devices(user_id);

-- Short-lived, single-use codes: a logged-in user requests one on the phone/web, types it into the
-- desktop app's own setup wizard. Redeeming a code is what creates the desktop_devices row and
-- binds it to that user_id — replacing today's "anyone who has the secret owns the device" model.
CREATE TABLE IF NOT EXISTS relay_pairing_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  device_id TEXT REFERENCES desktop_devices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS relay_pairing_codes_user_idx ON relay_pairing_codes(user_id);
