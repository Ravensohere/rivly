import { supabase } from '@/integrations/supabase/client';

/**
 * Start the offline (auth-code) Google connect flow so a refresh token is
 * stored. Redirects the browser to Google; returns to /calendar/callback.
 *
 * `includeGmail` adds the restricted gmail.readonly scope. Keep it false for the
 * default connect: Calendar alone only needs Google's standard verification,
 * while Gmail additionally requires an annual CASA audit. Asking for both up
 * front blocks every user until that audit is done.
 */
export async function connectGoogleOffline(includeGmail = false): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in to connect Google.');

  const redirectUri = `${window.location.origin}/calendar/callback`;
  const { data, error } = await supabase.functions.invoke('google-oauth-start', {
    body: { redirectUri, includeGmail },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  if (!data?.authUrl) throw new Error('Could not start Google connect.');
  window.location.href = data.authUrl;
}
