import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { TimeBlock } from '@/types';
import { formatTimeDisplay } from '@/hooks/useLocalStorage';
import { Check, Clock, Sparkles, AlertTriangle } from 'lucide-react';
import { useState, useCallback } from 'react';

interface TimeBlockCardProps {
  block: TimeBlock;
  onClick: () => void;
  onComplete?: (blockId: string) => void;
  style?: React.CSSProperties;
  variant?: 'calendar' | 'timeline';
  isCurrentBlock?: boolean;
}

const colorClasses: Record<string, string> = {
  sage: 'bg-block-sage',
  lavender: 'bg-block-lavender',
  peach: 'bg-block-peach',
  sky: 'bg-block-sky',
  mint: 'bg-block-mint',
  rose: 'bg-block-rose',
};

const colorGradients: Record<string, string> = {
  sage: 'linear-gradient(135deg, hsl(142 35% 85% / 0.9) 0%, hsl(142 35% 80% / 0.7) 100%)',
  lavender: 'linear-gradient(135deg, hsl(270 40% 88% / 0.9) 0%, hsl(270 40% 83% / 0.7) 100%)',
  peach: 'linear-gradient(135deg, hsl(25 70% 88% / 0.9) 0%, hsl(25 70% 83% / 0.7) 100%)',
  sky: 'linear-gradient(135deg, hsl(200 60% 88% / 0.9) 0%, hsl(200 60% 83% / 0.7) 100%)',
  mint: 'linear-gradient(135deg, hsl(165 45% 85% / 0.9) 0%, hsl(165 45% 80% / 0.7) 100%)',
  rose: 'linear-gradient(135deg, hsl(350 50% 88% / 0.9) 0%, hsl(350 50% 83% / 0.7) 100%)',
};

// Determine block status based on time and completion
function getBlockStatus(block: TimeBlock, isCurrentBlock: boolean): 'upcoming' | 'active' | 'missed' | 'completed' {
  if (block.status === 'completed') return 'completed';
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = block.startTime.split(':').map(Number);
  const [endH, endM] = block.endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  // Check if current block override
  if (isCurrentBlock || block.status === 'inProgress') return 'active';
  
  if (currentMinutes < startMinutes) return 'upcoming';
  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return 'active';
  if (currentMinutes >= endMinutes) return 'missed';
  
  return 'upcoming';
}

// Status badge configuration
const statusConfig = {
  upcoming: { 
    label: 'Upcoming', 
    className: 'bg-muted text-muted-foreground',
    icon: Clock,
  },
  active: { 
    label: 'Active', 
    className: 'bg-primary/15 text-primary',
    icon: Sparkles,
  },
  missed: { 
    label: 'Missed', 
    className: 'bg-destructive/15 text-destructive',
    icon: AlertTriangle,
  },
  completed: { 
    label: 'Done', 
    className: 'bg-primary/15 text-primary',
    icon: Check,
  },
};

const SWIPE_THRESHOLD = 100;

