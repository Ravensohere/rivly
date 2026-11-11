import { useEffect, useMemo, useRef, useState } from 'react';
import { PageTransition } from '@/components/ui/PageTransition';
import { NixiAvatar, NixiAvatarState } from '@/components/riva/NixiAvatar';
import { AvatarCustomizer } from '@/components/riva/AvatarCustomizer';
import { AssistantPanel, type AssistantActivity } from '@/components/desktop/AssistantPanel';
import { ApprovalsPanel, Approval, TerminalsPanel, usePolled } from '@/components/desktop/RemoteConsole';
import { OfficePanel } from '@/components/desktop/OfficePanel';
import { useAvatarSettings } from '@/lib/avatarSettings';
import { useSpeechInput } from '@/lib/useSpeechInput';
import { useRecorderTranscribe } from '@/lib/useRecorderTranscribe';
import { LOCAL_DESKTOP_URL, localDesktop } from '@/lib/localDesktop';
import { useRelaySettings, RelaySettings } from '@/lib/relaySettings';
import { cloudRelay } from '@/lib/cloudRelay';
import { desktopCall, DesktopContext } from '@/lib/desktopApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, Settings2 } from 'lucide-react';

interface DesktopCommand {
  id: string;
  command_text: string;
  status: 'pending' | 'claimed' | 'completed' | 'failed';
  result: { intent?: string; args?: unknown; result?: { error?: string; [k: string]: unknown } } | null;
  created_at: string;
}

type Tab = 'commands' | 'assistant' | 'office' | 'terminals' | 'approvals';

const TABS: Tab[] = ['commands', 'assistant', 'office', 'terminals', 'approvals'];

// The notch's "Open in Rivly" link lands on /desktop?tab=assistant.
function initialTab(): Tab {
  try {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    return TABS.find((t) => t === wanted) ?? 'commands';
  } catch {
    return 'commands';
  }
}

// Idle desktop polls every 5s; allow a missed poll or two before calling it offline.
const ONLINE_WITHIN_SECONDS = 20;

interface SystemStatus {
  shell_connected: boolean;
}

/**
 * Remote control for your desktop assistant: say or type a command (runs through the same engine
 * as a spoken command at the PC), watch and drive coding terminals, and approve risky actions.
 * Local mode talks straight to the desktop backend; cloud mode goes through the Cloudflare relay
 * (worker/src/routes/relay.ts) so it works from a phone anywhere. See ../../../../MERGE_LOG.md.
 */
