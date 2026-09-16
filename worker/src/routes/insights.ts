import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { createSupabaseClient } from '../services/supabase';
import { generateAIInsights } from '../services/ai/groq';

const insightsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /insights/memory - AI Memory & Insights (Pro Feature)
insightsRoutes.post('/memory', async (c) => {
  const userId = c.get('userId');
  const daysBack = parseInt(c.req.query('days') || '7');

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c.env);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const startKey = startDate.toISOString().split('T')[0];
    const endKey = endDate.toISOString().split('T')[0];

    // Fetch User Data
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('date_key', startKey)
      .lte('date_key', endKey);

    const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
    const totalTasks = tasks?.length || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('date_key', startKey)
      .lte('date_key', endKey);

    const totalFocusMinutes = focusSessions?.reduce((acc, s) => acc + (s.duration_min || 0), 0) || 0;
    const avgFocusPerDay = Math.round(totalFocusMinutes / daysBack);

    const { data: checkIns } = await supabase
      .from('events_ledger')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'check_in')
      .gte('date_key', startKey)
      .lte('date_key', endKey);

    const avgMood = checkIns?.length
      ? (checkIns.reduce((acc, ci) => acc + (ci.data?.mood || 3), 0) / checkIns.length).toFixed(1)
      : 'N/A';

    const avgEnergy = checkIns?.length
      ? (checkIns.reduce((acc, ci) => acc + (ci.data?.energy || 3), 0) / checkIns.length).toFixed(1)
      : 'N/A';

    const { data: reflections } = await supabase
      .from('events_ledger')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'reflection')
      .gte('date_key', startKey)
      .lte('date_key', endKey);

    const reflectionCount = reflections?.length || 0;

    const { data: timeBlocks } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', userId)
      .gte('date_key', startKey)
      .lte('date_key', endKey);

    const groupedBlocks: Record<string, number> = {};
    timeBlocks?.forEach(block => {
      const date = block.date_key;
      groupedBlocks[date] = (groupedBlocks[date] || 0) + 1;
    });
    const busyDays = Object.values(groupedBlocks).filter(count => count >= 5).length;

    // Generate AI Insights
    let aiInsights = {
      summary: "You're building a steady rhythm — keep it up!",
      energyPattern: null,
      suggestions: [] as string[]
    };

    if (c.env.GROQ_API_KEY) {
      aiInsights = await generateAIInsights(c.env.GROQ_API_KEY, {
        completedTasks,
        totalTasks,
        completionRate,
        totalFocusMinutes,
        avgFocusPerDay,
        avgMood,
        avgEnergy,
        reflectionCount,
        busyDays
      }, daysBack);
    }

    return c.json({
      period: `${daysBack} days`,
      stats: {
        tasks: { total: totalTasks, completed: completedTasks, completionRate: `${completionRate}%` },
        focus: { totalMinutes: totalFocusMinutes, avgPerDay: avgFocusPerDay, sessionCount: focusSessions?.length || 0 },
        wellbeing: { avgMood, avgEnergy, checkInCount: checkIns?.length || 0 },
        reflection: { count: reflectionCount },
        calendar: { busyDays, totalBlocks: timeBlocks?.length || 0 }
      },
      insights: aiInsights,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Insights] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default insightsRoutes;
