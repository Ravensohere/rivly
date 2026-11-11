import { useCallback, useEffect, useRef, useState } from 'react';
import { desktopCall, type DesktopContext } from '@/lib/desktopApi';
import { Mic, Send, Volume2, VolumeX } from 'lucide-react';
import { useSpeechInput } from '@/lib/useSpeechInput';

export type AssistantActivity = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  model?: string | null;
  error?: boolean;
  at?: Date;
}

interface AskReply {
  reply: string;
  model: string | null;
  error: string | null;
}

interface ProviderStatus {
  label: string;
  model: string;
  available: boolean;
  paid?: boolean;
  daily_cap?: number | null;
  used_today?: number;
}

interface BrainStatus {
  providers: Record<string, unknown>;
  config: { on_claude_limit: string; assistant_name?: string };
}

interface Voice {
  id: string;
  label: string;
  accent: string;
  gender: string;
}

interface VoiceInfo {
  voices: Voice[];
  prefs: { voice: string; speed: number; by_provider: Record<string, string> };
}

// A turn can take a while (Claude plus tools, or a model fallback), and may wait on an approval.
const ASK_TIMEOUT_MS = 100_000;

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const ORANGE = '#FF7A00';
const CHIPS = ['Top news', 'Weather today', 'What time is it', 'Open NibNow'];
const BAR: Record<string, string> = { Instant: '#7ED9A6', Claude: '#B9A4F5' };

const clock = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Chat with the desktop assistant (same router and models as the notch) plus model and voice settings.
 * Styled after the Flowzo Figma: orange accent, white rounded cards with pastel side bars, a Messages-style
 * thread and a round orange send button. */
