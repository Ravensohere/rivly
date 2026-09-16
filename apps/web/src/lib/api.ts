import { supabase } from '@/integrations/supabase/client';

// Change this to your deployed worker URL when going to production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vivly-backend.gnvenkatapathiraju.workers.dev/api';

/**
 * Perform an authenticated fetch to the Cloudflare Worker API
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Get the current user session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  // The worker derives identity from this token — it does not trust any
  // user id we send alongside it.
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `API Error: ${response.statusText}`;
    throw new Error(errorData.details ? `${message} (${errorData.details})` : message);
  }

  return response.json();
}

// --- API Methods ---

export const api = {
  tasks: {
    list: async (dateKey?: string) => {
      let query = (supabase as any).from('tasks').select('*');
      if (dateKey) {
        query = query.eq('due_date', dateKey);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { tasks: data };
    },
    create: async (task: { title: string; date_key: string; status?: 'todo' | 'done' | 'pending' | 'completed' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const dbTask = {
        title: task.title,
        status: task.status === 'done' ? 'completed' : 'pending',
        due_date: task.date_key,
        user_id: user.id
      };
      
      const { data, error } = await (supabase as any).from('tasks').insert(dbTask).select().single();
      if (error) throw error;
      return { task: data };
    },
    update: async (id: string, updates: any) => {
      const { error } = await (supabase as any).from('tasks').update(updates).eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    delete: async (id: string) => {
      const { error } = await (supabase as any).from('tasks').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  },

  focus: {
    recordSession: async (session: { 
      duration_minutes: number; 
      outcome?: 'good' | 'some' | 'notReally';
      started_at: string;
      ended_at: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any).from('focus_sessions').insert({
        ...session,
        user_id: user.id
      }).select().single();
      
      if (error) {
          console.warn('[API] Failed to record focus session to DB:', error);
          // Don't throw to avoid disrupting UI, or throw if critical? 
          // useEventsLedger catches it.
          throw error;
      }
      return { session: data };
    },
  },

  riva: {
    plan: (transcript: string, context: any = {}) => {
      return fetchWithAuth('/riva/plan', {
        method: 'POST',
        body: JSON.stringify({ transcript, context }),
      });
    },
    morningBriefing: (checkIn: any, userName: string = 'Friend') => {
      return fetchWithAuth('/riva/morning-briefing', {
        method: 'POST',
        body: JSON.stringify({ checkIn, userName }),
      });
    },
    searchVideo: (query: string, maxResults: number = 3) => {
      return fetchWithAuth('/riva/search-video', {
        method: 'POST',
        body: JSON.stringify({ query, maxResults }),
      });
    }
  },

  payment: {
    /** Create a Cashfree order. The server decides the price from the plan id. */
    createOrder: (planId: string) =>
      fetchWithAuth('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),
    verify: (orderId: string, paymentId?: string) =>
      fetchWithAuth('/payment/verify-payment', {
        method: 'POST',
        body: JSON.stringify({ orderId, paymentId }),
      }),
    status: () => fetchWithAuth('/payment/status'),
    cancel: () => fetchWithAuth('/payment/cancel-subscription', { method: 'POST', body: '{}' }),
  },

  inbox: {
    status: () => fetchWithAuth('/inbox/status'),
    scan: () => fetchWithAuth('/inbox/scan', { method: 'POST', body: '{}' }),
    suggestions: () => fetchWithAuth('/inbox/suggestions'),
    accept: (id: string) => fetchWithAuth(`/inbox/suggestions/${id}/accept`, { method: 'POST', body: '{}' }),
    dismiss: (id: string) => fetchWithAuth(`/inbox/suggestions/${id}/dismiss`, { method: 'POST', body: '{}' }),
    setSettings: (patch: { enabled?: boolean; categories?: string[] }) =>
      fetchWithAuth('/inbox/settings', { method: 'POST', body: JSON.stringify(patch) }),
  },
};
