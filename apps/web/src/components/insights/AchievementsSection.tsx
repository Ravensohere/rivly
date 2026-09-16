import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, ChevronRight, Sparkles, Target, CheckCircle2, Flame, Clock, Moon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAchievements } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';

const tierColors = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-slate-300 to-slate-500',
  gold: 'from-yellow-400 to-amber-500',
  platinum: 'from-cyan-300 to-blue-500',
};

const tierBorderColors = {
  bronze: 'border-amber-600/40',
  silver: 'border-slate-400/40',
  gold: 'border-yellow-500/40',
  platinum: 'border-cyan-400/40',
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
  streaks: Flame,
  milestones: Clock,
  reflect: Moon,
};

const categoryLabels = {
  focus: 'Focus Sessions',
  tasks: 'Tasks Completed',
  streaks: 'Streaks',
  milestones: 'Focus Time',
  reflect: 'Reflections',
};

interface AchievementBadgeProps {
  achievement: ReturnType<typeof useAchievements>['allAchievements'][0];
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onClick?: () => void;
}

function AchievementBadge({ achievement, size = 'md', showProgress = false, onClick }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={cn(
        'relative rounded-full flex items-center justify-center transition-all',
        sizeClasses[size],
        achievement.isUnlocked 
          ? `bg-gradient-to-br ${tierColors[achievement.tier]} shadow-lg`
          : 'bg-muted/50 border border-border/50',
        onClick && "cursor-pointer"
      )}
    >
      {achievement.isUnlocked ? (
        <span className="drop-shadow-md">{achievement.icon}</span>
      ) : (
        <Lock className="w-5 h-5 text-muted-foreground/50" />
      )}
      
      {/* New badge indicator */}
      {achievement.isUnlocked && !achievement.seen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
        >
          <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
        </motion.div>
      )}

      {/* Progress ring for locked achievements */}
      {!achievement.isUnlocked && showProgress && achievement.progress > 0 && (
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="hsl(var(--primary) / 0.3)"
            strokeWidth="3"
            strokeDasharray={`${(achievement.progress / 100) * 175.9} 175.9`}
            className="transition-all duration-500"
          />
        </svg>
      )}
    </motion.div>
  );
}

interface AchievementDetailProps {
  achievement: ReturnType<typeof useAchievements>['allAchievements'][0];
}

function AchievementDetail({ achievement }: AchievementDetailProps) {
  const CategoryIcon = categoryIcons[achievement.category];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-2xl border',
        achievement.isUnlocked 
          ? `${tierBgColors[achievement.tier]} ${tierBorderColors[achievement.tier]}`
          : 'bg-muted/30 border-border/40'
      )}
    >
      <div className="flex items-start gap-4">
        <AchievementBadge achievement={achievement} size="lg" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              'font-semibold',
              achievement.isUnlocked ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {achievement.name}
            </h4>
            {achievement.isUnlocked && !achievement.seen && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                NEW
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {achievement.description}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CategoryIcon className="w-3.5 h-3.5" />
            <span>{categoryLabels[achievement.category]}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className={cn(
              'capitalize font-medium',
              achievement.tier === 'bronze' && 'text-amber-600',
              achievement.tier === 'silver' && 'text-slate-400',
              achievement.tier === 'gold' && 'text-yellow-500',
              achievement.tier === 'platinum' && 'text-cyan-400',
            )}>
              {achievement.tier}
            </span>
          </div>
          
          {!achievement.isUnlocked && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-medium">{Math.round(achievement.progress)}%</span>
              </div>
              <Progress value={achievement.progress} className="h-1.5" />
            </div>
          )}
          
          {achievement.isUnlocked && achievement.unlockedAt && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AchievementsSection() {
  const { 
    allAchievements, 
    achievementsByCategory, 
    unlockedCount, 
    totalCount,
    newAchievements,
    markAllAsSeen,
  } = useAchievements();
  
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && newAchievements.length > 0) {
      // Mark all as seen when opening the sheet
      setTimeout(() => markAllAsSeen(), 500);
    }
  };

  // Get recently unlocked (up to 4)
  const recentlyUnlocked = allAchievements
    .filter(a => a.isUnlocked)
    .sort((a, b) => {
      if (!a.unlockedAt || !b.unlockedAt) return 0;
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    })
    .slice(0, 4);

  // Get next achievements to earn (closest to completion)
  const nextToEarn = allAchievements
    .filter(a => !a.isUnlocked && a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.5 }}
      className="bg-card rounded-2xl border border-border/40 p-4"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <button className="w-full text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Achievements</h3>
                  <p className="text-xs text-muted-foreground">{unlockedCount}/{totalCount} unlocked</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {newAchievements.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full"
                  >
                    {newAchievements.length} new
                  </motion.span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Recent badges preview */}
            <div className="flex items-center gap-2">
              {recentlyUnlocked.length > 0 ? (
                recentlyUnlocked.map((achievement, i) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <AchievementBadge achievement={achievement} size="sm" />
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Complete tasks and focus sessions to earn badges!</p>
              )}
              
              {unlockedCount > 4 && (
                <span className="text-sm text-muted-foreground ml-1">
                  +{unlockedCount - 4}
                </span>
              )}
            </div>

            {/* Next to earn */}
            {nextToEarn.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground mb-2">Next to earn</p>
                <div className="space-y-2">
                  {nextToEarn.map(achievement => (
                    <div key={achievement.id} className="flex items-center gap-2">
                      <span className="text-lg">{achievement.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{achievement.name}</p>
                        <Progress value={achievement.progress} className="h-1 mt-1" />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(achievement.progress)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievements
              <span className="text-sm font-normal text-muted-foreground">
                {unlockedCount}/{totalCount}
              </span>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="all" className="flex-1">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="focus" className="text-xs">Focus</TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
              <TabsTrigger value="reflect" className="text-xs">Reflect</TabsTrigger>
              <TabsTrigger value="streaks" className="text-xs">Streaks</TabsTrigger>
              <TabsTrigger value="milestones" className="text-xs">Time</TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto max-h-[calc(85vh-180px)] pb-8">
              <TabsContent value="all" className="space-y-3 mt-0">
                <AnimatePresence>
                  {allAchievements.map((achievement, i) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <AchievementDetail achievement={achievement} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </TabsContent>

              {(['focus', 'tasks', 'reflect', 'streaks', 'milestones'] as const).map(category => (
                <TabsContent key={category} value={category} className="space-y-3 mt-0">
                  <AnimatePresence>
                    {achievementsByCategory[category].map((achievement, i) => (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <AchievementDetail achievement={achievement} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
