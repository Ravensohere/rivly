import { motion } from 'framer-motion';

interface LandscapeGroundProps {
  hasGrassDetails?: boolean;
}

export function LandscapeGround({ hasGrassDetails = true }: LandscapeGroundProps) {
  return (
    <div className="absolute inset-x-0 bottom-0">
      {/* Main ground layer */}
      <svg
        viewBox="0 0 100 20"
        className="w-full h-16"
        preserveAspectRatio="none"
      >
        {/* Rolling hills */}
        <motion.path
          d="M 0 20 L 0 12 Q 15 6, 30 10 T 60 8 T 85 11 T 100 9 L 100 20 Z"
          fill="hsl(150 25% 25%)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        <motion.path
          d="M 0 20 L 0 14 Q 20 9, 40 12 T 70 10 T 100 13 L 100 20 Z"
          fill="hsl(150 22% 22%)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        />
        <motion.path
          d="M 0 20 L 0 16 Q 25 12, 50 14 T 80 13 T 100 15 L 100 20 Z"
          fill="hsl(150 20% 18%)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        />
      </svg>

      {/* Grass details */}
      {hasGrassDetails && (
        <div className="absolute bottom-4 inset-x-0 h-8">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bottom-0 w-px origin-bottom"
              style={{
                left: `${5 + (i * 17) % 90}%`,
                height: `${8 + (i % 4) * 3}px`,
                background: `hsl(135 ${20 + (i % 3) * 5}% ${30 + (i % 4) * 5}%)`,
              }}
              animate={{
                rotate: [-3, 3, -3],
              }}
              transition={{
                duration: 3 + (i % 2),
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
