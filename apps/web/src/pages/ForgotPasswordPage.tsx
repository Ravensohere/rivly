import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';

const E = [0.22, 1, 0.36, 1] as const;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuthContext();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);
    // Show the same confirmation either way: revealing that an address has no
    // account would let anyone enumerate the user list.
    if (result && !('error' in result)) setSent(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--gradient-calm)' }}
    >
      <SEO
        title="Reset your password — Rivly"
        description="Send yourself a link to choose a new Rivly password."
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
        to="/login"
        className="absolute top-6 left-5 sm:top-8 sm:left-8 flex items-center gap-2 text-xs tracking-widest uppercase z-10 transition-colors duration-300 hover:opacity-70 text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]"
        style={{
          fontFamily: "'DM Mono', monospace",
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
        }}
      >
        <ArrowLeft style={{ width: '0.85rem', height: '0.85rem' }} />
        Back to sign in
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
            {sent ? (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--gradient-indigo)', boxShadow: '0 4px 20px -4px hsl(235 35% 55% / 0.35)' }}
              >
                <MailCheck className="w-6 h-6 text-white" />
              </div>
            ) : (
              <Link to="/">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--gradient-indigo)', boxShadow: '0 4px 20px -4px hsl(235 35% 55% / 0.35)' }}
                >
                  <span
                    className="text-white"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '1.4rem', fontWeight: 400 }}
                  >
                    r
                  </span>
                </div>
              </Link>
            )}
          </motion.div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: E }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-foreground" style={{ fontWeight: 400, fontSize: '1.75rem', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                  Check your email
                </h1>
                <p
                  className="text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]"
                  style={{ fontSize: '0.85rem', fontWeight: 400 }}
                >
                  If <span style={{ color: 'hsl(var(--foreground))' }}>{email}</span> has an account, we've
                  sent a link to choose a new password. It expires in an hour.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full h-11 rounded-2xl">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: E }}
                className="space-y-2"
              >
                <h1 className="text-foreground" style={{ fontWeight: 400, fontSize: '1.75rem', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                  Forgot your password?
                </h1>
                <p
                  className="text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]"
                  style={{ fontSize: '0.85rem', fontWeight: 400 }}
                >
                  Enter your email and we'll send you a link to set a new one.
                </p>
              </motion.div>

              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: E }}
                className="space-y-3 text-left"
              >
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 rounded-2xl"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full h-12 text-sm font-medium rounded-2xl"
                  style={{ background: 'var(--gradient-indigo)', border: 'none' }}
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Sending…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </Button>
              </motion.form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
