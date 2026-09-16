import { motion } from 'framer-motion';
import { Trophy, Lock, Sparkles, Clock, Target, CheckCircle2, Flame, TrendingUp, Moon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AchievementWithStatus {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'focus' | 'tasks' | 'reflect' | 'streaks' | 'milestones';
  requirement: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  hint: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  seen: boolean;
  progress: number;
  currentValue: number;
}

interface AchievementDetailSheetProps {
  achievement: AchievementWithStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tierColors = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-slate-300 to-slate-500',
  gold: 'from-yellow-400 to-amber-500',
  platinum: 'from-cyan-300 to-blue-500',
};

const tierBgColors = {
  bronze: 'bg-amber-500/10',
  silver: 'bg-slate-400/10',
  gold: 'bg-yellow-500/10',
  platinum: 'bg-cyan-400/10',
};

const categoryIcons = {
  focus: Target,
  tasks: CheckCircle2,
  reflect: Moon,
  streaks: Flame,
  milestones: Clock,
};

const categoryLabels = {
  focus: 'Focus Sessions',
  tasks: 'Tasks Completed',
  reflect: 'Days Reflected',
  streaks: 'Activity Streaks',
  milestones: 'Focus Time',
};

export function AchievementDetailSheet({ achievement, open, onOpenChange }: AchievementDetailSheetProps) {
  if (!achievement) return null;

  const CategoryIcon = categoryIcons[achievement.category];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[75vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Achievement
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="pb-8">
          {/* Achievement Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center py-6"
          >
            <div
              className={cn(
                'w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-4 shadow-xl',
                achievement.isUnlocked
                  ? `bg-gradient-to-br ${tierColors[achievement.tier]}`
                  : 'bg-muted/50 border-2 border-dashed border-border'
              )}
            >
              {achievement.isUnlocked ? (
                <span className="drop-shadow-lg">{achievement.icon}</span>
              ) : (
                <Lock className="w-10 h-10 text-muted-foreground/50" />
              )}
            </div>

            <h2 className={cn(
              'text-xl font-bold mb-1',
              achievement.isUnlocked ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {achievement.name}
            </h2>

            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {achievement.description}
            </p>

            {/* Tier Badge */}
            <div className={cn(
              'mt-3 px-3 py-1 rounded-full text-xs font-medium capitalize',
              tierBgColors[achievement.tier],
              achievement.tier === 'bronze' && 'text-amber-600',
              achievement.tier === 'silver' && 'text-slate-500',
              achievement.tier === 'gold' && 'text-yellow-600',
              achievement.tier === 'platinum' && 'text-cyan-500',
            )}>
              {achievement.tier} Tier
            </div>
          </motion.div>

          {/* Progress Section */}
          <div className={cn(
            'rounded-2xl p-4 mb-4',
            achievement.isUnlocked ? 'bg-primary/5' : 'bg-muted/30'
          )}>
            {achievement.isUnlocked ? (
              <div className="text-center">
                <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Unlocked!</p>
                {achievement.unlockedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(achievement.progress)}%
                  </span>
                </div>
                <Progress value={achievement.progress} className="h-2 mb-3" />
                <p className="text-xs text-muted-foreground">
                  {Math.ceil(achievement.requirement * (1 - achievement.progress / 100))} more to unlock
                </p>
              </>
            )}
          </div>

          {/* How to Unlock */}
          {!achievement.isUnlocked && (
            <div className="rounded-2xl bg-secondary/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">How to unlock</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {achievement.hint}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Current: {achievement.currentValue} / {achievement.requirement}
              </p>
            </div>
          )}

          {/* Category Info */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <CategoryIcon className="w-3.5 h-3.5" />
            <span>{categoryLabels[achievement.category]}</span>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
