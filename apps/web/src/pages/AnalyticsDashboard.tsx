import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Users, Activity, TrendingUp, Clock, CheckCircle, Brain, Moon, Sparkles, Zap, CreditCard, AlertTriangle, Target, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDashboard as WaitlistAdmin } from './AdminDashboard';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_API_URL = import.meta.env.VITE_WORKER_URL || 'https://rivly-api.gnvenkatapathiraju.workers.dev';
const ADMIN_EMAILS = ['gnvenkatapathiraju@gmail.com', 'ravenso.here@gmail.com'];

interface AdminStats {
  timestamp: string;
  users: {
    total: number;
    dau: number;
    wau: number;
    mau: number;
    dauYesterday: number;
    dauGrowth: string;
    retentionRate7Day: string;
    proUsers: number;
    waitlistApproved: number;
  };
  engagement: {
    focusSessions: {
      total: number;
      totalMinutes: number;
      avgMinutesPerSession: number;
      usersWithFocus: number;
    };
    tasks: {
      created: number;
      completed: number;
      completionRate: string;
    };
    checkIns: {
      total: number;
      usersWithCheckIn: number;
    };
    reflections: {
      total: number;
      usersWithReflection: number;
    };
    sleep: {
      total: number;
      usersWithSleep: number;
    };
  };
  credits: {
    totalDistributed: number;
    avgPerUser: number;
  };
  waitlist: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

interface TimelineData {
  timeline: Array<{
    date: string;
    activeUsers: number;
    totalEvents: number;
    focusSessions: number;
    tasksCreated: number;
    reflections: number;
  }>;
}

interface FeatureAdoption {
  totalActiveUsers: number;
  features: {
    focusTimer: { users: number; adoption: string };
    tasks: { users: number; adoption: string };
    checkIn: { users: number; adoption: string };
    reflection: { users: number; adoption: string };
    sleep: { users: number; adoption: string };
  };
}

interface VoiceUsage {
  period: { start: string; days: number };
  summary: {
    totalCommands: number;
    uniqueUsers: number;
    avgCommandsPerUser: number;
  };
  eventTypes: Record<string, number>;
  timeline: Array<{ date: string; activeUsers: number; totalCommands: number }>;
}

interface CreditUsage {
  summary: {
    totalCreditsInCirculation: number;
    totalUsers: number;
    waitlistApproved: number;
    proUsers: number;
    scholarUsers: number;
    avgCreditsPerUser: number;
  };
  distribution: {
    zero: number;
    low: number;
    medium: number;
    high: number;
  };
}

interface FunnelData {
  period: { start: string; days: number };
  totalSignups: number;
  waitlistApproved: number;
  funnel: Array<{ stage: string; users: number; conversion: string }>;
}

export function AnalyticsDashboard() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [adoption, setAdoption] = useState<FeatureAdoption | null>(null);
  const [voiceUsage, setVoiceUsage] = useState<VoiceUsage | null>(null);
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const fetchData = async () => {
    if (!user) {
      setError('Please log in to access the admin dashboard');
      return;
    }

    if (!isAdmin) {
      setError('Unauthorized: You do not have admin access');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
      };

      const [statsRes, timelineRes, adoptionRes, voiceRes, creditRes, funnelRes] = await Promise.all([
        fetch(`${ADMIN_API_URL}/api/admin/stats`, { headers }),
        fetch(`${ADMIN_API_URL}/api/admin/user-timeline?days=30`, { headers }),
        fetch(`${ADMIN_API_URL}/api/admin/feature-adoption`, { headers }),
        fetch(`${ADMIN_API_URL}/api/admin/voice-usage?days=30`, { headers }),
        fetch(`${ADMIN_API_URL}/api/admin/credit-usage`, { headers }),
        fetch(`${ADMIN_API_URL}/api/admin/funnel?days=30`, { headers }),
      ]);

      if (!statsRes.ok) {
        throw new Error('Unauthorized - Admin access required');
      }

      const [statsData, timelineData, adoptionData, voiceData, creditData, funnelData] = await Promise.all([
        statsRes.json(),
        timelineRes.json(),
        adoptionRes.json(),
        voiceRes.json(),
        creditRes.json(),
        funnelRes.json(),
      ]);

      setStats(statsData);
      setTimeline(timelineData);
      setAdoption(adoptionData);
      setVoiceUsage(voiceData);
      setCreditUsage(creditData);
      setFunnel(funnelData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Rivly Analytics Admin</CardTitle>
            <CardDescription>Please log in to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You need to be logged in with an authorized admin account to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access this page</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only authorized administrators can access the analytics dashboard.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Logged in as: <strong>{user.email}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Tabs defaultValue="analytics" className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rivly Beta Admin</h1>
            <Button onClick={fetchData} variant="outline" size="sm">
              Refresh Data
            </Button>
          </div>
          <TabsList className="grid w-full max-w-xl grid-cols-5">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="voice">Voice AI</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="analytics" className="p-6">
        <AnalyticsView stats={stats} timeline={timeline} adoption={adoption} loading={loading} />
      </TabsContent>

      <TabsContent value="voice" className="p-6">
        <VoiceAIView voiceUsage={voiceUsage} loading={loading} />
      </TabsContent>

      <TabsContent value="credits" className="p-6">
        <CreditsView creditUsage={creditUsage} stats={stats} loading={loading} />
      </TabsContent>

      <TabsContent value="funnel" className="p-6">
        <FunnelView funnel={funnel} loading={loading} />
      </TabsContent>

      <TabsContent value="waitlist">
        <WaitlistAdmin />
      </TabsContent>
    </Tabs>
  );
}

function AnalyticsView({ stats, timeline, adoption, loading }: {
  stats: AdminStats | null;
  timeline: TimelineData | null;
  adoption: FeatureAdoption | null;
  loading: boolean;
}) {
  if (loading || !stats || !timeline || !adoption) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Last Updated */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Last updated: {new Date(stats.timestamp).toLocaleString()}
      </p>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Daily Active Users"
          value={stats.users.dau}
          subtitle={`WAU: ${stats.users.wau} | MAU: ${stats.users.mau}`}
          icon={<Users className="w-5 h-5" />}
          trend={stats.users.dauGrowth}
        />
        <MetricCard
          title="Waitlist Approved"
          value={stats.users.waitlistApproved}
          subtitle={`${stats.users.total} total registered`}
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="7-Day Retention"
          value={stats.users.retentionRate7Day}
          subtitle={`${stats.users.total} total users`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Focus Sessions (Week)"
          value={stats.engagement.focusSessions.total}
          subtitle={`${stats.engagement.focusSessions.totalMinutes} min total`}
          icon={<Clock className="w-5 h-5" />}
        />
        <MetricCard
          title="Task Completion"
          value={stats.engagement.tasks.completionRate}
          subtitle={`${stats.engagement.tasks.completed}/${stats.engagement.tasks.created} tasks`}
          icon={<CheckCircle className="w-5 h-5" />}
        />
      </div>

      {/* User Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity Timeline (30 Days)</CardTitle>
          <CardDescription>Daily active users and key events</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="activeUsers" stroke="#8b5cf6" strokeWidth={2} name="Active Users" />
              <Line type="monotone" dataKey="focusSessions" stroke="#10b981" strokeWidth={2} name="Focus" />
              <Line type="monotone" dataKey="tasksCreated" stroke="#f59e0b" strokeWidth={2} name="Tasks" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feature Adoption & Engagement */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Adoption (7 Days)</CardTitle>
            <CardDescription>{adoption.totalActiveUsers} active users</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: 'Focus Timer', users: adoption.features.focusTimer.users, adoption: parseInt(adoption.features.focusTimer.adoption) },
                  { name: 'Tasks', users: adoption.features.tasks.users, adoption: parseInt(adoption.features.tasks.adoption) },
                  { name: 'Check-In', users: adoption.features.checkIn.users, adoption: parseInt(adoption.features.checkIn.adoption) },
                  { name: 'Reflection', users: adoption.features.reflection.users, adoption: parseInt(adoption.features.reflection.adoption) },
                  { name: 'Sleep Log', users: adoption.features.sleep.users, adoption: parseInt(adoption.features.sleep.adoption) },
                ]}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                  {[0, 1, 2, 3, 4].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Focus Timer:</span>
                <span className="font-semibold">{adoption.features.focusTimer.adoption} adoption</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tasks:</span>
                <span className="font-semibold">{adoption.features.tasks.adoption} adoption</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-In/Mood:</span>
                <span className="font-semibold">{adoption.features.checkIn.adoption} adoption</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Breakdown</CardTitle>
            <CardDescription>Weekly activity summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <EngagementRow
              icon={<Clock className="w-5 h-5 text-purple-600" />}
              label="Focus Sessions"
              value={`${stats.engagement.focusSessions.total} sessions`}
              subtitle={`${stats.engagement.focusSessions.avgMinutesPerSession} min avg | ${stats.engagement.focusSessions.usersWithFocus} users`}
            />
            <EngagementRow
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              label="Tasks"
              value={`${stats.engagement.tasks.completed} completed`}
              subtitle={`${stats.engagement.tasks.completionRate} completion rate`}
            />
            <EngagementRow
              icon={<Brain className="w-5 h-5 text-blue-600" />}
              label="Check-Ins"
              value={`${stats.engagement.checkIns.total} logs`}
              subtitle={`${stats.engagement.checkIns.usersWithCheckIn} users tracking mood/energy`}
            />
            <EngagementRow
              icon={<Sparkles className="w-5 h-5 text-amber-600" />}
              label="Reflections"
              value={`${stats.engagement.reflections.total} entries`}
              subtitle={`${stats.engagement.reflections.usersWithReflection} users journaling`}
            />
            <EngagementRow
              icon={<Moon className="w-5 h-5 text-indigo-600" />}
              label="Sleep Logs"
              value={`${stats.engagement.sleep.total} entries`}
              subtitle={`${stats.engagement.sleep.usersWithSleep} users tracking sleep`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Beta Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>DAU Growth:</strong> {stats.users.dauGrowth} from yesterday (
            {stats.users.dauYesterday} → {stats.users.dau} users)
          </p>
          <p>
            <strong>Engagement Rate:</strong>{' '}
            {Math.round((stats.users.wau / Math.max(1, stats.users.total)) * 100)}% of total users active weekly
          </p>
          <p>
            <strong>Focus Adoption:</strong> {adoption.features.focusTimer.adoption} of active users use timer (
            {adoption.features.focusTimer.users} users)
          </p>
          <p>
            <strong>Reflection Adoption:</strong> {adoption.features.reflection.adoption} using journaling (
            {adoption.features.reflection.users} users)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, trend }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            {icon}
          </div>
          {trend && (
            <span className={`text-xs font-semibold ${trend.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
              {trend}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function EngagementRow({ icon, label, value, subtitle }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function VoiceAIView({ voiceUsage, loading }: { voiceUsage: VoiceUsage | null; loading: boolean }) {
  if (loading || !voiceUsage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Loading voice analytics...</p>
      </div>
    );
  }

  const eventData = Object.entries(voiceUsage.eventTypes).map(([name, value]) => ({ name, value }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Mic className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{voiceUsage.summary.totalCommands}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Voice Commands</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{voiceUsage.summary.uniqueUsers}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Unique Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{voiceUsage.summary.avgCommandsPerUser}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Commands/User</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voice Usage Timeline (30 Days)</CardTitle>
          <CardDescription>Daily voice command usage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={voiceUsage.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="totalCommands" stroke="#8b5cf6" strokeWidth={2} name="Commands" />
              <Line type="monotone" dataKey="activeUsers" stroke="#10b981" strokeWidth={2} name="Users" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Command Types</CardTitle>
            <CardDescription>Breakdown by event type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={eventData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {eventData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CreditsView({ creditUsage, stats, loading }: { creditUsage: CreditUsage | null; stats: AdminStats | null; loading: boolean }) {
  if (loading || !creditUsage || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Loading credit analytics...</p>
      </div>
    );
  }

  const distData = [
    { name: 'Zero', value: creditUsage.distribution.zero, fill: '#ef4444' },
    { name: 'Low (1-100)', value: creditUsage.distribution.low, fill: '#f59e0b' },
    { name: 'Medium (101-500)', value: creditUsage.distribution.medium, fill: '#3b82f6' },
    { name: 'High (500+)', value: creditUsage.distribution.high, fill: '#10b981' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{creditUsage.summary.totalCreditsInCirculation.toLocaleString()}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Credits</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{creditUsage.summary.waitlistApproved}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Approved Waitlist</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{creditUsage.summary.totalUsers}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{creditUsage.summary.proUsers}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pro Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{creditUsage.summary.avgCreditsPerUser}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Credits/User</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Credit Distribution</CardTitle>
            <CardDescription>User credit balance distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {distData.map(d => (
                <div key={d.name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{d.name}:</span>
                  <span className="font-semibold">{d.value} users</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FunnelView({ funnel, loading }: { funnel: FunnelData | null; loading: boolean }) {
  if (loading || !funnel) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Loading funnel analytics...</p>
      </div>
    );
  }

  const funnelData = funnel.funnel.map(f => ({
    stage: f.stage,
    users: f.users,
    conversion: parseInt(f.conversion) || 0,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{funnel.totalSignups}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">New Signups (30d)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{funnelData[1]?.users || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Created Task</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mic className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{funnelData[4]?.users || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Used Voice AI</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding Funnel</CardTitle>
          <CardDescription>User progression through key actions</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="users" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4'][index % 6]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funnel Conversion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnel.funnel.map((f, i) => (
              <div key={f.stage} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm font-bold text-purple-600">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium">{f.stage}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{f.users} users</span>
                  <span className="text-sm font-semibold text-green-600">{f.conversion}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
