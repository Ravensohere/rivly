import { motion } from 'framer-motion';
import { SkyState, LightState, WaterState } from '@/types/landscape';

interface LandscapeBackgroundProps {
  skyState: SkyState;
  lightState: LightState;
  waterState: WaterState;
}

const SKY_GRADIENTS: Record<SkyState, string[]> = {
  cloudy: ['hsl(220 20% 30%)', 'hsl(220 15% 45%)', 'hsl(200 20% 55%)'],
  clearing: ['hsl(215 35% 35%)', 'hsl(200 40% 50%)', 'hsl(180 35% 60%)'],
  clear: ['hsl(210 50% 45%)', 'hsl(195 55% 55%)', 'hsl(175 45% 65%)'],
  golden: ['hsl(35 60% 50%)', 'hsl(45 50% 60%)', 'hsl(180 40% 65%)'],
};

const LIGHT_OPACITY: Record<LightState, number> = {
  dim: 0.1,
  soft: 0.2,
  warm: 0.35,
  radiant: 0.5,
};

export function LandscapeBackground({ skyState, lightState, waterState }: LandscapeBackgroundProps) {
  const colors = SKY_GRADIENTS[skyState];
  const lightOpacity = LIGHT_OPACITY[lightState];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
        }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />

      {/* Light orb - sun/moon effect */}
      <motion.div
        className="absolute w-48 h-48 rounded-full"
        style={{
          left: '60%',
          top: '15%',
          background: lightState === 'radiant' 
            ? 'radial-gradient(circle, hsl(45 80% 85%) 0%, hsl(45 60% 70% / 0) 70%)'
            : 'radial-gradient(circle, hsl(45 40% 90% / 0.6) 0%, hsl(45 40% 90% / 0) 70%)',
        }}
        animate={{
          opacity: lightOpacity,
          scale: [1, 1.05, 1],
        }}
        transition={{
          scale: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
          opacity: { duration: 2 },
        }}
      />

      {/* Ambient glow */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: `linear-gradient(180deg, transparent 0%, hsl(var(--primary) / ${lightOpacity * 0.3}) 100%)`,
        }}
        animate={{
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Mist layers */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, hsl(0 0% 100% / 0.05) 100%)',
        }}
        animate={{
          opacity: waterState === 'still' ? 0.2 : 0.4,
          x: [-20, 20, -20],
        }}
        transition={{
          x: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
          opacity: { duration: 2 },
        }}
      />

      {/* Stars (visible in dim/soft light) */}
      {(lightState === 'dim' || lightState === 'soft') && (
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white/40"
              style={{
                left: `${10 + (i * 17) % 80}%`,
                top: `${5 + (i * 13) % 40}%`,
              }}
              animate={{
                opacity: [0.2, 0.6, 0.2],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3 + (i % 3),
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
