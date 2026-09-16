// Winddown Player - Full screen overlay with breathing animation

import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play, Check, Volume2 } from 'lucide-react';
import { useWinddownContext } from '@/contexts/WinddownContext';
import { getSoundById, SOUND_PACK_INFO } from '@/types/winddown';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect } from 'react';

interface WinddownPlayerProps {
  open: boolean;
  onClose: () => void;
}

export function WinddownPlayer({ open, onClose }: WinddownPlayerProps) {
  const { 
    activeSession, 
    isPlaying, 
    remainingSeconds,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
  } = useWinddownContext();
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [volume, setVolume] = useState(70);
  
  const sound = activeSession ? getSoundById(activeSession.soundId) : null;
  const packInfo = activeSession ? SOUND_PACK_INFO[activeSession.soundPack] : null;
  
  // Format time remaining
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Check for completion
  useEffect(() => {
    if (remainingSeconds === 0 && activeSession) {
      setShowCelebration(true);
      // Auto close after celebration
      setTimeout(() => {
        setShowCelebration(false);
        onClose();
      }, 3000);
    }
  }, [remainingSeconds, activeSession, onClose]);
  
  const handleComplete = () => {
    completeSession();
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      onClose();
    }, 2500);
  };
  
  const handleCancel = () => {
    cancelSession();
    onClose();
  };
  
  if (!open) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, hsl(230 25% 12%) 0%, hsl(260 20% 8%) 100%)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {/* Close button */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleCancel}
          className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <X className="w-5 h-5" />
        </motion.button>
        
        {showCelebration ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-primary/30 flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-12 h-12 text-primary" />
            </motion.div>
            <h2 className="text-white text-2xl font-semibold mb-2">Well done</h2>
            <p className="text-white/60">Wind-down complete. Rest well.</p>
          </motion.div>
        ) : (
          <>
            {/* Breathing Orb */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.6, 0.4],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div 
                className="w-80 h-80 rounded-full"
                style={{
                  background: 'radial-gradient(circle, hsl(235 40% 50% / 0.2) 0%, hsl(260 30% 40% / 0.1) 50%, transparent 70%)',
                }}
              />
            </motion.div>
            
            {/* Inner glowing orb */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.6, 0.8, 0.6],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
              className="relative"
            >
              <div 
                className="w-40 h-40 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle, hsl(235 45% 55% / 0.4) 0%, hsl(260 35% 45% / 0.2) 60%, transparent 100%)',
                  boxShadow: '0 0 60px 20px hsl(235 40% 50% / 0.2)',
                }}
              >
                <span className="text-5xl">{sound?.icon || packInfo?.icon}</span>
              </div>
            </motion.div>
            
            {/* Time Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-10 text-center"
            >
              <p className="text-white/50 text-sm mb-1">{sound?.name}</p>
              <p className="text-white text-5xl font-light tracking-wider">{timeDisplay}</p>
            </motion.div>
            
            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex items-center gap-4"
            >
              <button
                onClick={isPlaying ? pauseSession : resumeSession}
                className="w-16 h-16 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
              </button>
            </motion.div>
            
            {/* Volume Slider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 w-64 flex items-center gap-3"
            >
              <Volume2 className="w-4 h-4 text-white/50" />
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                max={100}
                step={1}
                className="flex-1"
              />
            </motion.div>
            
            {/* End Early Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute bottom-8 left-0 right-0 px-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            >
              <Button
                onClick={handleComplete}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Check className="w-4 h-4 mr-2" />
                End & Save
              </Button>
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
