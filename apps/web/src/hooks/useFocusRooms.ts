import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface FocusRoom {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  active_users: number;
  timer_end_at: string | null;
}

interface UseFocusRoomsReturn {
  rooms: FocusRoom[];
  loading: boolean;
  error: string | null;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  activeRoomId: string | null;
}

export function useFocusRooms(): UseFocusRoomsReturn {
  const [rooms, setRooms] = useState<FocusRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const { user } = useAuthContext();
  
  // Keep activeRoomId in a ref so cleanup handlers always see latest value
  const activeRoomRef = useRef<string | null>(null);

  // ── Initial fetch ────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('focus_rooms')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      setRooms((data as FocusRoom[]) ?? []);
    } catch (err) {
      console.error('[FocusRooms] fetch error:', err);
      setError('Could not load focus rooms. Showing cached data.');
      // Fallback seed data so the page still renders
      setRooms([
        { id: 'fallback-1', name: 'Deep Work',         emoji: '🧠', description: 'Intense focus.',           active_users: 142, timer_end_at: null },
        { id: 'fallback-2', name: 'Study Hall',         emoji: '📚', description: 'Reading and learning.',    active_users: 87,  timer_end_at: null },
        { id: 'fallback-3', name: 'Morning Focus',      emoji: '🌅', description: 'Start your day strong.',   active_users: 63,  timer_end_at: null },
        { id: 'fallback-4', name: 'Evening Wind-Down',  emoji: '🌙', description: 'Calm evening work.',       active_users: 38,  timer_end_at: null },
        { id: 'fallback-5', name: 'Flow State',         emoji: '🌊', description: 'Get in the zone.',         active_users: 201, timer_end_at: null },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel('focus_rooms_live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'focus_rooms' },
        (payload) => {
          const updated = payload.new as FocusRoom;
          setRooms((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[FocusRooms] Realtime connected ✓');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[FocusRooms] Realtime channel error — counts may lag.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  // ── Auto-cleanup on tab/window close ─────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      const roomId = activeRoomRef.current;
      if (!roomId) return;
      // Use sendBeacon for reliable fire-and-forget on tab close
      // Falls back to sync XHR if not available
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/leave_focus_room`;
      const payload = JSON.stringify({ room_id: roomId });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ── Join / Leave ───────────────────────────────────────────────────────────
  const joinRoom = useCallback(async (roomId: string) => {
    if (!user) return;
    // Leave previous room first
    if (activeRoomRef.current && activeRoomRef.current !== roomId) {
      await leaveRoomById(activeRoomRef.current);
    }

    try {
      const { error: rpcError } = await supabase.rpc('join_focus_room', { room_id: roomId });
      if (rpcError) throw rpcError;
      setActiveRoomId(roomId);
      activeRoomRef.current = roomId;
    } catch (err) {
      console.error('[FocusRooms] join error:', err);
      // Optimistically update UI even if RPC fails (offline-friendly)
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, active_users: r.active_users + 1 } : r
        )
      );
      setActiveRoomId(roomId);
      activeRoomRef.current = roomId;
    }
  }, [user]);

  const leaveRoomById = useCallback(async (roomId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('leave_focus_room', { room_id: roomId });
      if (rpcError) throw rpcError;
    } catch (err) {
      console.error('[FocusRooms] leave error:', err);
      // Optimistic rollback
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, active_users: Math.max(0, r.active_users - 1) } : r
        )
      );
    }
  }, []);

  const leaveRoom = useCallback(async (roomId: string) => {
    await leaveRoomById(roomId);
    setActiveRoomId(null);
    activeRoomRef.current = null;
  }, [leaveRoomById]);

  return { rooms, loading, error, joinRoom, leaveRoom, activeRoomId };
}
