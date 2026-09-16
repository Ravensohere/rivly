/**
 * Google Calendar Event Create - Adds an event to a user's Google Calendar
 * 
 * Refreshes access token if expired and pushes a new event
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Get request body
    const { event } = await req.json();
    
    if (!event || !event.title || !event.start || !event.end) {
      return new Response(
        JSON.stringify({ error: 'Missing event details (title, start, end)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's calendar connection (using service role to access refresh_token)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: connection, error: connError } = await supabaseAdmin
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Calendar not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = connection.access_token;
    const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
    const isExpired = expiresAt && expiresAt < new Date();

    // Refresh token if expired
    if (isExpired || !accessToken) {
      console.log('[google-calendar-event-create] Refreshing access token');
      
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'OAuth not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.text();
        console.error('[google-calendar-event-create] Token refresh failed. Response:', errorData);
        return new Response(
          JSON.stringify({ error: 'OAuth refresh failed', details: errorData }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshedTokens = await refreshResponse.json();
      accessToken = refreshedTokens.access_token;

      // Update stored tokens
      const newExpiresAt = refreshedTokens.expires_in
        ? new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString()
        : null;

      await supabaseAdmin
        .from('google_calendar_connections')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // Push event to Google Calendar
    const googleEvent = {
      summary: event.title,
      description: event.description || 'Created via Rivly',
      location: event.location || '',
      start: {
        dateTime: event.start, // ISO string
      },
      end: {
        dateTime: event.end, // ISO string
      },
      reminders: {
        useDefault: true,
      },
    };

    const createResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('[google-calendar-event-create] Calendar API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create calendar event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleData = await createResponse.json();
    
    console.log('[google-calendar-event-create] Event created successfully:', googleData.id);

    return new Response(
      JSON.stringify({ success: true, googleEventId: googleData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[google-calendar-event-create] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
