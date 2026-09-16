/**
 * FloatingFocusTimer - Mini timer pill that appears above the bottom nav
 * 
 * Features:
 * - Shows remaining time when focus session is active
 * - Persists across all pages
 * - Tap to navigate to Focus page
 * - Stop button with confirmation
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Timer, X, Pause, Play } from 'lucide-react';
import { useFocusTimer } from '@/contexts/FocusTimerContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Routes where the floating timer should be hidden
const HIDDEN_TIMER_ROUTES = ['/alarm/ringing', '/focus'];

export function FloatingFocusTimer() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    focusState,
    sessionConfig,
    formattedTime,
    cancelFocus,
    pauseFocus,
    resumeFocus,
    isRunning,
    isPaused,
    timerPosition,
    updateTimerPosition,
  } = useFocusTimer();
  
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  
  // Don't show on focus page or alarm page
  const isHiddenRoute = HIDDEN_TIMER_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );
  
  // Only show when there's an active session (running or paused)
  const isActive = focusState === 'running' || focusState === 'paused';
  
  if (!isActive || isHiddenRoute) {
    return null;
  }
  
  const purposeLabel = sessionConfig?.purposeType === 'custom'
    ? sessionConfig.customPurpose
    : sessionConfig?.purpose;
  
  const truncatedPurpose = purposeLabel && purposeLabel.length > 20
    ? purposeLabel.substring(0, 18) + '...'
    : purposeLabel;
  
  const handleTap = () => {
    navigate('/focus');
  };
  
  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStopConfirm(true);
  };
  
  const handleConfirmStop = () => {
    cancelFocus();
    setShowStopConfirm(false);
  };
  
  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPaused) {
      resumeFocus();
    } else {
      pauseFocus();
    }
  };
  
  return (
    <>
      <AnimatePresence>
        <motion.div
          drag
          dragMomentum={false}
          onDragEnd={(_, info) => {
            updateTimerPosition(timerPosition.x + info.offset.x, timerPosition.y + info.offset.y);
          }}
          initial={{ x: timerPosition.x, y: timerPosition.y + 100, opacity: 0 }}
          animate={{ x: timerPosition.x, y: timerPosition.y, opacity: 1 }}
          exit={{ x: timerPosition.x, y: timerPosition.y + 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed z-40 touch-none" // touch-none prevents scrolling while dragging
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
            left: 0,
            right: 0,
            margin: '0 auto',
            width: 'max-content',
          }}
        >
          <motion.div
            onClick={handleTap}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            role="button"
            tabIndex={0}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-2xl
              shadow-lg border backdrop-blur-xl cursor-pointer
              ${isPaused 
                ? 'bg-muted/90 border-border/50' 
                : 'bg-primary/90 border-primary/30'
              }
            `}
          >
            {/* Timer icon with pulse */}
            <div className="relative">
              {isRunning && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary-foreground/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <Timer className={`w-4 h-4 ${isPaused ? 'text-foreground' : 'text-primary-foreground'}`} />
            </div>
            
            {/* Time display */}
            <div className="flex flex-col items-start">
              <span className={`text-sm font-semibold tabular-nums ${
                isPaused ? 'text-foreground' : 'text-primary-foreground'
              }`}>
                {formattedTime}
              </span>
              {truncatedPurpose && (
                <span className={`text-[10px] ${
                  isPaused ? 'text-muted-foreground' : 'text-primary-foreground/70'
                }`}>
                  {isPaused ? 'Paused • ' : ''}{truncatedPurpose}
                </span>
              )}
            </div>
            
            {/* Pause/Resume button */}
            <button
              onClick={handleTogglePause}
              className={`p-1.5 rounded-lg transition-colors z-10 ${
                isPaused 
                  ? 'hover:bg-foreground/10' 
                  : 'hover:bg-primary-foreground/10'
              }`}
            >
              {isPaused ? (
                <Play className={`w-3.5 h-3.5 ${isPaused ? 'text-foreground' : 'text-primary-foreground'}`} />
              ) : (
                <Pause className={`w-3.5 h-3.5 ${isPaused ? 'text-foreground' : 'text-primary-foreground'}`} />
              )}
            </button>
            
            {/* Stop button */}
            <button
              onClick={handleStop}
              className={`p-1.5 rounded-lg transition-colors z-10 ${
                isPaused 
                  ? 'hover:bg-destructive/10' 
                  : 'hover:bg-primary-foreground/10'
              }`}
            >
              <X className={`w-3.5 h-3.5 ${isPaused ? 'text-destructive' : 'text-primary-foreground'}`} />
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      
      {/* Stop confirmation dialog */}
      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>End focus session?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress won't be saved if you stop now. Are you sure you want to end this session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Continue</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmStop}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
