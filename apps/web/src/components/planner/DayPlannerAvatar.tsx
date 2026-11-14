import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { RivaAvatar, type RivaAvatarState } from '@/components/riva/RivaAvatar';
import { useRiva } from '@/hooks/useRiva';
import { useRhythmOrbContext } from '@/contexts/RhythmOrbContext';

interface DayPlannerAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 96, md: 160, lg: 192 };

/**
 * Drop-in replacement for the old `<RhythmOrb size="md" />` on DayPlanner's home screen,
 * rendering RivaAvatar instead while carrying over RhythmOrb's interaction logic verbatim:
 * hold-to-talk (500ms threshold), tap-to-open-command-bar, and mic-level-reactive listening.
 * This is the home screen's only voice entry point (RivaMic is deliberately hidden here).
 *
 * State priority (approved design): voice state (useRiva) wins whenever active; otherwise the
 * RhythmOrbContext mood (focused/overwhelmed/settled, neutral->idle) shows at rest.
 */
export function DayPlannerAvatar({ size = 'md', className = '' }: DayPlannerAvatarProps) {
  const { currentState, dayColors, getTooltipMessage, isTransitioning } = useRhythmOrbContext();
  const { isListening, isProcessing, startListening, stopListening, setIsCommandBarOpen } = useRiva();

  const [showTooltip, setShowTooltip] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pointerDownTime = useRef<number>(0);
  const pointerDownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ported verbatim from RhythmOrb.tsx: live mic-level tracking while listening, used to scale
  // the avatar's listening pulse. Kept even though RivaAvatar doesn't yet read audioLevel —
  // preserved so a future RivaAvatar audio-reactive prop has real data to consume, matching the
  // design doc's "carry over the interaction logic, not just the look" requirement.
  function startAudioTracking() {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setAudioLevel(Math.min(sum / (dataArray.length * 128), 1));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        console.error('[DayPlannerAvatar] Audio tracking failed:', err);
      }
    })();
  }

  function stopAudioTracking() {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setAudioLevel(0);
  }

  // Ported verbatim from RhythmOrb.tsx: react to the *shared* isListening flag (not just this
  // component's own pointer handlers) so mic-level tracking starts/stops for ANY source that
  // flips listening state (e.g. RivaCommandBar's independent mic toggle), and so the cleanup
  // unconditionally tears down the mic/AudioContext on unmount even if listening never stopped
  // via pointerup/pointerleave (e.g. navigating away mid-hold via AnimatePresence).
  useEffect(() => {
    if (isListening) {
      startAudioTracking();
    } else {
      stopAudioTracking();
    }
    return () => {
      stopAudioTracking();
    };
  }, [isListening]);

  const handlePointerDown = () => {
    pointerDownTime.current = Date.now();
    pointerDownTimerRef.current = setTimeout(() => {
      if (!isListening) {
        startListening();
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
      }
    }, 500);
  };

  const handlePointerUp = () => {
    if (pointerDownTimerRef.current) {
      clearTimeout(pointerDownTimerRef.current);
      pointerDownTimerRef.current = null;
    }
    const holdDuration = Date.now() - pointerDownTime.current;
    if (holdDuration > 500) {
      if (isListening) {
        stopListening();
      }
    } else {
      setIsCommandBarOpen(true);
      if (isListening) {
        stopListening();
      }
    }
    pointerDownTime.current = 0;
  };

  const handlePointerLeave = () => {
    if (pointerDownTimerRef.current) {
      clearTimeout(pointerDownTimerRef.current);
      pointerDownTimerRef.current = null;
    }
    if (pointerDownTime.current > 0 && isListening) {
      const holdDuration = Date.now() - pointerDownTime.current;
      if (holdDuration > 500) {
        stopListening();
      }
      pointerDownTime.current = 0;
    }
  };

  // Priority rule: voice state wins whenever active; mood shows only at rest.
  const state: RivaAvatarState = isListening
    ? 'listening'
    : isProcessing
      ? 'thinking'
      : currentState === 'neutral'
        ? 'idle'
        : currentState;

  const moodColor = dayColors.length > 0 ? `hsl(${dayColors[0]})` : undefined;

  return (
    <div
      className={`relative inline-flex ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <RivaAvatar state={state} size={SIZE_PX[size]} moodColor={moodColor} trackCursor={false} />

      <AnimatePresence>
        {(showTooltip || isListening || isProcessing) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 5 }}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-max"
          >
            <div className="px-5 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/5 shadow-2xl">
              <span className="text-[11px] uppercase tracking-widest font-bold text-white flex items-center gap-3">
                {isListening ? (
                  <div className="flex gap-1 h-3 items-end">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-primary"
                        animate={{ height: ['20%', `${20 + audioLevel * 80}%`, '20%'] }}
                        transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                    <span className="ml-1">Listening</span>
                  </div>
                ) : isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" /> Riva Thinking
                  </span>
                ) : (
                  getTooltipMessage()
                )}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
