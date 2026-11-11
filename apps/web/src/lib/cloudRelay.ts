/**
 * Cloud-mode desktop bridge: talks to the Cloudflare Worker's relay routes
 * (worker/src/routes/relay.ts) using the paired device's secret (relaySettings.ts) — works from
 * anywhere, not just the same machine/network as the desktop (unlike localDesktop.ts). This is
 * the real "at work, control my home PC" path. Cloudflare-native: no Supabase, see MERGE_LOG.md.
 */
import { RelaySettings } from './relaySettings';

export interface RelayCommand {
  id: string;
  command_text: string;
  status: 'pending' | 'claimed' | 'completed' | 'failed';
  result: { intent?: string; args?: unknown; result?: { error?: string; [k: string]: unknown } } | null;
  created_at: string;
}

async function relayFetch(pairing: RelaySettings, path: string, init: RequestInit = {}) {
  const response = await fetch(`${pairing.workerUrl}/relay/devices/${pairing.deviceId}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pairing.secret}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || `relay error: ${response.status}`);
  }
  return response.json();
}

export const cloudRelay = {
  async sendCommand(pairing: RelaySettings, commandText: string): Promise<RelayCommand> {
    const data = await relayFetch(pairing, '/commands', {
      method: 'POST',
      body: JSON.stringify({ command_text: commandText }),
    });
    return parseCommand(data.command);
  },

  /** Newest first, capped — history view only, rpc console calls excluded. */
  async listCommands(pairing: RelaySettings): Promise<RelayCommand[]> {
    const data = await relayFetch(pairing, '/commands?kind=command&order=desc&limit=30');
    return (data.commands as Record<string, unknown>[]).map(parseCommand);
  },

  /** Seconds since the desktop agent last polled the relay, or null if it never has. */
  async presence(pairing: RelaySettings): Promise<{ secondsSinceSeen: number | null }> {
    const data = await relayFetch(pairing, '');
    return { secondsSinceSeen: typeof data.seconds_since_seen === 'number' ? data.seconds_since_seen : null };
  },

  /** Queue a remote-console call and wait for the desktop to answer (see desktop remote_rpc.py). */
  async rpc(pairing: RelaySettings, request: unknown, timeoutMs = 45000): Promise<unknown> {
    const created = await relayFetch(pairing, '/commands', {
      method: 'POST',
      body: JSON.stringify({ command_text: JSON.stringify(request), kind: 'rpc' }),
    });
    const id = String(created.command.id);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const data = await relayFetch(pairing, `/commands/${id}`);
      const row = data.command as Record<string, unknown>;
      if (row.status === 'completed' || row.status === 'failed') {
        const parsed = typeof row.result === 'string' ? JSON.parse(row.result) : null;
        if (row.status === 'failed') throw new Error(parsed?.error || 'desktop rejected the request');
        return parsed;
      }
    }
    throw new Error('desktop did not answer — is your PC on and the assistant running?');
  },
};

function parseCommand(row: Record<string, unknown>): RelayCommand {
  let result = null;
  if (typeof row.result === 'string') {
    try {
      result = JSON.parse(row.result);
    } catch {
      result = null;
    }
  }
  return {
    id: String(row.id),
    command_text: String(row.command_text),
    status: row.status as RelayCommand['status'],
    result,
    created_at: String(row.created_at),
  };
}
