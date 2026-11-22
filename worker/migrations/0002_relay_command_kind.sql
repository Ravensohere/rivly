-- Distinguishes user-visible spoken/typed commands from remote-console RPC calls (list panes, git
-- status, approve/deny, ...). Both ride the same queue; the phone's history view only shows 'command'.
ALTER TABLE desktop_commands ADD COLUMN kind TEXT NOT NULL DEFAULT 'command' CHECK (kind IN ('command', 'rpc'));
CREATE INDEX IF NOT EXISTS idx_desktop_commands_kind ON desktop_commands (device_id, kind, created_at);
