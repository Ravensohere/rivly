import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export type RivaAvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'success'
  | 'error'
  | 'focused'
  | 'overwhelmed'
  | 'settled';

export type RivaMotionIntensity = 'calm' | 'normal' | 'energetic';

interface RivaAvatarProps {
  state?: RivaAvatarState;
  pillColor?: string;
  eyeColor?: string;
  /** hsl(...) string tinting the glow at rest from RhythmOrbContext's dayColors; ignored while
   * an active voice state (listening/thinking/speaking/success/error) is showing. */
  moodColor?: string;
  size?: number;
  trackCursor?: boolean;
  /** "Make it yours" motion knob (see MERGE_LOG.md avatar-customization section): scales
   * cursor-pull distance and blink/animation speed without changing the geometry. */
  motionIntensity?: RivaMotionIntensity;
  className?: string;
  /** Tapping the avatar plays a short reaction (squint, or hearts on double tap) and calls this. */
  onPress?: () => void;
}

type Reaction = 'happy' | 'love' | null;
type Mood = 'focused' | 'overwhelmed' | 'settled';

const MOTION_SCALE: Record<RivaMotionIntensity, { pull: number; blinkSpeed: number; animSpeed: number }> = {
  calm: { pull: 0.5, blinkSpeed: 0.6, animSpeed: 0.65 },
  normal: { pull: 1, blinkSpeed: 1, animSpeed: 1 },
  energetic: { pull: 1.8, blinkSpeed: 1.6, animSpeed: 1.5 },
};

/**
 * Riva's avatar: a rounded capsule/pill with two eyes, matching the documented visual
 * reference (Nixi_Research_and_Claude_Code_Handoff.pdf, sections B/C — capsule geometry C01,
 * vertical-oval eyes with soft glow C02, "Make it yours" color customization C06-C09). This is
 * an original implementation built from that V-labeled (website-visible) screenshot evidence,
 * not copied Nixi assets — Nixi is closed-source, no source/art was available to copy.
 *
 * Cursor-tracking is a deliberate original addition beyond what Nixi's own research establishes
 * (the research's U01 explicitly says gaze tracking isn't documented for Nixi) — requested
 * directly as new, distinctive behavior for this avatar, not a claim about Nixi having it.
 *
 * Lives alongside Rivly's own LivingOrb.tsx (the calm breathing-orb identity, kept where it
 * already works) rather than replacing it — this is the second, more expressive/interactive
 * avatar, used for the desktop-control surface and (via DayPlannerAvatar) the home screen.
 *
 * Mood states (focused/overwhelmed/settled) render RhythmOrbContext's mood as eye expressions
 * rather than a separate component; voice state always wins over mood (see glowColor below and
 * the DayPlannerAvatar wrapper that derives the `state` prop).
 */
