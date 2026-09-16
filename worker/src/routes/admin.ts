import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { createSupabaseClient } from '../services/supabase';
import { requireAdmin } from '../middleware/admin';

const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /admin/stats - Overall platform metrics
adminRoutes.get('/stats', async (c) => {
  const authError = requireAdmin(c);
  if (authError) return authError;

  try {
    const supabase = createSupabaseClient(c.env);

    // Time ranges
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get approved waitlist emails and user IDs
    const { data: waitlistApproved } = await supabase
      .from('waitlist')
      .select('email')
      .eq('status', 'approved');

    const approvedEmails = waitlistApproved?.map(w => w.email.toLowerCase()) || [];
    
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const approvedUserIds = authUsers?.users
      ?.filter((u: any) => u.email && approvedEmails.includes(u.email.toLowerCase()))
      .map((u: any) => u.id) || [];

    // Filter events by approved users only
    const filterByApproved = approvedUserIds.length > 0 ? approvedUserIds : [''];

    // 1. User Metrics (only approved users)
    const { data: allUsers } = await supabase
      .from('events_ledger')
      .select('user_id')
      .in('user_id', filterByApproved);

    const uniqueUsers = new Set(allUsers?.map(u => u.user_id) || []).size;

    // Daily Active Users
    const { data: dauData } = await supabase
      .from('events_ledger')
      .select('user_id')
      .gte('date_key', today)
      .in('user_id', filterByApproved);

    const dau = new Set(dauData?.map(u => u.user_id) || []).size;

    // Weekly Active Users
    const { data: wauData } = await supabase
      .from('events_ledger')
      .select('user_id')
      .gte('date_key', weekAgo)
      .in('user_id', filterByApproved);

    const wau = new Set(wauData?.map(u => u.user_id) || []).size;

    // Monthly Active Users
    const { data: mauData } = await supabase
      .from('events_ledger')
      .select('user_id')
      .gte('date_key', monthAgo)
      .in('user_id', filterByApproved);

    const mau = new Set(mauData?.map(u => u.user_id) || []).size;

    // 2. Feature Usage Metrics (only approved users)
    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .gte('date_key', weekAgo)
      .in('user_id', filterByApproved);

    const totalFocusMinutes = focusSessions?.reduce((acc, s) => acc + (s.duration_min || 0), 0) || 0;
    const avgFocusPerSession = focusSessions?.length ? totalFocusMinutes / focusSessions.length : 0;

    const { count: tasksCreatedWeek } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .gte('date_key', weekAgo)
      .in('user_id', filterByApproved);

    const { count: tasksCompletedWeek } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .gte('date_key', weekAgo)
      .eq('status', 'done')
      .in('user_id', filterByApproved);

    const completionRate = tasksCreatedWeek ? Math.round(((tasksCompletedWeek || 0) / tasksCreatedWeek) * 100) : 0;

    // 3. AI Feature Usage (only approved users)
    const { data: checkIns } = await supabase
      .from('events_ledger')
      .select('*')
      .eq('event_type', 'check_in')
      .gte('date_key', weekAgo)
      .in('user_id', filterByApproved);

    const { data: reflections } = await supabase
      .from('events_ledger')
      .select('*')
      .eq('event_type', 'reflection')
      .gte('date_key', weekAgo)
      .in('user_id', filterByApproved);

    const { data: sleepLogs } = await supabase
      .from('events_ledger')
      .select('*')
      .eq('event_type', 'sleep')
      .gte('date_key', weekAgo)
      .in('user_id', filterByApproved);

    // 4. Waitlist Metrics
    const { data: waitlist } = await supabase
      .from('waitlist')
      .select('*');

    const waitlistStats = {
      total: waitlist?.length || 0,
      approved: waitlist?.filter(w => w.status === 'approved').length || 0,
      pending: waitlist?.filter(w => w.status === 'pending').length || 0,
      rejected: waitlist?.filter(w => w.status === 'rejected').length || 0,
    };

    // 5. Engagement Metrics (only approved users)
    const { data: yesterdayData } = await supabase
      .from('events_ledger')
      .select('user_id')
      .eq('date_key', yesterday)
      .in('user_id', filterByApproved);

    const dauYesterday = new Set(yesterdayData?.map(u => u.user_id) || []).size;
    const dauGrowth = dauYesterday ? Math.round(((dau - dauYesterday) / dauYesterday) * 100) : 0;

    // 6. Retention (only approved users)
    const { data: sevenDaysAgo } = await supabase
      .from('events_ledger')
      .select('user_id')
      .eq('date_key', weekAgo)
      .in('user_id', filterByApproved);

    const usersSevenDaysAgo = new Set(sevenDaysAgo?.map(u => u.user_id) || []);
    const retainedUsers = [...usersSevenDaysAgo].filter(uid =>
      wauData?.some(u => u.user_id === uid)
    ).length;

    const retentionRate = usersSevenDaysAgo.size ? Math.round((retainedUsers / usersSevenDaysAgo.size) * 100) : 0;

    // 7. Credit Usage (only approved users)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('credits_balance, created_at')
      .limit(1000);

    const totalCredits = profiles?.reduce((acc, p) => acc + (p.credits_balance || 0), 0) || 0;
    const avgCredits = profiles?.length ? Math.round(totalCredits / profiles.length) : 0;

    // 8. Pro/Paid Tier Users
    const { data: proUsers } = await supabase
      .from('profiles')
      .select('user_id, subscription_tier')
      .eq('subscription_tier', 'pro');

    return c.json({
      timestamp: new Date().toISOString(),
      users: {
        total: uniqueUsers,
        dau,
        wau,
        mau,
        dauYesterday,
        dauGrowth: `${dauGrowth}%`,
        retentionRate7Day: `${retentionRate}%`,
        proUsers: proUsers?.length || 0,
        waitlistApproved: waitlistStats.approved,
      },
      engagement: {
        focusSessions: {
          total: focusSessions?.length || 0,
          totalMinutes: totalFocusMinutes,
          avgMinutesPerSession: Math.round(avgFocusPerSession),
          usersWithFocus: new Set(focusSessions?.map(s => s.user_id) || []).size,
        },
        tasks: {
          created: tasksCreatedWeek,
          completed: tasksCompletedWeek,
          completionRate: `${completionRate}%`,
        },
        checkIns: {
          total: checkIns?.length || 0,
          usersWithCheckIn: new Set(checkIns?.map(c => c.user_id) || []).size,
        },
        reflections: {
          total: reflections?.length || 0,
          usersWithReflection: new Set(reflections?.map(r => r.user_id) || []).size,
        },
        sleep: {
          total: sleepLogs?.length || 0,
          usersWithSleep: new Set(sleepLogs?.map(s => s.user_id) || []).size,
        },
      },
      credits: {
        totalDistributed: totalCredits,
        avgPerUser: avgCredits,
      },
      waitlist: waitlistStats,
    });
  } catch (error: any) {
    console.error('[Admin Stats] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /admin/user-timeline - Daily user activity over time
adminRoutes.get('/user-timeline', async (c) => {
  const authError = requireAdmin(c);
  if (authError) return authError;

  try {
    const supabase = createSupabaseClient(c.env);
    const days = parseInt(c.req.query('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().split('T')[0];

    const { data: events } = await supabase
      .from('events_ledger')
      .select('date_key, user_id, event_type')
      .gte('date_key', startKey);

    // Group by date
    const byDate: Record<string, { users: Set<string>; events: number; focus: number; tasks: number; reflections: number }> = {};

    events?.forEach(e => {
      if (!byDate[e.date_key]) {
        byDate[e.date_key] = { users: new Set(), events: 0, focus: 0, tasks: 0, reflections: 0 };
      }
      byDate[e.date_key].users.add(e.user_id);
      byDate[e.date_key].events++;

      if (e.event_type === 'focus_completed') byDate[e.date_key].focus++;
      if (e.event_type === 'task_created') byDate[e.date_key].tasks++;
      if (e.event_type === 'reflection') byDate[e.date_key].reflections++;
    });

    const timeline = Object.entries(byDate).map(([date, data]) => ({
      date,
      activeUsers: data.users.size,
      totalEvents: data.events,
      focusSessions: data.focus,
      tasksCreated: data.tasks,
      reflections: data.reflections,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return c.json({ timeline });
  } catch (error: any) {
    console.error('[Admin Timeline] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /admin/feature-adoption - Which features are being used
adminRoutes.get('/feature-adoption', async (c) => {
  const authError = requireAdmin(c);
  if (authError) return authError;

  try {
    const supabase = createSupabaseClient(c.env);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekKey = weekAgo.toISOString().split('T')[0];

    // Get all active users
    const { data: allEvents } = await supabase
      .from('events_ledger')
      .select('user_id, event_type')
      .gte('date_key', weekKey);

    const activeUsers = new Set(allEvents?.map(e => e.user_id) || []);
    const totalActiveUsers = activeUsers.size;

    // Get users who used each feature
    const usersWithFocus = new Set(allEvents?.filter(e => e.event_type === 'focus_completed').map(e => e.user_id) || []);
    const usersWithTasks = new Set(allEvents?.filter(e => e.event_type === 'task_created').map(e => e.user_id) || []);
    const usersWithCheckIn = new Set(allEvents?.filter(e => e.event_type === 'check_in').map(e => e.user_id) || []);
    const usersWithReflection = new Set(allEvents?.filter(e => e.event_type === 'reflection').map(e => e.user_id) || []);
    const usersWithSleep = new Set(allEvents?.filter(e => e.event_type === 'sleep').map(e => e.user_id) || []);

    const adoption = (users: Set<string>) => {
      return totalActiveUsers ? Math.round((users.size / totalActiveUsers) * 100) : 0;
    };

    return c.json({
      totalActiveUsers,
      features: {
        focusTimer: {
          users: usersWithFocus.size,
          adoption: `${adoption(usersWithFocus)}%`,
        },
        tasks: {
          users: usersWithTasks.size,
          adoption: `${adoption(usersWithTasks)}%`,
        },
        checkIn: {
          users: usersWithCheckIn.size,
          adoption: `${adoption(usersWithCheckIn)}%`,
        },
        reflection: {
          users: usersWithReflection.size,
          adoption: `${adoption(usersWithReflection)}%`,
        },
        sleep: {
          users: usersWithSleep.size,
          adoption: `${adoption(usersWithSleep)}%`,
        },
      },
    });
  } catch (error: any) {
    console.error('[Admin Feature Adoption] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /admin/voice-usage - Voice/AI command usage metrics
adminRoutes.get('/voice-usage', async (c) => {
  const authError = requireAdmin(c);
  if (authError) return authError;

  try {
    const supabase = createSupabaseClient(c.env);
    const days = parseInt(c.req.query('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().split('T')[0];

    // Get Riva/voice events
    const { data: voiceEvents } = await supabase
      .from('events_ledger')
      .select('user_id, event_type, date_key, created_at')
      .in('event_type', ['riva_command', 'voice_command', 'ai_chat', 'morning_briefing'])
      .gte('date_key', startKey)
      .order('created_at', { ascending: false });

    const voiceUsers = new Set(voiceEvents?.map(e => e.user_id) || []);
    
    // Group by date
    const byDate: Record<string, { users: Set<string>; commands: number }> = {};
    voiceEvents?.forEach(e => {
      if (!byDate[e.date_key]) {
        byDate[e.date_key] = { users: new Set(), commands: 0 };
      }
      byDate[e.date_key].users.add(e.user_id);
      byDate[e.date_key].commands++;
    });

    const timeline = Object.entries(byDate).map(([date, data]) => ({
      date,
      activeUsers: data.users.size,
      totalCommands: data.commands,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Event type breakdown
    const eventBreakdown: Record<string, number> = {};
    voiceEvents?.forEach(e => {
      eventBreakdown[e.event_type] = (eventBreakdown[e.event_type] || 0) + 1;
    });

    return c.json({
      period: { start: startKey, days },
      summary: {
        totalCommands: voiceEvents?.length || 0,
        uniqueUsers: voiceUsers.size,
        avgCommandsPerUser: voiceUsers.size ? Math.round((voiceEvents?.length || 0) / voiceUsers.size) : 0,
      },
      eventTypes: eventBreakdown,
      timeline,
    });
  } catch (error: any) {
    console.error('[Admin Voice Usage] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /admin/credit-usage - Credit consumption analytics
adminRoutes.get('/credit-usage', async (c) => {
  const authError = requireAdmin(c);
  if (authError) return authError;

  try {
    const supabase = createSupabaseClient(c.env);

    // Get approved waitlist emails
    const { data: waitlistApproved } = await supabase
      .from('waitlist')
      .select('email')
      .eq('status', 'approved');

    const approvedEmails = waitlistApproved?.map(w => w.email.toLowerCase()) || [];
    
    // Get user IDs from auth.users for approved emails
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const approvedUserIds = authUsers?.users
      ?.filter((u: any) => u.email && approvedEmails.includes(u.email.toLowerCase()))
      .map((u: any) => u.id) || [];

    // Get profiles for approved users only
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, credits_balance, subscription_tier, created_at')
      .in('user_id', approvedUserIds.length > 0 ? approvedUserIds : [''])
      .order('credits_balance', { ascending: false });

    // Get credit deduction events from events_ledger (only for approved users)
    const { data: creditEvents } = await supabase
      .from('events_ledger')
      .select('user_id, event_type, date_key, created_at, metadata')
      .eq('event_type', 'credit_deduction')
      .in('user_id', approvedUserIds.length > 0 ? approvedUserIds : [''])
      .order('created_at', { ascending: false })
      .limit(1000);

    // Group deductions by action type from metadata
    const byAction: Record<string, { count: number; credits: number }> = {};
    creditEvents?.forEach(d => {
      const action = d.metadata?.action || 'unknown';
      const amount = d.metadata?.amount || 0;
      if (!byAction[action]) {
        byAction[action] = { count: 0, credits: 0 };
      }
      byAction[action].count++;
      byAction[action].credits += amount;
    });

    // User distribution
    const creditDistribution = {
      zero: profiles?.filter(p => p.credits_balance === 0).length || 0,
      low: profiles?.filter(p => p.credits_balance > 0 && p.credits_balance <= 100).length || 0,
      medium: profiles?.filter(p => p.credits_balance > 100 && p.credits_balance <= 500).length || 0,
      high: profiles?.filter(p => p.credits_balance > 500).length || 0,
    };

    const totalCredits = profiles?.reduce((acc, p) => acc + (p.credits_balance || 0), 0) || 0;
    const proUsers = profiles?.filter(p => p.subscription_tier === 'pro').length || 0;
    const scholarUsers = profiles?.filter(p => p.subscription_tier === 'scholar').length || 0;

    return c.json({
      summary: {
        totalCreditsInCirculation: totalCredits,
        totalUsers: profiles?.length || 0,
        waitlistApproved: approvedEmails.length,
        proUsers,
        scholarUsers,
        avgCreditsPerUser: profiles?.length ? Math.round(totalCredits / profiles.length) : 0,
      },
      distribution: creditDistribution,
      topActions: byAction,
      recentDeductions: creditEvents?.slice(0, 20).map(d => ({
        userId: d.user_id,
        action: d.metadata?.action || 'unknown',
        amount: d.metadata?.amount || 0,
        timestamp: d.created_at,
      })) || [],
    });
  } catch (error: any) {
    console.error('[Admin Credit Usage] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /admin/user-cohorts - New vs returning user analysis
adminRoutes.get('/user-cohorts', async (c) => {
  const authError = requireAdmin(c);
  if (authError) return authError;

  try {
    const supabase = createSupabaseClient(c.env);
    const days = parseInt(c.req.query('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().split('T')[0];

    // Get all events in the period
    const { data: events } = await supabase
      .from('events_ledger')
      .select('user_id, date_key')
      .gte('date_key', startKey);

    // Get first activity date for each user
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, created_at');

    // Group users by their first activity week
    const userFirstActive: Record<string, Set<string>> = {};
    const userActiveDates: Record<string, Set<string>> = {};

    events?.forEach(e => {
      if (!userActiveDates[e.user_id]) {
        userActiveDates[e.user_id] = new Set();
      }
      userActiveDates[e.user_id].add(e.date_key);
    });

    // Calculate cohorts (new users in each week)
    const now = new Date();
    const cohorts: Record<string, { new: number; returning: number; total: number }> = {};

    for (let i = 0; i < days; i += 7) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - days + i);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndKey = weekEnd.toISOString().split('T')[0];

      let newUsers = 0;
      let returningUsers = 0;

      events?.forEach(e => {
        if (e.date_key >= weekKey && e.date_key <= weekEndKey) {
          const firstActive = Array.from(userActiveDates[e.user_id] || []).sort()[0];
          if (firstActive === e.date_key) {
            newUsers++;
          } else {
            returningUsers++;
          }
        }
      });

      cohorts[weekKey] = { new: newUsers, returning: returningUsers, total: newUsers + returningUsers };
    }

    return c.json({
      period: { start: startKey, days },
      cohorts: Object.entries(cohorts).map(([week, data]) => ({ week, ...data })),
    });
  } catch (error: any) {
    console.error('[Admin User Cohorts] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /admin/errors - Error tracking
adminRoutes.get('/errors', async (c) => {
  const authError = requireAdmin(c);
  if (authError) return authError;

  try {
    const supabase = createSupabaseClient(c.env);
    const days = parseInt(c.req.query('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().split('T')[0];

    // Get error events
    const { data: errors } = await supabase
      .from('events_ledger')
      .select('user_id, event_type, date_key, created_at, metadata')
      .eq('event_type', 'error')
      .gte('date_key', startKey)
      .order('created_at', { ascending: false })
      .limit(100);

    // Group by error type
    const errorTypes: Record<string, number> = {};
    errors?.forEach(e => {
      const type = e.metadata?.error_type || 'unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    return c.json({
      period: { start: startKey, days },
      totalErrors: errors?.length || 0,
      byType: errorTypes,
      recentErrors: errors?.slice(0, 20).map(e => ({
        userId: e.user_id,
        type: e.metadata?.error_type || 'unknown',
        message: e.metadata?.message || 'No message',
        timestamp: e.created_at,
      })) || [],
    });
  } catch (error: any) {
    console.error('[Admin Errors] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /admin/funnel - Onboarding funnel analysis
adminRoutes.get('/funnel', async (c) => {
  const authError = requireAdmin(c);
  if (authError) return authError;

  try {
    const supabase = createSupabaseClient(c.env);
    const days = parseInt(c.req.query('days') || '30');

    // Get waitlist stats for context
    const { data: waitlist } = await supabase
      .from('waitlist')
      .select('status');
    
    const waitlistStats = {
      total: waitlist?.length || 0,
      approved: waitlist?.filter(w => w.status === 'approved').length || 0,
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().split('T')[0];

    // Get all profiles who signed up in the period
    const { data: newUsers } = await supabase
      .from('profiles')
      .select('user_id, created_at')
      .gte('created_at', startKey)
      .limit(500);

    const userIds = newUsers?.map(u => u.user_id) || [];

    // If we have fewer profile users than approved waitlist, use waitlist as base
    // Otherwise use profiles
    const totalSignups = Math.min(userIds.length, waitlistStats.approved) || userIds.length;

    if (userIds.length === 0) {
      return c.json({
        period: { start: startKey, days },
        totalSignups,
        waitlistApproved: waitlistStats.approved,
        funnel: [],
      });
    }

    // Get their first week activity
    const { data: events } = await supabase
      .from('events_ledger')
      .select('user_id, event_type')
      .in('user_id', userIds)
      .gte('date_key', startKey);

    // Count users at each funnel stage
    const usersAtStage = {
      signedUp: new Set<string>(),
      createdTask: new Set<string>(),
      usedFocus: new Set<string>(),
      didCheckIn: new Set<string>(),
      usedVoice: new Set<string>(),
      returned: new Set<string>(),
    };

    const userFirstWeekEvents: Record<string, Set<string>> = {};

    events?.forEach(e => {
      if (!userFirstWeekEvents[e.user_id]) {
        userFirstWeekEvents[e.user_id] = new Set();
      }
      userFirstWeekEvents[e.user_id].add(e.event_type);

      usersAtStage.signedUp.add(e.user_id);
      if (e.event_type === 'task_created') usersAtStage.createdTask.add(e.user_id);
      if (e.event_type === 'focus_completed') usersAtStage.usedFocus.add(e.user_id);
      if (e.event_type === 'check_in') usersAtStage.didCheckIn.add(e.user_id);
      if (e.event_type === 'riva_command' || e.event_type === 'voice_command') usersAtStage.usedVoice.add(e.user_id);
    });

    const funnel = [
      { stage: 'Sign Up', users: totalSignups, conversion: '100%' },
      { stage: 'Created Task', users: usersAtStage.createdTask.size, conversion: totalSignups ? Math.round((usersAtStage.createdTask.size / totalSignups) * 100) + '%' : '0%' },
      { stage: 'Used Focus Timer', users: usersAtStage.usedFocus.size, conversion: totalSignups ? Math.round((usersAtStage.usedFocus.size / totalSignups) * 100) + '%' : '0%' },
      { stage: 'Did Check-In', users: usersAtStage.didCheckIn.size, conversion: totalSignups ? Math.round((usersAtStage.didCheckIn.size / totalSignups) * 100) + '%' : '0%' },
      { stage: 'Used Voice AI', users: usersAtStage.usedVoice.size, conversion: totalSignups ? Math.round((usersAtStage.usedVoice.size / totalSignups) * 100) + '%' : '0%' },
    ];

    return c.json({
      period: { start: startKey, days },
      totalSignups,
      waitlistApproved: waitlistStats.approved,
      funnel,
    });
  } catch (error: any) {
    console.error('[Admin Funnel] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default adminRoutes;
