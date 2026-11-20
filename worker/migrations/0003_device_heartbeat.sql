-- The desktop agent stamps this on every poll (X-Relay-Role: desktop) so the phone can show an
-- honest online/offline indicator without sending a probe command.
ALTER TABLE desktop_devices ADD COLUMN last_seen_at TEXT;
