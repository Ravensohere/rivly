/**
 * Google OAuth Callback - Exchanges code for tokens and stores them
 * 
 * Required secrets:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

Deno.serve(async (req) => {
  try {
    // Validate request
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header - Supabase Edge Runtime handles JWT validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[google-oauth-callback] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a regular Supabase client (not admin) for user auth validation
    const supabaseClient = createClient(
      'https://kddwrjvrkkaylnwgskke.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZHdyanZya2theWxud2dza2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTY2NTUsImV4cCI6MjA4NDkzMjY1NX0.gy70UiydC3vIipX3036ZaU00gCnl-z6Loz0Z1dVeN_A',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('[google-oauth-callback] Invalid user token:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Get request body
    const { code, redirectUri } = await req.json();
    
    if (!code || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Missing code or redirectUri' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google OAuth credentials
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    console.log('[google-oauth-callback] Client ID present:', !!clientId);
    console.log('[google-oauth-callback] Client Secret present:', !!clientSecret);
    console.log('[google-oauth-callback] Redirect URI:', redirectUri);

    if (!clientId || !clientSecret) {
      console.error('[google-oauth-callback] Missing credentials');
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[google-oauth-callback] Token exchange failed. Status:', tokenResponse.status);
      console.error('[google-oauth-callback] Google error response:', errorData);
      console.error('[google-oauth-callback] Used redirect URI:', redirectUri);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to exchange code for tokens',
          details: errorData,
          status: tokenResponse.status
        }),
        { status: tokenResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = await tokenResponse.json();
    console.log('[google-oauth-callback] Token exchange successful');

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let email: string | null = null;
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      email = userInfo.email || null;
    }

    // Store tokens in database (using service role for security)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: upsertError } = await supabaseAdmin
      .from('google_calendar_connections')
      .upsert({
        user_id: userId,
        provider: 'google',
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: expiresAt,
        scope: tokens.scope || null,
        email,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('[google-oauth-callback] DB error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[google-oauth-callback] Connection saved for user:', userId);

    return new Response(
      JSON.stringify({ success: true, email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[google-oauth-callback] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
