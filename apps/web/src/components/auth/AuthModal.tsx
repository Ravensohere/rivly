import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
} from '@/components/ui/ResponsiveModal';
import { useAuthContext } from '@/contexts/AuthContext';
import { isGoogleOAuthReady } from '@/lib/authDiagnostics';
import { GoogleOAuthDiagnosticsSheet } from './GoogleOAuthDiagnosticsSheet';

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

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: 'signin' | 'signup' | 'magic-link';
}

export function AuthModal({ open, onOpenChange, defaultMode = 'magic-link' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic-link'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { signUp, signIn, signInWithMagicLink, signInWithGoogle, isGoogleEnabled } = useAuthContext();

  const googleReady = isGoogleOAuthReady();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (mode === 'magic-link') {
      const result = await signInWithMagicLink(email);
      if (!result.error) {
        setMagicLinkSent(true);
      }
    } else if (mode === 'signup') {
      const result = await signUp(email, password, name);
      if (!result.error) {
        onOpenChange(false);
        resetForm();
      }
    } else {
      const result = await signIn(email, password);
      if (!result.error) {
        onOpenChange(false);
        resetForm();
      }
    }

    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (!googleReady) {
      // Show diagnostics sheet instead of signing in
      setShowDiagnostics(true);
      return;
    }

    setIsGoogleLoading(true);
    await signInWithGoogle();
    setIsGoogleLoading(false);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setMagicLinkSent(false);
  };

  const getTitle = () => {
    if (magicLinkSent) return 'Check your email';
    switch (mode) {
      case 'magic-link': return 'Sign in with Email';
      case 'signup': return 'Create Account';
      case 'signin': return 'Welcome Back';
    }
  };

  const getDescription = () => {
    if (magicLinkSent) return 'We sent a sign-in link to your email';
    switch (mode) {
      case 'magic-link': return 'We\'ll send you a sign-in link';
      case 'signup': return 'Start your daily rhythm journey';
      case 'signin': return 'Sign in to continue your journey';
    }
  };

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}>
        <ResponsiveModalContent className="max-w-md">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle className="text-xl font-semibold text-center">
              {getTitle()}
            </ResponsiveModalTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {getDescription()}
            </p>
          </ResponsiveModalHeader>

          <ResponsiveModalBody className="space-y-5">
            {magicLinkSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Click the link in the email to sign in.<br />
                  You can close this window.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setEmail('');
                  }}
                >
                  Use a different email
                </Button>
              </motion.div>
            ) : (
              <>
                {/* Google Sign-In Button - Only show if configured */}
                {isGoogleEnabled && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 gap-3"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          <GoogleIcon className="w-5 h-5" />
                          Continue with Google
                        </>
                      )}
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-3 text-muted-foreground">
                          Or continue with email
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Magic Link Form - Primary Method */}
                {mode === 'magic-link' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="relative mt-1.5">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="pl-10 h-12"
                          required
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Send Sign-in Link
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Email/Password Form */}
                {(mode === 'signin' || mode === 'signup') && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence mode="wait">
                      {mode === 'signup' && (
                        <motion.div
                          key="name-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Label htmlFor="name" className="text-sm font-medium">
                            Name
                          </Label>
                          <div className="relative mt-1.5">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="name"
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Your name"
                              className="pl-10 h-12"
                              required={mode === 'signup'}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <Label htmlFor="email-pass" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="relative mt-1.5">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email-pass"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="pl-10 h-12"
                          required
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative mt-1.5">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 h-12"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          {mode === 'signup' ? 'Create Account' : 'Sign In'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Divider for email options */}
                {!isGoogleEnabled && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-3 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>
                )}

                {/* Alternative Methods */}
                <div className="space-y-2">
                  {/* Toggle between magic link and email/password */}
                  {mode === 'magic-link' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-10 text-sm text-muted-foreground"
                      onClick={() => setMode('signin')}
                    >
                      Use email and password instead
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-10 text-sm text-muted-foreground"
                      onClick={() => setMode('magic-link')}
                    >
                      Sign in with magic link
                    </Button>
                  )}
                </div>
              </>
            )}
          </ResponsiveModalBody>

          {!magicLinkSent && (mode === 'signin' || mode === 'signup') && (
            <ResponsiveModalFooter className="flex-col gap-3">
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {mode === 'signup' ? (
                  <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
                ) : (
                  <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
                )}
              </button>
            </ResponsiveModalFooter>
          )}
        </ResponsiveModalContent>
      </ResponsiveModal>

      {/* Diagnostics Sheet */}
      <GoogleOAuthDiagnosticsSheet
        open={showDiagnostics}
        onOpenChange={setShowDiagnostics}
      />
    </>
  );
}