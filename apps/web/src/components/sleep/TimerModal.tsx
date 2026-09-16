/**
 * TimerModal - Modal for setting sleep timer
 * Uses ResponsiveModal for proper bottom-sheet on mobile
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
} from '@/components/ui/ResponsiveModal';
import { Button } from '@/components/ui/button';
import { Timer, Check, Minus, Plus, Clock, ChevronLeft } from 'lucide-react';
import { TIMER_OPTIONS } from '@/services/AudioController';

interface TimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTimer: number | null;
  onSetTimer: (minutes: number | null) => void;
}

export function TimerModal({ open, onOpenChange, currentTimer, onSetTimer }: TimerModalProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(90);

  const handleSelect = (value: number | null) => {
    onSetTimer(value);
    onOpenChange(false);
  };

  const handleCustomConfirm = () => {
    onSetTimer(customMinutes);
    onOpenChange(false);
    setShowCustom(false);
  };

  const adjustCustom = (delta: number) => {
    setCustomMinutes(Math.max(1, Math.min(180, customMinutes + delta)));
  };

  // Reset custom view when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowCustom(false);
    }
    onOpenChange(open);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
      <ResponsiveModalContent className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl">
        {/* Header */}
        <ResponsiveModalHeader>
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <ResponsiveModalTitle>
              {showCustom ? 'Custom Duration' : 'Sleep Timer'}
            </ResponsiveModalTitle>
          </div>
        </ResponsiveModalHeader>

        {/* Content */}
        <ResponsiveModalBody>
          <AnimatePresence mode="wait">
            {!showCustom ? (
              <motion.div
                key="presets"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Timer Options Grid - 2 columns on mobile, 3 on larger screens */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {TIMER_OPTIONS.map((option) => {
                    const isSelected = currentTimer === option.value;
                    
                    return (
                      <motion.button
                        key={option.label}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelect(option.value)}
                        className={`
                          relative h-12 sm:h-14 rounded-xl text-center font-semibold transition-all
                          flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground shadow-md' 
                            : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border/30'}
                        `}
                      >
                        <span className="text-sm sm:text-base">{option.label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom Duration Button */}
                <div className="pt-3 border-t border-border/30">
                  <Button
                    variant="outline"
                    onClick={() => setShowCustom(true)}
                    className="w-full h-11 sm:h-12 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Custom duration
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Custom Timer Stepper */}
                <div className="py-4 sm:py-6">
                  <p className="text-center text-xs sm:text-sm text-muted-foreground mb-4">
                    Set duration (1–180 minutes)
                  </p>
                  
                  <div className="flex items-center justify-center gap-3 sm:gap-5">
                    {/* Minus Button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => adjustCustom(-15)}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-secondary border border-border/30 flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors touch-manipulation"
                    >
                      <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                    
                    {/* Minutes Display */}
                    <div className="text-center min-w-[90px] sm:min-w-[100px]">
                      <input
                        type="number"
                        value={customMinutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setCustomMinutes(Math.max(1, Math.min(180, val)));
                        }}
                        className="w-20 h-14 sm:w-24 sm:h-16 text-center text-3xl sm:text-4xl font-bold bg-secondary rounded-xl border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        min={1}
                        max={180}
                      />
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">minutes</p>
                    </div>
                    
                    {/* Plus Button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => adjustCustom(15)}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-secondary border border-border/30 flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors touch-manipulation"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ResponsiveModalBody>

        {/* Footer */}
        <ResponsiveModalFooter>
          {showCustom ? (
            <div className="flex gap-2 sm:gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowCustom(false)}
                className="flex-1 h-11 sm:h-12 rounded-xl gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleCustomConfirm}
                className="flex-1 h-11 sm:h-12 rounded-xl"
              >
                Set {customMinutes}m
              </Button>
            </div>
          ) : (
            <div className="w-full text-center text-xs text-muted-foreground">
              Timer will fade out audio gradually
            </div>
          )}
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
