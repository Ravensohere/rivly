import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useFocusRooms } from '../useFocusRooms';

// ── Mock Supabase ──────────────────────────────────────────────────────────
const { mockChannel, mockRPC, mockSelect } = vi.hoisted(() => ({
  mockChannel: {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  },
  mockRPC: vi.fn().mockResolvedValue({ error: null }),
  mockSelect: vi.fn().mockResolvedValue({
    data: [
      { id: 'room-1', name: 'Deep Work',    emoji: '🧠', description: 'Focus hard.', active_users: 42, timer_end_at: null },
      { id: 'room-2', name: 'Study Hall',   emoji: '📚', description: 'Study!',      active_users: 15, timer_end_at: null },
    ],
    error: null,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select:  vi.fn().mockReturnValue({ order: vi.fn().mockImplementation(() => mockSelect()) }),
      update:  vi.fn().mockReturnThis(),
    }),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    rpc: mockRPC,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'user-123', email: 'test@test.com' } }),
}));

// ─────────────────────────────────────────────────────────────────────────────

describe('useFocusRooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRPC.mockResolvedValue({ error: null });
  });

  // ── Data loading ────────────────────────────────────────────────────────
  describe('initial load', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useFocusRooms());
      expect(result.current.loading).toBe(true);
      expect(result.current.rooms).toHaveLength(0);
    });

    it('loads rooms from Supabase and sets loading=false', async () => {
      const { result } = renderHook(() => useFocusRooms());

      await act(async () => { await Promise.resolve(); });

      expect(result.current.loading).toBe(false);
      expect(result.current.rooms).toHaveLength(2);
      expect(result.current.rooms[0].name).toBe('Deep Work');
      expect(result.current.rooms[0].active_users).toBe(42);
    });

    it('shows fallback rooms when Supabase fetch fails', async () => {
      const { supabase } = await import('@/integrations/supabase/client') as any;
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB offline') }),
        }),
      });

      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      expect(result.current.loading).toBe(false);
      // Fallback rooms should be populated
      expect(result.current.rooms.length).toBeGreaterThan(0);
      expect(result.current.error).not.toBeNull();
    });

    it('renders empty state when rooms table returns empty array', async () => {
      const { supabase } = await import('@/integrations/supabase/client') as any;
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      expect(result.current.rooms).toHaveLength(0);
    });
  });

  // ── Join / Leave ─────────────────────────────────────────────────────────
  describe('joinRoom', () => {
    it('calls join_focus_room RPC with correct room_id', async () => {
      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      await act(async () => {
        await result.current.joinRoom('room-1');
      });

      expect(mockRPC).toHaveBeenCalledWith('join_focus_room', { room_id: 'room-1' });
      expect(result.current.activeRoomId).toBe('room-1');
    });

    it('sets activeRoomId to the joined room', async () => {
      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      await act(async () => {
        await result.current.joinRoom('room-2');
      });

      expect(result.current.activeRoomId).toBe('room-2');
    });

    it('leaves previous room before joining a new one', async () => {
      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      await act(async () => { await result.current.joinRoom('room-1'); });
      await act(async () => { await result.current.joinRoom('room-2'); });

      // leave_focus_room called for room-1, then join for room-2
      expect(mockRPC).toHaveBeenCalledWith('leave_focus_room', { room_id: 'room-1' });
      expect(mockRPC).toHaveBeenCalledWith('join_focus_room', { room_id: 'room-2' });
    });

    it('optimistically updates active_users when RPC fails', async () => {
      mockRPC.mockRejectedValueOnce(new Error('network error'));

      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      const before = result.current.rooms.find((r) => r.id === 'room-1')!.active_users;

      await act(async () => {
        await result.current.joinRoom('room-1');
      });

      const after = result.current.rooms.find((r) => r.id === 'room-1')!.active_users;
      expect(after).toBe(before + 1);
    });
  });

  describe('leaveRoom', () => {
    it('calls leave_focus_room RPC and clears activeRoomId', async () => {
      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      await act(async () => { await result.current.joinRoom('room-1'); });
      await act(async () => { await result.current.leaveRoom('room-1'); });

      expect(mockRPC).toHaveBeenCalledWith('leave_focus_room', { room_id: 'room-1' });
      expect(result.current.activeRoomId).toBeNull();
    });

    it('never lets active_users go below 0 on optimistic update', async () => {
      mockRPC.mockRejectedValueOnce(new Error('Leave RPC failed'));

      // Seed a room with 0 users
      const { supabase } = await import('@/integrations/supabase/client') as any;
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'room-zero', name: 'Empty Room', emoji: '🪑', description: null, active_users: 0, timer_end_at: null }],
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      await act(async () => { await result.current.leaveRoom('room-zero'); });

      const room = result.current.rooms.find((r) => r.id === 'room-zero');
      expect(room?.active_users).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Realtime subscription ─────────────────────────────────────────────────
  describe('realtime', () => {
    it('subscribes to focus_rooms_live channel on mount', async () => {
      const { supabase } = await import('@/integrations/supabase/client') as any;
      renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      expect(supabase.channel).toHaveBeenCalledWith('focus_rooms_live');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'focus_rooms' },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('updates active_users when realtime UPDATE fires', async () => {
      let realtimeCallback: ((payload: any) => void) | null = null;
      mockChannel.on.mockImplementationOnce((_event: any, _filter: any, cb: (payload: any) => void) => {
        realtimeCallback = cb;
        return mockChannel;
      });

      const { result } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      expect(result.current.rooms[0].active_users).toBe(42);

      // Simulate realtime update from Supabase
      act(() => {
        realtimeCallback?.({ new: { id: 'room-1', active_users: 99 } });
      });

      expect(result.current.rooms.find((r) => r.id === 'room-1')?.active_users).toBe(99);
    });

    it('removes channel on unmount', async () => {
      const { supabase } = await import('@/integrations/supabase/client') as any;
      const { unmount } = renderHook(() => useFocusRooms());
      await act(async () => { await Promise.resolve(); });

      unmount();
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });
});
