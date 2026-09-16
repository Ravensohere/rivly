/**
 * Google Calendar Section — status only.
 *
 * Connecting moved to the Account section above, which is now the single place
 * a Google account is linked. This used to carry its own Connect button running
 * a *different* OAuth flow, which is how users ended up with connections that
 * had no refresh token and silently died after an hour.
 */

import { motion } from 'framer-motion';
import { Calendar, Check, Loader2 } from 'lucide-react';
import { useInboxRadar } from '@/hooks/useInboxRadar';

export function GoogleCalendarSection() {
  const { status } = useInboxRadar();

  if (!status) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const connected = !!status.connected;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground mb-1">Google Calendar</h4>
          {connected ? (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Check className="w-4 h-4" />
              <span className="font-medium">Using your Google account</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Connect your Google account above to sync events and schedules.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
