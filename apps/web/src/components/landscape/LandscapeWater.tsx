import { motion } from 'framer-motion';
import { WaterState } from '@/types/landscape';

interface LandscapeWaterProps {
  waterState: WaterState;
  hasStream?: boolean;
  hasPond?: boolean;
}

export function LandscapeWater({ waterState, hasStream, hasPond }: LandscapeWaterProps) {
  const rippleIntensity = {
    still: 0,
    rippling: 0.5,
    flowing: 1,
  };

  return (
    <div className="absolute inset-x-0 bottom-0 h-24 overflow-hidden">
      {/* Base water reflection */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, hsl(200 40% 50% / 0.15) 100%)',
        }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Pond */}
      {hasPond && (
        <motion.div
          className="absolute bottom-4 left-1/4 w-32 h-12 rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(200 45% 45% / 0.4) 0%, hsl(200 40% 40% / 0.2) 60%, transparent 100%)',
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
          }}
          transition={{ duration: 2 }}
        >
          {/* Pond ripples */}
          {waterState !== 'still' && [...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-white/10"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 1.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Stream */}
      {hasStream && (
        <svg
          viewBox="0 0 200 30"
          className="absolute bottom-2 left-0 w-full h-8"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M -20 15 Q 30 10, 60 15 T 120 15 T 180 15 T 240 15"
            stroke="hsl(200 50% 55% / 0.3)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            animate={{
              d: waterState === 'flowing' 
                ? [
                    "M -20 15 Q 30 10, 60 15 T 120 15 T 180 15 T 240 15",
                    "M -20 15 Q 30 20, 60 15 T 120 15 T 180 15 T 240 15",
                    "M -20 15 Q 30 10, 60 15 T 120 15 T 180 15 T 240 15",
                  ]
                : "M -20 15 Q 30 15, 60 15 T 120 15 T 180 15 T 240 15",
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Stream shimmer */}
          <motion.path
            d="M -20 15 Q 30 10, 60 15 T 120 15 T 180 15 T 240 15"
            stroke="hsl(200 60% 70% / 0.2)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            animate={{
              strokeDashoffset: [0, -100],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
            strokeDasharray="10 20"
          />
        </svg>
      )}

      {/* Ambient water reflections */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-white/10"
          style={{
            bottom: `${8 + i * 4}px`,
            left: `${10 + i * 15}%`,
            width: `${20 + (i % 3) * 10}px`,
          }}
          animate={{
            opacity: [0.1, 0.3, 0.1],
            scaleX: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
