import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, BellOff, Clock, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { alarmSoundPlayer, isNativeAlarmAvailable } from '@/services/NativeAlarmBridge';
import { useSleep } from '@/hooks/useSleep';
import { formatTimeDisplay } from '@/hooks/useLocalStorage';
import { Alarm } from '@/types/sleep';

export default function AlarmRingingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const alarmId = searchParams.get('id');
  const testMode = searchParams.get('test') === 'true';
  
  const { alarms, updateAlarm } = useSleep();
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [snoozed, setSnoozed] = useState(false);

  // Find the alarm
  useEffect(() => {
    if (alarmId) {
      const found = alarms.find(a => a.id === alarmId);
      if (found) {
        setAlarm(found);
      }
    } else if (testMode) {
      // Create a test alarm
      setAlarm({
        id: 'test',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        label: 'Test Alarm',
        type: 'gentle',
        repeat: 'once',
        sound: 'morning-breeze',
        fadeInSeconds: 3,
        snoozeMinutes: 5,
        enabled: true,
        vibration: true,
      });
    }
  }, [alarmId, alarms, testMode]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Start playing alarm sound
  useEffect(() => {
    if (alarm) {
      alarmSoundPlayer.play(alarm.sound, alarm.type === 'gentle' ? alarm.fadeInSeconds : 0);
    }
    return () => {
      alarmSoundPlayer.stop();
    };
  }, [alarm]);

  // Vibration pattern (if supported and enabled)
  useEffect(() => {
    if (!alarm?.vibration || snoozed) return;

    const vibrate = () => {
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    };

    vibrate();
    const interval = setInterval(vibrate, 2000);
    return () => {
      clearInterval(interval);
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [alarm?.vibration, snoozed]);

  const handleSnooze = useCallback((minutes: number) => {
    alarmSoundPlayer.stop();
    setSnoozed(true);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }

    // Schedule snooze wake-up (web only, for testing)
    setTimeout(() => {
      setSnoozed(false);
      if (alarm) {
        alarmSoundPlayer.play(alarm.sound, 0);
      }
    }, minutes * 60 * 1000);

    // In real app, navigate back and let native handle snooze
    if (isNativeAlarmAvailable()) {
      navigate(-1);
    }
  }, [alarm, navigate]);

  const handleDismiss = useCallback(() => {
    alarmSoundPlayer.stop();
    
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }

    // If one-time alarm, disable it
    if (alarm && alarm.repeat === 'once' && alarm.id !== 'test') {
      updateAlarm(alarm.id, { enabled: false });
    }

    // Navigate to home
    navigate('/');
  }, [alarm, navigate, updateAlarm]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!alarm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/20 to-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Alarm not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-b from-primary/30 via-primary/10 to-background flex flex-col items-center justify-center"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Pulsing background ring */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-primary/20"
            style={{ width: 200 + i * 100, height: 200 + i * 100 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Bell icon */}
        <motion.div
          className="mb-8 p-6 rounded-full bg-primary/20"
          animate={{
            rotate: snoozed ? 0 : [-5, 5, -5, 5, 0],
            scale: snoozed ? 1 : [1, 1.05, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: snoozed ? 0 : Infinity,
            repeatDelay: 1,
          }}
        >
          {snoozed ? (
            <BellOff className="w-12 h-12 text-muted-foreground" />
          ) : (
            <Bell className="w-12 h-12 text-primary" />
          )}
        </motion.div>

        {/* Current time */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4"
        >
          <h1 className="text-6xl font-bold text-foreground tracking-tight">
            {formatTime(currentTime)}
          </h1>
        </motion.div>

        {/* Alarm label */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-2"
        >
          <p className="text-xl text-muted-foreground">
            {alarm.label || 'Alarm'}
          </p>
        </motion.div>

        {/* Alarm time and type */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 mb-8"
        >
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Set for {formatTimeDisplay(alarm.time)}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
            {alarm.type}
          </span>
        </motion.div>

        {/* Sound indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 mb-12 text-sm text-muted-foreground"
        >
          <Volume2 className="w-4 h-4" />
          <span className="capitalize">{alarm.sound.replace('-', ' ')}</span>
        </motion.div>

        {/* Snoozed state */}
        {snoozed && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8 px-6 py-3 rounded-full bg-muted"
          >
            <p className="text-muted-foreground">Snoozed - will ring again soon</p>
          </motion.div>
        )}

        {/* Action buttons */}
        {!snoozed && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-4 w-full max-w-xs"
          >
            {/* Snooze buttons */}
            <div className="flex gap-2">
              {[5, 10, 15].map((mins) => (
                <Button
                  key={mins}
                  variant="outline"
                  onClick={() => handleSnooze(mins)}
                  className="flex-1 h-14 text-lg bg-secondary/80 border-border hover:bg-secondary"
                >
                  {mins}m
                </Button>
              ))}
            </div>

            {/* Dismiss button */}
            <Button
              onClick={handleDismiss}
              className="w-full h-16 text-xl font-semibold"
            >
              Dismiss
            </Button>
          </motion.div>
        )}

        {/* Test mode indicator */}
        {testMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm"
          >
            Test Mode - Alarm UI Preview
          </motion.div>
        )}
      </div>
    </div>
  );
}
