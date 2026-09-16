import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Timer, CheckCircle2, Moon, TrendingUp, TrendingDown, 
  Minus, Flame, Calendar, User, Lock, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  ResponsiveContainer, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { PageTransition } from '@/components/ui/PageTransition';
import { GoalsSection } from '@/components/insights/GoalsSection';
import { AchievementsSection } from '@/components/insights/AchievementsSection';
import { ActivityHeatmap } from '@/components/insights/ActivityHeatmap';
import { DebugPanel } from '@/components/insights/DebugPanel';
import { Progress } from '@/components/ui/progress';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { formatDayLabel, formatDateLabel } from '@/lib/aggregation';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { safeNumber, formatFocusTime, getLocalDateKey } from '@/lib/focusTotals';
import { FeedbackModal } from '@/components/settings/FeedbackModal';
import { getPatternInsights } from '@/lib/patternInsights';
import { Sparkles } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { RhythmReportCard } from '@/components/analytics/RhythmReportCard';
import { generateMonthlyReport } from '@/lib/rhythmReport';
import { useFocusSessions } from '@/hooks/useFocusSessions';
import { useTasks } from '@/hooks/useTasks';
import { useCheckIn } from '@/hooks/useCheckIn';

// ===== Types & Constants =====

type ViewRange = 'day' | 'week' | 'month';

interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  delay?: number;
  tone?: 'primary' | 'success' | 'night' | 'warning';
  progress?: { current: number; total: number };
}

const INSIGHT_ICON_TONE_CLASSES: Record<NonNullable<InsightCardProps['tone']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  night: 'bg-night-accent/10 text-night-accent',
  warning: 'bg-warning/10 text-warning',
};

const VIEW_RANGE_OPTIONS: { value: ViewRange; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

// ===== Components =====

function InsightCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  delay = 0,
  tone = 'primary',
  progress,
}: InsightCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-400' : 'text-muted-foreground';

  const progressPercent = progress ? Math.min(100, Math.round((progress.current / Math.max(1, progress.total)) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-card rounded-2xl border border-border/40 p-4"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${INSIGHT_ICON_TONE_CLASSES[tone]}`}
        >
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trendValue}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground/70 mt-1">{subtitle}</div>}

      {progress && progress.total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>
              {progress.current} / {progress.total}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      )}
    </motion.div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  delay?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
}

function ChartCard({ title, subtitle, children, delay = 0, emptyMessage, isEmpty }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-card rounded-2xl border border-border/40 p-4 mb-4"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {isEmpty ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{emptyMessage || 'No data yet'}</p>
        </div>
      ) : (
        children
      )}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium text-foreground">
            {entry.value} {entry.name}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ===== Main Component =====

