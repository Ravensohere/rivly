/**
 * Google OAuth Start - Generates the authorization URL
 * 
 * Required secrets:
 * - GOOGLE_CLIENT_ID
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { redirectUri, includeGmail } = await req.json();

    if (!redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Missing redirectUri' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /**
     * Scope classes decide how hard this app is to ship:
     *   calendar.* + userinfo.*  -> SENSITIVE  (Google verification, no CASA)
     *   gmail.readonly           -> RESTRICTED (verification + annual CASA audit)
     *
     * Asking for Gmail up front dragged the whole app — Calendar included —
     * behind the restricted-scope review, so nobody outside the Console test-user
     * list could connect anything. Gmail is now requested separately, only when
     * the user explicitly opts into email scanning.
     */
    const BASE_SCOPES = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];
    const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

    const scopes = includeGmail ? [...BASE_SCOPES, GMAIL_SCOPE] : BASE_SCOPES;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      // Incremental auth: adding Gmail later must not silently drop Calendar.
      include_granted_scopes: 'true',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return new Response(
      JSON.stringify({ authUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[google-oauth-start] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
