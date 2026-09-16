/**
 * SoundBrowseDrawer - Bottom sheet for browsing all sounds
 * Features: Search, category tabs, vertical scroll, large touch targets
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, Check, Heart, Lock, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAllSounds, isSoundConfigured, SoundConfig } from '@/services/AudioController';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SoundBrowseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  favorites: string[];
  onToggleFavorite: (trackId: string) => void;
}

type Category = 'all' | 'nature' | 'noise' | 'night';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'nature', label: 'Nature' },
  { id: 'noise', label: 'Noise' },
  { id: 'night', label: 'Night' },
];

export function SoundBrowseDrawer({ 
  open, 
  onOpenChange, 
  activeTrackId, 
  onSelectTrack,
  favorites,
  onToggleFavorite,
}: SoundBrowseDrawerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  
  const allSounds = getAllSounds();

  const filteredSounds = useMemo(() => {
    let sounds = allSounds;
    
    // Filter by category
    if (category !== 'all') {
      sounds = sounds.filter(s => s.category === category);
    }
    
    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      sounds = sounds.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }
    
    return sounds;
  }, [allSounds, category, search]);

  const handleSelect = (sound: SoundConfig) => {
    if (!isSoundConfigured(sound.id)) return;
    onSelectTrack(sound.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-0 h-[80vh] flex flex-col p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="text-lg font-semibold text-foreground">
            Browse Sounds
          </SheetTitle>
        </SheetHeader>

        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search sounds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-0"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`
                  px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${category === cat.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-muted-foreground hover:text-foreground'}
                `}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sound List */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-6">
            {filteredSounds.map((sound, index) => {
              const configured = isSoundConfigured(sound.id);
              const isSelected = activeTrackId === sound.id;
              const isFav = favorites.includes(sound.id);
              
              return (
                <motion.div
                  key={sound.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`
                    flex items-center gap-4 p-4 rounded-2xl transition-all
                    ${!configured ? 'opacity-50' : 'cursor-pointer'}
                    ${isSelected 
                      ? 'bg-primary/15 border border-primary/30' 
                      : 'bg-secondary border border-transparent hover:bg-secondary/80'}
                  `}
                  onClick={() => handleSelect(sound)}
                >
                  {/* Icon */}
                  <span className="text-3xl flex-shrink-0">{sound.icon}</span>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}>
                      {sound.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {configured ? sound.description : 'Not configured'}
                    </p>
                  </div>

                  {/* Status/Actions */}
                  <div className="flex items-center gap-2">
                    {!configured ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <>
                        {/* Favorite button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(sound.id);
                          }}
                          className="p-2 rounded-lg hover:bg-background/50 transition-colors"
                        >
                          <Heart 
                            className={`w-4 h-4 transition-all ${
                              isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                            }`} 
                          />
                        </button>
                        
                        {/* Selected check */}
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {filteredSounds.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No sounds found
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Settings Link */}
        <div className="p-4 border-t border-border/30">
          <Link 
            to="/settings"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configure sound URLs in Settings
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
