import { motion } from 'framer-motion';

interface AnimatedOrbProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'idle' | 'active' | 'calm' | 'complete';
  className?: string;
}

const sizeClasses = {
  sm: 'w-24 h-24',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
  xl: 'w-56 h-56',
};

export function AnimatedOrb({ size = 'lg', variant = 'idle', className = '' }: AnimatedOrbProps) {
  const isActive = variant === 'active';
  const isComplete = variant === 'complete';
  const isCalm = variant === 'calm';

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/5"
        animate={{
          scale: isActive ? [1, 1.3, 1] : isCalm ? [1, 1.15, 1] : [1, 1.2, 1],
          opacity: isActive ? [0.3, 0.1, 0.3] : [0.2, 0.08, 0.2],
        }}
        transition={{
          duration: isActive ? 2 : isCalm ? 6 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      <motion.div
        className="absolute inset-2 rounded-full bg-primary/8"
        animate={{
          scale: isActive ? [1, 1.2, 1] : isCalm ? [1, 1.1, 1] : [1, 1.15, 1],
          opacity: isActive ? [0.4, 0.15, 0.4] : [0.25, 0.1, 0.25],
        }}
        transition={{
          duration: isActive ? 2.5 : isCalm ? 7 : 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Main orb */}
      <motion.div
        className="absolute inset-4 rounded-full overflow-hidden"
        style={{
          background: isComplete 
            ? 'radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.4) 0%, hsl(var(--primary) / 0.2) 50%, hsl(var(--primary) / 0.1) 100%)'
            : 'radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.12) 50%, hsl(var(--primary) / 0.05) 100%)',
          boxShadow: 'inset 0 0 40px -10px hsl(var(--primary) / 0.2)',
        }}
        animate={{
          scale: isActive ? [1, 1.05, 1] : isCalm ? [1, 1.02, 1] : [1, 1.03, 1],
        }}
        transition={{
          duration: isActive ? 3 : isCalm ? 8 : 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner highlight */}
        <motion.div
          className="absolute top-4 left-4 w-1/3 h-1/3 rounded-full bg-primary/15 blur-sm"
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
        
        {/* Center glow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: isActive ? 2 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div 
            className="w-1/2 h-1/2 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            }}
          />
        </motion.div>
      </motion.div>

      {/* Floating particles for active state */}
      {isActive && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-primary/40"
              style={{
                top: '50%',
                left: '50%',
              }}
              animate={{
                x: [0, Math.cos((i / 6) * Math.PI * 2) * 60],
                y: [0, Math.sin((i / 6) * Math.PI * 2) * 60],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Completion bloom */}
      {isComplete && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.8, 1.5, 2],
          }}
          transition={{
            duration: 1.5,
            ease: 'easeOut',
          }}
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
}