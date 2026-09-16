// Morning Bridge Card - Show next step on wake up

import { motion } from 'framer-motion';
import { Sunrise, ChevronRight, Calendar, CheckSquare, Droplets, Wind } from 'lucide-react';
import { SleepCard, SleepCardHeader } from './SleepCard';
import { Switch } from '@/components/ui/switch';
import { useTasks } from '@/hooks/useTasks';
import { useTimeBlocks } from '@/hooks/useTimeBlocks';
import { getLocalDateKey } from '@/lib/dateUtils';

interface MorningBridgeCardProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

type NextStepType = 'block' | 'task' | 'gentle';

interface NextStep {
  type: NextStepType;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}

const GENTLE_SUGGESTIONS: NextStep[] = [
  { 
    type: 'gentle', 
    title: 'Drink a glass of water', 
    subtitle: 'Hydrate to start your day', 
    icon: <Droplets className="w-5 h-5" /> 
  },
  { 
    type: 'gentle', 
    title: 'Take 5 deep breaths', 
    subtitle: '2 minutes of calm', 
    icon: <Wind className="w-5 h-5" /> 
  },
];

export function MorningBridgeCard({ enabled, onToggle }: MorningBridgeCardProps) {
  const { getActiveTasksForDate } = useTasks();
  const { getBlocksForDate } = useTimeBlocks();
  
  // Get tomorrow's data for preview
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getLocalDateKey(tomorrow);
  
  const blocks = getBlocksForDate(tomorrowKey);
  const tasks = getActiveTasksForDate(tomorrowKey);
  
  // Determine next step priority
  const getNextStep = (): NextStep => {
    // 1. First upcoming block
    if (blocks.length > 0) {
      const firstBlock = blocks[0];
      return {
        type: 'block',
        title: firstBlock.title,
        subtitle: `${firstBlock.startTime} - ${firstBlock.endTime}`,
        icon: <Calendar className="w-5 h-5" />,
        color: firstBlock.color,
      };
    }
    
    // 2. First incomplete task
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      return {
        type: 'task',
        title: firstTask.title,
        subtitle: 'Your first task',
        icon: <CheckSquare className="w-5 h-5" />,
      };
    }
    
    // 3. Gentle suggestion
    const randomSuggestion = GENTLE_SUGGESTIONS[Math.floor(Math.random() * GENTLE_SUGGESTIONS.length)];
    return randomSuggestion;
  };
  
  const nextStep = getNextStep();
  
  return (
    <SleepCard delay={0.4}>
      <SleepCardHeader 
        icon={<Sunrise className="w-5 h-5" />}
        title="Morning Bridge"
        subtitle="A gentle start to your day"
      />
      
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">
          Show one gentle next step when you wake up
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
          transition={{ duration: 0.4 }}
          className="overflow-hidden"
        >
          <div className="p-4 rounded-2xl bg-secondary border border-border/30">
            <p className="text-muted-foreground text-xs mb-3 font-medium uppercase tracking-wider">
              Preview of your morning
            </p>
            
            <div className="space-y-3">
              <p className="text-foreground font-medium">Good morning ☀️</p>
              <p className="text-muted-foreground text-sm">Here's your first step:</p>
              
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/40">
                {nextStep.color ? (
                  <div className={`w-2 h-10 rounded-full bg-block-${nextStep.color}`} />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {nextStep.icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{nextStep.title}</p>
                  {nextStep.subtitle && (
                    <p className="text-muted-foreground text-xs">{nextStep.subtitle}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </SleepCard>
  );
}
