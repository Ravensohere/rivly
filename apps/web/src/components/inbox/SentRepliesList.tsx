import { senderName } from './SuggestionsTray';
import { useSentReplies } from '@/hooks/useSentReplies';

export function formatSentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function SentRepliesList() {
  const { sent, isLoading, connected, gmailConnected, error } = useSentReplies();
  if (isLoading) return <p className="text-xs text-muted-foreground text-center">Loading…</p>;
  if (connected === false) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        Connect Google in Settings to see sent mail here.
      </p>
    );
  }
  if (connected === true && gmailConnected === false) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        Connect Gmail (not just Calendar) in Settings to see sent mail here.
      </p>
    );
  }
  if (error) {
    return <p className="text-xs text-destructive text-center">{error}</p>;
  }
  if (sent.length === 0) {
    return <p className="text-xs text-muted-foreground text-center">No sent mail yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5 max-h-56 overflow-auto">
      {sent.map((m) => (
        <li key={m.source_ref} className="rounded-xl px-2 py-1.5 hover:bg-accent/40 text-sm">
          <p className="truncate font-medium">{m.subject}</p>
          <p className="text-xs text-muted-foreground truncate">
            To {senderName(m.recipient)} · {formatSentDate(m.date)}
          </p>
        </li>
      ))}
    </ul>
  );
}
