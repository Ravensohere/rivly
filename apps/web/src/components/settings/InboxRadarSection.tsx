import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Link2, Loader2, RefreshCw, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useInboxRadar } from '@/hooks/useInboxRadar';
import { connectGoogleOffline } from '@/lib/googleConnect';
import { INBOX_CATEGORIES, CATEGORY_META, type InboxCategory } from '@/lib/inboxCategories';

const SCAN_STATUS_MESSAGE: Record<string, string> = {
  ok: 'Scan complete — check your day planner.',
  skipped_throttle: 'Already scanned recently. Try again in a bit.',
  disabled: 'Turn Inbox Radar on first.',
  no_connection: 'Connect your Google account first.',
  needs_reconnect: 'Your Google connection expired. Reconnect to keep Inbox Radar running.',
  token_failed: "Google access expired — tap Reconnect and we'll fix it.",
  extract_failed: 'Riva could not read your inbox just now. Try again shortly.',
  gmail_failed: 'Could not read Gmail. Try again shortly.',
};

export function InboxRadarSection() {
  const { toast } = useToast();
  const { status, categories, setEnabled, setCategories, triggerScan } = useInboxRadar();
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [savingCategory, setSavingCategory] = useState<InboxCategory | null>(null);

  const connected = !!status?.connected;
  // Calendar-only is a fully working state — Gmail is an optional upgrade.
  const gmailConnected = !!status?.gmailConnected;
  const enabled = !!status?.enabled;

  const handleToggle = async (next: boolean) => {
    setBusy(true);
    try {
      await setEnabled(next);
      toast({
        title: 'Inbox Radar',
        description: next
          ? 'Riva will now scan your inbox for what matters.'
          : 'Inbox Radar turned off.',
      });
    } catch {
      toast({ title: 'Inbox Radar', description: 'Could not update. Try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleCategoryToggle = async (category: InboxCategory) => {
    const isOn = categories.includes(category);
    const next = isOn ? categories.filter((c) => c !== category) : [...categories, category];
    if (next.length === 0) {
      toast({ title: 'Inbox Radar', description: 'Keep at least one type selected.', variant: 'destructive' });
      return;
    }
    setSavingCategory(category);
    try {
      await setCategories(next);
    } catch {
      toast({ title: 'Inbox Radar', description: 'Could not save. Try again.', variant: 'destructive' });
    } finally {
      setSavingCategory(null);
    }
  };

  // Only ever used to add Gmail now; the base connection is made in Account.
  const handleAddGmail = async () => {
    try {
      await connectGoogleOffline(true);
    } catch (e: any) {
      toast({ title: 'Connect failed', description: e.message || 'Try again.', variant: 'destructive' });
    }
  };

  const handleScanNow = async () => {
    setScanning(true);
    try {
      const result = await triggerScan(true);
      const key = result?.status as string | undefined;
      const added = result?.suggestionsAdded ?? 0;
      const failed = key !== 'ok';
      toast({
        title: 'Inbox Radar',
        // The server's `detail` is the specific, actionable reason (e.g. the
        // Gmail API being disabled); prefer it over the generic fallback.
        description: failed
          ? result?.detail || SCAN_STATUS_MESSAGE[key || ''] || 'Could not scan. Try again.'
          : added > 0
          ? `Found ${added} new item${added === 1 ? '' : 's'}.`
          : result?.gmailEnabled === false
          // Calendar-only found nothing: say so, or an empty tray reads as broken.
          ? 'Nothing new in your calendar. Add Gmail to also catch bills and deadlines.'
          : 'Nothing new to surface right now.',
        variant: failed && key !== 'skipped_throttle' ? 'destructive' : undefined,
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
          <Inbox className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium text-foreground">Inbox Radar</h4>
            {connected && (
              <Switch checked={enabled} disabled={busy} onCheckedChange={handleToggle} />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Riva scans your calendar for meetings, and — if you connect Gmail — recent email{' '}
            <em>subjects and snippets</em> for deadlines, bills and deliveries. Nothing is stored
            except the items you approve.
          </p>

          {!connected && (
            // Connecting lives in the Account section above — one Google
            // connection for the whole app, not a second button meaning
            // something subtly different.
            <p className="text-xs text-muted-foreground rounded-lg border border-border/60 bg-muted/30 p-3">
              Connect your Google account above to turn this on.
            </p>
          )}
          {connected && !gmailConnected && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-medium text-foreground">Calendar connected.</span> Add Gmail
                so Riva can also spot bills, deadlines and deliveries in your email. She only ever
                reads subjects and senders — never message bodies.
              </p>
              <Button size="sm" variant="outline" onClick={handleAddGmail} className="gap-2">
                <Link2 className="w-4 h-4" /> Add Gmail
              </Button>
            </div>
          )}

          <AnimatePresence initial={false}>
            {connected && enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs font-medium text-foreground mt-4 mb-2">
                  What should Riva surface?
                </p>
                <div className="space-y-1">
                  {INBOX_CATEGORIES.map((category) => {
                    const meta = CATEGORY_META[category];
                    const Icon = meta.icon;
                    const isOn = categories.includes(category);
                    const saving = savingCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => handleCategoryToggle(category)}
                        disabled={saving}
                        className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                          isOn
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/60 bg-background/40 hover:bg-muted/40'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isOn ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm leading-tight">{meta.label}</span>
                          <span className="block text-xs text-muted-foreground truncate">{meta.hint}</span>
                        </span>
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                        ) : (
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isOn ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                            }`}
                          >
                            {isOn && <Check className="w-3 h-3 text-primary-foreground" />}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleScanNow}
                  disabled={scanning}
                  className="gap-2 mt-3"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Scan inbox now
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {busy && <Loader2 className="w-4 h-4 animate-spin text-primary mt-2" />}
        </div>
      </div>
    </motion.div>
  );
}