export function TimeBlockCard({ block, onClick, onComplete, style, variant = 'timeline', isCurrentBlock = false }: TimeBlockCardProps) {
  const status = getBlockStatus(block, isCurrentBlock);
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isMissed = status === 'missed';
  const [showRipple, setShowRipple] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  // Swipe gesture motion values
  const x = useMotionValue(0);
  const swipeProgress = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const backgroundOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.3]);
  const checkScale = useTransform(x, [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0.5, 0.8, 1.2]);
  const checkOpacity = useTransform(x, [0, SWIPE_THRESHOLD * 0.3], [0, 1]);

  const handleClick = () => {
    if (isSwiping) return;
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 600);
    onClick();
  };

  const handleDragStart = useCallback(() => {
    setIsSwiping(true);
  }, []);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    console.log('[TimeBlockCard] Drag ended:', { 
      offsetX: info.offset.x, 
      threshold: SWIPE_THRESHOLD, 
      hasOnComplete: !!onComplete,
      isCompleted,
      blockId: block.id 
    });
    
    // If swiped past threshold, trigger complete
    if (info.offset.x >= SWIPE_THRESHOLD && onComplete && !isCompleted) {
      console.log('[TimeBlockCard] Triggering complete for block:', block.id);
      onComplete(block.id);
    }
    
    // Reset swiping state after a short delay to prevent click
    setTimeout(() => setIsSwiping(false), 100);
  }, [onComplete, block.id, isCompleted]);

  const StatusIcon = statusConfig[status].icon;

  // Only enable swipe for timeline variant and non-completed blocks
  const canSwipe = variant === 'timeline' && !isCompleted && onComplete;
  
  return (
    <div className={`relative overflow-hidden rounded-3xl ${variant === 'calendar' ? 'h-full' : ''}`}>
      {/* Swipe background reveal */}
      {canSwipe && (
        <motion.div 
          className="absolute inset-0 bg-primary/20 rounded-3xl flex items-center pl-6"
          style={{ opacity: backgroundOpacity }}
        >
          <motion.div 
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center"
            style={{ scale: checkScale, opacity: checkOpacity }}
          >
            <Check className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
          </motion.div>
          <motion.span 
            className="ml-3 text-sm font-medium text-primary"
            style={{ opacity: checkOpacity }}
          >
            Complete
          </motion.span>
        </motion.div>
      )}

      <motion.div
        layout
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        whileHover={{ 
          scale: variant === 'timeline' && !isSwiping ? 1.015 : 1,
          y: variant === 'timeline' && !isSwiping ? -2 : 0,
        }}
        whileTap={!isSwiping ? { scale: 0.98 } : undefined}
        onClick={handleClick}
        style={{
          ...style,
          background: colorGradients[block.color] || colorGradients.sage,
          x: canSwipe ? x : undefined,
        }}
        drag={canSwipe ? "x" : false}
        dragConstraints={{ left: 0, right: SWIPE_THRESHOLD * 1.2 }}
        dragElastic={{ left: 0, right: 0.2 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`
          relative overflow-hidden cursor-pointer backdrop-blur-sm touch-pan-y
          ${variant === 'calendar' 
            ? 'absolute left-1 right-1 rounded-xl px-2.5 py-2 border border-border/20' 
            : 'rounded-3xl p-5 border border-border/20'
          }
          ${isCompleted ? 'opacity-80' : ''}
          ${isMissed ? 'opacity-90' : ''}
          transition-colors duration-300 ease-out
        `}
      >
        {/* Subtle inner glow */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 20% 20%, hsl(var(--background) / 0.3) 0%, transparent 50%)',
          }}
        />

        {/* Completion overlay with glow */}
        {isCompleted && (
          <>
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 bg-primary/10 origin-left"
            />
            {/* Completion sparkle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="absolute top-3 right-3"
            >
              <Sparkles className="w-4 h-4 text-primary/50" />
            </motion.div>
          </>
        )}

        {/* Missed indicator */}
        {isMissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-destructive/5"
          />
        )}

        {/* Progress indicator for active blocks */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.2, 0.4, 0.2],
              background: [
                'linear-gradient(90deg, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
                'linear-gradient(90deg, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
                'linear-gradient(90deg, hsl(var(--primary) / 0.1) 0%, transparent 50%)',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0"
          />
        )}

        {/* Click ripple effect */}
        {showRipple && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-primary/20"
            style={{ transformOrigin: 'center' }}
          />
        )}

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className={`font-semibold ${variant === 'calendar' ? 'text-xs' : 'text-lg'} text-foreground truncate`}>
              {block.title}
            </div>
            <div className={`flex items-center gap-2 text-muted-foreground ${variant === 'calendar' ? 'text-[10px] mt-0.5' : 'text-sm mt-1'}`}>
              <Clock className={variant === 'calendar' ? 'w-2.5 h-2.5' : 'w-4 h-4'} />
              <span>{formatTimeDisplay(block.startTime)} – {formatTimeDisplay(block.endTime)}</span>
            </div>
            
            {/* Status badge - only show in timeline variant */}
            {variant === 'timeline' && (
              <motion.div 
                className="mt-3 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className={`
                  inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  ${statusConfig[status].className}
                `}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig[status].label}
                </span>
                
                {/* Swipe hint for non-completed blocks */}
                {canSwipe && (
                  <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      →
                    </motion.span>
                    swipe to complete
                  </span>
                )}
                
                {block.tasks.length > 0 && (
                  <>
                    <div className="flex -space-x-1 ml-2">
                      {[...Array(Math.min(block.tasks.length, 3))].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-2 h-2 rounded-full bg-primary/40 border border-card"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {block.tasks.length} task{block.tasks.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </motion.div>
            )}
          </div>

          {/* Status indicator */}
          <div className={`flex-shrink-0 ${variant === 'calendar' ? 'w-5 h-5' : 'w-10 h-10'} rounded-full flex items-center justify-center`}>
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`${variant === 'calendar' ? 'w-5 h-5' : 'w-8 h-8'} rounded-full bg-primary flex items-center justify-center`}
                style={{ boxShadow: 'var(--shadow-glow)' }}
              >
                <Check className={`${variant === 'calendar' ? 'w-3 h-3' : 'w-5 h-5'} text-primary-foreground`} strokeWidth={3} />
              </motion.div>
            ) : isActive ? (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`${variant === 'calendar' ? 'w-5 h-5' : 'w-8 h-8'} rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm`}
              >
                <motion.div 
                  className={`${variant === 'calendar' ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-primary`}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            ) : isMissed ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`${variant === 'calendar' ? 'w-5 h-5' : 'w-8 h-8'} rounded-full bg-destructive/15 flex items-center justify-center`}
              >
                <AlertTriangle className={`${variant === 'calendar' ? 'w-3 h-3' : 'w-4 h-4'} text-destructive`} />
              </motion.div>
            ) : (
              <div className={`${variant === 'calendar' ? 'w-5 h-5' : 'w-8 h-8'} rounded-full border-2 border-muted-foreground/20 bg-card/50`} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}