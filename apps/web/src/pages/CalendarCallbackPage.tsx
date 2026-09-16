/**
 * Calendar Callback Page - Handles OAuth redirects for Google Calendar
 * 
 * Route: /calendar/callback
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function CalendarCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          setStatus('error');
          setErrorMessage(errorDescription || error);
          return;
        }

        // Get the authorization code
        const code = searchParams.get('code');
        
        if (!code) {
          setStatus('error');
          setErrorMessage('No authorization code received');
          return;
        }

        // Exchange code for tokens via edge function
        const { data: { session } } = await supabase.auth.getSession();
        
        // Check session
        
        if (!session) {
          console.error('[CalendarCallback] No session found');
          setStatus('error');
          setErrorMessage('You must be logged in to connect your calendar');
          return;
        }

        // console.log('[CalendarCallback] Invoking google-oauth-callback with code:', code.substring(0, 10) + '...');

        const { data, error: fnError } = await supabase.functions.invoke('google-oauth-callback', {
          body: { 
            code,
            redirectUri: `${window.location.origin}/calendar/callback`,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (fnError) {
          console.error('[CalendarCallback] Function error:', {
            message: fnError.message,
            status: (fnError as any).status,
            context: (fnError as any).context,
            details: fnError,
          });
          setStatus('error');
          
          // Provide more specific error messages
          if ((fnError as any).status === 401) {
            setErrorMessage('Authentication failed. Please try logging out and back in, then reconnect your calendar.');
          } else {
            setErrorMessage(fnError.message || 'Failed to connect calendar. Please try again.');
          }
          return;
        }

        if (data?.error) {
          setStatus('error');
          setErrorMessage(data.error);
          return;
        }

        setStatus('success');
        toast({
          title: 'Calendar connected!',
          description: 'Your Google Calendar is now synced with Rivly.',
        });

        // Redirect after a brief delay
        setTimeout(() => {
          navigate('/settings', { replace: true });
        }, 1500);
        
      } catch (err) {
        console.error('[CalendarCallback] Unexpected error:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred');
      }
    };

    handleCallback();
  }, [navigate, searchParams, toast]);

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
            <h1 className="text-xl font-semibold text-foreground">Connecting Calendar...</h1>
            <p className="text-sm text-muted-foreground">Please wait a moment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Calendar Connected!</h1>
            <p className="text-sm text-muted-foreground">Your events will now appear in Rivly</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Connection failed</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{errorMessage}</p>
            <button
              onClick={() => navigate('/settings', { replace: true })}
              className="text-sm text-primary hover:underline mt-4"
            >
              Return to Settings
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
