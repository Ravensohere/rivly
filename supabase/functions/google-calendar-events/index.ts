/**
 * Google Calendar Events - Fetches calendar events for a user
 * 
 * Refreshes access token if expired and returns events for a given time range
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
}

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
    const { timeMin, timeMax } = await req.json();
    
    if (!timeMin || !timeMax) {
      return new Response(
        JSON.stringify({ error: 'Missing timeMin or timeMax' }),
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
      console.log('[google-calendar-events] Refreshing access token');
      
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
        console.error('[google-calendar-events] Token refresh failed. Response:', errorData);
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

    // Fetch calendar events
    const calendarParams = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${calendarParams}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.text();
      console.error('[google-calendar-events] Calendar API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch calendar events' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarData = await eventsResponse.json();
    
    // Normalize events
    const events: CalendarEvent[] = (calendarData.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || 'Untitled',
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      location: item.location || undefined,
      isAllDay: !item.start?.dateTime,
    }));

    console.log(`[google-calendar-events] Returning ${events.length} events for user:`, userId);

    return new Response(
      JSON.stringify({ events }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[google-calendar-events] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
