
import { motion, AnimatePresence } from 'framer-motion';
import { useRhythmOrbContext } from '@/contexts/RhythmOrbContext';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useRiva } from '@/hooks/useRiva';
import { Loader2 } from 'lucide-react';

interface RhythmOrbProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function RhythmOrb({ className = '', size = 'md', onClick }: RhythmOrbProps) {
  const location = useLocation();
  const { currentState, getTooltipMessage, isTransitioning, dayColors } = useRhythmOrbContext();
  const { isListening, isProcessing, startListening, stopListening, setIsCommandBarOpen } = useRiva();
  
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pointerDownTime = useRef<number>(0);
  const pointerDownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // SINGLE ORB RULE: Only render on Day (Home) screen
  const isDayScreen = location.pathname === '/' || location.pathname === '/day' || location.pathname === '/app';

  // Audio level tracking for listening state
  useEffect(() => {
    if (isListening && isDayScreen) {
      const startAudioTracking = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContext();
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
          console.error('[RhythmOrb] Audio tracking failed:', err);
        }
      };
      startAudioTracking();
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      audioContextRef.current = null; analyserRef.current = null; streamRef.current = null;
      setAudioLevel(0);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [isListening, isDayScreen]);

  if (!isDayScreen) {
    return null;
  }

  // State-aware colors: Green/Blue = Balanced/Flow; Orange/Red = Overloaded/Drained
  const getGradient = (intensity: number) => {
    if (dayColors && dayColors.length > 0) {
      return `radial-gradient(circle at 35% 35%, 
        hsl(${dayColors[0]} / ${intensity}) 0%, 
        hsl(${dayColors[1] || dayColors[0]} / ${intensity * 0.8}) 40%, 
        hsl(var(--secondary) / ${intensity * 0.6}) 100%)`;
    }

    // Overloaded/Drained → orange/red
    if (currentState === 'overwhelmed') {
      return `radial-gradient(circle at 35% 35%, 
        hsl(10 85% 55% / ${intensity}) 0%, 
        hsl(25 90% 50% / ${intensity * 0.8}) 50%, 
        hsl(var(--background) / ${intensity * 0.6}) 100%)`;
    }

    // Settled → muted, calm
    if (currentState === 'settled') {
      return `radial-gradient(circle at 35% 35%, 
        hsl(220 15% 45% / ${intensity}) 0%, 
        hsl(220 10% 40% / ${intensity * 0.8}) 50%, 
        hsl(var(--secondary) / ${intensity * 0.6}) 100%)`;
    }

    // Balanced/Flow (neutral + focused) → green/blue
    if (currentState === 'focused') {
      return `radial-gradient(circle at 35% 35%, 
        hsl(165 55% 42% / ${intensity}) 0%, 
        hsl(200 65% 48% / ${intensity * 0.85}) 50%, 
        hsl(var(--secondary) / ${intensity * 0.6}) 100%)`;
    }

    // Neutral / Idle → soft green-blue
    return `radial-gradient(circle at 35% 35%, 
      hsl(200 60% 50% / ${intensity}) 0%, 
      hsl(165 45% 48% / ${intensity * 0.8}) 40%, 
      hsl(var(--secondary) / ${intensity * 0.6}) 100%)`;
  };

  const getGlowIntensity = () => {
    if (isListening || isProcessing) return 0.9;
    switch (currentState) {
      case 'neutral': return 0.5; // Increased for better visibility
      case 'focused': return 0.7;
      case 'overwhelmed': return 0.4;
      case 'settled': return 0.3;
      default: return 0.5;
    }
  };

  const getScaleRange = () => {
    if (isListening) {
      const dynamicScale = 1.1 + (audioLevel * 0.25);
      return [dynamicScale, dynamicScale, dynamicScale];
    }
    if (isProcessing) return [0.95, 1.05, 0.95];
    switch (currentState) {
      case 'neutral': return [1, 1.05, 1];
      case 'focused': return [1.05, 1.1, 1.05];
      case 'overwhelmed': return [1, 1.02, 1]; 
      case 'settled': return [1, 1, 1];
      default: return [1, 1.05, 1];
    }
  };