export default function DesktopControlPage() {
  const [commandText, setCommandText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [avatarSettings, updateAvatarSettings] = useAvatarSettings();
  const [pairing, setPairing] = useRelaySettings();
  // Local (same machine, lowest latency) wins when configured; otherwise cloud when paired.
  const mode: 'local' | 'cloud' | 'unpaired' = LOCAL_DESKTOP_URL ? 'local' : pairing ? 'cloud' : 'unpaired';
  const ctx: DesktopContext | null = useMemo(
    () => (mode === 'local' ? { mode: 'local' } : mode === 'cloud' && pairing ? { mode: 'cloud', pairing } : null),
    [mode, pairing],
  );
  const active = ctx !== null;

  const commandsPoll = usePolled<DesktopCommand[]>(
    async () => {
      const rows = mode === 'local' ? await localDesktop.listHistory() : await cloudRelay.listCommands(pairing!);
      return rows as unknown as DesktopCommand[];
    },
    2500,
    active,
  );
  const commands = commandsPoll.data ?? [];

  const presence = usePolled<boolean>(
    async () => {
      if (mode === 'local') {
        await desktopCall<SystemStatus>({ mode: 'local' }, { method: 'GET', path: '/system/status' });
        return true;
      }
      const { secondsSinceSeen } = await cloudRelay.presence(pairing!);
      return secondsSinceSeen !== null && secondsSinceSeen <= ONLINE_WITHIN_SECONDS;
    },
    8000,
    active,
  );
  // Until the first check completes, assume reachable so the UI isn't greyed out on load.
  const online = presence.error ? false : (presence.data ?? true);

  const shellStatus = usePolled<SystemStatus>(
    () => desktopCall<SystemStatus>(ctx!, { method: 'GET', path: '/system/status' }),
    15000,
    active && online && tab === 'terminals',
  );

  const approvals = usePolled<Approval[]>(
    () => desktopCall<Approval[]>(ctx!, { method: 'GET', path: '/approvals/pending' }),
    tab === 'approvals' ? 3000 : 10000,
    active && online,
  );
  const pendingApprovals = approvals.data?.length ?? 0;

  const speech = useSpeechInput((finalText) => {
    setCommandText((prev) => (prev ? `${prev} ${finalText}` : finalText));
  });
  const recorder = useRecorderTranscribe(
    (text) => setCommandText((prev) => (prev ? `${prev} ${text}` : text)),
    (wavBlob) => localDesktop.transcribe(wavBlob),
  );
  // Recorder fallback needs the desktop backend's STT, which the cloud Worker doesn't have, so it
  // only applies in local mode — and only when the browser lacks the Web Speech API.
  const showRecorderFallback = !speech.supported && !!LOCAL_DESKTOP_URL;
  const baseAvatarState = useAvatarStateFromCommands(commands, sending);
  const [assistantActivity, setAssistantActivity] = useState<AssistantActivity>('idle');
  const avatarState: NixiAvatarState =
    tab === 'assistant' && assistantActivity !== 'idle'
      ? assistantActivity
      : speech.listening || recorder.recording
        ? 'listening'
        : recorder.busy
          ? 'thinking'
          : baseAvatarState;

  // Settings load asynchronously, so only fall back to Commands after the page was active (an unpair),
  // not on the first render — that would discard a ?tab= deep link.
  const wasActive = useRef(false);
  useEffect(() => {
    if (active) wasActive.current = true;
    else if (wasActive.current) setTab('commands');
  }, [active]);

  async function send() {
    const text = commandText.trim();
    if (!text || sending || !active) return;
    setSending(true);
    setError(null);
    try {
      if (mode === 'local') {
        await localDesktop.sendCommand(text);
      } else if (pairing) {
        await cloudRelay.sendCommand(pairing, text);
      }
      setCommandText('');
      commandsPoll.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <PageTransition className="flex flex-col items-center gap-5 px-4 sm:px-6 py-8 max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-3 relative w-full">
        <button
          type="button"
          onClick={() => setCustomizing((v) => !v)}
          className="absolute right-0 top-0 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Customize avatar"
        >
          <Settings2 className="w-4 h-4" />
        </button>
        <NixiAvatar
          state={avatarState}
          size={120}
          pillColor={avatarSettings.pillColor}
          eyeColor={avatarSettings.eyeColor}
          motionIntensity={avatarSettings.motionIntensity}
          trackCursor={avatarSettings.trackCursor}
        />
        <h1 className="text-xl font-medium">Send to desktop</h1>
        <p className="text-sm text-muted-foreground text-center">
          Tell it what to do — it runs on your computer, wherever you are.
        </p>
      </div>

      {customizing && <AvatarCustomizer settings={avatarSettings} onChange={updateAvatarSettings} />}

      {!active ? (
        <PairingForm onPaired={setPairing} />
      ) : (
        <>
          <div className="w-full flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-destructive'}`} />
              {online
                ? mode === 'cloud'
                  ? 'Desktop online — controlling it from anywhere'
                  : 'Desktop online (same machine)'
                : 'Desktop offline — commands will wait until it reconnects'}
            </span>
            {mode === 'cloud' && (
              <button type="button" className="underline hover:text-foreground" onClick={() => setPairing(null)}>
                Unpair
              </button>
            )}
          </div>

          <div className="w-full flex rounded-full border border-border p-1 text-sm">
            {(
              [
                ['commands', 'Commands'],
                ['assistant', 'Assistant'],
                ['office', 'Office'],
                ['terminals', 'Terminals'],
                ['approvals', pendingApprovals > 0 ? `Approvals (${pendingApprovals})` : 'Approvals'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 py-1.5 rounded-full transition-colors ${
                  tab === id
                    ? 'bg-orange-400 text-white'
                    : id === 'approvals' && pendingApprovals > 0
                      ? 'text-orange-400 font-medium'
                      : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'commands' && (
            <>
              <div className="w-full flex gap-2">
                <Input
                  value={speech.listening && speech.interimText ? speech.interimText : commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="e.g. open the budget spreadsheet"
                  disabled={sending}
                  className="rounded-full"
                />
                {speech.supported && (
                  <Button
                    onClick={() => (speech.listening ? speech.stop() : speech.start())}
                    disabled={sending}
                    size="icon"
                    variant={speech.listening ? 'default' : 'outline'}
                    className={`rounded-full shrink-0 ${speech.listening ? 'bg-orange-400 hover:bg-orange-500 text-white' : ''}`}
                    title={speech.listening ? 'Stop listening' : 'Speak a command'}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
                {showRecorderFallback && (
                  <Button
                    onClick={() => (recorder.recording ? recorder.stop() : recorder.start())}
                    disabled={sending || recorder.busy}
                    size="icon"
                    variant={recorder.recording ? 'default' : 'outline'}
                    className={`rounded-full shrink-0 ${recorder.recording ? 'bg-orange-400 hover:bg-orange-500 text-white' : ''}`}
                    title={recorder.recording ? 'Stop and transcribe' : recorder.busy ? 'Transcribing…' : 'Record a command'}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
                <Button onClick={send} disabled={sending || !commandText.trim()} size="icon" className="rounded-full shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {error && <p className="text-sm text-destructive w-full">{error}</p>}

              <div className="w-full flex flex-col gap-2">
                {commandsPoll.error && <p className="text-xs text-destructive">{commandsPoll.error}</p>}
                {commands.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">No commands sent yet.</p>
                ) : (
                  commands.map((c) => <CommandRow key={c.id} command={c} />)
                )}
              </div>
            </>
          )}

          {tab === 'assistant' && ctx && <AssistantPanel ctx={ctx} onActivity={setAssistantActivity} />}

          {tab === 'office' && ctx && <OfficePanel ctx={ctx} />}

          {tab === 'terminals' && ctx && (
            <TerminalsPanel ctx={ctx} shellConnected={shellStatus.data?.shell_connected ?? null} />
          )}

          {tab === 'approvals' && ctx && (
            <ApprovalsPanel
              ctx={ctx}
              approvals={approvals.data}
              error={approvals.error}
              onDecided={approvals.refresh}
            />
          )}
        </>
      )}
    </PageTransition>
  );
}

/**
 * Manual pairing fallback. The easy path is scanning the QR / opening the link from the desktop's
 * /desktop-relay/pair-page, which carries these values in the URL fragment (never sent to any
 * server) and is consumed by useRelaySettings.
 */
function PairingForm({ onPaired }: { onPaired: (s: RelaySettings) => void }) {
  const [workerUrl, setWorkerUrl] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [secret, setSecret] = useState('');

  function submit() {
    if (!workerUrl.trim() || !deviceId.trim() || !secret.trim()) return;
    onPaired({ workerUrl: workerUrl.trim().replace(/\/$/, ''), deviceId: deviceId.trim(), secret: secret.trim() });
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Pair with your desktop</p>
        <p className="text-xs text-muted-foreground mt-1">
          On your PC open <code className="px-1 rounded bg-accent">/desktop-relay/pair-page</code> on the assistant
          backend and scan the QR code with your phone. Or paste the three values it shows here.
        </p>
      </div>
      <Input placeholder="Worker URL (https://...)" value={workerUrl} onChange={(e) => setWorkerUrl(e.target.value)} className="rounded-full" />
      <Input placeholder="Device ID" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="rounded-full" />
      <Input placeholder="Secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className="rounded-full" />
      <Button onClick={submit} disabled={!workerUrl.trim() || !deviceId.trim() || !secret.trim()} className="rounded-full">
        Pair
      </Button>
    </div>
  );
}

const STATUS_STYLE: Record<DesktopCommand['status'], { dot: string; text: string; label: string }> = {
  pending: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'Pending' },
  claimed: { dot: 'bg-amber-500', text: 'text-amber-500', label: 'Running' },
  completed: { dot: 'bg-orange-400', text: 'text-orange-400', label: 'Done' },
  failed: { dot: 'bg-destructive', text: 'text-destructive', label: 'Failed' },
};

function CommandRow({ command }: { command: DesktopCommand }) {
  const style = STATUS_STYLE[command.status];
  const outcome = command.result?.result;
  const summary = summarize(outcome);
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-3 text-sm flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
        <span className="flex-1 truncate">{command.command_text}</span>
        <span className={`text-[10px] uppercase tracking-wide font-medium ${style.text}`}>{style.label}</span>
      </div>
      {outcome?.error ? (
        <p className="text-xs text-destructive pl-4 break-words">{String(outcome.error)}</p>
      ) : (
        summary && <p className="text-xs text-muted-foreground pl-4 break-words">{summary}</p>
      )}
    </div>
  );
}

/** One-line human summary of a command result, so stored output is readable without opening it. */
function summarize(o: Record<string, unknown> | undefined) {
  if (!o || typeof o !== 'object') return null;
  for (const key of ['message', 'spoken', 'summary', 'text', 'output']) {
    if (typeof o[key] === 'string' && o[key]) return String(o[key]).slice(0, 300);
  }
  return null;
}

/** Drives the avatar from the newest command's real lifecycle. Success (heart eyes) shows for a few seconds
 * after a command finishes while this page is open, then settles back to idle. */
function useAvatarStateFromCommands(commands: DesktopCommand[], sending: boolean): NixiAvatarState {
  const latest = commands[0];
  const seen = useRef<{ id: string | null; status: string | null; first: boolean }>({ id: null, status: null, first: true });
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    const prev = seen.current;
    const id = latest ? String(latest.id) : null;
    const status = latest?.status ?? null;
    const changed = id !== prev.id || status !== prev.status;
    if (!latest && prev.first) return;
    seen.current = { id, status, first: false };
    if (!changed || prev.first || status !== 'completed') return;
    setCelebrate(true);
    const t = setTimeout(() => setCelebrate(false), 3000);
    return () => clearTimeout(t);
  }, [latest?.id, latest?.status]);

  if (sending) return 'listening';
  if (!latest) return 'idle';
  if (latest.status === 'pending' || latest.status === 'claimed') return 'thinking';
  if (latest.status === 'failed') return 'error';
  if (latest.status === 'completed' && celebrate) return 'success';
  return 'idle';
}
