/**
 * Google Account Section — the ONE place a Google account is connected.
 *
 * There used to be three "Connect" buttons meaning three different things:
 * this one (signed in with Google — identity only, no calendar access), the
 * Calendar section, and Inbox Radar. A user could see "Connected" here while
 * Inbox Radar insisted they were not connected, because they were reporting on
 * entirely different facts.
 *
 * Now this grants the Google connection (calendar, with a refresh token) and
 * everything downstream reads that same state. Gmail stays a separate opt-in
 * inside Inbox Radar: it is a restricted scope, so it must stay a deliberate
 * choice rather than something bundled into a generic "connect".
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Unlink, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useInboxRadar } from '@/hooks/useInboxRadar';
import { useGoogleCalendarSimple } from '@/hooks/useGoogleCalendarSimple';
import { connectGoogleOffline } from '@/lib/googleConnect';

// Google Icon SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function GoogleAccountSection() {
  const { user, isGoogleEnabled } = useAuthContext();
  const { toast } = useToast();
  const { status } = useInboxRadar();
  const { disconnectCalendar } = useGoogleCalendarSimple();
  const [busy, setBusy] = useState(false);

  if (!isGoogleEnabled) {
    return null; // Don't show the section if Google OAuth is not configured
  }

  const connected = !!status?.connected;
  const gmailConnected = !!status?.gmailConnected;
  const userEmail = user?.email;

  const handleConnect = async () => {
    setBusy(true);
    try {
      // Redirects to Google and returns to /calendar/callback.
      await connectGoogleOffline();
    } catch (err: any) {
      console.error('[GoogleAccount] Connect error:', err);
      toast({
        title: 'Connection failed',
        description: err?.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectCalendar();
      toast({
        title: 'Google disconnected',
        description: 'Calendar and Inbox Radar will stop syncing.',
      });
    } catch (err) {
      console.error('[GoogleAccount] Disconnect error:', err);
      toast({
        title: 'Disconnect failed',
        description: 'Could not disconnect. Try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-card border border-border/40"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          connected ? 'bg-green-500/10' : 'bg-primary/10'
        }`}>
          {connected ? <GoogleIcon className="w-5 h-5" /> : <Mail className="w-5 h-5 text-primary" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">Google Account</p>
          {connected ? (
            <p className="text-xs text-muted-foreground truncate">
              {userEmail || 'Connected'} · Calendar{gmailConnected ? ' and Gmail' : ''}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Connect once — your calendar and Inbox Radar both use this.
            </p>
          )}
        </div>

        {connected ? (
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
            Disconnect
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={handleConnect} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Connect Google
          </Button>
        )}
      </div>
    </motion.div>
  );
}
