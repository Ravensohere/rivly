import { motion } from 'framer-motion';

interface SleepBackgroundProps {
  isWindDown?: boolean;
}

export function SleepBackground({ isWindDown = false }: SleepBackgroundProps) {
  const duration = isWindDown ? 30 : 20;
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Light Dusk Mode - Warm Sand → Moonlight Blue gradient */}
      <div 
        className={`absolute inset-0 transition-all duration-[3000ms] ${
          isWindDown 
            ? 'bg-gradient-to-b from-[hsl(38,30%,94%)] via-[hsl(260,28%,92%)] to-[hsl(220,35%,88%)]'
            : 'bg-gradient-to-b from-[hsl(38,35%,95%)] via-[hsl(260,25%,94%)] to-[hsl(220,30%,92%)]'
        }`}
      />
      
      {/* Slow-moving dusk glow layer 1 */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(ellipse 80% 50% at 20% 30%, hsl(260 35% 85% / 0.4) 0%, transparent 60%)',
            'radial-gradient(ellipse 80% 50% at 60% 40%, hsl(220 40% 85% / 0.4) 0%, transparent 60%)',
            'radial-gradient(ellipse 80% 50% at 40% 60%, hsl(235 35% 85% / 0.4) 0%, transparent 60%)',
            'radial-gradient(ellipse 80% 50% at 20% 30%, hsl(260 35% 85% / 0.4) 0%, transparent 60%)',
          ],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Slow-moving dusk glow layer 2 */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(ellipse 60% 40% at 70% 70%, hsl(235 30% 88% / 0.35) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 30% 50%, hsl(260 35% 86% / 0.35) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 50% 30%, hsl(220 30% 88% / 0.35) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 40% at 70% 70%, hsl(235 30% 88% / 0.35) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: duration * 1.3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />
      
      {/* Subtle soft light particles */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 60}%`,
              background: 'linear-gradient(135deg, hsl(260 40% 75% / 0.3), hsl(220 45% 70% / 0.2))',
            }}
            animate={{
              opacity: [0.15, 0.4, 0.15],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>
      
      {/* Moon glow (subtle, light version) */}
      <motion.div
        className="absolute top-12 right-10 w-28 h-28"
        animate={{
          opacity: isWindDown ? [0.35, 0.55, 0.35] : [0.25, 0.4, 0.25],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div 
          className="w-full h-full rounded-full animate-moon-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(220 45% 90% / 0.8) 0%, hsl(235 40% 85% / 0.4) 40%, transparent 70%)',
          }}
        />
      </motion.div>
    </div>
  );
}