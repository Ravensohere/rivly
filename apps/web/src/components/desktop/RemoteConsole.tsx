import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { desktopCall, DesktopContext } from '@/lib/desktopApi';
import { ArrowLeft, Check, GitBranch, Plus, Send, TerminalSquare, X } from 'lucide-react';

export interface Pane {
  id: number;
  call_sign: string;
  cli_tool: string;
  status: string;
  submission_state: string;
  project_path: string | null;
}

export interface Approval {
  id: number;
  pane_id: number | null;
  action_description: string;
  risk_level: string;
  status: string;
}

interface Polled<T> {
  data: T | null;
  error: string | null;
  refresh: () => void;
}

/** Poll `fetcher` every `intervalMs` while enabled and the tab is visible. Requests never overlap
 * (a cloud rpc takes seconds), and the next one is scheduled only after the previous settles. */
export function usePolled<T>(fetcher: () => Promise<T>, intervalMs: number, enabled: boolean): Polled<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;

    const run = async () => {
      if (cancelled || running) return;
      running = true;
      if (!document.hidden) {
        try {
          const next = await fetcherRef.current();
          if (!cancelled) {
            setData(next);
            setError(null);
          }
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        }
      }
      running = false;
      if (!cancelled) timer = setTimeout(run, intervalMs);
    };
    kick.current = () => {
      if (timer) clearTimeout(timer);
      void run();
    };
    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, intervalMs]);

  return { data, error, refresh: () => kick.current() };
}

const STATE_STYLE: Record<string, string> = {
  running: 'bg-amber-500',
  idle: 'bg-orange-500',
};

