// Winddown Card - Start a winddown session

import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Play, Check, Clock } from 'lucide-react';
import { useState } from 'react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Button } from '@/components/ui/button';
import { useWinddownContext } from '@/contexts/WinddownContext';
import { 
  WINDDOWN_DURATIONS, 
  SOUND_PACK_INFO, 
  getSoundsForPack,
  WinddownSoundPack,
} from '@/types/winddown';

interface WinddownCardProps {
  onStartPlayer: () => void;
}

export function WinddownCard({ onStartPlayer }: WinddownCardProps) {
  const { 
    activeSession, 
    todayCompleted, 
    preferences, 
    startSession,
    updatePreferences,
  } = useWinddownContext();
  
  const [selectedDuration, setSelectedDuration] = useState(preferences.defaultDuration);
  const [selectedPack, setSelectedPack] = useState<WinddownSoundPack>(preferences.defaultSoundPack);
  
  const handleStart = () => {
    const sounds = getSoundsForPack(selectedPack);
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    
    startSession(selectedDuration, selectedPack, randomSound.id);
    onStartPlayer();
    
    // Save preferences
    updatePreferences({
      defaultDuration: selectedDuration,
      defaultSoundPack: selectedPack,
    });
  };
  
  const isActive = !!activeSession;
  
  return (
    <SleepCard delay={0.1}>
      <SleepCardHeader 
        icon={<Moon className="w-5 h-5" />}
        title="Wind Down"
        subtitle={todayCompleted ? "Completed today" : isActive ? "Session active" : "Prepare for rest"}
      />
      
      <AnimatePresence mode="wait">
        {todayCompleted && !isActive ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-6"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-3">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <p className="text-foreground font-medium">Recorded for today</p>
            <p className="text-muted-foreground text-sm mt-1">Rest well tonight</p>
          </motion.div>
        ) : isActive ? (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <Button
              onClick={onStartPlayer}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Open Player
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Duration Picker */}
            <div>
              <p className="text-muted-foreground text-sm mb-2.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Duration
              </p>
              <div className="flex gap-2">
                {WINDDOWN_DURATIONS.map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setSelectedDuration(dur)}
                    className={`
                      flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border
                      ${selectedDuration === dur 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}
                    `}
                  >
                    {dur}m
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sound Pack Picker */}
            <div>
              <p className="text-muted-foreground text-sm mb-2.5">Sound pack</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SOUND_PACK_INFO) as WinddownSoundPack[]).map((pack) => {
                  const info = SOUND_PACK_INFO[pack];
                  return (
                    <button
                      key={pack}
                      onClick={() => setSelectedPack(pack)}
                      className={`
                        flex items-center gap-2 px-3 py-3 rounded-xl text-sm transition-all duration-300 border
                        ${selectedPack === pack 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}
                      `}
                    >
                      <span className="text-lg">{info.icon}</span>
                      <span className="font-medium">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Start Button */}
            <Button
              onClick={handleStart}
              className="w-full h-12"
            >
              <Moon className="w-4 h-4 mr-2" />
              Start Wind Down
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </SleepCard>
  );
}
