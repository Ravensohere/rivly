-- Desktop relay: phone-to-desktop command queue, Cloudflare-native (D1), no Supabase involved.
-- Deliberately not tied to Rivly's Supabase user accounts: a device holds a single shared
-- secret, generated once by the desktop agent, pasted once into the phone/web client. Whoever
-- has the secret can both enqueue and execute commands for that device — appropriate for a
-- single-user personal device pair, not a multi-tenant system.

CREATE TABLE IF NOT EXISTS desktop_devices (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL, -- SHA-256 hex of the shared secret; the raw secret is never stored
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS desktop_commands (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES desktop_devices(id) ON DELETE CASCADE,
  command_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'completed', 'failed')),
  result TEXT, -- JSON string: {intent, args, result} from system_agent.dispatch
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  claimed_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS desktop_commands_device_status_idx
  ON desktop_commands(device_id, status, created_at);
