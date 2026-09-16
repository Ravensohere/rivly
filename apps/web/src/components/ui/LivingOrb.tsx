import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LivingOrbProps {
  state?: 'idle' | 'active' | 'overwhelmed' | 'bloom' | 'rest';
  onInteraction?: () => void;
  className?: string;
}

export function LivingOrb({ state = 'idle', onInteraction, className = '' }: LivingOrbProps) {
  const [showBloom, setShowBloom] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  // Trigger bloom animation when state changes to 'bloom'
  useEffect(() => {
    if (state === 'bloom') {
      setShowBloom(true);
      const timer = setTimeout(() => setShowBloom(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleTap = () => {
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 800);
    onInteraction?.();
  };

  const getBreathingSpeed = () => {
    switch (state) {
      case 'active': return 2.5;
      case 'overwhelmed': return 6;
      case 'rest': return 8;
      default: return 4;
    }
  };

  const getGlowIntensity = () => {
    switch (state) {
      case 'active': return 0.4;
      case 'bloom': return 0.6;
      case 'overwhelmed': return 0.15;
      case 'rest': return 0.2;
      default: return 0.25;
    }
  };

  return (
    <motion.div 
      className={`relative w-40 h-40 ${className}`}
      onClick={handleTap}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Outer breathing ring 1 */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary) / ${getGlowIntensity() * 0.3}) 0%, transparent 70%)`,
        }}
        animate={{
          scale: state === 'overwhelmed' ? [1, 1.08, 1] : [1, 1.15, 1],
          opacity: [0.4, 0.15, 0.4],
        }}
        transition={{
          duration: getBreathingSpeed() + 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Outer breathing ring 2 */}
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary) / ${getGlowIntensity() * 0.5}) 0%, transparent 60%)`,
        }}
        animate={{
          scale: state === 'overwhelmed' ? [1, 1.05, 1] : [1, 1.1, 1],
          opacity: [0.5, 0.2, 0.5],
        }}
        transition={{
          duration: getBreathingSpeed() + 1,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Main orb body */}
      <motion.div
        className="absolute inset-4 rounded-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at 35% 35%, 
            hsl(var(--primary) / ${getGlowIntensity()}) 0%, 
            hsl(var(--primary) / ${getGlowIntensity() * 0.5}) 40%, 
            hsl(var(--secondary) / ${getGlowIntensity() * 0.3}) 70%, 
            hsl(var(--primary) / ${getGlowIntensity() * 0.15}) 100%)`,
          boxShadow: `inset 0 0 30px -5px hsl(var(--primary) / ${getGlowIntensity() * 0.5})`,
        }}
        animate={{
          scale: state === 'overwhelmed' ? [1, 1.01, 1] : [1, 1.03, 1],
        }}
        transition={{
          duration: getBreathingSpeed(),
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner highlight (top-left shine) */}
        <motion.div
          className="absolute top-4 left-4 w-1/3 h-1/4 rounded-full blur-sm"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--background) / 0.5) 0%, transparent 70%)',
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Center pulse */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            className="w-1/2 h-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle, hsl(var(--primary) / ${getGlowIntensity() * 0.8}) 0%, transparent 60%)`,
            }}
            animate={{
              opacity: state === 'active' ? [0.6, 0.9, 0.6] : [0.4, 0.7, 0.4],
              scale: [0.9, 1.05, 0.9],
            }}
            transition={{
              duration: getBreathingSpeed() - 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </motion.div>

      {/* Ripple effect on interaction */}
      <AnimatePresence>
        {showRipple && (
          <motion.div
            className="absolute inset-4 rounded-full"
            style={{
              border: '2px solid hsl(var(--primary) / 0.4)',
            }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Bloom effect */}
      <AnimatePresence>
        {showBloom && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, hsl(var(--secondary) / 0.3) 0%, transparent 60%)`,
                }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2 + i * 0.3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 1.5, 
                  delay: i * 0.2,
                  ease: 'easeOut' 
                }}
              />
            ))}
            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-secondary"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{
                  x: Math.cos((i / 6) * Math.PI * 2) * 80,
                  y: Math.sin((i / 6) * Math.PI * 2) * 80,
                  scale: [0, 1, 0.5],
                  opacity: [0.8, 0.6, 0],
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.3 + i * 0.08,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Ambient particles for active state */}
      {state === 'active' && (
        <>
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/30"
              style={{
                top: '50%',
                left: '50%',
              }}
              animate={{
                x: [0, Math.cos((i / 4) * Math.PI * 2 + Date.now() / 3000) * 50],
                y: [0, Math.sin((i / 4) * Math.PI * 2 + Date.now() / 3000) * 50],
                opacity: [0, 0.6, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}
