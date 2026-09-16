import { motion } from 'framer-motion';
import { Waves, CalendarDays } from 'lucide-react';
import { useState } from 'react';

interface ViewToggleProps {
  viewMode: 'flow' | 'plan';
  onViewModeChange: (mode: 'flow' | 'plan') => void;
}

const E = [0.22, 1, 0.36, 1] as const;

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleModeChange = (mode: 'flow' | 'plan') => {
    if (mode !== viewMode) {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 400);
      onViewModeChange(mode);
    }
  };

  const iconSz  = 'clamp(0.8rem, 1.1vw, 1rem)';
  const labelFz = 'clamp(0.82rem, 1.05vw, 1rem)';
  const btnPad  = 'clamp(0.45rem, 0.8vh, 0.6rem) clamp(1.1rem, 2vw, 1.8rem)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.45, ease: E }}
      className="flex justify-center"
      style={{ padding: 'clamp(0.3rem, 0.6vh, 0.5rem) 0 clamp(0.7rem, 1.2vh, 1rem)' }}
    >
      {/* Pill container */}
      <div
        className="relative flex"
        style={{
          padding: '0.22rem',
          borderRadius: '999px',
          background: 'hsl(var(--muted) / 0.55)',
          border: '1px solid hsl(var(--border) / 0.4)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Animated active pill */}
        <motion.div
          className="absolute top-[0.22rem] bottom-[0.22rem] rounded-full"
          animate={{
            left:  viewMode === 'flow' ? '0.22rem' : 'calc(50% + 0.11rem)',
            right: viewMode === 'flow' ? 'calc(50% + 0.11rem)' : '0.22rem',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          style={{
            background: 'hsl(var(--card))',
            boxShadow: isTransitioning
              ? '0 2px 16px -2px hsl(235 35% 55% / 0.25), var(--shadow-soft)'
              : 'var(--shadow-soft)',
          }}
        />

        {/* Flow */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => handleModeChange('flow')}
          className="relative z-10 flex items-center gap-2 transition-colors duration-300"
          style={{ padding: btnPad, color: viewMode === 'flow' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
        >
          <motion.div animate={viewMode === 'flow' ? { rotate: [0, 8, -8, 0] } : {}} transition={{ duration: 0.5, delay: 0.1 }}>
            <Waves style={{ width: iconSz, height: iconSz }} />
          </motion.div>
          <span style={{ fontFamily: "Roboto, sans-serif", fontSize: labelFz, fontWeight: viewMode === 'flow' ? 600 : 400, letterSpacing: '-0.01em' }}>
            Flow
          </span>
        </motion.button>

        {/* Plan */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => handleModeChange('plan')}
          className="relative z-10 flex items-center gap-2 transition-colors duration-300"
          style={{ padding: btnPad, color: viewMode === 'plan' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
        >
          <motion.div animate={viewMode === 'plan' ? { rotate: [0, -8, 8, 0] } : {}} transition={{ duration: 0.5, delay: 0.1 }}>
            <CalendarDays style={{ width: iconSz, height: iconSz }} />
          </motion.div>
          <span style={{ fontFamily: "Roboto, sans-serif", fontSize: labelFz, fontWeight: viewMode === 'plan' ? 600 : 400, letterSpacing: '-0.01em' }}>
            Plan
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
