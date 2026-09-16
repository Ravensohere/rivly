// Collectible Celebration Modal - Shows when a collectible is unlocked

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  CollectibleDefinition, 
  getRarityColor, 
  getRarityBgColor 
} from '@/types/collectibles';
import { useEffect, useState } from 'react';

interface CollectibleCelebrationProps {
  collectible: CollectibleDefinition | null;
  onDismiss: () => void;
  onViewCollection?: () => void;
}

// Sparkle particle component
function SparkleParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{
        background: 'linear-gradient(135deg, hsl(45 93% 60%), hsl(45 93% 80%))',
        left: '50%',
        top: '50%',
      }}
      initial={{ 
        opacity: 0, 
        scale: 0,
        x: 0,
        y: 0,
      }}
      animate={{ 
        opacity: [0, 1, 1, 0], 
        scale: [0, 1.5, 1, 0],
        x: x,
        y: y,
      }}
      transition={{ 
        delay: delay + 0.3,
        duration: 1.2,
        ease: 'easeOut',
      }}
    />
  );
}

export function CollectibleCelebration({ 
  collectible, 
  onDismiss,
  onViewCollection 
}: CollectibleCelebrationProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (collectible) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [collectible]);

  if (!collectible) return null;

  const rarityColor = getRarityColor(collectible.rarity);
  const rarityBg = getRarityBgColor(collectible.rarity);

  // Generate random sparkle positions
  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.08,
    x: Math.cos((i / 12) * Math.PI * 2) * 80 + (Math.random() - 0.5) * 30,
    y: Math.sin((i / 12) * Math.PI * 2) * 80 + (Math.random() - 0.5) * 30,
  }));

  return (
    <AnimatePresence>
      {collectible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
          />

          {/* Content */}
          <motion.div
            className="relative bg-card rounded-3xl p-8 max-w-sm w-[90%] mx-auto shadow-2xl border border-border/50 overflow-hidden"
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ 
              type: 'spring', 
              damping: 20, 
              stiffness: 300,
              delay: 0.1 
            }}
          >
            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Header */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
                <Sparkles className="w-3 h-3" />
                <span>New Discovery!</span>
              </div>
            </motion.div>

            {/* Icon with celebration effects */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Sparkles */}
              {sparkles.map((sparkle, i) => (
                <SparkleParticle key={i} {...sparkle} />
              ))}
              
              {/* Glow ring */}
              <motion.div
                className="absolute w-28 h-28 rounded-full"
                style={{ 
                  background: `radial-gradient(circle, ${rarityBg} 0%, transparent 70%)`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1.5, 1.2],
                  opacity: [0, 0.8, 0.4],
                }}
                transition={{ 
                  duration: 0.8,
                  delay: 0.3,
                  ease: 'easeOut',
                }}
              />
              
              {/* Icon container */}
              <motion.div
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ 
                  backgroundColor: rarityBg,
                  boxShadow: `0 0 30px 5px ${rarityBg}`,
                }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: 'spring',
                  damping: 12,
                  stiffness: 200,
                  delay: 0.4,
                }}
              >
                <motion.span
                  className="text-5xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  {collectible.icon}
                </motion.span>
              </motion.div>
            </div>

            {/* Collectible info */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-xl font-bold text-foreground mb-1">
                {collectible.name}
              </h3>
              <p className="text-muted-foreground text-sm mb-3">
                {collectible.description}
              </p>
              
              {/* Rarity badge */}
              <div
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize"
                style={{ 
                  backgroundColor: rarityBg,
                  color: rarityColor,
                }}
              >
                {collectible.rarity}
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="mt-6 flex flex-col gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {onViewCollection && (
                <Button
                  onClick={() => {
                    onDismiss();
                    onViewCollection();
                  }}
                  className="w-full"
                  variant="default"
                >
                  View Collection
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              <Button
                onClick={onDismiss}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
