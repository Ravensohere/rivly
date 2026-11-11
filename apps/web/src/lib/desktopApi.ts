/**
 * One call surface for the remote console (terminals, git, approvals) that works in both modes:
 * same-machine `local` (direct fetch to the desktop backend) and `cloud` (queued through the
 * Cloudflare relay as an rpc command, replayed by the desktop against its own backend — see
 * desktop remote_rpc.py for the allowlist). Panels don't need to know which one is active.
 */
import { LOCAL_DESKTOP_URL } from './localDesktop';
import { cloudRelay } from './cloudRelay';
import { RelaySettings } from './relaySettings';

export type DesktopContext = { mode: 'local' } | { mode: 'cloud'; pairing: RelaySettings };

export interface RpcRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number>;
  body?: Record<string, unknown>;
}

interface RpcOutcome {
  status: number;
  body?: unknown;
  text?: string;
  truncated?: boolean;
  error?: string;
}

function errorFrom(status: number, body: unknown): Error {
  const detail = (body as { detail?: unknown } | null)?.detail;
  return new Error(typeof detail === 'string' ? detail : `desktop returned ${status}`);
}

export async function desktopCall<T>(ctx: DesktopContext, request: RpcRequest, timeoutMs?: number): Promise<T> {
  if (ctx.mode === 'local') {
    const search = request.query
      ? '?' + new URLSearchParams(Object.entries(request.query).map(([k, v]) => [k, String(v)])).toString()
      : '';
    const response = await fetch(`${LOCAL_DESKTOP_URL}${request.path}${search}`, {
      method: request.method,
      headers: request.body ? { 'Content-Type': 'application/json' } : undefined,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw errorFrom(response.status, payload);
    return payload as T;
  }

  const outcome = (await cloudRelay.rpc(ctx.pairing, request, timeoutMs)) as RpcOutcome;
  if (outcome.error) throw new Error(outcome.error);
  if (outcome.status >= 400) throw errorFrom(outcome.status, outcome.body);
  if (outcome.truncated) return { diff: outcome.text, truncated: true } as T;
  return outcome.body as T;
}
