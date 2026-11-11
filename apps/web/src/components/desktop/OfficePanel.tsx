import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { desktopCall, DesktopContext } from '@/lib/desktopApi';
import { usePolled } from '@/components/desktop/RemoteConsole';
import { Brain, Calendar as CalendarIcon, Check, ListTodo, Mail, Pause, Pencil, Play, Plus, Send, Sparkles, Square, Timer, Trash2, X } from 'lucide-react';
import { SuggestionsTray } from '@/components/inbox/SuggestionsTray';
import { SentRepliesList } from '@/components/inbox/SentRepliesList';
import { useGoogleCalendarSimple } from '@/hooks/useGoogleCalendarSimple';

/** Office-assistant control surface: everything the Assistant tab can only do by typing a
 * sentence, as direct controls instead — mail/meeting check-ins, tasks, lists, focus, learned
 * skills and memory. Same card/pill visual language as AssistantPanel and RemoteConsole. */
export function OfficePanel({ ctx }: { ctx: DesktopContext }) {
  return (
    <div className="w-full flex flex-col gap-4">
      <CheckinCard ctx={ctx} />
      <CalendarCard />
      <SuggestionsTray />
      <TasksCard ctx={ctx} />
      <SentRepliesCard />
      <FocusCard ctx={ctx} />
      <ListsCard ctx={ctx} />
      <SkillsCard ctx={ctx} />
      <MemoryCard ctx={ctx} />
    </div>
  );
}

