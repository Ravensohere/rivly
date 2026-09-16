import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/contexts/AuthContext';
import { useState } from 'react';
import { SEO } from '@/components/SEO';

const E = [0.22, 1, 0.36, 1] as const;

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const { signIn, signUp, signInAsGuest } = useAuthContext();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    await signInAsGuest();
    navigate('/app');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, name || email.split('@')[0]);
    setLoading(false);
    if (result && !('error' in result)) {
      navigate('/app');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--gradient-calm)' }}
    >
      <SEO
        title="Sign In — Rivly"
        description="Log in to Rivly to access your daily rhythm, focus sessions, and calm planner."
        keywords={['Rivly Login', 'Daily Planner', 'Flow State App']}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 20%, hsl(235 35% 55% / 0.07) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 40% 40% at 80% 80%, hsl(260 35% 65% / 0.06) 0%, transparent 70%)',
        }}
      />

      <Link
        to="/"
        className="absolute top-6 left-5 sm:top-8 sm:left-8 flex items-center gap-2 text-xs tracking-widest uppercase z-10 transition-colors duration-300 hover:opacity-70"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: 'hsl(var(--muted-foreground))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
        }}
      >
        <ArrowLeft style={{ width: '0.85rem', height: '0.85rem' }} />
        Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: E }}
        className="relative w-full max-w-sm"
      >
        <div
          className="rounded-3xl border p-6 sm:p-10 text-center space-y-8"
          style={{
            background: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border) / 0.4)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: E }}
          >
            <Link to="/">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'var(--gradient-indigo)',
                  boxShadow: '0 4px 20px -4px hsl(235 35% 55% / 0.35)',
                }}
              >
                <span
                  className="text-white"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: '1.4rem',
                    fontWeight: 400,
                  }}
                >
                  r
                </span>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: E }}
            className="space-y-2"
          >
            <h1
              className="text-foreground"
              style={{
                fontWeight: 400,
                fontSize: '1.75rem',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h1>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'hsl(var(--muted-foreground))',
                fontWeight: 400,
              }}
            >
              {mode === 'signin' ? 'Sign in to continue your daily ' : 'Start your daily '}
              <em style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'hsl(var(--primary))' }}>
                flow
              </em>
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: E }}
            className="space-y-3 text-left"
          >
            {mode === 'signup' && (
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-2xl"
                autoComplete="name"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-2xl"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-2xl"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-12 text-sm font-medium rounded-2xl mt-2"
              style={{ background: 'var(--gradient-indigo)', border: 'none' }}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </Button>

            {mode === 'signin' && (
              <Link
                to="/forgot-password"
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                Forgot password?
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--border) / 0.6)' }} />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'hsl(var(--muted-foreground) / 0.6)',
                }}
              >
                or
              </span>
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--border) / 0.6)' }} />
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full h-11 rounded-2xl text-sm font-medium transition-all duration-300"
              style={{
                border: '1px solid hsl(var(--border) / 0.5)',
                background: 'transparent',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              Continue as Guest
            </button>
          </motion.form>

          <p
            className="text-center"
            style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground) / 0.6)' }}
          >
            By continuing you agree to our{' '}
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
