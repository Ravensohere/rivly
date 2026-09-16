import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  mode?: 'normal' | 'calm' | 'overwhelmed';
}

export function AnimatedBackground({ mode = 'normal' }: AnimatedBackgroundProps) {
  const getSpeed = () => {
    switch (mode) {
      case 'calm': return 1.5; // Slower during wind-down
      case 'overwhelmed': return 0.5; // Much slower during overwhelm
      default: return 1;
    }
  };

  const speed = getSpeed();

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <motion.div 
        className="absolute inset-0"
        style={{ background: 'var(--gradient-calm)' }}
        animate={mode === 'overwhelmed' ? {
          opacity: [1, 0.95, 1],
        } : {}}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Animated gradient blob 1 - Primary accent */}
      <motion.div
        className="absolute top-0 -left-1/4 w-1/2 h-1/2 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
          opacity: mode === 'overwhelmed' ? 0.15 : 0.3,
        }}
        animate={{
          x: [0, 60, 0],
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25 / speed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Animated gradient blob 2 - Secondary accent */}
      <motion.div
        className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--secondary) / 0.35) 0%, transparent 70%)',
          opacity: mode === 'overwhelmed' ? 0.1 : 0.2,
        }}
        animate={{
          x: [0, -50, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 30 / speed,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 8,
        }}
      />

      {/* Third blob - Center warmth */}
      <motion.div
        className="absolute top-1/3 left-1/3 w-1/3 h-1/3 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 60%)',
          opacity: mode === 'overwhelmed' ? 0.05 : 0.15,
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 35 / speed,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 4,
        }}
      />
      
      {/* Very slow moving gradient overlay for subtle depth */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'linear-gradient(135deg, hsl(var(--primary) / 0.015) 0%, transparent 40%, hsl(var(--secondary) / 0.015) 100%)',
            'linear-gradient(180deg, hsl(var(--primary) / 0.02) 0%, transparent 50%, hsl(var(--secondary) / 0.01) 100%)',
            'linear-gradient(225deg, hsl(var(--primary) / 0.015) 0%, transparent 40%, hsl(var(--secondary) / 0.02) 100%)',
            'linear-gradient(270deg, hsl(var(--primary) / 0.02) 0%, transparent 50%, hsl(var(--secondary) / 0.015) 100%)',
            'linear-gradient(315deg, hsl(var(--primary) / 0.015) 0%, transparent 40%, hsl(var(--secondary) / 0.015) 100%)',
            'linear-gradient(135deg, hsl(var(--primary) / 0.015) 0%, transparent 40%, hsl(var(--secondary) / 0.015) 100%)',
          ],
        }}
        transition={{
          duration: 60 / speed,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
