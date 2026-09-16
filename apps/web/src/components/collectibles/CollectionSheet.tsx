// Collection Sheet - Shows all collectibles (unlocked and locked)

import { motion } from 'framer-motion';
import { Lock, Trophy, Sparkles, Moon, Target, Zap } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CollectibleCategory,
  getRarityColor, 
  getRarityBgColor,
  COLLECTIBLE_DEFINITIONS,
} from '@/types/collectibles';

interface CollectibleWithStatus {
  id: string;
  name: string;
  description: string;
  category: CollectibleCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: string;
  ruleKey: string;
  isUnlocked: boolean;
  unlockedAt?: string;
}

interface CollectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectibles: CollectibleWithStatus[];
  unlockedCount: number;
}

const CATEGORY_ICONS: Record<CollectibleCategory, React.ReactNode> = {
  focus: <Target className="w-4 h-4" />,
  sleep: <Moon className="w-4 h-4" />,
  streak: <Zap className="w-4 h-4" />,
  rhythm: <Sparkles className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<CollectibleCategory, string> = {
  focus: 'Focus',
  sleep: 'Sleep',
  streak: 'Streaks',
  rhythm: 'Rhythm',
};

function CollectibleCard({ collectible }: { collectible: CollectibleWithStatus }) {
  const rarityColor = getRarityColor(collectible.rarity);
  const rarityBg = getRarityBgColor(collectible.rarity);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative p-4 rounded-2xl border transition-all duration-300
        ${collectible.isUnlocked 
          ? 'bg-card border-border/50 hover:border-primary/30' 
          : 'bg-muted/30 border-border/30 opacity-60'
        }
      `}
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${collectible.isUnlocked ? '' : 'grayscale'}
          `}
          style={{ 
            backgroundColor: collectible.isUnlocked ? rarityBg : 'hsl(var(--muted))',
          }}
        >
          {collectible.isUnlocked ? (
            <span className="text-2xl">{collectible.icon}</span>
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        
        {/* Rarity badge */}
        {collectible.isUnlocked && (
          <span
            className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: rarityBg,
              color: rarityColor,
            }}
          >
            {collectible.rarity}
          </span>
        )}
      </div>
      
      {/* Info */}
      <div>
        <h4 className={`font-semibold text-sm mb-0.5 ${!collectible.isUnlocked ? 'text-muted-foreground' : 'text-foreground'}`}>
          {collectible.isUnlocked ? collectible.name : '???'}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {collectible.isUnlocked ? collectible.description : 'Keep going to unlock!'}
        </p>
      </div>
      
      {/* Unlock date */}
      {collectible.isUnlocked && collectible.unlockedAt && (
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          Unlocked {new Date(collectible.unlockedAt).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  );
}

export function CollectionSheet({ 
  open, 
  onOpenChange, 
  collectibles,
  unlockedCount,
}: CollectionSheetProps) {
  // Group by category
  const byCategory = collectibles.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<CollectibleCategory, CollectibleWithStatus[]>);
  
  const categories = Object.keys(byCategory) as CollectibleCategory[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl"
      >
        <SheetHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Collection
            </SheetTitle>
            <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium text-primary">
                {unlockedCount}/{COLLECTIBLE_DEFINITIONS.length}
              </span>
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(85vh-6rem)] mt-4 pb-8">
          <div className="space-y-6 pb-8">
            {categories.map((category, categoryIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    {CATEGORY_ICONS[category]}
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({byCategory[category].filter(c => c.isUnlocked).length}/{byCategory[category].length})
                  </span>
                </div>
                
                {/* Collectibles grid */}
                <div className="grid grid-cols-2 gap-3">
                  {byCategory[category].map((collectible, index) => (
                    <CollectibleCard 
                      key={collectible.id} 
                      collectible={collectible} 
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
