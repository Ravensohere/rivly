import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isSameDay } from 'date-fns';

export type EventCategory = 'birthday' | 'personal' | 'work' | 'reminder';
export type ReminderOption = 'none' | 'at_time' | '10m' | '1h' | '1d';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm:ss
  all_day: boolean;
  category: EventCategory;
  notes: string | null;
  reminder_option: ReminderOption;
  recurring_yearly: boolean;
  created_at: string;
  updated_at: string;
  is_google_event?: boolean;
  meet_link?: string | null; // Google Meet link for quick access
}

export interface NewEvent {
  title: string;
  date: string;
  time?: string;
  all_day?: boolean;
  category: EventCategory;
  notes?: string;
  reminder_option?: ReminderOption;
  recurring_yearly?: boolean;
}

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all events for the user
  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error loading events',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setEvents(data as CalendarEvent[]);
    
    setEvents(data as CalendarEvent[]);
    setLoading(false);
  }, [user, toast]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Add new event
  const addEvent = useCallback(async (event: NewEvent) => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to add events.',
        variant: 'destructive',
      });
      return { error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        ...event,
        user_id: user.id,
        all_day: event.all_day ?? true,
        reminder_option: event.reminder_option ?? 'none',
        recurring_yearly: event.recurring_yearly ?? false,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error adding event',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setEvents(prev => [...prev, data as CalendarEvent]);
    toast({
      title: 'Event added',
      description: `"${event.title}" has been added.`,
    });
    return { data };
  }, [user, toast]);

  // Update event
  const updateEvent = useCallback(async (id: string, updates: Partial<NewEvent>) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error updating event',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setEvents(prev => prev.map(e => e.id === id ? data as CalendarEvent : e));
    toast({
      title: 'Event updated',
    });
    return { data };
  }, [toast]);

  // Delete event
  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting event',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setEvents(prev => prev.filter(e => e.id !== id));
    toast({
      title: 'Event deleted',
    });
    return {};
  }, [toast]);

  // Get events for a specific date (including recurring yearly events)
  const getEventsForDate = useCallback((dateString: string) => {
    const targetDate = parseISO(dateString);
    
    return events.filter(event => {
      const eventDate = parseISO(event.date);
      
      // Direct match
      if (event.date === dateString) return true;
      
      // Recurring yearly - same month and day
      if (event.recurring_yearly) {
        return eventDate.getMonth() === targetDate.getMonth() &&
               eventDate.getDate() === targetDate.getDate();
      }
      
      return false;
    });
  }, [events]);

  // Check if a date has events
  const hasEventsOnDate = useCallback((dateString: string) => {
    return getEventsForDate(dateString).length > 0;
  }, [getEventsForDate]);

  // Get dates with events for a month (for calendar display)
  const getDatesWithEvents = useCallback(() => {
    const datesSet = new Set<string>();
    
    events.forEach(event => {
      datesSet.add(event.date);
    });
    
    return Array.from(datesSet);
  }, [events]);

  return {
    events,
    isLoading: loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    hasEventsOnDate,
    getDatesWithEvents,
    refetchEvents: fetchEvents,
  };
}
