
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function SignupPage() {
  const { signInWithGoogle } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      <SEO 
        title="Rivly Signup - Start Your Calm Journey"
        description="Create your Rivly account to start planning your day with rhythm and focus. Free for students and individuals."
        keywords={['Rivly Signup', 'Rivly Register', 'Create Rivly Account', 'Daily Planner App']}
      />
      <Link
        to="/"
        className="absolute top-6 left-5 sm:top-8 sm:left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors z-10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 bg-card p-6 sm:p-8 rounded-3xl border border-border/50 shadow-xl text-center"
      >
        <div className="flex flex-col items-center gap-4">
           <Link to="/">
            <img src="/icon-512.png" alt="Rivly Logo" className="w-20 h-20 rounded-2xl shadow-sm hover:scale-105 transition-transform" />
           </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground">
              Start your journey to a calmer, more focused day
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Button
            size="lg"
            className="w-full h-12 text-base rounded-xl"
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? (
               <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"
                />
            ) : (
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
            )}
            Sign up with Google
          </Button>
        </div>

        <p className="px-8 text-center text-xs text-muted-foreground">
          By clicking continue, you agree to our{' '}
          <Link to="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
        
        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