  const getBreathingSpeed = () => {
    if (isListening) return 0.1; 
    if (isProcessing) return 0.8;
    switch (currentState) {
      case 'neutral': return 4;
      case 'focused': return 2;
      case 'overwhelmed': return 0.5;
      case 'settled': return 8;
      default: return 4;
    }
  };

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-48 h-48',
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownTime.current = Date.now();
    pointerDownTimerRef.current = setTimeout(() => {
      if (!isListening) {
        startListening();
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
      }
    }, 500);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerDownTimerRef.current) {
        clearTimeout(pointerDownTimerRef.current);
        pointerDownTimerRef.current = null;
    }

    const holdDuration = Date.now() - pointerDownTime.current;
    if (holdDuration > 500) {
      if (isListening) stopListening();
    } else {
      setIsCommandBarOpen(true);
      if (isListening) stopListening(); // Just in case
    }
    
    pointerDownTime.current = 0;
    if (onClick) onClick();
  };

  const handlePointerLeave = () => {
    if (pointerDownTimerRef.current) {
        clearTimeout(pointerDownTimerRef.current);
        pointerDownTimerRef.current = null;
    }
    // If they drag their finger off the button while holding, stop listening
    if (pointerDownTime.current > 0 && isListening) {
       const holdDuration = Date.now() - pointerDownTime.current;
       if (holdDuration > 500) {
           stopListening();
       }
       pointerDownTime.current = 0;
    }
  };

  const handleInteraction = () => {
    // Fallback for simple click 
    if (pointerDownTime.current === 0) { 
      setIsCommandBarOpen(true);
      if (onClick) onClick();
    }
  };

  return (
    <motion.div 
      className={`relative ${sizeClasses[size]} ${className} group cursor-pointer touch-none`}
      onClick={handleInteraction}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      whileTap={{ scale: 0.95 }}
    >
      {/* 2. OUTER ATMOSPHERIC RADIANCE */}
      <motion.div
        className="absolute -inset-8 rounded-full pointer-events-none opacity-30 blur-2xl mix-blend-plus-lighter"
        animate={{
          scale: isListening ? [1, 1.2, 1] : [1, 1.05, 1],
          opacity: isListening ? [0.2, 0.4, 0.2] : 0.2,
          background: isListening
            ? `radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)`
            : `radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 60%)`,
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* 3. MAIN ORB BODY */}
      <motion.div
        className="absolute inset-4 rounded-full overflow-hidden flex items-center justify-center p-8"
        style={{
          background: getGradient(getGlowIntensity()),
          boxShadow: isListening 
             ? `inset 0 0 ${40 + audioLevel * 20}px -5px hsl(var(--primary) / 0.8)`
             : `inset 0 0 30px -5px hsl(var(--primary) / 0.5)`,
          filter: (dayColors.length > 1 || isListening) ? 'blur(4px)' : 'blur(1px)',
        }}
        animate={{
          scale: getScaleRange(),
          // ROTATING WATER ORB
          rotate: [0, 360],
        }}
        transition={{
          scale: {
            duration: isListening ? 0.05 : getBreathingSpeed(),
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'linear',
          },
          rotate: {
            duration: isListening ? 8 : 15,
            repeat: Infinity,
            ease: 'linear',
          },
        }}
      >
        {/* Inner highlights for glassy/watery look */}
        {!isProcessing && (
          <motion.div
            className="absolute top-4 left-4 w-1/3 h-1/4 rounded-full blur-md"
            style={{
              background: 'radial-gradient(ellipse, hsl(var(--background) / 0.6) 0%, transparent 80%)',
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>

      {/* 5. TOOLTIP / STATUS */}
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
                      {[1,2,3,4].map(i => (
                          <motion.div 
                            key={i} 
                            className="w-0.5 bg-primary" 
                            animate={{ height: ['20%', '100%', '20%'] }} 
                            transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }} 
                          />
                      ))}
                      <span className="ml-1">Listening</span>
                   </div>
                ) : isProcessing ? (
                   <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin text-primary" /> Riva Thinking</span>
                ) : (
                   getTooltipMessage()
                )}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
