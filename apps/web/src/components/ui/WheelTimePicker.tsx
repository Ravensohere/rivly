/**
 * WheelTimePicker - A calm, modern wheel-style time picker
 * Matches the app's premium aesthetic with smooth scrolling
 * Uses ResponsiveModal for proper mobile bottom-sheet behavior
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { 
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
} from '@/components/ui/ResponsiveModal';
import { Button } from '@/components/ui/button';
import { Clock, Zap } from 'lucide-react';

interface WheelTimePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string; // "HH:mm" format
  onChange: (value: string) => void;
  title?: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// Generate arrays
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

interface WheelColumnProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

function WheelColumn({ items, value, onChange, label }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const currentIndex = items.indexOf(value);
  const targetY = -currentIndex * ITEM_HEIGHT;

  // Sync position when value changes externally
  useEffect(() => {
    if (!isDragging) {
      animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
    }
  }, [targetY, isDragging, y]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    const currentY = y.get();
    const index = Math.round(-currentY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    const newValue = items[clampedIndex];
    
    animate(y, -clampedIndex * ITEM_HEIGHT, { type: 'spring', stiffness: 400, damping: 35 });
    
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [items, value, onChange, y]);

  const handleItemClick = (index: number) => {
    const newValue = items[index];
    animate(y, -index * ITEM_HEIGHT, { type: 'spring', stiffness: 400, damping: 35 });
    onChange(newValue);
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
        {label}
      </span>
      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl"
        style={{ 
          height: PICKER_HEIGHT,
          width: 80,
          background: 'linear-gradient(180deg, hsl(var(--secondary) / 0.5) 0%, hsl(var(--secondary) / 0.8) 50%, hsl(var(--secondary) / 0.5) 100%)',
        }}
      >
        {/* Fade overlays */}
        <div 
          className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-none"
          style={{ 
            background: 'linear-gradient(180deg, hsl(var(--card)) 0%, transparent 100%)',
          }}
        />
        <div 
          className="absolute inset-x-0 bottom-0 h-16 z-10 pointer-events-none"
          style={{ 
            background: 'linear-gradient(0deg, hsl(var(--card)) 0%, transparent 100%)',
          }}
        />
        
        {/* Selection highlight */}
        <div 
          className="absolute inset-x-2 z-5 rounded-xl pointer-events-none"
          style={{ 
            top: ITEM_HEIGHT * 2,
            height: ITEM_HEIGHT,
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.08) 100%)',
            border: '1px solid hsl(var(--primary) / 0.2)',
            boxShadow: '0 0 20px -5px hsl(var(--primary) / 0.2)',
          }}
        />

        {/* Scrollable items */}
        <motion.div
          style={{ y }}
          drag="y"
          dragConstraints={{
            top: -(items.length - 1) * ITEM_HEIGHT,
            bottom: 0,
          }}
          dragElastic={0.1}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          className="cursor-grab active:cursor-grabbing"
        >
          {/* Top padding */}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
          
          {items.map((item, index) => {
            const isSelected = item === value;
            
            return (
              <motion.div
                key={item}
                onClick={() => handleItemClick(index)}
                className={`
                  flex items-center justify-center cursor-pointer select-none
                  transition-colors duration-200
                  ${isSelected 
                    ? 'text-primary font-semibold' 
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                  }
                `}
                style={{ height: ITEM_HEIGHT }}
              >
                <span className={`text-2xl ${isSelected ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
                  {item}
                </span>
              </motion.div>
            );
          })}
          
          {/* Bottom padding */}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
        </motion.div>
      </div>
    </div>
  );
}

export function WheelTimePicker({ 
  open, 
  onOpenChange, 
  value, 
  onChange,
  title = 'Set Time'
}: WheelTimePickerProps) {
  const [hours, minutes] = value.split(':');
  const [tempHours, setTempHours] = useState(hours || '09');
  const [tempMinutes, setTempMinutes] = useState(minutes || '00');

  // Reset temp values when modal opens (not when value changes during open)
  useEffect(() => {
    if (open && value) {
      const [h, m] = value.split(':');
      setTempHours(h || '09');
      // Snap to nearest 5 minutes
      const mins = parseInt(m || '0');
      const snapped = Math.round(mins / 5) * 5;
      setTempMinutes(snapped.toString().padStart(2, '0'));
    }
  }, [open]); // Only depend on open, not value

  const handleSetNow = () => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = (Math.round(now.getMinutes() / 5) * 5 % 60).toString().padStart(2, '0');
    setTempHours(h);
    setTempMinutes(m);
  };

  const handleConfirm = () => {
    // Only apply changes on explicit confirmation
    onChange(`${tempHours}:${tempMinutes}`);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to original value and close without saving
    const [h, m] = value.split(':');
    setTempHours(h || '09');
    const mins = parseInt(m || '0');
    const snapped = Math.round(mins / 5) * 5;
    setTempMinutes(snapped.toString().padStart(2, '0'));
    onOpenChange(false);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleCancel}>
      <ResponsiveModalContent 
        className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl z-[100000]"
        overlayClassName="z-[99999]"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none rounded-t-3xl sm:rounded-3xl" />
        
        <ResponsiveModalHeader className="relative">
          <div className="flex items-center justify-center gap-2">
            <motion.div 
              className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Clock className="w-5 h-5 text-primary" />
            </motion.div>
            <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          </div>
        </ResponsiveModalHeader>

        <ResponsiveModalBody className="relative">
          {/* Time display preview */}
          <div className="pb-4">
            <motion.div 
              key={`${tempHours}:${tempMinutes}`}
              initial={{ opacity: 0.5, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-2"
            >
              <span className="text-4xl font-bold text-foreground tracking-tight">
                {tempHours}:{tempMinutes}
              </span>
            </motion.div>
          </div>

          {/* Wheel pickers */}
          <div className="flex justify-center gap-4 pb-4">
            <WheelColumn
              items={HOURS}
              value={tempHours}
              onChange={setTempHours}
              label="Hour"
            />
            
            {/* Separator */}
            <div className="flex items-center justify-center pt-6">
              <span className="text-3xl font-bold text-muted-foreground/40">:</span>
            </div>
            
            <WheelColumn
              items={MINUTES}
              value={tempMinutes}
              onChange={setTempMinutes}
              label="Min"
            />
          </div>

          {/* Now shortcut */}
          <Button
            variant="ghost"
            onClick={handleSetNow}
            className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground gap-2"
          >
            <Zap className="w-4 h-4" />
            Set to now
          </Button>
        </ResponsiveModalBody>

        {/* Sticky footer with Confirm/Cancel */}
        <ResponsiveModalFooter>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-12 rounded-xl text-base font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 h-12 rounded-xl text-base font-semibold"
            >
              Done
            </Button>
          </div>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

// Compact trigger button that opens the picker
interface TimePickerTriggerProps {
  value: string;
  onClick: () => void;
  className?: string;
}

export function TimePickerTrigger({ value, onClick, className = '' }: TimePickerTriggerProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
        bg-secondary border border-border/30 
        text-foreground font-medium text-sm
        hover:bg-secondary/80 transition-colors
        ${className}
      `}
    >
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span>{value}</span>
    </motion.button>
  );
}
