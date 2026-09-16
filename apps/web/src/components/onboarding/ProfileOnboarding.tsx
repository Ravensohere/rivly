/**
 * ProfileOnboarding - Multi-step onboarding for user profile setup
 * Step 1: Name (required)
 * Step 2: Email (required) with optional Google sign-in entry point
 * Step 3: Calendar connection (optional, can skip)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Calendar, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';

import { useAuthContext } from '@/contexts/AuthContext';

interface ProfileOnboardingProps {
  open: boolean;
  onComplete: () => void;
}

type Step = 'name' | 'email' | 'calendar';

export function ProfileOnboarding({ open, onComplete }: ProfileOnboardingProps) {
  const { setProfile, connectCalendar } = useUserPreferences();
  const { signInWithIdToken, isGoogleEnabled } = useAuthContext();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!open) return null;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleNameNext = () => {
    if (!name.trim()) {
      setNameError('Please enter your name');
      return;
    }
    setNameError('');
    setStep('email');
  };

  const handleEmailNext = () => {
    if (!email.trim()) {
      setEmailError('Please enter your email');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }
    setEmailError('');
    setStep('calendar');
  };

  const handleConnectCalendar = () => {
    // For now, simulate calendar connection
    // In future, this would trigger Google Calendar OAuth
    connectCalendar();
    toast.success('Calendar connected!');
    finishOnboarding();
  };

  const handleSkipCalendar = () => {
    finishOnboarding();
  };

  const finishOnboarding = () => {
    setProfile(name.trim(), email.trim(), 'local');
    onComplete();
  };

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    try {
      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        use_fedcm_for_prompt: false,
        callback: async (response: any) => {
          try {
            const { error } = await signInWithIdToken(response.credential);
            if (error) {
              toast.error('Google Sign-In failed: ' + error.message);
            }
            // App.tsx handles the state change and will close this modal
          } catch (err) {
            console.error(err);
            toast.error('An unexpected error occurred during Google Sign-In');
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });
      // @ts-ignore
      window.google.accounts.id.prompt(); 
    } catch (error) {
      console.error('Google initialization failed:', error);
      setIsGoogleLoading(false);
      toast.error('Failed to initialize Google login');
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  const steps = ['name', 'email', 'calendar'] as const;
  const currentStepIndex = steps.indexOf(step);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/98 backdrop-blur-md"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-sm mx-4 p-6 rounded-3xl bg-card border border-border/40 shadow-xl"
      >
        {/* Progress indicator */}
        <div className="flex gap-2 mb-6">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Name */}
          {step === 'name' && (
            <motion.div
              key="name"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-center mb-6">
                <motion.div
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <User className="w-8 h-8 text-primary" />
                </motion.div>
              </div>

              <h2 className="text-xl font-semibold text-foreground text-center mb-2">
                What should we call you?
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                We'll use this to personalize your experience
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="sr-only">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameNext()}
                    className={`h-12 text-center text-lg rounded-xl ${
                      nameError ? 'border-destructive' : ''
                    }`}
                    autoFocus
                  />
                  {nameError && (
                    <p className="text-sm text-destructive text-center mt-2">{nameError}</p>
                  )}
                </div>

                <Button
                  onClick={handleNameNext}
                  className="w-full h-12 rounded-xl"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Email - Removed manual entry, strictly Google Sign-in now */}
          {step === 'email' && (
            <motion.div
              key="email"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-center mb-6">
                <motion.div
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Mail className="w-8 h-8 text-primary" />
                </motion.div>
              </div>

              <h2 className="text-xl font-semibold text-foreground text-center mb-2">
                Welcome to Rivly
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Please sign in with your Google account to continue
              </p>

              <div className="space-y-4">
                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full h-12 rounded-xl"
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Sign in with Google
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Calendar */}
          {step === 'calendar' && (
            <motion.div
              key="calendar"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-center mb-6">
                <motion.div
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Calendar className="w-8 h-8 text-primary" />
                </motion.div>
              </div>

              <h2 className="text-xl font-semibold text-foreground text-center mb-2">
                Connect your calendar?
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Sync your events to plan your day better
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleConnectCalendar}
                  className="w-full h-12 rounded-xl"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleSkipCalendar}
                  className="w-full h-12 rounded-xl text-muted-foreground"
                >
                  Skip for now
                </Button>
              </div>

              <button
                onClick={() => setStep('email')}
                className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decorative element */}
        <motion.div
          className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Legal Links Footer */}
        <div className="mt-8 flex justify-center gap-4 text-[10px] text-muted-foreground/60">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Privacy Policy</a>
          <span className="opacity-30">•</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Terms of Service</a>
        </div>
      </motion.div>
    </motion.div>
  );
}