export function TerminalsPanel({ ctx, shellConnected }: { ctx: DesktopContext; shellConnected: boolean | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const panes = usePolled(() => desktopCall<Pane[]>(ctx, { method: 'GET', path: '/panes' }), 5000, selected === null);

  if (selected) {
    return <PaneView ctx={ctx} callSign={selected} shellConnected={shellConnected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {shellConnected === false && <ShellBanner />}
      {panes.error && <p className="text-sm text-destructive">{panes.error}</p>}
      {panes.data === null && !panes.error && <p className="text-sm text-muted-foreground text-center">Loading terminals…</p>}
      {panes.data?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">No terminals yet — create one below.</p>
      )}
      {panes.data?.map((pane) => (
        <button
          key={pane.id}
          type="button"
          onClick={() => setSelected(pane.call_sign)}
          className="rounded-2xl border border-border bg-card/40 p-3 text-sm flex items-center gap-3 text-left hover:bg-accent/40 transition-colors"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATE_STYLE[pane.status] ?? 'bg-muted-foreground'}`} />
          <TerminalSquare className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="font-medium">{pane.call_sign}</span>
            <span className="block text-xs text-muted-foreground truncate">{pane.project_path ?? 'no project folder'}</span>
          </span>
          <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">{pane.status}</span>
        </button>
      ))}
      <NewPaneForm ctx={ctx} onCreated={(callSign) => setSelected(callSign)} />
    </div>
  );
}

function ShellBanner() {
  return (
    <p className="text-xs rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3">
      The terminal app isn't running on your PC, so panes can be listed but can't receive input or show output.
      Start the desktop assistant window to use them.
    </p>
  );
}

function NewPaneForm({ ctx, onCreated }: { ctx: DesktopContext; onCreated: (callSign: string) => void }) {
  const [open, setOpen] = useState(false);
  const [callSign, setCallSign] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const pane = await desktopCall<Pane>(ctx, {
        method: 'POST',
        path: '/panes',
        body: { call_sign: callSign.trim(), project_path: projectPath.trim() || null },
      });
      setOpen(false);
      setCallSign('');
      setProjectPath('');
      onCreated(pane.call_sign);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1" /> New terminal
      </Button>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 flex flex-col gap-2">
      <Input
        placeholder="Call sign (e.g. GT1)"
        value={callSign}
        onChange={(e) => setCallSign(e.target.value)}
        maxLength={32}
        className="rounded-full"
      />
      <Input
        placeholder="Project folder on your PC (optional)"
        value={projectPath}
        onChange={(e) => setProjectPath(e.target.value)}
        className="rounded-full"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button className="rounded-full flex-1" disabled={busy || !callSign.trim()} onClick={create}>
          Create
        </Button>
        <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface GitStatus {
  branch: string;
  clean: boolean;
  files: { status: string; path: string }[];
}

function PaneView({
  ctx,
  callSign,
  shellConnected,
  onBack,
}: {
  ctx: DesktopContext;
  callSign: string;
  shellConnected: boolean | null;
  onBack: () => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const [view, setView] = useState<'output' | 'git'>('output');
  const outputRef = useRef<HTMLPreElement>(null);

  const output = usePolled(
    () => desktopCall<{ lines: string[] }>(ctx, { method: 'GET', path: `/panes/${callSign}/output`, query: { limit: 120 } }),
    3000,
    view === 'output',
  );
  const git = usePolled(
    () => desktopCall<GitStatus>(ctx, { method: 'GET', path: `/panes/${callSign}/git/status` }),
    8000,
    view === 'git' && diffPath === null,
  );
  const diff = usePolled(
    () =>
      desktopCall<{ diff: string; truncated?: boolean }>(ctx, {
        method: 'GET',
        path: `/panes/${callSign}/git/diff`,
        query: diffPath ? { path: diffPath } : {},
      }),
    60000,
    view === 'git' && diffPath !== null,
  );

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output.data]);

  async function send() {
    const line = text.trim();
    if (!line || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await desktopCall(ctx, { method: 'POST', path: `/panes/${callSign}/send`, body: { text: line } });
      setText('');
      output.refresh();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="p-2 rounded-full hover:bg-accent" title="Back to terminals">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-medium flex-1">{callSign}</span>
        <div className="flex rounded-full border border-border p-0.5 text-xs">
          {(['output', 'git'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                setDiffPath(null);
              }}
              className={`px-3 py-1 rounded-full flex items-center gap-1 ${view === v ? 'bg-orange-500 text-white' : 'text-muted-foreground'}`}
            >
              {v === 'git' && <GitBranch className="w-3 h-3" />}
              {v === 'output' ? 'Output' : 'Git'}
            </button>
          ))}
        </div>
      </div>

      {shellConnected === false && <ShellBanner />}

      {view === 'output' ? (
        <>
          <pre
            ref={outputRef}
            className="rounded-2xl border border-border bg-black/80 text-green-300 text-[11px] leading-snug p-3 h-64 overflow-auto whitespace-pre-wrap break-words"
          >
            {output.error
              ? output.error
              : output.data
                ? output.data.lines.join('\n') || '(no output yet)'
                : 'Loading…'}
          </pre>
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={`Tell ${callSign} what to do`}
              disabled={sending}
              className="rounded-full"
            />
            <Button onClick={send} disabled={sending || !text.trim()} size="icon" className="rounded-full shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {sendError && <p className="text-xs text-destructive">{sendError}</p>}
        </>
      ) : diffPath ? (
        <div className="flex flex-col gap-2">
          <button type="button" className="text-xs underline self-start" onClick={() => setDiffPath(null)}>
            ← all changed files
          </button>
          <p className="text-xs text-muted-foreground break-all">{diffPath}</p>
          <pre className="rounded-2xl border border-border bg-black/80 text-[11px] leading-snug p-3 max-h-96 overflow-auto whitespace-pre">
            {diff.error ? diff.error : diff.data ? <DiffText text={diff.data.diff} /> : 'Loading…'}
          </pre>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {git.error && <p className="text-sm text-destructive">{git.error}</p>}
          {!git.data && !git.error && <p className="text-sm text-muted-foreground text-center">Loading…</p>}
          {git.data && (
            <>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> {git.data.branch} · {git.data.clean ? 'clean' : `${git.data.files.length} changed`}
              </p>
              {git.data.files.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setDiffPath(f.path)}
                  className="rounded-2xl border border-border bg-card/40 px-3 py-2 text-xs flex gap-3 text-left hover:bg-accent/40"
                >
                  <code className="shrink-0 text-orange-500">{f.status.trim() || '·'}</code>
                  <span className="break-all">{f.path}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DiffText({ text }: { text: string }) {
  if (!text) return <span className="text-muted-foreground">(no unstaged changes)</span>;
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span
          key={i}
          className={line.startsWith('+') ? 'text-green-400' : line.startsWith('-') ? 'text-red-400' : line.startsWith('@@') ? 'text-sky-400' : 'text-muted-foreground'}
        >
          {line + '\n'}
        </span>
      ))}
    </>
  );
}

const RISK_STYLE: Record<string, string> = {
  low: 'text-orange-500',
  medium: 'text-amber-500',
  high: 'text-destructive',
};

export function ApprovalsPanel({
  ctx,
  approvals,
  error,
  onDecided,
}: {
  ctx: DesktopContext;
  approvals: Approval[] | null;
  error: string | null;
  onDecided: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const decide = useCallback(
    async (id: number, status: 'approved' | 'denied') => {
      setBusyId(id);
      setActionError(null);
      try {
        await desktopCall(ctx, { method: 'PATCH', path: `/approvals/${id}`, body: { status } });
        onDecided();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyId(null);
      }
    },
    [ctx, onDecided],
  );

  return (
    <div className="w-full flex flex-col gap-2">
      {(error || actionError) && <p className="text-sm text-destructive">{actionError ?? error}</p>}
      {approvals === null && !error && <p className="text-sm text-muted-foreground text-center">Loading…</p>}
      {approvals?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">Nothing waiting for your approval.</p>
      )}
      {approvals?.map((a) => (
        <div key={a.id} className="rounded-2xl border border-border bg-card/40 p-3 text-sm flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <p className="flex-1 break-words">{a.action_description}</p>
            <span className={`text-[10px] uppercase tracking-wide font-medium ${RISK_STYLE[a.risk_level] ?? 'text-muted-foreground'}`}>
              {a.risk_level} risk
            </span>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-full flex-1" disabled={busyId === a.id} onClick={() => decide(a.id, 'approved')}>
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button variant="outline" className="rounded-full flex-1" disabled={busyId === a.id} onClick={() => decide(a.id, 'denied')}>
              <X className="w-4 h-4 mr-1" /> Deny
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
