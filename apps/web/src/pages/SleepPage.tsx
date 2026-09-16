// Redesigned Sleep Page - Clean, functional, production-ready

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/PageTransition';
import { SleepBackground } from '@/components/sleep/SleepBackground';
import { WinddownCard } from '@/components/sleep/WinddownCard';
import { WinddownPlayer } from '@/components/sleep/WinddownPlayer';
import { SleepCheckInCard } from '@/components/sleep/SleepCheckInCard';
import { MorningBridgeSettingsSection } from '@/components/sleep/MorningBridgeSettingsSection';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useSleep } from '@/hooks/useSleep';
import { useMorningBridge } from '@/hooks/useMorningBridge';
import { useWinddownContext } from '@/contexts/WinddownContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function SleepPage() {
  const { firstName } = useUserPreferences();
  const { prefs, updatePrefs } = useSleep();
  const { activeSession } = useWinddownContext();
  const { isGuest } = useAuthContext();
  const {
    settings: morningBridgeSettings,
    toggleEnabled: toggleMorningBridge,
    setWakeTime,
    addAction,
    removeAction,
  } = useMorningBridge();
  const [playerOpen, setPlayerOpen] = useState(false);
  
  // Open player if there's an active session
  const handleOpenPlayer = () => {
    setPlayerOpen(true);
  };
  
  return (
    <>
      <SleepBackground isWindDown={!!activeSession} />
      
      <PageTransition className="page-container relative">
        <div className="content-wrapper pt-6 pb-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-6 text-center p-6 rounded-3xl bg-card border border-border/40"
            style={{ boxShadow: 'var(--shadow-soft)' }}
          >
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              {firstName ? `Rest well, ${firstName}` : 'Wind Down'}
            </h1>
            <p className="text-muted-foreground text-sm">
              Prepare for restful sleep
            </p>
          </motion.div>

          {/* Cards - Clean layout */}
          <div className={`space-y-4 ${isGuest ? 'blur-sm pointer-events-none select-none opacity-50' : ''}`}>
            {/* Section 1: Wind Down ritual */}
            <WinddownCard onStartPlayer={handleOpenPlayer} />
            
            {/* Section 2: Sleep log */}
            <SleepCheckInCard />

            {/* Morning Bridge Settings */}
            <MorningBridgeSettingsSection
              settings={morningBridgeSettings}
              onToggleEnabled={toggleMorningBridge}
              onSetWakeTime={setWakeTime}
              onAddAction={addAction}
              onRemoveAction={removeAction}
            />
          </div>

          {/* Guest Lock Overlay */}
          {isGuest && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-card/90 backdrop-blur-md p-8 rounded-3xl border border-border shadow-xl text-center max-w-xs mx-4">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Sleep Insights are Locked</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Sign in to track your sleep, set alarms, and build your wind-down routine.
                </p>
                <Link to="/login">
                  <Button className="w-full rounded-full">
                    Sign in to Unlock
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </PageTransition>
      
      {/* Winddown Player Overlay */}
      <WinddownPlayer
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
      />
    </>
  );
}
