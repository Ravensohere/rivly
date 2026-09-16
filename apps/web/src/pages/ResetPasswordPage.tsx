import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';

const E = [0.22, 1, 0.36, 1] as const;
const MIN_PASSWORD = 6;

/** How long to wait for supabase-js to turn the URL token into a session. */
const TOKEN_EXCHANGE_TIMEOUT_MS = 5000;

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const { updatePassword } = useAuthContext();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>('checking');

  // The recovery link lands with a token in the URL, which supabase-js
  // exchanges for a session asynchronously (detectSessionInUrl). Wait for that
  // session rather than assuming it is already there on first render.
  useEffect(() => {
    let settled = false;

    const markValid = () => {
      if (settled) return;
      settled = true;
      setLinkState('valid');
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markValid();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        markValid();
      }
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setLinkState('invalid');
      }
    }, TOKEN_EXCHANGE_TIMEOUT_MS);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const canSubmit = password.length >= MIN_PASSWORD && password === confirm && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result && !('error' in result)) navigate('/app');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--gradient-calm)' }}
    >
      <SEO title="Choose a new password — Rivly" description="Set a new password for your Rivly account." />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: E }}
        className="w-full max-w-sm text-center"
      >
        {linkState === 'checking' && (
          <p className="text-sm text-muted-foreground">Checking your link…</p>
        )}

        {linkState === 'invalid' && (
          <>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold mb-2">This link has expired</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Reset links are single-use and last an hour. Request a fresh one and you'll be back in
              a minute.
            </p>
            <Button asChild className="w-full h-11 rounded-2xl">
              <Link to="/forgot-password">Send a new link</Link>
            </Button>
          </>
        )}

        {linkState === 'valid' && (
          <>
            <h1 className="text-xl font-semibold mb-2">Choose a new password</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Make it at least {MIN_PASSWORD} characters.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                className="h-11 rounded-2xl"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11 rounded-2xl"
              />
              {tooShort && (
                <p className="text-xs text-destructive">
                  Use at least {MIN_PASSWORD} characters.
                </p>
              )}
              {mismatch && <p className="text-xs text-destructive">Those don't match yet.</p>}
              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit}
                className="w-full h-12 text-sm font-medium rounded-2xl"
                style={{ background: 'var(--gradient-indigo)', border: 'none' }}
              >
                {loading ? 'Saving…' : 'Set new password'}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
