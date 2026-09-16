import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, Video, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInboxRadar, type TaskSuggestion } from '@/hooks/useInboxRadar';
import { categoryMeta } from '@/lib/inboxCategories';

function dueLabel(due: string | null): string {
  if (!due) return '';
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Today, 9:30 AM" / "Tue, 26 Jun, 9:30 AM" for a meeting start. */
function meetingLabel(startsAt: string): string {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return `Today, ${time}`;
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}

/** A meeting is "live" from 10 min before start until 2h after. */
function isJoinable(startsAt: string | null | undefined): boolean {
  if (!startsAt) return true; // no time known — let them try
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) return true;
  const now = Date.now();
  return now >= start - 10 * 60 * 1000 && now <= start + 2 * 60 * 60 * 1000;
}


/**
 * Gmail snippets arrive HTML-escaped ("Adiii&#39;s server"). Decode the handful
 * of entities that actually show up.
 *
 * Deliberately NOT the `textarea.innerHTML` trick: this is text from arbitrary
 * senders, and it should never touch an HTML parser on its way to the screen.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#34': '"',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#\d{1,5}|[a-z]+);/gi, (match, name: string) => {
    const named = NAMED_ENTITIES[name.toLowerCase()];
    if (named) return named;
    if (name.startsWith('#')) {
      const code = Number(name.slice(1));
      // Ignore control characters; they only ever arrive as noise.
      if (Number.isFinite(code) && code >= 32 && code <= 0x10ffff) return String.fromCodePoint(code);
    }
    return match;
  });
}

/**
 * Deep-link back to the original Gmail message.
 *
 * ponytail: hardcodes /u/0, so someone signed into several Google accounts in
 * the same browser may land on the wrong mailbox and see "no conversation".
 * Fixing it means threading the connected address through to the client and
 * using ?authuser= — worth doing only once multi-account users complain.
 */
export function gmailUrl(sourceRef: string): string {
  // #all rather than #inbox: the message may since have been archived.
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(sourceRef)}`;
}

/** "Google <no-reply@google.com>" -> "Google". Falls back to the raw string. */
export function senderName(sender: string): string {
  const match = sender.match(/^\s*"?([^"<]+?)"?\s*</);
  return (match ? match[1] : sender).trim();
}

function SuggestionCard({
  suggestion: s,
  onAccept,
  onDismiss,
}: {
  suggestion: TaskSuggestion;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const meta = categoryMeta(s.category);
  const Icon = meta.icon;
  const snippet = s.snippet ? decodeEntities(s.snippet) : '';
  // Nothing to reveal for a bare calendar entry whose title already says it all.
  const hasDetails = !!snippet || !!s.sender || s.source === 'gmail';
  const isMeeting = s.category === 'meeting';
  const when = isMeeting && s.starts_at ? meetingLabel(s.starts_at) : dueLabel(s.due_at);
  const canJoin = !!s.meeting_url;
  const joinNow = canJoin && isJoinable(s.starts_at);

  return (
    <li className="rounded-xl border border-border/60 bg-background/50 p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{s.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {meta.label}
            {when ? ` · ${when}` : ''}
            {s.amount ? ` · ₹${s.amount}` : ''}
            {s.sender ? ` · ${senderName(s.sender)}` : ''}
          </p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-8 rounded-lg bg-muted/40 p-2.5 space-y-1.5">
              {s.sender && (
                <p className="text-xs text-muted-foreground break-words">
                  <span className="font-medium text-foreground">From </span>
                  {s.sender}
                </p>
              )}
              {snippet && (
                <p className="text-xs text-muted-foreground leading-relaxed break-words">{snippet}</p>
              )}
              {s.source === 'gmail' && (
                <a
                  href={gmailUrl(s.source_ref)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Open in Gmail
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 mt-2 justify-end items-center">
        {hasDetails && (
          <button
            onClick={() => setShowDetails((d) => !d)}
            aria-expanded={showDetails}
            className="mr-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            Details
            <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
        )}
        {canJoin && (
          <Button
            size="sm"
            variant={joinNow ? 'default' : 'outline'}
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => window.open(s.meeting_url!, '_blank', 'noopener,noreferrer')}
          >
            <Video className="w-3.5 h-3.5" />
            {joinNow ? 'Join now' : 'Join'}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={() => onDismiss(s.id)}>
          Dismiss
        </Button>
        <Button size="sm" className="h-7 px-3 text-xs" onClick={() => onAccept(s.id)}>
          Add task
        </Button>
      </div>
    </li>
  );
}

export function SuggestionsTray() {
  const { suggestions, accept, dismiss } = useInboxRadar();
  const [open, setOpen] = useState(true);

  if (!suggestions.length) return null;

  // Meetings first — they're time-critical and carry the Join action.
  const ordered = [...suggestions].sort((a, b) => {
    if (a.category === 'meeting' && b.category !== 'meeting') return -1;
    if (b.category === 'meeting' && a.category !== 'meeting') return 1;
    return 0;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Suggested by Riva</span>
        <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
          {suggestions.length}
        </span>
        <ChevronDown className={`ml-auto w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="px-3 pb-3 space-y-2 overflow-hidden"
          >
            {ordered.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onAccept={accept} onDismiss={dismiss} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
