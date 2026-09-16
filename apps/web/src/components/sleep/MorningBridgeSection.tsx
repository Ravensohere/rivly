import { motion } from 'framer-motion';
import { Sunrise, ChevronRight, Calendar } from 'lucide-react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Switch } from '@/components/ui/switch';
import { TimeBlock } from '@/types';

interface MorningBridgeSectionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  firstBlock?: TimeBlock;
}

export function MorningBridgeSection({ enabled, onToggle, firstBlock }: MorningBridgeSectionProps) {
  return (
    <SleepCard delay={0.5}>
      <SleepCardHeader 
        icon={<Sunrise className="w-5 h-5" />}
        title="Morning Bridge"
        subtitle="A gentle start to your day"
      />

      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">
          When you wake up, we'll show just one gentle next step.
        </p>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>

      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          {/* Inner card with solid background for text readability */}
          <div className="p-4 rounded-2xl bg-secondary border border-border/30">
            <p className="text-muted-foreground text-xs mb-3 font-medium">Preview of your morning</p>
            
            <div className="space-y-3">
              <p className="text-foreground font-medium">Good morning ☀️</p>
              <p className="text-muted-foreground text-sm">Here's your first step for today:</p>
              
              {firstBlock ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 mt-3">
                  <div className={`w-2 h-8 rounded-full bg-block-${firstBlock.color}`} />
                  <div className="flex-1">
                    <p className="text-foreground text-sm font-medium">{firstBlock.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {firstBlock.startTime} - {firstBlock.endTime}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 mt-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">No blocks planned yet</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </SleepCard>
  );
}