import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Pause, Play, Timer, Waves } from 'lucide-react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  SOUND_OPTIONS, 
  SoundCategory, 
  SoundPlaybackState, 
  TIMER_OPTIONS 
} from '@/types/sleep';

interface SleepEnvironmentSectionProps {
  playback: SoundPlaybackState;
  selectedCategory: SoundCategory;
  onSelectSound: (soundId: string | null) => void;
  onTogglePlayback: () => void;
  onSetVolume: (volume: number) => void;
  onSetTimer: (minutes: number | null) => void;
  onToggleAutoFade: () => void;
  onSetCategory: (category: SoundCategory) => void;
  timerRemaining?: number | null;
}

const CATEGORIES: { id: SoundCategory; label: string; icon: string }[] = [
  { id: 'forest', label: 'Forest', icon: '🌲' },
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'ocean', label: 'Ocean', icon: '🌊' },
  { id: 'mountains', label: 'Mountains', icon: '🏔️' },
  { id: 'night', label: 'Night', icon: '🌙' },
  { id: 'noise', label: 'Noise', icon: '📻' },
];

export function SleepEnvironmentSection({
  playback,
  selectedCategory,
  onSelectSound,
  onTogglePlayback,
  onSetVolume,
  onSetTimer,
  onToggleAutoFade,
  onSetCategory,
  timerRemaining,
}: SleepEnvironmentSectionProps) {
  const filteredSounds = SOUND_OPTIONS.filter(s => s.category === selectedCategory);
  const currentSound = SOUND_OPTIONS.find(s => s.id === playback.selectedSound);

  return (
    <SleepCard delay={0.2}>
      <SleepCardHeader 
        icon={<Waves className="w-5 h-5" />}
        title="Sleep Sounds"
        subtitle="Soothing ambient sounds"
      />

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat.id}
            onClick={() => onSetCategory(cat.id)}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm whitespace-nowrap
              transition-all duration-400
              ${selectedCategory === cat.id 
                ? 'bg-primary text-primary-foreground border border-primary' 
                : 'bg-secondary text-foreground border border-transparent hover:bg-secondary/80'}
            `}
          >
            <span>{cat.icon}</span>
            <span className="font-medium">{cat.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Sound tiles */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {filteredSounds.map((sound) => {
          const isSelected = playback.selectedSound === sound.id;
          return (
            <motion.button
              key={sound.id}
              onClick={() => onSelectSound(isSelected ? null : sound.id)}
              whileTap={{ scale: 0.97 }}
              className={`
                relative p-4 rounded-2xl text-left transition-all duration-400
                ${isSelected 
                  ? 'bg-primary/15 border border-primary/30' 
                  : 'bg-secondary border border-border/30 hover:bg-secondary/80'}
              `}
            >
              {/* Soft glow effect for playing sound */}
              <AnimatePresence>
                {isSelected && playback.isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      boxShadow: '0 0 25px -5px hsl(var(--primary) / 0.2)',
                    }}
                  />
                )}
              </AnimatePresence>
              
              <div className="relative z-10">
                <span className="text-2xl mb-2 block">{sound.icon}</span>
                <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {sound.name}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Now Playing Bar */}
      <AnimatePresence>
        {playback.selectedSound && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-secondary border border-border/30 space-y-4">
              {/* Playback controls */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onTogglePlayback}
                  className="flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-foreground"
                >
                  {playback.isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </motion.button>
                <div className="flex-1">
                  <p className="text-foreground text-sm font-semibold">{currentSound?.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {playback.isPlaying ? 'Playing' : 'Paused'}
                    {timerRemaining ? ` • ${Math.ceil(timerRemaining / 60)}m remaining` : playback.sleepTimerMinutes && ` • ${playback.sleepTimerMinutes}m timer`}
                  </p>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 relative">
                  <Slider
                    value={[playback.volume]}
                    max={100}
                    step={1}
                    onValueChange={(v) => onSetVolume(v[0])}
                    className="flex-1"
                  />
                </div>
                <span className="text-muted-foreground text-xs w-8 text-right font-medium">{playback.volume}%</span>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2.5">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <div className="flex gap-1.5 flex-wrap">
                  {TIMER_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => onSetTimer(opt.value)}
                      className={`
                        px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-300
                        ${playback.sleepTimerMinutes === opt.value 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-card text-muted-foreground hover:bg-card/80 border border-border/30'}
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-fade */}
              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <span className="text-foreground text-sm">Auto-fade before timer ends</span>
                <Switch
                  checked={playback.autoFade}
                  onCheckedChange={onToggleAutoFade}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SleepCard>
  );
}