export function AssistantPanel({ ctx, onActivity }: { ctx: DesktopContext; onActivity?: (a: AssistantActivity) => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('Nova');
  const endRef = useRef<HTMLDivElement>(null);
  const [speakReplies, setSpeakReplies] = useState(() => {
    try {
      return localStorage.getItem('rivly-assistant-speak') !== '0';
    } catch {
      return true;
    }
  });
  const [talking, setTalking] = useState(false);
  const [mood, setMood] = useState<AssistantActivity>('idle');
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashMood = useCallback((m: AssistantActivity, ms: number) => {
    setMood(m);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood('idle'), ms);
  }, []);

  const toggleSpeak = () => {
    setSpeakReplies((v) => {
      try {
        localStorage.setItem('rivly-assistant-speak', v ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      if (v) window.speechSynthesis?.cancel();
      return !v;
    });
  };

  // The avatar talks while the reply is read aloud with the browser voice. Without a voice it still mouths
  // along for a time scaled to the reply length.
  const speakReply = useCallback(
    (reply: string) => {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      const finish = () => setTalking(false);
      if (talkTimer.current) clearTimeout(talkTimer.current);
      setTalking(true);
      if (speakReplies && synth && typeof SpeechSynthesisUtterance !== 'undefined') {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(reply.slice(0, 600));
        u.onend = finish;
        u.onerror = finish;
        synth.speak(u);
        talkTimer.current = setTimeout(finish, 30_000);
      } else {
        talkTimer.current = setTimeout(finish, Math.min(8000, 900 + reply.split(/\s+/).length * 280));
      }
    },
    [speakReplies],
  );

  useEffect(
    () => () => {
      if (talkTimer.current) clearTimeout(talkTimer.current);
      if (moodTimer.current) clearTimeout(moodTimer.current);
      window.speechSynthesis?.cancel();
    },
    [],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [turns, busy]);

  useEffect(() => {
    desktopCall<BrainStatus>(ctx, { method: 'GET', path: '/brain/status' })
      .then((b) => setName(b.config.assistant_name || 'Nova'))
      .catch(() => {});
  }, [ctx]);

  const send = useCallback(
    async (override?: string) => {
      const message = (override ?? text).trim();
      if (!message || busy) return;
      setText('');
      setBusy(true);
      setTurns((t) => [...t, { role: 'user', text: message, at: new Date() }]);
      try {
        const out = await desktopCall<AskReply>(
          ctx,
          { method: 'POST', path: '/assistant/ask-text', body: { text: message } },
          ASK_TIMEOUT_MS,
        );
        setTurns((t) => [
          ...t,
          { role: 'assistant', text: out.reply || 'Done.', model: out.model, error: !!out.error, at: new Date() },
        ]);
        if (out.error) flashMood('error', 2500);
        else {
          if (/\b(thanks?|thank you|thx|love you|good job|well done)\b/i.test(message)) flashMood('success', 3000);
          speakReply(out.reply || 'Done.');
        }
      } catch (e) {
        setTurns((t) => [...t, { role: 'assistant', text: errText(e), error: true, at: new Date() }]);
        flashMood('error', 2500);
      } finally {
        setBusy(false);
      }
    },
    [ctx, text, busy, flashMood, speakReply],
  );

  const speech = useSpeechInput((finalText) => void send(finalText));

  const activity: AssistantActivity = speech.listening
    ? 'listening'
    : busy
      ? 'thinking'
      : talking
        ? 'speaking'
        : mood;
  useEffect(() => {
    onActivity?.(activity);
  }, [activity, onActivity]);
  useEffect(() => () => onActivity?.('idle'), [onActivity]);

  return (
    <div className="w-full flex flex-col gap-4 rounded-3xl bg-white text-neutral-900 p-4 shadow-sm border border-neutral-200">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
          style={{ background: `linear-gradient(135deg, #FFA94D, ${ORANGE})` }}
          aria-hidden
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-extrabold leading-tight truncate" style={{ color: ORANGE }}>
            {name}
          </h2>
          <p className="text-xs text-neutral-500">
            {speech.listening ? 'Listening…' : busy ? 'Thinking…' : talking ? 'Speaking…' : 'Online on your PC'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleSpeak}
          aria-label={speakReplies ? 'Mute spoken replies' : 'Speak replies aloud'}
          title={speakReplies ? 'Mute spoken replies' : 'Speak replies aloud'}
          className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600"
        >
          {speakReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => void send(c)}
            disabled={busy}
            className="rounded-full px-3 py-1 text-xs font-medium border bg-white disabled:opacity-50"
            style={{ borderColor: ORANGE, color: ORANGE }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {turns.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-4">
            Ask {name} anything. News, weather and quick questions answer in a second. Email and calendar use Claude.
          </p>
        )}
        {turns.map((turn, i) =>
          turn.role === 'user' ? (
            <div key={i} className="self-end max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 text-sm text-white break-words" style={{ background: ORANGE }}>
              {turn.text}
            </div>
          ) : (
            <div
              key={i}
              className="self-start max-w-[92%] rounded-2xl border bg-white shadow-sm pl-4 pr-3 py-2 text-sm break-words relative overflow-hidden"
              style={{ borderColor: turn.error ? '#f3b4b4' : '#ececec' }}
            >
              <span
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ background: turn.error ? '#F28B8B' : BAR[turn.model ?? ''] ?? '#8EC5FF' }}
              />
              <span className={turn.error ? 'text-red-600' : ''}>{turn.text}</span>
              <div className="mt-1 flex items-center justify-between gap-3 text-[10px] uppercase tracking-wide text-neutral-400">
                <span>{turn.model ?? ''}</span>
                <span>{turn.at ? clock(turn.at) : ''}</span>
              </div>
            </div>
          ),
        )}
        {busy && <p className="self-start text-sm text-neutral-400">{name} is thinking…</p>}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={speech.listening && speech.interimText ? speech.interimText : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder={`Message ${name}`}
          disabled={busy}
          className="flex-1 min-w-0 h-11 rounded-full border border-neutral-300 bg-white px-4 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-orange-500"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            disabled={busy}
            aria-label={speech.listening ? 'Stop listening' : 'Talk to the assistant'}
            className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center border disabled:opacity-50"
            style={speech.listening ? { background: ORANGE, color: '#fff', borderColor: ORANGE } : { borderColor: ORANGE, color: ORANGE }}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => void send()}
          disabled={busy || !text.trim()}
          aria-label="Send"
          className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-white shadow-md disabled:opacity-50"
          style={{ background: ORANGE }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <ModelAndVoiceSettings ctx={ctx} name={name} onName={setName} />
    </div>
  );
}

function ModelAndVoiceSettings({ ctx, name, onName }: { ctx: DesktopContext; name: string; onName: (n: string) => void }) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);

  const saveName = async () => {
    const clean = draft.replace(/[^A-Za-z0-9 '-]/g, '').trim().slice(0, 24) || 'Nova';
    setDraft(clean);
    try {
      await desktopCall(ctx, { method: 'PUT', path: '/brain/config', body: { assistant_name: clean } });
      onName(clean);
    } catch (e) {
      setError(errText(e));
    }
  };

  const [brain, setBrain] = useState<BrainStatus | null>(null);
  const [voiceInfo, setVoiceInfo] = useState<VoiceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, v] = await Promise.all([
        desktopCall<BrainStatus>(ctx, { method: 'GET', path: '/brain/status' }),
        desktopCall<VoiceInfo>(ctx, { method: 'GET', path: '/voice/voices' }),
      ]);
      setBrain(b);
      setVoiceInfo(v);
      setError(null);
    } catch (e) {
      setError(errText(e));
    }
  }, [ctx]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMode = async (value: string) => {
    setBrain((b) => (b ? { ...b, config: { ...b.config, on_claude_limit: value } } : b));
    try {
      await desktopCall(ctx, { method: 'PUT', path: '/brain/config', body: { on_claude_limit: value } });
    } catch (e) {
      setError(errText(e));
    }
  };

  const saveVoice = async (voice: string) => {
    setVoiceInfo((v) => (v ? { ...v, prefs: { ...v.prefs, voice } } : v));
    try {
      await desktopCall(ctx, { method: 'PUT', path: '/voice/prefs', body: { voice } });
    } catch (e) {
      setError(errText(e));
    }
  };

  const providers: [string, ProviderStatus][] = brain
    ? Object.entries(brain.providers).filter(
        (entry): entry is [string, ProviderStatus] =>
          typeof entry[1] === 'object' && entry[1] !== null && 'label' in entry[1] && 'available' in entry[1],
      )
    : [];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 flex flex-col gap-3 text-sm text-neutral-800">
      <p className="font-bold">Assistant settings</p>
      <label className="flex items-center gap-2">
        <span className="flex-1">Name</span>
        <input
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== name && void saveName()}
          onKeyDown={(e) => e.key === 'Enter' && void saveName()}
          className="w-32 rounded-full border border-neutral-300 bg-white px-3 py-1"
        />
      </label>
      {error && <p className="text-red-600">{error}</p>}
      {!brain && !error && <p className="text-neutral-500">Loading…</p>}
      {brain && (
        <>
          <ul className="flex flex-col gap-1">
            {providers.map(([id, p]) => (
              <li key={id} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${p.available ? 'bg-green-500' : 'bg-neutral-300'}`} />
                <span className="flex-1">{p.label}</span>
                {p.daily_cap ? (
                  <span className="text-xs text-neutral-500">
                    {p.used_today ?? 0}/{p.daily_cap} today
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2">
            <span className="flex-1">When Claude hits its limit</span>
            <select
              className="rounded-full border border-neutral-300 bg-white px-2 py-1"
              value={brain.config.on_claude_limit}
              onChange={(e) => void saveMode(e.target.value)}
            >
              <option value="ask">Ask me</option>
              <option value="auto">Switch automatically</option>
            </select>
          </label>
          <p className="text-xs text-neutral-500">
            Type "use deepseek", "use local" or "auto" to pick a model. API keys and paid models are managed on the PC
            only.
          </p>
        </>
      )}
      {voiceInfo && (
        <label className="flex items-center gap-2">
          <span className="flex-1">Assistant voice</span>
          <select
            className="rounded-full border border-neutral-300 bg-white px-2 py-1"
            value={voiceInfo.prefs.voice}
            onChange={(e) => void saveVoice(e.target.value)}
          >
            {voiceInfo.voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} ({v.accent}, {v.gender})
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