function CalendarCard() {
  const { googleEvents, fetchGoogleEvents, isConnected } = useGoogleCalendarSimple();
  useEffect(() => {
    fetchGoogleEvents(new Date());
  }, [fetchGoogleEvents]);

  return (
    <SectionCard title="Today's calendar" icon={<CalendarIcon className="w-4 h-4 text-orange-400" />}>
      {!isConnected && (
        <p className="text-xs text-muted-foreground text-center">
          Connect Google Calendar in Settings to see events here.
        </p>
      )}
      {isConnected && googleEvents.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">No events today.</p>
      )}
      {isConnected && googleEvents.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-56 overflow-auto">
          {googleEvents.map((e: any) => (
            <div key={e.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent/40 text-sm">
              <span className="flex-1 truncate">{e.title}</span>
              {!e.isAllDay && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(e.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SentRepliesCard() {
  return (
    <SectionCard title="Sent replies" icon={<Send className="w-4 h-4 text-orange-400" />}>
      <SentRepliesList />
    </SectionCard>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="w-full rounded-2xl border border-border bg-card/40 p-4 flex flex-col gap-3">
      <p className="font-bold flex items-center gap-2 text-sm">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

interface CheckinConfig {
  enabled: boolean;
  schedule: string;
}

function CheckinCard({ ctx }: { ctx: DesktopContext }) {
  const [cfg, setCfg] = useState<CheckinConfig | null>(null);
  const [draft, setDraft] = useState('every 30 minutes');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const poll = usePolled(
    () => desktopCall<CheckinConfig>(ctx, { method: 'GET', path: '/workspace-checkin/config' }),
    15000,
    true,
  );
  useEffect(() => {
    if (!poll.data || cfg) return;
    setCfg(poll.data);
    setDraft(poll.data.schedule);
  }, [poll.data, cfg]);

  const save = useCallback(
    async (patch: Partial<CheckinConfig>) => {
      setBusy(true);
      setError(null);
      try {
        const next = await desktopCall<CheckinConfig>(ctx, { method: 'PUT', path: '/workspace-checkin/config', body: patch });
        setCfg(next);
        setDraft(next.schedule);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [ctx],
  );

  return (
    <SectionCard title="Mail & meeting check-ins" icon={<Mail className="w-4 h-4 text-orange-400" />}>
      <p className="text-xs text-muted-foreground">
        Speaks up on its own about new important mail, a reply you were waiting on, or a meeting starting soon. Each
        check uses your Claude plan.
      </p>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="every 30 minutes"
          disabled={busy}
          className="rounded-full flex-1"
        />
        <Button
          variant={cfg?.enabled ? 'outline' : 'default'}
          className={`rounded-full shrink-0 ${cfg?.enabled ? '' : 'bg-orange-400 hover:bg-orange-500 text-white'}`}
          disabled={busy || !draft.trim()}
          onClick={() => void save(cfg?.enabled ? { enabled: false } : { enabled: true, schedule: draft.trim() })}
        >
          {cfg?.enabled ? 'Turn off' : 'Turn on'}
        </Button>
      </div>
      {cfg?.enabled && <p className="text-xs text-orange-400">On — checking {cfg.schedule}.</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </SectionCard>
  );
}

interface Task {
  id: number;
  title: string;
  done: boolean;
  priority: string;
  due_at: string | null;
}

function TasksCard({ ctx }: { ctx: DesktopContext }) {
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tasks = usePolled(() => desktopCall<Task[]>(ctx, { method: 'GET', path: '/tasks' }), 10000, true);

  const add = async () => {
    const text = title.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    try {
      await desktopCall(ctx, { method: 'POST', path: '/tasks', body: { title: text } });
      setTitle('');
      tasks.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (task: Task) => {
    try {
      await desktopCall(ctx, { method: 'PATCH', path: `/tasks/${task.id}`, body: { done: !task.done } });
      tasks.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (task: Task) => {
    try {
      await desktopCall(ctx, { method: 'DELETE', path: `/tasks/${task.id}` });
      tasks.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const items = tasks.data ?? [];
  return (
    <SectionCard title="Tasks" icon={<Check className="w-4 h-4 text-orange-400" />}>
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void add()}
          placeholder="Add a task"
          disabled={adding}
          className="rounded-full flex-1"
        />
        <Button size="icon" className="rounded-full shrink-0" disabled={adding || !title.trim()} onClick={() => void add()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {(tasks.error || error) && <p className="text-xs text-destructive">{error ?? tasks.error}</p>}
      {items.length === 0 && !tasks.error && <p className="text-xs text-muted-foreground text-center">No tasks yet.</p>}
      <div className="flex flex-col gap-1.5 max-h-56 overflow-auto">
        {items.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent/40 text-sm">
            <button
              type="button"
              onClick={() => void toggle(t)}
              className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center ${t.done ? 'bg-orange-400 border-orange-400 text-white' : 'border-neutral-300'}`}
            >
              {t.done && <Check className="w-3 h-3" />}
            </button>
            <span className={`flex-1 truncate ${t.done ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
            <button type="button" onClick={() => void remove(t)} className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

interface FocusSession {
  id: number;
  intention: string;
  duration_seconds: number;
  started_at: string;
  finished_at: string | null;
  status: string;
}

function FocusCard({ ctx }: { ctx: DesktopContext }) {
  const [intention, setIntention] = useState('');
  const [minutes, setMinutes] = useState('25');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = usePolled(
    () => desktopCall<FocusSession | null>(ctx, { method: 'GET', path: '/focus/active' }),
    10000,
    true,
  );

  const act = async (path: string) => {
    setBusy(true);
    setError(null);
    try {
      await desktopCall(ctx, { method: 'POST', path });
      active.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    const text = intention.trim();
    const mins = Math.max(1, parseInt(minutes, 10) || 25);
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      await desktopCall(ctx, { method: 'POST', path: '/focus/start', body: { intention: text, duration_seconds: mins * 60 } });
      setIntention('');
      active.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const session = active.data;
  return (
    <SectionCard title="Focus" icon={<Timer className="w-4 h-4 text-orange-400" />}>
      {(active.error || error) && <p className="text-xs text-destructive">{error ?? active.error}</p>}
      {session ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <span className="font-medium">{session.intention}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {Math.round(session.duration_seconds / 60)} min · {session.status}
            </span>
          </p>
          <div className="flex gap-2">
            {session.status === 'running' ? (
              <Button size="sm" variant="outline" className="rounded-full flex-1" disabled={busy} onClick={() => void act(`/focus/${session.id}/pause`)}>
                <Pause className="w-3.5 h-3.5 mr-1" /> Pause
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="rounded-full flex-1" disabled={busy} onClick={() => void act(`/focus/${session.id}/resume`)}>
                <Play className="w-3.5 h-3.5 mr-1" /> Resume
              </Button>
            )}
            <Button size="sm" className="rounded-full flex-1 bg-orange-400 hover:bg-orange-500 text-white" disabled={busy} onClick={() => void act(`/focus/${session.id}/finish`)}>
              <Check className="w-3.5 h-3.5 mr-1" /> Finish
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" disabled={busy} onClick={() => void act(`/focus/${session.id}/cancel`)}>
              <Square className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void start()}
            placeholder="What are you focusing on?"
            disabled={busy}
            className="rounded-full flex-1"
          />
          <Input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
            className="rounded-full w-16 text-center"
            inputMode="numeric"
          />
          <Button size="icon" className="rounded-full shrink-0" disabled={busy || !intention.trim()} onClick={() => void start()}>
            <Play className="w-4 h-4" />
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

interface RivlyList {
  id: number;
  name: string;
}

interface ListItem {
  id: number;
  text: string;
  done: boolean;
}

function ListsCard({ ctx }: { ctx: DesktopContext }) {
  const [listName, setListName] = useState('');
  const [itemText, setItemText] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lists = usePolled(() => desktopCall<RivlyList[]>(ctx, { method: 'GET', path: '/lists' }), 15000, true);
  const detail = usePolled(
    () =>
      desktopCall<{ id: number; name: string; items: ListItem[] }>(ctx, {
        method: 'GET',
        path: `/lists/${selected}`,
      }),
    8000,
    selected !== null,
  );

  const add = async () => {
    const list = (selected ? detail.data?.name : listName)?.trim();
    const text = itemText.trim();
    if (!list || !text) return;
    setAdding(true);
    setError(null);
    try {
      await desktopCall(ctx, { method: 'POST', path: '/lists/items', body: { list_name: list, text } });
      setItemText('');
      setListName('');
      lists.refresh();
      if (selected) detail.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (item: ListItem) => {
    try {
      await desktopCall(ctx, { method: 'PATCH', path: `/lists/items/${item.id}`, body: { done: !item.done } });
      detail.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (item: ListItem) => {
    try {
      await desktopCall(ctx, { method: 'DELETE', path: `/lists/items/${item.id}` });
      detail.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <SectionCard title="Lists" icon={<ListTodo className="w-4 h-4 text-orange-400" />}>
      {(lists.error || detail.error || error) && <p className="text-xs text-destructive">{error ?? lists.error ?? detail.error}</p>}
      {(lists.data?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {lists.data!.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelected(selected === String(l.id) ? null : String(l.id))}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                selected === String(l.id) ? 'bg-orange-400 text-white border-orange-400' : 'border-neutral-300 text-muted-foreground'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {!selected && (
          <Input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="List name"
            disabled={adding}
            className="rounded-full w-28 shrink-0"
          />
        )}
        <Input
          value={itemText}
          onChange={(e) => setItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void add()}
          placeholder={selected ? `Add to ${detail.data?.name ?? 'list'}` : 'Item text'}
          disabled={adding}
          className="rounded-full flex-1"
        />
        <Button
          size="icon"
          className="rounded-full shrink-0"
          disabled={adding || !itemText.trim() || (selected ? !detail.data?.name : !listName.trim())}
          onClick={() => void add()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {selected && detail.data && (
        <div className="flex flex-col gap-1.5 max-h-56 overflow-auto">
          {detail.data.items.length === 0 && <p className="text-xs text-muted-foreground text-center">Nothing on this list yet.</p>}
          {detail.data.items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent/40 text-sm">
              <button
                type="button"
                onClick={() => void toggle(it)}
                className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center ${it.done ? 'bg-orange-400 border-orange-400 text-white' : 'border-neutral-300'}`}
              >
                {it.done && <Check className="w-3 h-3" />}
              </button>
              <span className={`flex-1 truncate ${it.done ? 'line-through text-muted-foreground' : ''}`}>{it.text}</span>
              <button type="button" onClick={() => void remove(it)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {(lists.data?.length ?? 0) === 0 && !lists.error && <p className="text-xs text-muted-foreground text-center">No lists yet — add an item to create one.</p>}
    </SectionCard>
  );
}

interface Skill {
  id: number;
  name: string;
  trigger_type: string;
  trigger_value: string | null;
  status: string;
  source: string;
}

function SkillsCard({ ctx }: { ctx: DesktopContext }) {
  const [error, setError] = useState<string | null>(null);
  const skills = usePolled(() => desktopCall<Skill[]>(ctx, { method: 'GET', path: '/skills' }), 10000, true);
  const active = (skills.data ?? []).filter((s) => s.status === 'active');
  const proposed = (skills.data ?? []).filter((s) => s.status === 'proposed');

  const decide = async (id: number, accept: boolean) => {
    try {
      await desktopCall(ctx, { method: 'POST', path: `/self-build/${id}/${accept ? 'accept' : 'reject'}` });
      skills.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: number) => {
    try {
      await desktopCall(ctx, { method: 'DELETE', path: `/skills/${id}` });
      skills.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <SectionCard title="Learned skills" icon={<Sparkles className="w-4 h-4 text-orange-400" />}>
      {(skills.error || error) && <p className="text-xs text-destructive">{error ?? skills.error}</p>}
      {proposed.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">Pending — solved once, ready to skip the AI next time</p>
          {proposed.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/50 px-2 py-1.5 text-sm">
              <span className="flex-1 truncate" title={s.trigger_value ?? ''}>{s.name}</span>
              <button type="button" onClick={() => void decide(s.id, true)} className="text-orange-400 shrink-0">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => void decide(s.id, false)} className="text-muted-foreground hover:text-destructive shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {active.length === 0 && proposed.length === 0 && !skills.error && (
        <p className="text-xs text-muted-foreground text-center">No skills learned yet.</p>
      )}
      {active.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-40 overflow-auto">
          {active.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent/40 text-sm">
              <span className="flex-1 truncate" title={s.trigger_value ?? ''}>{s.name}</span>
              <button type="button" onClick={() => void remove(s.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

interface MemoryItem {
  id: number;
  title: string;
  body: string;
}

interface MemoryProposal {
  id: number;
  title: string;
  proposed_body: string;
}

function MemoryCard({ ctx }: { ctx: DesktopContext }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const pages = usePolled(() => desktopCall<MemoryItem[]>(ctx, { method: 'GET', path: '/memory/search', query: { q: '' } }), 15000, true);
  const proposals = usePolled(
    () => desktopCall<MemoryProposal[]>(ctx, { method: 'GET', path: '/memory/proposals/pending' }),
    15000,
    true,
  );

  const add = async () => {
    const value = text.trim();
    if (!value) return;
    setAdding(true);
    setError(null);
    try {
      await desktopCall(ctx, { method: 'POST', path: '/memory', body: { title: value.slice(0, 60), body: value } });
      setText('');
      pages.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const decide = async (id: number, approved: boolean) => {
    try {
      await desktopCall(ctx, { method: 'PATCH', path: `/memory/proposals/${id}`, body: { approved } });
      proposals.refresh();
      pages.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const startEdit = (p: MemoryItem) => {
    setEditingId(p.id);
    setEditDraft(p.body);
  };

  const saveEdit = async (id: number) => {
    const value = editDraft.trim();
    if (!value) return;
    setBusyId(id);
    setError(null);
    try {
      await desktopCall(ctx, { method: 'PATCH', path: `/memory/${id}`, body: { title: value.slice(0, 60), body: value } });
      setEditingId(null);
      pages.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const removePage = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await desktopCall(ctx, { method: 'DELETE', path: `/memory/${id}` });
      pages.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const items = pages.data ?? [];
  const pending = proposals.data ?? [];
  return (
    <SectionCard title="Memory" icon={<Brain className="w-4 h-4 text-orange-400" />}>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void add()}
          placeholder="Remember something"
          disabled={adding}
          className="rounded-full flex-1"
        />
        <Button size="icon" className="rounded-full shrink-0" disabled={adding || !text.trim()} onClick={() => void add()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {(pages.error || proposals.error || error) && (
        <p className="text-xs text-destructive">{error ?? pages.error ?? proposals.error}</p>
      )}
      {pending.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">Pending — inferred, not yet confirmed</p>
          {pending.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/50 px-2 py-1.5 text-sm">
              <span className="flex-1 truncate" title={p.proposed_body}>{p.title}</span>
              <button type="button" onClick={() => void decide(p.id, true)} className="text-orange-400 shrink-0">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => void decide(p.id, false)} className="text-muted-foreground hover:text-destructive shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {items.length === 0 && !pages.error && <p className="text-xs text-muted-foreground text-center">Nothing remembered yet.</p>}
      <div className="flex flex-col gap-1.5 max-h-56 overflow-auto">
        {items.map((p) =>
          editingId === p.id ? (
            <div key={p.id} className="rounded-xl px-2 py-1.5 bg-accent/40 text-sm flex flex-col gap-1.5">
              <Input
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void saveEdit(p.id)}
                disabled={busyId === p.id}
                className="rounded-full"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="rounded-full h-6 px-2 text-xs" disabled={busyId === p.id} onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button size="sm" className="rounded-full h-6 px-2 text-xs" disabled={busyId === p.id || !editDraft.trim()} onClick={() => void saveEdit(p.id)}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div key={p.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent/40 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{p.title}</p>
                {p.body !== p.title && <p className="text-xs text-muted-foreground truncate">{p.body}</p>}
              </div>
              <button
                type="button"
                onClick={() => startEdit(p)}
                disabled={busyId === p.id}
                className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void removePage(p.id)}
                disabled={busyId === p.id}
                className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ),
        )}
      </div>
    </SectionCard>
  );
}
