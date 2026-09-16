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

      <Link
        to="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: E }}
        className="w-full max-w-sm text-center"
      >
        {sent ? (
          <>
            <div className="flex justify-center mb-4">
              <MailCheck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground mb-6">
              If <span className="font-medium text-foreground">{email}</span> has an account, we've
              sent a link to choose a new password. It expires in an hour.
            </p>
            <Button asChild variant="outline" className="w-full h-11 rounded-2xl">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-2">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your email and we'll send you a link to set a new one.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3 text-left">
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
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
