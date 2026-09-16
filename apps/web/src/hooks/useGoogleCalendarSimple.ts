import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { connectGoogleOffline } from '@/lib/googleConnect';

export function useGoogleCalendarSimple() {
  const { user, session } = useAuthContext();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);

  // Loads Google Identity Services. This hook is the only place that injects it,
  // and ProfileOnboarding's sign-in depends on window.google.accounts.id, so the
  // script load stays even though connecting no longer uses a GIS token client.
  useEffect(() => {
    const loadGoogleAPI = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      document.body.appendChild(gapiScript);
    };

    loadGoogleAPI();
  }, []);

  /**
   * Connect via the offline (auth-code) flow.
   *
   * This used to use GIS `initTokenClient`, which is implicit-only: it returns an
   * access token and NEVER a refresh token. The row it wrote had refresh_token
   * null, so once that hour-long access token expired the connection was dead —
   * `getFreshAccessToken` bails on a missing refresh token and every Inbox Radar
   * scan returned `token_failed` forever. Worse, the upsert is keyed on user_id,
   * so connecting here AFTER connecting through Inbox Radar overwrote a good
   * refresh token with null.
   *
   * Both entry points now use the same auth-code flow, so every connection can
   * be refreshed. Redirects to Google and returns to /calendar/callback.
   */
  const connectCalendar = useCallback(async () => {
    await connectGoogleOffline();
  }, []);

  const disconnectCalendar = async () => {
    if (!user) return;

    try {
      await supabase
        .from('google_calendar_connections')
        .delete()
        .eq('user_id', user.id);

      setIsConnected(false);
      // Settings reads connection state from /api/inbox/status, so drop that
      // cache too or the UI keeps showing a connection that no longer exists.
      await queryClient.invalidateQueries({ queryKey: ['inbox-status', user.id] });
    } catch (err) {
      console.error('Error disconnecting:', err);
      throw err;
    }
  };

  const saveTokens = async (tokens: {
    access_token: string;
    refresh_token?: string;
    expires_at: string;
  }) => {
    if (!user) return;

    try {
      // Get user email from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );
      const userInfo = await userInfoResponse.json();

      // Save to Supabase
      const connectionData: any = {
        user_id: user.id,
        provider: 'google',
        access_token: tokens.access_token,
        expires_at: tokens.expires_at,
        email: userInfo.email,
      };

      // Only include refresh_token if provided (not always available with implicit flow)
      if (tokens.refresh_token) {
        connectionData.refresh_token = tokens.refresh_token;
      }

      const { error } = await supabase
        .from('google_calendar_connections')
        .upsert(connectionData);

      if (error) {
        console.error('Error saving tokens:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error saving tokens:', err);
      throw err;
    }
  };

  const getCalendarEvents = useCallback(async (timeMin: string, timeMax: string) => {
    if (!user) return [];

    let accessToken: string | null = null;

    try {
      // 1. Try getting from DB
      const { data: connection } = await supabase
        .from('google_calendar_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      accessToken = connection?.access_token || null;

      // 2. Fallback to session token if DB is empty but session exists
      if (!accessToken && session?.provider_token) {
        accessToken = session.provider_token;
      }

      if (!accessToken) return [];

      const fetchEvents = async (token: string) => {
        return fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
            new URLSearchParams({
              timeMin,
              timeMax,
              singleEvents: 'true',
              orderBy: 'startTime',
            }),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      };

      let response = await fetchEvents(accessToken);

      // 3. Handle 401 - Retry with session token if we weren't already using it
      if (response.status === 401 && session?.provider_token && accessToken !== session.provider_token) {
        console.log('[GoogleCalendarSimple] Token expired, retrying with session token...');
        response = await fetchEvents(session.provider_token);

        // If successful, update the legacy DB connection with the fresh token
        if (response.ok) {
          saveTokens({
            access_token: session.provider_token,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          }).catch(console.error);
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
           console.warn('[GoogleCalendarSimple] API returned 401 even after retry');
           await disconnectCalendar(); // Force disconnect to remove invalid token
           setIsConnected(false);
        }
        return []; 
      }

      const data = await response.json();
      return data.items || [];
    } catch (err) {
      console.error('[GoogleCalendarSimple] Error fetching events:', err);
      return [];
    }
  }, [user, session]);

  const createCalendarEvent = useCallback(async (event: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    recurrence?: string[];
  }) => {
    if (!user) return null;

    let accessToken: string | null = null;

    try {
      // 1. Get from DB
      const { data: connection } = await supabase
        .from('google_calendar_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .single();
      
      accessToken = connection?.access_token || null;

      // 2. Fallback
      if (!accessToken && session?.provider_token) {
        accessToken = session.provider_token;
      }

      if (!accessToken) return null;

      // Create event in Google Calendar
      const eventBody: any = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.endTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      if (event.recurrence) {
        eventBody.recurrence = event.recurrence;
      }

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[GoogleCalendarSimple] Error creating event:', err);
      return null;
    }
  }, [user, session]);

  const deleteCalendarEvent = useCallback(async (eventId: string) => {
    if (!user) return false;

    let accessToken: string | null = null;

    try {
      // 1. Get from DB
      const { data: connection } = await supabase
        .from('google_calendar_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .single();
      
      accessToken = connection?.access_token || null;

      // 2. Fallback
      if (!accessToken && session?.provider_token) {
        accessToken = session.provider_token;
      }

      if (!accessToken) return false;

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (err) {
      console.error('[GoogleCalendarSimple] Error deleting event:', err);
      return false;
    }
  }, [user, session]);

  const updateCalendarEvent = useCallback(async (eventId: string, updates: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
  }) => {
    if (!user) return null;

    let accessToken: string | null = null;

    try {
      // 1. Get from DB
      const { data: connection } = await supabase
        .from('google_calendar_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .single();
      
      accessToken = connection?.access_token || null;

      // 2. Fallback
      if (!accessToken && session?.provider_token) {
        accessToken = session.provider_token;
      }

      if (!accessToken) return null;

      // Construct patch body
      const patchBody: any = {};
      
      if (updates.title !== undefined) patchBody.summary = updates.title;
      if (updates.description !== undefined) patchBody.description = updates.description;
      
      if (updates.startTime) {
        patchBody.start = {
          dateTime: updates.startTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      
      if (updates.endTime) {
         patchBody.end = {
          dateTime: updates.endTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patchBody),
        }
      );

      return response.ok;
    } catch (err) {
      console.error('[GoogleCalendarSimple] Error updating event:', err);
      return null;
    }
  }, [user, session]);

  // Wrapper for fetching events that updates state
  const fetchGoogleEvents = useCallback(async (date: Date) => {
    // Note: We removed the isConnected check here because we want to attempt connection via session token
    // even if the DB connection is invalid/missing initially.

    try {
      // Get start and end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const events = await getCalendarEvents(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      // Format events for display
      const formattedEvents = events.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        isAllDay: !event.start?.dateTime,
        location: event.location,
        description: event.description,
        meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
      }));

      setGoogleEvents(formattedEvents);
      // If we got events, we can assume we are connected
      if (formattedEvents.length > 0) setIsConnected(true);
      return formattedEvents;
    } catch (err) {
      console.error('[GoogleCalendarSimple] Error in fetchGoogleEvents:', err);
      setGoogleEvents([]);
      return [];
    }
  }, [getCalendarEvents]); // Dependency on getCalendarEvents which is now stable-ish (we should memoize it or use ref, but it depends on 'user', so it's fine)


  return {
    isConnected,
    isLoading,
    connectCalendar,
    disconnectCalendar,
    getCalendarEvents,
    createCalendarEvent,
    fetchGoogleEvents,
    createGoogleEvent: createCalendarEvent,
    deleteCalendarEvent,
    updateCalendarEvent,
    googleEvents,
  };
}
