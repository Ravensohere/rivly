import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Trophy, Target, CheckCircle2, Flame, Clock, 
  TrendingUp, Calendar, Star, Award, Zap, Crown,
  Settings, Edit3, Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/ui/PageTransition';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAchievements } from '@/hooks/useAchievements';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { EditProfileSheet } from '@/components/profile/EditProfileSheet';
import { ShareProgressCard } from '@/components/profile/ShareProgressCard';
import { AchievementDetailSheet } from '@/components/profile/AchievementDetailSheet';
import { format } from 'date-fns';

// Quick stat for profile header
interface QuickStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

function QuickStat({ label, value, icon }: QuickStatProps) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
        <div className="text-primary">{icon}</div>
      </div>
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// Achievement Badge for Showcase
interface ShowcaseBadgeProps {
  achievement: {
    id: string;
    name: string;
    icon: string;
    tier: string;
    isUnlocked: boolean;
  };
  delay?: number;
  onClick?: () => void;
}

function ShowcaseBadge({ achievement, delay = 0, onClick }: ShowcaseBadgeProps) {
  const tierColors = {
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-slate-300 to-slate-500',
    gold: 'from-yellow-400 to-amber-500',
    platinum: 'from-violet-400 to-purple-600',
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="relative group"
    >
      <div 
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
          bg-gradient-to-br ${tierColors[achievement.tier as keyof typeof tierColors]}
          shadow-lg transform transition-transform group-hover:scale-110`}
      >
        {achievement.icon}
      </div>
    </motion.button>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { firstName, tagline, createdAt, dailyFocusGoal, dailyTaskGoal } = useUserPreferences();
  const { allAchievements, unlockedCount, totalCount, stats } = useAchievements();
  const { week, focusStreak } = useFocusTotals();
  const { taskEvents } = useEventsLedgerContext();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showShareProgress, setShowShareProgress] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<typeof allAchievements[0] | null>(null);

  // Calculate week tasks completed from ledger
  const weekTasksCompleted = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const completed = taskEvents.filter(e => 
      e.type === 'completed' && e.dateKey >= weekAgoStr
    ).length;
    const uncompleted = taskEvents.filter(e => 
      e.type === 'uncompleted' && e.dateKey >= weekAgoStr
    ).length;
    
    return Math.max(0, completed - uncompleted);
  }, [taskEvents]);

  // Get top unlocked achievements for showcase
  const showcaseAchievements = useMemo(() => {
    const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    return allAchievements
      .filter(a => a.isUnlocked)
      .sort((a, b) => tierOrder[a.tier as keyof typeof tierOrder] - tierOrder[b.tier as keyof typeof tierOrder])
      .slice(0, 6);
  }, [allAchievements]);

  // Calculate completion percentage
  const achievementProgress = Math.round((unlockedCount / totalCount) * 100);

  // Member since text
  const memberSince = createdAt 
    ? format(new Date(createdAt), 'MMMM yyyy')
    : 'Welcome to Rivly';

  return (
    <PageTransition className="pb-32">
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 
              flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.4)' }}
          >
            {firstName ? (
              <span className="text-3xl font-bold text-primary-foreground">
                {firstName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-10 h-10 text-primary-foreground" />
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-semibold text-foreground"
          >
            {firstName || 'Your Profile'}
          </motion.h1>

          {tagline && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm text-primary mt-1"
            >
              {tagline}
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-muted-foreground mt-1"
          >
            {memberSince}
          </motion.p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="grid grid-cols-4 gap-2 mb-5"
        >
          <QuickStat
            label="Focus"
            value={week.formatted}
            icon={<Clock className="w-5 h-5" />}
          />
          <QuickStat
            label="Sessions"
            value={week.sessions}
            icon={<Target className="w-5 h-5" />}
          />
          <QuickStat
            label="Tasks"
            value={weekTasksCompleted}
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
          <QuickStat
            label="Streak"
            value={focusStreak}
            icon={<Flame className="w-5 h-5" />}
          />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex gap-3 mb-5"
        >
          <Button
            variant="outline"
            onClick={() => setShowEditProfile(true)}
            className="flex-1 h-11 rounded-xl"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowShareProgress(true)}
            className="flex-1 h-11 rounded-xl"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Week
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="h-11 w-11 rounded-xl p-0"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Achievement Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="bg-card rounded-2xl border border-border/40 p-5 mb-5"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-foreground">Achievements</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {unlockedCount} / {totalCount}
            </span>
          </div>
          <Progress value={achievementProgress} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            {achievementProgress}% complete • {totalCount - unlockedCount} more to unlock
          </p>
        </motion.div>

        {/* Achievements Showcase */}
        {showcaseAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-card rounded-2xl border border-border/40 p-5 mb-5"
            style={{ boxShadow: 'var(--shadow-soft)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Trophy Case</span>
            </div>
            <div className="flex flex-wrap gap-4 justify-center pb-4">
              {showcaseAchievements.map((achievement, index) => (
                <ShowcaseBadge
                  key={achievement.id}
                  achievement={achievement}
                  delay={0.5 + index * 0.1}
                  onClick={() => setSelectedAchievement(achievement)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Lifetime Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="bg-card rounded-2xl border border-border/40 p-5 mb-5"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Lifetime Stats</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Focus Time</span>
              </div>
              <span className="font-semibold text-foreground">
                {Math.floor(stats.totalFocusMinutes / 60)}h {stats.totalFocusMinutes % 60}m
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Focus Sessions</span>
              </div>
              <span className="font-semibold text-foreground">{stats.totalSessions}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Tasks Completed</span>
              </div>
              <span className="font-semibold text-foreground">{stats.totalTasksCompleted}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Longest Streak</span>
              </div>
              <span className="font-semibold text-foreground">{stats.longestStreak} days</span>
            </div>
          </div>
        </motion.div>

        {/* Motivation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="p-5 rounded-2xl bg-primary/5 border border-primary/10 text-center"
        >
          <Award className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-foreground font-medium">
            {stats.totalSessions >= 50
              ? "You're a focus master! Keep pushing your limits."
              : stats.totalSessions >= 10
                ? "Great progress! Consistency is your superpower."
                : "Every session counts. You're building something amazing."}
          </p>
        </motion.div>
      </div>

      {/* Sheets */}
      <EditProfileSheet 
        open={showEditProfile} 
        onOpenChange={setShowEditProfile} 
      />
      <ShareProgressCard 
        open={showShareProgress} 
        onOpenChange={setShowShareProgress} 
      />
      <AchievementDetailSheet
        achievement={selectedAchievement}
        open={!!selectedAchievement}
        onOpenChange={(open) => !open && setSelectedAchievement(null)}
      />
    </PageTransition>
  );
}
