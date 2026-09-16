/**
 * Auth Callback Page - Handles OAuth redirects from Supabase
 * 
 * Route: /auth/callback
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[AuthCallback] Starting callback handler...');
        // Check for error in URL params
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('[AuthCallback] Error in URL:', error, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || error);
          return;
        }

        // Wait a small amount for Supabase to process the hash/code internally
        await new Promise(resolve => setTimeout(resolve, 500));

        // Exchange the code for a session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setStatus('error');
          setErrorMessage(sessionError.message);
          return;
        }

        if (data.session) {
          console.log('[AuthCallback] Session established:', data.session.user.id);
          setStatus('success');
          
          // Redirect after a brief delay to show success and let AuthContext catch up
          setTimeout(() => {
            console.log('[AuthCallback] Navigating to /app with reload');
            // Force a hard reload as requested to ensure fresh state
            window.location.href = '/app';
          }, 1500);
        } else {
          console.warn('[AuthCallback] No session found, retrying...');
          // No session yet, Supabase may still be processing
          // Wait a moment and check again
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const { data: retryData, error: retryError } = await supabase.auth.getSession();
          
          if (retryError || !retryData.session) {
            console.error('[AuthCallback] Retry failed:', retryError);
            setStatus('error');
            setErrorMessage('Unable to complete sign in. Please try again.');
            return;
          }
          
          console.log('[AuthCallback] Session established on retry');
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/app';
          }, 1000);
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Signing you in...</h1>
            <p className="text-sm text-muted-foreground">Please wait a moment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Welcome to Rivly!</h1>
            <p className="text-sm text-muted-foreground">Redirecting you now...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Sign in failed</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{errorMessage}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="text-sm text-primary hover:underline mt-4"
            >
              Return to Rivly
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