export default function InsightsPage() {
  const navigate = useNavigate();
  const { isGuest } = useAuthContext();
  const { firstName } = useUserPreferences();
  const [viewRange, setViewRange] = useState<ViewRange>('week');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showRhythmReport, setShowRhythmReport] = useState(false);

  // Rhythm report — generate lazily for current month
  const { sessions: allSessions } = useFocusSessions();
  const { tasks: allTasks } = useTasks();
  const { checkIns: allCheckIns } = useCheckIn();
  const now = new Date();
  const rhythmReport = useMemo(
    () => generateMonthlyReport(allSessions ?? [], allCheckIns ?? [], allTasks ?? [], now.getMonth() + 1, now.getFullYear()),
    [allSessions, allCheckIns, allTasks, now.getMonth(), now.getFullYear()]
  );
  
  // Use the canonical focus totals hook - SINGLE SOURCE OF TRUTH
  const { today: todayFocus, week: weekFocus, focusStreak } = useFocusTotals();
  
  // Use the Events Ledger for other data
  const {
    isLoaded,
    timeRange,
    setTimeRange,
    focusByDay,
    tasksByDay,
    sleepByDay,
    totalCompletedTasks,
    totalCreatedTasks,
    sleepDistribution,
    focusSessions,
    todayCompletedTasks,
    todayCreatedTasks,
    todaySleepEvent,
    moodByDay,
    energyByDay,
    todayCheckInEvent,
  } = useEventsLedgerContext();

  // Sync viewRange with ledger timeRange
  const effectiveTimeRange = useMemo(() => {
    if (viewRange === 'day') return 'week'; // Day view still uses week data for charts but filters
    if (viewRange === 'month') return 'month';
    return 'week';
  }, [viewRange]);

  // Update ledger time range when view changes
  // Update ledger time range when view changes
  useEffect(() => {
    if (effectiveTimeRange !== timeRange) {
      setTimeRange(effectiveTimeRange as 'week' | 'month' | '3months');
    }
  }, [effectiveTimeRange, timeRange, setTimeRange]);

  // Transform data for charts with memoization - using LOCAL dateKey
  const focusChartData = useMemo(() => {
    const today = getLocalDateKey();
    if (viewRange === 'day') {
      const todayData = focusByDay.find(d => d.dateKey === today);
      return [{
        day: 'Today',
        date: formatDateLabel(today),
        minutes: safeNumber(todayData?.value),
      }];
    }
    return focusByDay.map(d => ({
      day: viewRange === 'month' ? formatDateLabel(d.dateKey) : formatDayLabel(d.dateKey),
      date: formatDateLabel(d.dateKey),
      minutes: safeNumber(d.value),
    }));
  }, [focusByDay, viewRange]);

  const taskChartData = useMemo(() => {
    const today = getLocalDateKey();
    if (viewRange === 'day') {
      const todayData = tasksByDay.find(d => d.dateKey === today);
      return [{
        day: 'Today',
        date: formatDateLabel(today),
        completed: safeNumber(todayData?.value),
      }];
    }
    return tasksByDay.map(d => ({
      day: viewRange === 'month' ? formatDateLabel(d.dateKey) : formatDayLabel(d.dateKey),
      date: formatDateLabel(d.dateKey),
      completed: safeNumber(d.value),
    }));
  }, [tasksByDay, viewRange]);

  const sleepChartData = useMemo(() => {
    const today = getLocalDateKey();
    if (viewRange === 'day') {
      const todayData = sleepByDay.find(d => d.dateKey === today);
      const quality = safeNumber(todayData?.value);
      return [{
        day: 'Today',
        date: formatDateLabel(today),
        quality,
        qualityLabel: quality === 0 ? 'No data' : quality === 1 ? 'Poor' : quality === 2 ? 'Okay' : 'Good',
        hasData: quality > 0,
      }];
    }
    return sleepByDay.map(d => ({
      day: viewRange === 'month' ? formatDateLabel(d.dateKey) : formatDayLabel(d.dateKey),
      date: formatDateLabel(d.dateKey),
      quality: safeNumber(d.value),
      qualityLabel: d.value === 0 ? 'No data' : d.value === 1 ? 'Poor' : d.value === 2 ? 'Okay' : 'Good',
      hasData: d.value > 0,
    }));
  }, [sleepByDay, viewRange]);

  const moodChartData = useMemo(() => {
    const today = getLocalDateKey();
    if (viewRange === 'day') {
      const todayData = moodByDay.find(d => d.dateKey === today);
      const mood = safeNumber(todayData?.value);
      return [{
        day: 'Today',
        date: formatDateLabel(today),
        mood,
        moodLabel: ['', '😔', '😕', '😐', '🙂', '😊'][mood] || 'No data',
        hasData: mood > 0,
      }];
    }
    return moodByDay.map(d => ({
      day: viewRange === 'month' ? formatDateLabel(d.dateKey) : formatDayLabel(d.dateKey),
      date: formatDateLabel(d.dateKey),
      mood: safeNumber(d.value),
      moodLabel: ['', '😔', '😕', '😐', '🙂', '😊'][d.value] || 'No data',
      hasData: d.value > 0,
    }));
  }, [moodByDay, viewRange]);

  const energyChartData = useMemo(() => {
    const today = getLocalDateKey();
    if (viewRange === 'day') {
      const todayData = energyByDay.find(d => d.dateKey === today);
      const energy = safeNumber(todayData?.value);
      return [{
        day: 'Today',
        date: formatDateLabel(today),
        energy,
        energyLabel: energy === 0 ? 'No data' : energy === 1 ? 'Low' : energy === 2 ? 'Medium' : 'High',
        hasData: energy > 0,
      }];
    }
    return energyByDay.map(d => ({
      day: viewRange === 'month' ? formatDateLabel(d.dateKey) : formatDayLabel(d.dateKey),
      date: formatDateLabel(d.dateKey),
      energy: safeNumber(d.value),
      energyLabel: d.value === 0 ? 'No data' : d.value === 1 ? 'Low' : d.value === 2 ? 'Medium' : 'High',
      hasData: d.value > 0,
    }));
  }, [energyByDay, viewRange]);

  // Compute stats based on view range - using safe canonical totals
  const stats = useMemo(() => {
    const today = getLocalDateKey();
    
    if (viewRange === 'day') {
      // Today's stats - use canonical focus totals
      const todaySessions = focusSessions.filter(s => s.dateKey === today);
      return {
        totalFocusMinutes: todayFocus.minutes,
        totalSessions: todaySessions.length,
        totalTasksCompleted: safeNumber(todayCompletedTasks),
        totalTasksCreated: safeNumber(todayCreatedTasks),
        goodSleepDays: todaySleepEvent?.rating === 'good' ? 1 : 0,
        daysWithSleepData: todaySleepEvent ? 1 : 0,
        currentStreak: safeNumber(focusStreak),
        activePercent: todayFocus.minutes > 0 || todayCompletedTasks > 0 ? 100 : 0,
        formatted: todayFocus.formatted,
      };
    }

    // Week/Month stats - use canonical focus totals
    const weekFocusMinutes = weekFocus.minutes;
    const totalSessions = focusSessions.length;
    const daysWithFocus = new Set(focusByDay.filter(d => d.value > 0).map(d => d.dateKey));
    const daysWithTasks = new Set(tasksByDay.filter(d => d.value > 0).map(d => d.dateKey));
    const daysActive = new Set([...daysWithFocus, ...daysWithTasks]).size;
    const totalDays = focusByDay.length || 1;
    const activePercent = totalDays > 0 ? Math.round((daysActive / totalDays) * 100) : 0;
    
    const goodSleepDays = sleepDistribution.good;
    const daysWithSleepData = sleepDistribution.good + sleepDistribution.okay + sleepDistribution.poor;
    
    return {
      totalFocusMinutes: weekFocusMinutes,
      totalSessions,
      totalTasksCompleted: safeNumber(totalCompletedTasks),
      totalTasksCreated: safeNumber(totalCreatedTasks),
      goodSleepDays,
      daysWithSleepData,
      currentStreak: safeNumber(focusStreak),
      activePercent,
      formatted: weekFocus.formatted,
    };
  }, [
    viewRange, 
    todayFocus,
    weekFocus,
    todayCompletedTasks, 
    todayCreatedTasks, 
    todaySleepEvent,
    totalCompletedTasks, 
    totalCreatedTasks, 
    focusStreak, 
    sleepDistribution, 
    focusSessions, 
    focusByDay, 
    tasksByDay
  ]);

  // Pattern recognition insights (memory engine)
  const patternInsights = useMemo(
    () => getPatternInsights(focusByDay, moodByDay, energyByDay, sleepByDay),
    [focusByDay, moodByDay, energyByDay, sleepByDay]
  );

  // Check if charts have any data
  const hasFocusData = focusChartData.some(d => d.minutes > 0);
  const hasTaskData = taskChartData.some(d => d.completed > 0);
  const hasSleepData = sleepChartData.some(d => d.hasData);
  const hasCheckInData = moodByDay.some(d => d.value > 0) || energyByDay.some(d => d.value > 0);

  // Colors for charts - using semantic colors
  const primaryColor = 'hsl(235, 35%, 55%)';
  const successColor = 'hsl(165, 40%, 50%)';
  const energyColor = 'hsl(45, 90%, 50%)';
  const sleepQualityColors = ['hsl(var(--muted))', '#f87171', '#fbbf24', '#4ade80'];

  const getRangeLabel = () => {
    switch (viewRange) {
      case 'day': return 'Today';
      case 'week': return 'Last 7 days';
      case 'month': return 'Last 30 days';
      default: return 'Last 7 days';
    }
  };

  if (!isLoaded) {
    return (
      <PageTransition className="page-container">
        <div className="content-wrapper pt-6 sm:pt-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading insights...</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="page-container relative">
      <div className={`content-wrapper pt-6 sm:pt-8 pb-28 overflow-y-auto max-h-[calc(100dvh-var(--safe-area-inset-bottom,0px)-80px)] ${isGuest ? 'blur-sm pointer-events-none select-none opacity-50' : ''}`}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">{getRangeLabel()}</span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                {viewRange === 'day' ? 'Today\'s' : viewRange === 'week' ? 'Weekly' : 'Monthly'} Insights
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Your rhythm at a glance
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* See Your Month Button */}
              <Button
                onClick={() => setShowRhythmReport(true)}
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-4 h-4" />
                See Your Month
              </Button>
              {/* Mobile: Icon-only button */}
              <button
                onClick={() => setShowRhythmReport(true)}
                className="sm:hidden w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(129, 140, 248, 0.15)' }}
              >
                <Sparkles className="w-5 h-5 text-primary" />
              </button>
            </div>

            {/* Profile Button */}
            <motion.button
              onClick={() => navigate('/profile')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60
                flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 4px 16px -4px hsl(var(--primary) / 0.4)' }}
            >
              {firstName ? (
                <span className="text-lg font-bold text-primary-foreground">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="w-6 h-6 text-primary-foreground" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Time Range Toggle - Day / Week / Month */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          className="mb-5"
        >
          <div className="flex gap-2 bg-muted/50 rounded-xl p-1">
            {VIEW_RANGE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setViewRange(option.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  viewRange === option.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Today's Rhythm Summary */}
        {viewRange === 'day' && todayCheckInEvent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {['', '😔', '😕', '😐', '🙂', '😊'][todayCheckInEvent.mood]}
              </div>
              <div>
                <h3 className="font-semibold text-foreground capitalize">
                  Feeling {['', 'Low', 'Meh', 'Okay', 'Good', 'Great'][todayCheckInEvent.mood]}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Today's Intention: <span className="text-primary font-medium capitalize">{todayCheckInEvent.intent}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== 3 ADJUSTMENTS PANEL (top — above charts) ===== */}
        {viewRange === 'week' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07, duration: 0.5 }}
            className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  This week, do these 3 things
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Based on your rhythm data</p>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-2.5">
              {/* Adjustment 1: Best focus window */}
              <div className="flex gap-3 items-start p-3 rounded-xl bg-background/50">
                <span className="text-lg shrink-0">⏰</span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {hasFocusData
                      ? 'Protect your best focus window'
                      : 'Log your first focus session'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasFocusData
                      ? `You have ${stats.totalSessions} session${stats.totalSessions !== 1 ? 's' : ''} this week. Block a recurring time and guard it.`
                      : 'Start with just 25 minutes. Consistency matters more than duration.'}
                  </p>
                </div>
              </div>

              {/* Adjustment 2: Task completion / distraction pattern */}
              <div className="flex gap-3 items-start p-3 rounded-xl bg-background/50">
                <span className="text-lg shrink-0">✅</span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {stats.totalTasksCompleted > 0 && stats.totalTasksCreated > 0
                      ? `Finish ${stats.totalTasksCreated - stats.totalTasksCompleted > 0 ? (stats.totalTasksCreated - stats.totalTasksCompleted) + ' unfinished' : 'all planned'} tasks before adding new ones`
                      : 'Add 3 tasks and complete them before Friday'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.totalTasksCompleted}/{stats.totalTasksCreated} tasks done this week. Less planning, more finishing.
                  </p>
                </div>
              </div>

              {/* Adjustment 3: Sleep → performance correlation */}
              <div className="flex gap-3 items-start p-3 rounded-xl bg-background/50">
                <span className="text-lg shrink-0">🌙</span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {stats.goodSleepDays >= 4
                      ? 'Good sleep streak — protect your wind-down time'
                      : stats.daysWithSleepData === 0
                      ? 'Log your sleep quality in check-in'
                      : 'Improve sleep quality to unlock better focus'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.goodSleepDays >= 4
                      ? `${stats.goodSleepDays} good sleep nights this week. Keep the routine.`
                      : 'Sleep quality directly impacts your focus capacity the next day.'}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => {}}
                className="w-full mt-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Apply next week's plan →
              </button>
            </div>
          </motion.div>
        )}

        {/* ===== CHARTS SECTION (First as per "2nd image" layout) ===== */}
        
        {/* Focus Time Chart */}
        <ChartCard
          title="Focus Time"
          subtitle="Minutes per day"
          delay={0.1}
          isEmpty={!hasFocusData}
          emptyMessage="No focus sessions logged yet"
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={focusChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  name="min"
                  stroke={primaryColor}
                  strokeWidth={2}
                  fill="url(#focusGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Tasks Completed Chart */}
        <ChartCard
          title="Tasks Completed"
          subtitle="Daily task completion"
          delay={0.15}
          isEmpty={!hasTaskData}
          emptyMessage="No tasks completed yet"
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="completed" 
                  name="tasks"
                  radius={[4, 4, 0, 0]}
                >
                  {taskChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.completed > 0 ? successColor : 'hsl(var(--muted))'}
                      opacity={entry.completed > 0 ? 0.8 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        {/* Daily Rhythm Charts */}
        {hasCheckInData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ChartCard
              title="Mood Rhythm"
              subtitle="Your daily emotional state"
              delay={0.18}
            >
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      domain={[0, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={(value) => ['', '😔', '😕', '😐', '🙂', '😊'][value] || ''}
                    />
                    <Tooltip 
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-center">
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <p className="text-xl mt-1">{data.moodLabel}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="mood" 
                      radius={[4, 4, 0, 0]}
                    >
                      {moodChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={primaryColor}
                          opacity={entry.hasData ? 0.6 + (entry.mood * 0.08) : 0.1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Energy Flow"
              subtitle="Daily energy levels"
              delay={0.19}
            >
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={energyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={energyColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={energyColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      domain={[0, 3]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(value) => ['', 'Low', 'Med', 'High'][value] || ''}
                    />
                    <Tooltip 
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <p className="text-sm font-medium text-foreground">Energy: {data.energyLabel}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="energy"
                      stroke={energyColor}
                      strokeWidth={2}
                      fill="url(#energyGradient)"
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        )}

        {/* Sleep Analytics */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg font-semibold text-foreground mb-3 mt-6"
        >
          Sleep & Recovery
        </motion.h2>
        <ChartCard
          title="Sleep Quality"
          subtitle="Sleep analytics — quality over time"
          delay={0.2}
          isEmpty={!hasSleepData}
          emptyMessage="No sleep data logged yet"
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  domain={[0, 3]}
                  ticks={[1, 2, 3]}
                  tickFormatter={(value) => ['', 'Poor', 'Okay', 'Good'][value] || ''}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-medium text-foreground capitalize">{data.qualityLabel}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="quality" 
                  radius={[4, 4, 0, 0]}
                >
                  {sleepChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={sleepQualityColors[entry.quality]}
                      opacity={entry.hasData ? 0.8 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: sleepQualityColors[1] }} />
              <span className="text-xs text-muted-foreground">Poor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: sleepQualityColors[2] }} />
              <span className="text-xs text-muted-foreground">Okay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: sleepQualityColors[3] }} />
              <span className="text-xs text-muted-foreground">Good</span>
            </div>
          </div>
        </ChartCard>

        {/* Pattern recognition (memory engine) */}
        {patternInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mb-5"
          >
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Patterns
            </h2>
            <div className="space-y-2">
              {patternInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground"
                >
                  {insight.text}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== SUMMARY METRIC CARDS GRID (2x2) ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mb-5"
        >
          <h2 className="text-lg font-semibold text-foreground mb-3">Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <InsightCard
              title="Focus Time"
              value={`${Math.floor(stats.totalFocusMinutes / 60)}h ${stats.totalFocusMinutes % 60}m`}
              subtitle={`${stats.totalSessions} sessions`}
              icon={<Timer className="w-5 h-5" />}
              trend={stats.totalFocusMinutes > 60 ? 'up' : 'neutral'}
              delay={0.3}
              tone="primary"
            />

            <InsightCard
              title="Tasks Done"
              value={stats.totalTasksCompleted}
              subtitle={`${stats.activePercent}% ${viewRange === 'day' ? 'progress' : 'days active'}`}
              icon={<CheckCircle2 className="w-5 h-5" />}
              trend={stats.activePercent >= 70 ? 'up' : stats.activePercent >= 40 ? 'neutral' : 'down'}
              delay={0.35}
              tone="success"
              progress={
                stats.totalTasksCreated > 0
                  ? {
                      current: stats.totalTasksCompleted,
                      total: stats.totalTasksCreated,
                    }
                  : undefined
              }
            />

            <InsightCard
              title="Good Sleep"
              value={
                stats.daysWithSleepData === 0 
                  ? '0 nights' 
                  : `${stats.goodSleepDays} night${stats.goodSleepDays !== 1 ? 's' : ''}`
              }
              subtitle={
                stats.daysWithSleepData === 0 
                  ? 'no sleep data logged' 
                  : `of ${stats.daysWithSleepData} nights rated good`
              }
              icon={<Moon className="w-5 h-5" />}
              delay={0.4}
              tone="night"
            />

            <InsightCard
              title="Focus Streak"
              value={stats.currentStreak}
              subtitle="consecutive days"
              icon={<Flame className="w-5 h-5" />}
              trend={stats.currentStreak >= 3 ? 'up' : 'neutral'}
              trendValue={stats.currentStreak >= 3 ? 'on fire!' : undefined}
              delay={0.45}
              tone="warning"
            />
          </div>
        </motion.div>

        {/* Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mb-5"
        >
          <ActivityHeatmap />
        </motion.div>

        {/* Achievements */}
        <div className="mb-5">
          <AchievementsSection />
        </div>

        {/* Weekly Goals */}
        <div className="mb-5">
          <GoalsSection />
        </div>

        {/* Weekly Tip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-5 p-4 rounded-2xl bg-primary/5 border border-primary/10"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm mb-1">
                {stats.currentStreak >= 3 ? 'Great momentum!' : 'Build your streak'}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {stats.currentStreak >= 3 
                  ? `You've focused for ${stats.currentStreak} consecutive days. Keep it up!`
                  : 'Try to focus for at least a few minutes each day to build a consistent rhythm.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Send Feedback Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.52 }}
          onClick={() => setShowFeedback(true)}
          className="w-full mt-5 py-3 px-4 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20 text-sm text-primary font-medium transition-all flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          Send Feedback
        </motion.button>

        {/* Settings Link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          onClick={() => navigate('/settings')}
          className="w-full mt-3 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Settings & Preferences →
        </motion.button>
      </div>
      
      {/* Debug Panel - Dev only */}
      <DebugPanel />

      {/* Feedback Modal */}
      <FeedbackModal open={showFeedback} onOpenChange={setShowFeedback} />

      {/* Rhythm Report Modal */}
      {showRhythmReport && (
        <RhythmReportCard
          report={rhythmReport}
          onClose={() => setShowRhythmReport(false)}
        />
      )}

      {/* Guest Lock Overlay */}
      {isGuest && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-card/90 backdrop-blur-md p-8 rounded-3xl border border-border shadow-xl text-center max-w-xs mx-4">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Insights are Locked</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Sign in to track your progress, view trends, and see your growth over time.
            </p>
            <Link to="/login">
              <Button className="w-full rounded-full">
                Sign in to Unlock
              </Button>
            </Link>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