export function RivaAvatar({
  state = 'idle',
  pillColor = '#14141c',
  eyeColor = '#ffffff',
  moodColor,
  size = 120,
  trackCursor = true,
  motionIntensity = 'normal',
  className = '',
  onPress,
}: RivaAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const motion_ = MOTION_SCALE[motionIntensity];

  // Cursor tracking: eyes (not the whole pill) shift a few pixels toward the mouse, clamped to
  // a small range so it reads as "aware of you" rather than cartoonish eye-popping. Clamp range
  // itself scales with motionIntensity so "energetic" reads as more alive, not just faster.
  const [reaction, setReaction] = useState<Reaction>(null);
  const lastPointer = useRef(0);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);

  // Pointer events cover mouse and touch, so the eyes follow a finger on the phone too.
  useEffect(() => {
    if (!trackCursor) return;
    function onMove(e: PointerEvent) {
      const el = containerRef.current;
      if (!el) return;
      lastPointer.current = Date.now();
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.hypot(dx, dy) || 1;
      const maxPull = 3.2 * motion_.pull; // px of pupil travel at the clamp
      const pull = Math.min(maxPull, distance / 40);
      setGaze({ x: (dx / distance) * pull, y: (dy / distance) * pull });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, [trackCursor, motion_.pull]);

  // With no pointer activity (typical on a phone) the eyes glance around now and then so it feels alive.
  useEffect(() => {
    if (state !== 'idle') return;
    const id = setInterval(() => {
      if (Date.now() - lastPointer.current < 4000) return;
      const r = 3 * motion_.pull;
      setGaze(Math.random() < 0.4 ? { x: 0, y: 0 } : { x: (Math.random() * 2 - 1) * r, y: (Math.random() * 2 - 1) * r * 0.5 });
    }, 2600);
    return () => clearInterval(id);
  }, [state, motion_.pull]);

  useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);

  function handlePress() {
    const now = Date.now();
    const next: Reaction = now - lastTap.current < 450 ? 'love' : 'happy';
    lastTap.current = now;
    setReaction(next);
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(null), next === 'love' ? 2200 : 1100);
    onPress?.();
  }

  // Idle blink: a natural, irregular interval rather than a fixed loop, so two avatars on
  // screen at once don't blink in visible lockstep. Interval scales inversely with blinkSpeed.
  // Mood states blink too (slower for focused, per the mood's own cadence below), so the blink
  // loop runs for idle/listening/focused/overwhelmed/settled, not just idle/listening.
  useEffect(() => {
    if (state !== 'idle' && state !== 'listening' && state !== 'focused' && state !== 'overwhelmed' && state !== 'settled') return;
    let cancelled = false;
    const moodBlinkScale = state === 'focused' ? 0.6 : 1; // ~40% slower blink interval when focused
    function scheduleBlink() {
      const delay = (2600 + Math.random() * 3200) / (motion_.blinkSpeed * moodBlinkScale);
      setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        setTimeout(() => {
          if (!cancelled) setBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    }
    scheduleBlink();
    return () => {
      cancelled = true;
    };
  }, [state, motion_.blinkSpeed]);

  const width = size;
  const height = size * 0.62; // capsule proportions matching the documented reference screenshot
  const isVoiceActive = state === 'listening' || state === 'thinking' || state === 'speaking';
  const glowColor =
    state === 'error' ? '#ef4444' : state === 'success' ? '#f97316' : isVoiceActive ? eyeColor : moodColor ?? eyeColor;
  const mood: Mood | undefined =
    state === 'focused' || state === 'overwhelmed' || state === 'settled' ? state : undefined;

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={handlePress}
      role="button"
      aria-label="Assistant avatar"
      style={{ width, height: height + 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}
    >
      <motion.div
        style={{
          width,
          height,
          borderRadius: height / 2,
          background: pillColor,
          position: 'relative',
          boxShadow: `0 8px 24px -8px ${pillColor}99, inset 0 1px 1px rgba(255,255,255,0.06)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: width * 0.14,
        }}
        animate={
          state === 'listening'
            ? { scale: [1, 1.04, 1] }
            : state === 'thinking'
              ? { rotate: [0, -1.5, 1.5, 0] }
              : state === 'overwhelmed'
                ? { scale: [1, 1.015, 1] }
                : state === 'settled'
                  ? { scale: [1, 1.01, 1] }
                  : { scale: 1, rotate: 0 }
        }
        transition={
          state === 'listening'
            ? { duration: 1.1 / motion_.animSpeed, repeat: Infinity, ease: 'easeInOut' }
            : state === 'thinking'
              ? { duration: 1.6 / motion_.animSpeed, repeat: Infinity, ease: 'easeInOut' }
              : state === 'overwhelmed'
                ? { duration: 2.2 / motion_.animSpeed, repeat: Infinity, ease: 'easeInOut' } // listening pulse at ~0.5x speed
                : state === 'settled'
                  ? { duration: 3.4 / motion_.animSpeed, repeat: Infinity, ease: 'easeInOut' } // slower, calmer cadence than overwhelmed
                  : { type: 'spring', stiffness: 300, damping: 20 }
        }
      >
        {state === 'error' ? (
          <ErrorEyes color={glowColor} size={height} />
        ) : state === 'success' || reaction === 'love' ? (
          <HeartEyes color={glowColor} size={height} />
        ) : reaction === 'happy' ? (
          <HappyEyes color={glowColor} size={height} />
        ) : (
          <>
            {[0, 1].map((i) => (
              <Eye
                key={i}
                color={glowColor}
                size={height}
                gaze={gaze}
                blinking={blinking}
                wide={state === 'listening'}
                talking={state === 'speaking'}
                talkSpeed={motion_.animSpeed}
                offset={i * 0.07}
                mood={mood}
              />
            ))}
          </>
        )}

        {state === 'thinking' && <ThinkingDots color={glowColor} pillHeight={height} />}
      </motion.div>
    </div>
  );
}

function Eye({
  color,
  size,
  gaze,
  blinking,
  wide,
  talking,
  talkSpeed,
  offset,
  mood,
}: {
  color: string;
  size: number;
  gaze: { x: number; y: number };
  blinking: boolean;
  wide: boolean;
  talking: boolean;
  talkSpeed: number;
  offset: number;
  mood?: Mood;
}) {
  // Mood adjustments to the base geometry (design doc Global Constraints):
  // - focused: narrower (eyeWidth * 0.85), slightly taller resting height, glow boosted.
  // - overwhelmed: shorter resting height (eyeHeight * 0.75), dimmed glow (alpha reduced) —
  //   kept visually distinct from error's X-eyes (no strikethrough, just a softer, shorter eye).
  // - settled: extra glow radius, calm (no height change beyond the base).
  const widthScale = mood === 'focused' ? 0.85 : 1;
  const restHeight = mood === 'focused' ? size * 0.44 : mood === 'overwhelmed' ? size * 0.3 : size * 0.4;
  const eyeWidth = size * 0.16 * widthScale;
  const eyeHeight = blinking ? size * 0.04 : wide ? size * 0.48 : restHeight;
  const h = size * 0.4;
  const glowBlur = mood === 'settled' ? size * 0.26 : size * 0.18;
  const glowAlpha = mood === 'overwhelmed' ? '55' : 'aa';
  // A hex alpha suffix (e.g. "#ffffffaa") is only valid CSS when `color` is itself hex —
  // appending it to an hsl(...)/rgb(...) string (moodColor's format) produces an invalid
  // color value that gets silently dropped, losing the glow entirely.
  const shadowColor = color.startsWith('#') ? `${color}${glowAlpha}` : color;
  return (
    <motion.div
      style={{
        width: eyeWidth,
        borderRadius: eyeWidth / 2,
        background: color,
        boxShadow: `0 0 ${glowBlur}px ${shadowColor}`,
      }}
      animate={
        talking
          ? { height: [h, h * 1.3, h * 0.8, h * 1.2, h * 0.9, h], x: gaze.x, y: gaze.y }
          : { height: eyeHeight, x: gaze.x, y: gaze.y }
      }
      transition={
        talking
          ? { height: { duration: 0.9 / talkSpeed, repeat: Infinity, ease: 'easeInOut', delay: offset }, x: { type: 'spring', stiffness: 220, damping: 18 }, y: { type: 'spring', stiffness: 220, damping: 18 } }
          : { height: { duration: 0.1 }, x: { type: 'spring', stiffness: 220, damping: 18 }, y: { type: 'spring', stiffness: 220, damping: 18 } }
      }
    />
  );
}

function HappyEyes({ color, size }: { color: string; size: number }) {
  const w = size * 0.3;
  return (
    <div style={{ display: 'flex', gap: size * 0.14 }}>
      {[0, 1].map((i) => (
        <svg key={i} width={w} height={w * 0.7} viewBox="0 0 24 16" style={{ overflow: 'visible', filter: `drop-shadow(0 0 5px ${color}aa)` }}>
          <path d="M3 14 Q12 0 21 14" fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

function HeartEyes({ color, size }: { color: string; size: number }) {
  const s = size * 0.3;
  return (
    <div style={{ display: 'flex', gap: size * 0.14 }}>
      {[0, 1].map((i) => (
        <svg key={i} width={s} height={s} viewBox="0 0 24 24" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }}>
          <path d="M12 21s-7.5-4.6-10-9.3C.4 8.2 2.3 4.5 6 4.5c2 0 3.5 1 4.5 2.5C11.5 5.5 13 4.5 15 4.5c3.7 0 5.6 3.7 4 7.2C19.5 16.4 12 21 12 21z" />
        </svg>
      ))}
    </div>
  );
}

function ErrorEyes({ color, size }: { color: string; size: number }) {
  const w = size * 0.18;
  return (
    <div style={{ display: 'flex', gap: size * 0.14 }}>
      {[0, 1].map((i) => (
        <svg key={i} width={w} height={w} viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
          <line x1="3" y1="3" x2="21" y2="21" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="21" y1="3" x2="3" y2="21" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

function ThinkingDots({ color, pillHeight }: { color: string; pillHeight: number }) {
  return (
    <div style={{ position: 'absolute', bottom: -pillHeight * 0.22, display: 'flex', gap: pillHeight * 0.08 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{ width: pillHeight * 0.1, height: pillHeight * 0.1, borderRadius: '50%', background: color }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
