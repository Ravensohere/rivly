/**
 * Local-mode desktop bridge: talks directly to the desktop agent's backend
 * (F:\Personal Assistant\app\backend, port 8765) with no Supabase/Worker involved. Used when
 * `VITE_LOCAL_DESKTOP_URL` is set — i.e. right now, since no external Supabase account/project
 * exists yet for the real cloud relay (see MERGE_LOG.md "Not done yet"). This proves the full
 * "type a command, desktop actually runs it" integration today, same-machine. Swapping to the
 * real `api.desktop.*` (Supabase-backed, works from anywhere, phone included) is a config
 * change once real credentials exist — this file and that one deliberately share the exact
 * same return shape so DesktopControlPage.tsx doesn't need to know which one it's using.
 */
export const LOCAL_DESKTOP_URL = import.meta.env.VITE_LOCAL_DESKTOP_URL as string | undefined;

export interface LocalCommandResult {
  id: string;
  command_text: string;
  status: 'completed' | 'failed';
  result: { intent?: string; args?: unknown; result?: { error?: string; [k: string]: unknown } };
  created_at: string;
}

export const localDesktop = {
  /** Local-only STT fallback for browsers without the Web Speech API (see
   * useRecorderTranscribe.ts) — the cloud Worker has no faster-whisper model, so this only
   * works when talking directly to the desktop backend. */
  async transcribe(wavBlob: Blob): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append('audio', wavBlob, 'command.wav');
    const response = await fetch(`${LOCAL_DESKTOP_URL}/voice/transcribe`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error(`transcribe failed: ${response.status}`);
    return response.json();
  },

  async sendCommand(commandText: string): Promise<LocalCommandResult> {
    const response = await fetch(`${LOCAL_DESKTOP_URL}/voice/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commandText }),
    });
    if (!response.ok) throw new Error(`desktop backend error: ${response.status}`);
    const data = await response.json();
    const failed = typeof data.result === 'object' && data.result !== null && 'error' in data.result;
    return {
      id: `${Date.now()}`,
      command_text: commandText,
      status: failed ? 'failed' : 'completed',
      result: { intent: data.intent, args: data.args, result: data.result },
      created_at: new Date().toISOString(),
    };
  },

  async listHistory(): Promise<LocalCommandResult[]> {
    const response = await fetch(`${LOCAL_DESKTOP_URL}/action-history?limit=20`);
    if (!response.ok) throw new Error(`desktop backend error: ${response.status}`);
    const rows: { id: number; type: string; transcript: string | null; result: string | null; created_at: string }[] =
      await response.json();
    return rows.map((row) => {
      let parsedResult: unknown = {};
      try {
        parsedResult = row.result ? JSON.parse(row.result) : {};
      } catch {
        /* leave as {} if the stored result wasn't valid JSON */
      }
      const failed = typeof parsedResult === 'object' && parsedResult !== null && 'error' in parsedResult;
      return {
        id: String(row.id),
        command_text: row.transcript ?? '',
        status: failed ? 'failed' : 'completed',
        result: { intent: row.type, result: parsedResult as Record<string, unknown> },
        created_at: row.created_at,
      };
    });
  },
};
