import { motion } from 'framer-motion';
import { Collectible } from '@/types/landscape';

interface CollectibleElementProps {
  collectible: Collectible;
  x: number;
  delay?: number;
  onTap?: () => void;
}

export function CollectibleElement({ collectible, x, delay = 0, onTap }: CollectibleElementProps) {
  const renderElement = () => {
    switch (collectible.visualType) {
      case 'water-stream':
        return (
          <motion.svg viewBox="0 0 60 20" className="w-full h-6">
            <motion.path
              d="M 0 10 Q 15 5, 30 10 T 60 10"
              stroke="hsl(200 50% 55% / 0.5)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay }}
            />
          </motion.svg>
        );

      case 'air-mist':
        return (
          <div className="relative w-full h-12">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/10"
                style={{
                  width: `${30 + i * 10}%`,
                  height: '8px',
                  left: `${10 + i * 5}%`,
                  top: `${20 + i * 25}%`,
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: [0.2, 0.4, 0.2],
                  x: [0, 10, 0],
                }}
                transition={{
                  duration: 6 + i,
                  repeat: Infinity,
                  delay: delay + i * 0.5,
                }}
              />
            ))}
          </div>
        );

      case 'water-pond':
        return (
          <motion.div
            className="w-16 h-8 rounded-full"
            style={{
              background: 'radial-gradient(ellipse, hsl(200 45% 50% / 0.4) 0%, transparent 70%)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, delay }}
          >
            <motion.div
              className="absolute inset-2 rounded-full border border-white/10"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, delay }}
            />
          </motion.div>
        );

      case 'water-rain':
        return (
          <div className="relative w-20 h-16 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-px bg-blue-300/30"
                style={{
                  left: `${10 + i * 15}%`,
                  height: '8px',
                }}
                animate={{
                  y: [0, 60],
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
        );

      case 'light-sunrise':
        return (
          <motion.div
            className="w-24 h-12 rounded-t-full"
            style={{
              background: 'radial-gradient(ellipse at bottom, hsl(40 70% 60% / 0.6) 0%, hsl(30 60% 50% / 0.3) 50%, transparent 80%)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, delay }}
          />
        );

      case 'light-golden':
        return (
          <motion.div
            className="w-20 h-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(45 70% 70% / 0.4) 0%, transparent 70%)',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0.4, 0.6, 0.4],
              scale: 1,
            }}
            transition={{
              opacity: { duration: 4, repeat: Infinity },
              scale: { duration: 1.5, delay },
            }}
          />
        );

      case 'sky-dusk':
        return (
          <motion.div
            className="w-full h-16"
            style={{
              background: 'linear-gradient(180deg, hsl(280 30% 50% / 0.3) 0%, hsl(30 50% 50% / 0.2) 100%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay }}
          />
        );

      case 'sky-stars':
        return (
          <div className="relative w-24 h-16">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/60"
                style={{
                  left: `${10 + (i * 20) % 80}%`,
                  top: `${10 + (i * 25) % 70}%`,
                }}
                animate={{
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  delay: delay + i * 0.3,
                }}
              />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  // Position based on category
  const getPosition = () => {
    switch (collectible.category) {
      case 'calm':
        return 'bottom-4';
      case 'rhythm':
        return 'top-8';
      default:
        return 'bottom-16';
    }
  };

  return (
    <motion.div
      className={`absolute ${getPosition()}`}
      style={{ left: `${x}%` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay }}
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
    >
      {renderElement()}
    </motion.div>
  );
}
