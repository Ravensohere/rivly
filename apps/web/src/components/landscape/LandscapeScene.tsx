import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandscapeBackground } from './LandscapeBackground';
import { LandscapeGround } from './LandscapeGround';
import { LandscapeWater } from './LandscapeWater';
import { LandscapeTree } from './LandscapeTree';
import { CollectibleElement } from './CollectibleElement';
import { LandscapeState, Collectible, FocusSeed, COLLECTIBLES } from '@/types/landscape';

interface LandscapeSceneProps {
  landscapeState: LandscapeState;
  seeds: FocusSeed[];
  unlockedCollectibles: Collectible[];
  isInteractive?: boolean;
  showMessage?: boolean;
}

export function LandscapeScene({
  landscapeState,
  seeds,
  unlockedCollectibles,
  isInteractive = true,
  showMessage = false,
}: LandscapeSceneProps) {
  const [selectedElement, setSelectedElement] = useState<{ name: string; description: string } | null>(null);

  // Determine which trees to show based on seeds
  const trees = useMemo(() => {
    const recentSeeds = seeds.slice(-10); // Last 10 seeds
    const treePositions: { type: 'oak' | 'bamboo' | 'pine' | 'willow' | 'seedling'; x: number; size: 'small' | 'medium' | 'large'; progress: number }[] = [];
    
    recentSeeds.forEach((seed, i) => {
      let type: 'oak' | 'bamboo' | 'pine' | 'willow' | 'seedling' = 'seedling';
      let size: 'small' | 'medium' | 'large' = 'small';

      if (seed.completed && seed.durationMinutes >= 45) {
        type = 'oak';
        size = 'large';
      } else if (seed.completed && seed.durationMinutes >= 25) {
        type = 'pine';
        size = 'medium';
      } else if (seed.completed && seed.durationMinutes < 25) {
        type = 'bamboo';
        size = 'small';
      } else if (!seed.completed && seed.durationMinutes >= 15) {
        type = 'willow';
        size = 'medium';
      }

      treePositions.push({
        type,
        x: 10 + (i * 9) % 75,
        size,
        progress: seed.growthLevel,
      });
    });

    return treePositions;
  }, [seeds]);

  // Check if stream/pond are unlocked
  const hasStream = unlockedCollectibles.some(c => c.id === 'gentle-stream');
  const hasPond = unlockedCollectibles.some(c => c.id === 'still-water');

  const handleElementTap = (name: string, description: string) => {
    if (!isInteractive) return;
    setSelectedElement({ name, description });
    setTimeout(() => setSelectedElement(null), 3000);
  };

  return (
    <div className="relative w-full h-full min-h-[300px] overflow-hidden rounded-2xl">
      {/* Background layers */}
      <LandscapeBackground
        skyState={landscapeState.skyState}
        lightState={landscapeState.lightState}
        waterState={landscapeState.waterState}
      />

      {/* Water elements */}
      <LandscapeWater
        waterState={landscapeState.waterState}
        hasStream={hasStream}
        hasPond={hasPond}
      />

      {/* Ground */}
      <LandscapeGround hasGrassDetails={true} />

      {/* Trees from focus sessions */}
      {trees.map((tree, i) => (
        <LandscapeTree
          key={i}
          type={tree.type}
          size={tree.size}
          x={tree.x}
          growthProgress={tree.progress}
          delay={i * 0.1}
        />
      ))}

      {/* Collectible elements */}
      {unlockedCollectibles
        .filter(c => !['tree-oak', 'tree-bamboo', 'tree-pine', 'tree-willow'].includes(c.visualType))
        .map((collectible, i) => (
          <CollectibleElement
            key={collectible.id}
            collectible={collectible}
            x={15 + (i * 20) % 70}
            delay={0.5 + i * 0.2}
            onTap={() => handleElementTap(collectible.name, collectible.description)}
          />
        ))}

      {/* Element tooltip */}
      <AnimatePresence>
        {selectedElement && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm"
          >
            <p className="text-sm text-foreground font-medium">{selectedElement.name}</p>
            <p className="text-xs text-muted-foreground">{selectedElement.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient message overlay */}
      {showMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 1 }}
          className="absolute inset-0 flex items-end justify-center pb-8"
        >
          <p className="text-white/70 text-sm font-light tracking-wide">
            Your quiet landscape grows with you
          </p>
        </motion.div>
      )}
    </div>
  );
}
