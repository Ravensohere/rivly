import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/ui/PageTransition';
import { Users, Timer, Headphones, ArrowLeft, CheckCircle2, RefreshCw, Volume2, VolumeX, X } from 'lucide-react';
import { useFocusRooms, FocusRoom } from '@/hooks/useFocusRooms';
import { useNavigate } from 'react-router-dom';

// ── Constants ────────────────────────────────────────────────────────────────
const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds

const AMBIENT_TRACKS = [
  { label: 'Lo-fi Beats',      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { label: 'Rain & Thunder',   url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { label: 'Brown Noise',      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { label: 'Silence',          url: '' },
];

// Color palettes per room (cycling if more rooms added later)
const ROOM_PALETTES: Record<string, { from: string; to: string; pulse: string }> = {
  'Deep Work':         { from: '#4f46e5', to: '#7c3aed', pulse: '#6366f1' },
  'Study Hall':        { from: '#0891b2', to: '#0e7490', pulse: '#06b6d4' },
  'Morning Focus':     { from: '#d97706', to: '#b45309', pulse: '#f59e0b' },
  'Evening Wind-Down': { from: '#7c3aed', to: '#6d28d9', pulse: '#8b5cf6' },
  'Flow State':        { from: '#059669', to: '#047857', pulse: '#10b981' },
};
const DEFAULT_PALETTE = { from: '#4f46e5', to: '#7c3aed', pulse: '#6366f1' };

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// ── Sub-component: Room Card ─────────────────────────────────────────────────
interface RoomCardProps {
  room: FocusRoom;
  isActive: boolean;
  onJoin: () => void;
}

function RoomCard({ room, isActive, onJoin }: RoomCardProps) {
  const palette = ROOM_PALETTES[room.name] ?? DEFAULT_PALETTE;

  return (
    <motion.button
      id={`room-card-${room.id}`}
      onClick={onJoin}
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="relative w-full text-left overflow-hidden rounded-2xl border p-5 transition-all duration-300"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${palette.from}22, ${palette.to}33)`
          : 'hsl(var(--card) / 0.6)',
        borderColor: isActive ? palette.pulse : 'hsl(var(--border) / 0.4)',
        backdropFilter: 'blur(12px)',
        boxShadow: isActive
          ? `0 0 0 2px ${palette.pulse}55, 0 8px 32px ${palette.from}22`
          : '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Active pulse ring */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{ border: `2px solid ${palette.pulse}`, borderRadius: 16 }}
          />
        )}
      </AnimatePresence>

      {/* Inner bead glow */}
      {isActive && (
        <div
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ background: palette.pulse, boxShadow: `0 0 10px 3px ${palette.pulse}88` }}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl shrink-0 mt-0.5">{room.emoji}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate" style={{ color: isActive ? palette.pulse : 'hsl(var(--foreground))' }}>
              {room.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{room.description}</p>
          </div>
        </div>

        {/* Live count */}
        <div
          className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            background: isActive ? `${palette.pulse}22` : 'hsl(var(--muted) / 0.6)',
            color: isActive ? palette.pulse : 'hsl(var(--muted-foreground))',
          }}
        >
          {isActive && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: palette.pulse }}
            />
          )}
          <Users className="w-3 h-3" />
          <span>{formatCount(room.active_users)}</span>
          <span className="opacity-70">now</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span
          className="text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={{
            background: isActive ? `${palette.pulse}20` : 'hsl(var(--secondary) / 0.5)',
            color: isActive ? palette.pulse : 'hsl(var(--muted-foreground))',
          }}
        >
          {isActive ? '● Focusing now' : 'Tap to join'}
        </span>

        {!isActive && (
          <motion.div
            className="text-xs font-medium text-primary opacity-70"
            whileHover={{ opacity: 1 }}
          >
            Join →
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

// ── Sub-component: Active Room View ──────────────────────────────────────────
interface ActiveViewProps {
  room: FocusRoom;
  onLeave: () => void;
  onComplete: () => void;
}

function ActiveRoomView({ room, onLeave, onComplete }: ActiveViewProps) {
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(true);
  const [trackIdx, setTrackIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const palette = ROOM_PALETTES[room.name] ?? DEFAULT_PALETTE;
  const progress = 1 - secondsLeft / POMODORO_DURATION;

  // Timer tick
  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => {
      if (s <= 1) { clearInterval(id); onComplete(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [isRunning, secondsLeft, onComplete]);

  // Audio
  useEffect(() => {
    const track = AMBIENT_TRACKS[trackIdx];
    if (!track.url) {
      audioRef.current?.pause();
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(track.url);
      audioRef.current.loop = true;
    } else {
      audioRef.current.src = track.url;
    }
    audioRef.current.muted = isMuted;
    audioRef.current.play().catch(() => {}); // auto-play may be blocked
    return () => { audioRef.current?.pause(); };
  }, [trackIdx]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  // SVG circle config
  const R = 80;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - progress);

  return (
    <motion.div
      key="active-room"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-6 px-4"
    >
      {/* Room pill */}
      <div
        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
        style={{ background: `${palette.pulse}20`, color: palette.pulse }}
      >
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: palette.pulse }} />
        <span>{room.emoji} {room.name}</span>
      </div>

      {/* Live user count */}
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="flex items-center gap-2 text-muted-foreground text-sm"
      >
        <Users className="w-4 h-4" />
        <span>
          <span className="font-bold text-foreground">{formatCount(room.active_users)}</span>
          {' '}people focusing with you right now
        </span>
      </motion.div>

      {/* Circular timer */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
        {/* Background glow */}
        <div
          className="absolute inset-0 rounded-full opacity-20 blur-2xl"
          style={{ background: `radial-gradient(circle, ${palette.pulse}, transparent 70%)` }}
        />

        <svg width="200" height="200" className="rotate-[-90deg] relative z-10">
          {/* Track */}
          <circle
            cx="100" cy="100" r={R}
            fill="none"
            strokeWidth="8"
            stroke="hsl(var(--border) / 0.5)"
          />
          {/* Progress */}
          <motion.circle
            cx="100" cy="100" r={R}
            fill="none"
            strokeWidth="8"
            stroke={palette.pulse}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 8px ${palette.pulse}88)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: secondsLeft < 60 ? '#ef4444' : 'hsl(var(--foreground))' }}
          >
            {formatTime(secondsLeft)}
          </span>
          <span className="text-xs text-muted-foreground mt-1">remaining</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsRunning((r) => !r)}
          className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{
            background: `gradient(${palette.from}, ${palette.to})`,
            backgroundColor: palette.from,
            color: '#fff',
            boxShadow: `0 4px 16px ${palette.from}55`,
          }}
        >
          {isRunning ? 'Pause' : 'Resume'}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMuted((m) => !m)}
          className="p-2.5 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onLeave}
          className="p-2.5 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Ambient track selector */}
      <div className="w-full max-w-sm">
        <p className="text-xs text-muted-foreground text-center mb-2 flex items-center justify-center gap-1.5">
          <Headphones className="w-3.5 h-3.5" /> Ambient Sound
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          {AMBIENT_TRACKS.map((t, i) => (
            <motion.button
              key={t.label}
              whileTap={{ scale: 0.92 }}
              onClick={() => setTrackIdx(i)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: i === trackIdx ? `${palette.pulse}20` : 'hsl(var(--muted) / 0.5)',
                color: i === trackIdx ? palette.pulse : 'hsl(var(--muted-foreground))',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: i === trackIdx ? palette.pulse : 'transparent',
              }}
            >
              {t.label}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Sub-component: Completion Screen ─────────────────────────────────────────
interface CompletionViewProps {
  room: FocusRoom;
  onRejoin: () => void;
  onLeave: () => void;
}

function CompletionView({ room, onRejoin, onLeave }: CompletionViewProps) {
  const palette = ROOM_PALETTES[room.name] ?? DEFAULT_PALETTE;

  return (
    <motion.div
      key="completion"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-6 px-4 py-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `${palette.pulse}20` }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: palette.pulse }} />
        </div>
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold">Session Complete! 🎉</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          25 minutes of focused work done.<br />
          You focused alongside {formatCount(room.active_users)} others.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onRejoin}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm text-white"
          style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`, boxShadow: `0 4px 20px ${palette.from}44` }}
        >
          <RefreshCw className="w-4 h-4" />
          Another Round
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onLeave}
          className="w-full py-3 rounded-2xl font-semibold text-sm bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
        >
          Leave Room
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StudyTogetherPage() {
  const { rooms, loading, error, joinRoom, leaveRoom, activeRoomId } = useFocusRooms();
  const [view, setView] = useState<'lobby' | 'session' | 'complete'>('lobby');
  const navigate = useNavigate();

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;

  const handleJoin = useCallback(async (roomId: string) => {
    await joinRoom(roomId);
    setView('session');
  }, [joinRoom]);

  const handleLeave = useCallback(async () => {
    if (activeRoomId) await leaveRoom(activeRoomId);
    setView('lobby');
  }, [activeRoomId, leaveRoom]);

  const handleComplete = useCallback(() => {
    setView('complete');
  }, []);

  const handleRejoin = useCallback(async () => {
    if (activeRoomId) {
      // Re-join the same room with a fresh timer
      await joinRoom(activeRoomId);
      setView('session');
    }
  }, [activeRoomId, joinRoom]);

  const totalFocusing = rooms.reduce((sum, r) => sum + r.active_users, 0);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Ambient background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-accent/5 blur-3xl" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (view !== 'lobby') {
                  handleLeave();
                } else {
                  navigate(-1);
                }
              }}
              className="p-2 rounded-full hover:bg-muted/60 text-muted-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>

            <div className="flex-1">
              <h1 className="font-bold text-base leading-tight">Study Together</h1>
              {!loading && view === 'lobby' && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">{formatCount(totalFocusing)}</span>
                  {' '}people focusing globally
                </p>
              )}
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-xs text-green-500 font-semibold">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-lg mx-auto px-4 pb-32 pt-4">
          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs"
              >
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* ── LOBBY ──────────────────────────────────────────────── */}
            {view === 'lobby' && (
              <motion.div
                key="lobby"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-3"
              >
                {/* Hero text */}
                <div className="text-center py-4">
                  <h2 className="text-xl font-bold">Pick Your Room</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    No chat. No video. Just shared focus.
                  </p>
                </div>

                {/* Loading skeleton */}
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-2xl bg-muted/40 animate-pulse"
                        style={{ animationDelay: `${i * 80}ms` }}
                      />
                    ))
                  : rooms.length === 0
                    ? (
                      <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <span className="text-5xl">🪑</span>
                        <p className="text-muted-foreground text-sm">
                          No rooms available right now.<br />Check back soon!
                        </p>
                      </div>
                    )
                    : rooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          isActive={room.id === activeRoomId}
                          onJoin={() => handleJoin(room.id)}
                        />
                      ))
                }
              </motion.div>
            )}

            {/* ── SESSION ─────────────────────────────────────────────── */}
            {view === 'session' && activeRoom && (
              <div className="py-6">
                <ActiveRoomView
                  room={activeRoom}
                  onLeave={handleLeave}
                  onComplete={handleComplete}
                />
              </div>
            )}

            {/* ── COMPLETION ──────────────────────────────────────────── */}
            {view === 'complete' && activeRoom && (
              <CompletionView
                room={activeRoom}
                onRejoin={handleRejoin}
                onLeave={handleLeave}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
