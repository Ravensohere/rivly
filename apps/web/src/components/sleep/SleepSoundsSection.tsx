/**
 * SleepSoundsSection - Premium mini-player for sleep sounds
 * Features: Mini player, quick picks, browse drawer
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  Timer, 
  Heart, 
  ChevronRight,
  Loader2,
  Music,
  AlertCircle,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { SoundBrowseDrawer } from './SoundBrowseDrawer';
import { TimerModal } from './TimerModal';
import { useAudioController } from '@/hooks/useAudioController';
import { getAllSounds, isSoundConfigured } from '@/services/AudioController';
import { toast } from 'sonner';
import { SoundCategory } from '@/types/sleep';

interface SleepSoundsSectionProps {
  selectedCategory: SoundCategory;
  onSetCategory: (category: SoundCategory) => void;
}

export function SleepSoundsSection({ selectedCategory, onSetCategory }: SleepSoundsSectionProps) {
  const [showBrowse, setShowBrowse] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    trackId,
    currentTrack,
    isPlaying,
    isLoading,
    hasError,
    volume,
    timerMinutes,
    timeRemaining,
    autoFade,
    error,
    favorites,
    recents,
    selectTrack,
    togglePlayPause,
    setVolume,
    setTimer,
    setAutoFade,
    toggleFavorite,
    isFavorite,
    isConfigured,
  } = useAudioController();

  const allSounds = getAllSounds();

  // Build quick picks: favorites first, then recents, then defaults
  const quickPicks = (() => {
    const picks: string[] = [];
    
    // Add favorites first
    favorites.forEach(id => {
      if (!picks.includes(id)) picks.push(id);
    });
    
    // Add recents
    recents.forEach(id => {
      if (!picks.includes(id)) picks.push(id);
    });
    
    // Fill with defaults if needed
    const defaultOrder = ['forest-breeze', 'light-rain', 'ocean-waves', 'mountain-wind', 'night-crickets', 'brown-noise'];
    defaultOrder.forEach(id => {
      if (!picks.includes(id)) picks.push(id);
    });
    
    return picks.slice(0, 8);
  })();

  // Scroll hint detection
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = scrollRef.current;
        setShowScrollHint(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 20);
      }
    };
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  // Handle track selection
  const handleSelectTrack = async (soundId: string) => {
    if (!isConfigured(soundId)) {
      toast.error("Can't play this sound. Add URL in Settings.");
      return;
    }
    await selectTrack(soundId);
  };

  const getSoundById = (id: string) => allSounds.find(s => s.id === id);

  return (
    <SleepCard delay={0.2}>
      <SleepCardHeader 
        icon={<Music className="w-5 h-5" />}
        title="Sleep Sounds"
        subtitle="Ambient sounds to help you sleep"
      />

      {/* Mini Player Card */}
      <AnimatePresence mode="wait">
        {trackId && currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-3">
              {/* Top row: Play, Track info, Timer, Favorite */}
              <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlayPause}
                  disabled={isLoading}
                  className={`
                    relative flex items-center justify-center w-12 h-12 rounded-full
                    ${isLoading ? 'bg-muted' : 'bg-primary'}
                    text-primary-foreground shadow-lg
                  `}
                >
                  {/* Playing indicator pulse */}
                  {isPlaying && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary"
                      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <span className="relative z-10">
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </span>
                </motion.button>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {currentTrack.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPlaying ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {timeRemaining ? `${timeRemaining} left` : 'Playing'}
                      </span>
                    ) : hasError ? (
                      <span className="text-destructive">{error}</span>
                    ) : (
                      currentTrack.description
                    )}
                  </p>
                </div>

                {/* Timer Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTimer(true)}
                  className={`
                    p-2.5 rounded-xl transition-colors
                    ${timerMinutes ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}
                  `}
                >
                  <Timer className="w-5 h-5" />
                </motion.button>

                {/* Favorite Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleFavorite(trackId)}
                  className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Heart 
                    className={`w-5 h-5 transition-all ${
                      isFavorite(trackId) ? 'fill-red-500 text-red-500' : ''
                    }`} 
                  />
                </motion.button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={(v) => setVolume(v[0])}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-9 text-right">
                  {volume}%
                </span>
              </div>

              {/* Auto-fade toggle (only show when timer is set) */}
              {timerMinutes && (
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">Fade out before timer ends</span>
                  <Switch
                    checked={autoFade}
                    onCheckedChange={setAutoFade}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display when no track selected but there was an error */}
      {hasError && !trackId && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Quick Picks Row */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Quick Picks
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowBrowse(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-3 h-3" />
          </motion.button>
        </div>
        
        <div className="relative">
          <div 
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {quickPicks.map((soundId) => {
              const sound = getSoundById(soundId);
              if (!sound) return null;
              
              const isSelected = trackId === soundId;
              const isThisPlaying = isSelected && isPlaying;
              const configured = isConfigured(soundId);
              const fav = isFavorite(soundId);
              
              return (
                <motion.button
                  key={soundId}
                  whileTap={configured ? { scale: 0.95 } : undefined}
                  onClick={() => handleSelectTrack(soundId)}
                  disabled={!configured}
                  className={`
                    relative flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px]
                    transition-all duration-200 flex-shrink-0
                    ${!configured ? 'opacity-40 cursor-not-allowed' : ''}
                    ${isSelected 
                      ? 'bg-primary/15 border-2 border-primary/40' 
                      : 'bg-secondary border-2 border-transparent hover:bg-secondary/80'}
                  `}
                >
                  {/* Playing indicator */}
                  {isThisPlaying && (
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{ boxShadow: '0 0 20px -5px hsl(var(--primary) / 0.3)' }}
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  
                  {/* Favorite badge */}
                  {fav && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <Heart className="w-2.5 h-2.5 text-white fill-white" />
                    </span>
                  )}
                  
                  <span className="text-xl relative z-10">{sound.icon}</span>
                  <span className={`text-[10px] font-medium text-center leading-tight relative z-10 ${
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {sound.name.split(' ')[0]}
                  </span>
                  
                  {isSelected && isLoading && (
                    <Loader2 className="absolute top-1 right-1 w-3 h-3 animate-spin text-primary" />
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Scroll hint */}
          <AnimatePresence>
            {showScrollHint && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 top-0 bottom-1 w-10 pointer-events-none flex items-center justify-end"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, hsl(var(--card)) 70%)',
                }}
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Browse Drawer */}
      <SoundBrowseDrawer
        open={showBrowse}
        onOpenChange={setShowBrowse}
        activeTrackId={trackId}
        onSelectTrack={handleSelectTrack}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* Timer Modal */}
      <TimerModal
        open={showTimer}
        onOpenChange={setShowTimer}
        currentTimer={timerMinutes}
        onSetTimer={setTimer}
      />
    </SleepCard>
  );
}
