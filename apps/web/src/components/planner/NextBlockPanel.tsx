import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Brain, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeBlock } from '@/types';
import { useFocusTimer } from '@/contexts/FocusTimerContext';
import { useToast } from '@/hooks/use-toast';

interface NextBlockPanelProps {
  block: TimeBlock | null;
  onDelay: (blockId: string, minutes: number) => void;
  onOverwhelmed: () => void;
  onReplan: () => void;
}

const BLOCK_COLOR_MAP: Record<string, string> = {
  sage:     '#6eb5a0',
  lavender: '#9b8ec4',
  peach:    '#e8a87c',
  sky:      '#6baed6',
  mint:     '#74c493',
  rose:     '#e88ca0',
  blue:     '#6baed6',
};

function timeLabel(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
}

export function NextBlockPanel({ block, onDelay, onOverwhelmed, onReplan }: NextBlockPanelProps) {
  const { startFocus, isRunning } = useFocusTimer();
  const { toast } = useToast();

  if (!block) return null;

  const blockColor = BLOCK_COLOR_MAP[block.color] || '#9b8ec4';
  const isActive = block.status === 'inProgress';
  const isCompleted = block.status === 'completed';

  // duration in minutes
  const [sh, sm] = block.startTime.split(':').map(Number);
  const [eh, em] = block.endTime.split(':').map(Number);
  const durationMin = (eh * 60 + em) - (sh * 60 + sm);

  const handleStartFocus = () => {
    startFocus({
      duration: Math.max(5, durationMin),
      purpose: block.title,
      purposeType: 'custom',
      customPurpose: block.title,
    });
    toast({ title: '🎯 Focus started', description: `Focusing on: ${block.title}` });
  };

  if (isCompleted) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={block.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mx-4 mb-2"
      >
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${blockColor}18 0%, ${blockColor}08 100%)`,
            borderColor: `${blockColor}40`,
            boxShadow: `0 4px 20px -4px ${blockColor}20`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: blockColor }} />
              <span className="text-xs text-muted-foreground font-medium">
                {isActive ? '▶ In progress' : 'Up next'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{timeLabel(block.startTime)} – {timeLabel(block.endTime)}</span>
            </div>
          </div>

          {/* Title */}
          <div className="px-4 pb-3">
            <h3
              className="font-semibold text-foreground text-base leading-tight truncate"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {block.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{durationMin} min block</p>
          </div>

          {/* Action row */}
          <div
            className="grid gap-1.5 px-3 pb-3"
            style={{ gridTemplateColumns: 'auto auto auto auto' }}
          >
            {/* Start Focus */}
            <button
              onClick={handleStartFocus}
              className={cn(
                'col-span-2 flex items-center justify-center gap-2',
                'h-9 rounded-xl text-sm font-semibold transition-all active:scale-95',
                'text-white shadow-sm'
              )}
              style={{ background: blockColor }}
              disabled={isRunning}
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Focusing…' : 'Start focus'}
            </button>

            {/* Delay 15 */}
            <button
              onClick={() => onDelay(block.id, 15)}
              className={cn(
                'flex items-center justify-center gap-1',
                'h-9 rounded-xl text-xs font-medium transition-all active:scale-95',
                'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              +15m
            </button>

            {/* Delay 30 */}
            <button
              onClick={() => onDelay(block.id, 30)}
              className={cn(
                'flex items-center justify-center gap-1',
                'h-9 rounded-xl text-xs font-medium transition-all active:scale-95',
                'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              +30m
            </button>
          </div>

          {/* Bottom row */}
          <div className="flex items-center gap-1 px-3 pb-3">
            <button
              onClick={onOverwhelmed}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium bg-secondary/60 text-muted-foreground hover:bg-secondary active:scale-95 transition-all"
            >
              <Brain className="w-3.5 h-3.5" />
              Overwhelmed
            </button>
            <button
              onClick={onReplan}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium bg-secondary/60 text-muted-foreground hover:bg-secondary active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Replan
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
