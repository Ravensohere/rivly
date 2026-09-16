import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { createClient } from '@supabase/supabase-js';
import { generateMorningBriefing, generateOrbGuide, generatePlan, generatePlanWithCorrection, createEmptyMemory, groqChat } from '../services/ai/groq';
import { MODEL_FOR_TASK } from '../config/constants';
import type { UserMemory } from '../services/ai/groq';
import { getWeather, searchWeb, searchYouTube, getNews } from '../services/tools';
import { generateLearningPath } from '../services/ai/learningPath';
import { parseCommandHeuristically, cleanTaskTitlesInResponse } from '../utils/heuristic-parser';

const rivaRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function logEvent(supabase: any, userId: string, eventType: string, metadata?: any) {
  try {
    await supabase.from('events_ledger').insert({
      user_id: userId,
      event_type: eventType,
      date_key: new Date().toISOString().split('T')[0],
      metadata
    });
  } catch (e) {
    console.error('[Event Log] Error:', e);
  }
}

async function loadUserMemory(supabase: any, userId: string): Promise<UserMemory> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('riva_memory')
      .eq('user_id', userId)
      .single();
    if (data?.riva_memory && typeof data.riva_memory === 'object') {
      return data.riva_memory as UserMemory;
    }
  } catch (e) {
    console.warn('[Memory] Failed to load:', e);
  }
  return createEmptyMemory();
}

async function saveUserMemory(supabase: any, userId: string, memory: UserMemory): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ riva_memory: memory })
      .eq('user_id', userId);
  } catch (e) {
    console.warn('[Memory] Failed to save:', e);
  }
}

// POST /riva/plan - AI command planning
rivaRoutes.post('/plan', async (c) => {
  const { transcript, context } = await c.req.json();
  const text = (transcript || '').toLowerCase();
  const userId = c.get('userId');
  const userEmail = c.get('userEmail') || '';

  // Initialize Supabase
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
 
  // 1. Check Credits (Base Cost: 10 for AI Chat)
  let { data: profile } = await supabase.from('profiles').select('credits_balance').eq('user_id', userId).single();
  
  // Auto-create profile if missing (defensive: handles users created before trigger)
  // Only give credits if user is approved in waitlist
  if (!profile) {
    // Check if user is approved in waitlist
    let creditsToGive = 0;
    
    if (userEmail) {
      const { data: waitlistEntry } = await supabase
        .from('waitlist')
        .select('status')
        .eq('email', userEmail.toLowerCase())
        .single();
      
      // Only give credits if approved
      if (waitlistEntry?.status === 'approved') {
        creditsToGive = 500;
      }
    }
    
    await supabase.from('profiles').upsert({ 
      user_id: userId, 
      name: 'User', 
      credits_balance: creditsToGive 
    }, { onConflict: 'user_id' });
    
    const result = await supabase.from('profiles').select('credits_balance').eq('user_id', userId).single();
    profile = result.data;
  }

  const currentBalance = profile?.credits_balance || 0;
  
  if (currentBalance < 10) {
    return c.json({ 
        message: "You've run out of credits. Please top up to continue using Riva.", 
        action: 'unknown',
        data: { error: 'insufficient_credits' } 
    });
  }

  // Deduct Base Cost (10)
  await supabase.rpc('deduct_credits', { p_user_id: userId, amount: 10 });

  const errors: string[] = [];

  // ... (Grok check) ...

  // 2. Try Groq Llama 3 (if available) - Preferred by User
  if (c.env.GROQ_API_KEY) {
    console.log('[Riva] Using Groq Llama 3 with transcript correction...');
    try {
      // Load user memory for transcript correction + personalization
      const userMemory = await loadUserMemory(supabase, userId);

      const { response: result, correction, updatedMemory } = await generatePlanWithCorrection(
        c.env.GROQ_API_KEY,
        text,
        context,
        userMemory
      );

      // Persist updated memory (fire-and-forget)
      saveUserMemory(supabase, userId, updatedMemory);

      // Add correction info to response headers
      if (correction.wasChanged) {
        c.header('X-Riva-Corrected', correction.corrected);
        c.header('X-Riva-Original', correction.original);
        console.log(`[Riva] STT correction: "${correction.original}" → "${correction.corrected}"`);
      }
      
      // Handle Learning Path: generate checkpoints + YouTube per topic
      if (result && result.action === 'create_learning_path' && result.data?.topic) {
        const surcharge = 50;
        if (currentBalance < (10 + surcharge)) {
          return c.json({
            message: "You need 60 credits to create a learning path. Please top up.",
            action: 'unknown',
            data: { error: 'insufficient_credits' },
          });
        }
        if (!c.env.YOUTUBE_API_KEY) {
          return c.json({
            message: "Learning paths need YouTube search; it's not configured right now.",
            action: 'unknown',
            data: {},
          });
        }
        try {
          const pathResult = await generateLearningPath(
            c.env.GROQ_API_KEY,
            result.data.topic,
            c.env.YOUTUBE_API_KEY
          );
          await supabase.rpc('deduct_credits', { p_user_id: userId, amount: surcharge });
          return c.json({
            message: `I've created a learning path for ${result.data.topic} with ${pathResult.checkpoints.length} checkpoints and videos. Open it to start.`,
            action: 'create_learning_path',
            data: pathResult,
          });
        } catch (e: any) {
          console.error('[Riva] Learning path error:', e);
          return c.json({
            message: "I couldn't generate the learning path right now. Try again later.",
            action: 'unknown',
            data: { error: e.message },
          });
        }
      }

      // Handle Tool Calls (Two-Step Agent)
      if (result && (result.action === 'search_web' || result.action === 'get_weather' || result.action === 'search_youtube' || result.action === 'get_news')) {
          console.log(`[Riva] Tool required: ${result.action}`);
          
          let toolResult = "";
          let surcharge = 0;

          if (result.action === 'search_web' && c.env.TAVILY_API_KEY) {
              surcharge = 190; 
              if (currentBalance < (10 + surcharge)) {
                  toolResult = "You do not have enough credits for Web Search (Requires 200 credits).";
                  surcharge = 0;
              } else {
                  toolResult = await searchWeb(result.data.query, c.env.TAVILY_API_KEY);
              }
          } else if (result.action === 'get_weather' && c.env.OPENWEATHER_API_KEY) {
              // Weather is free. No surcharge. Total 10.
              toolResult = await getWeather(result.data.location, c.env.OPENWEATHER_API_KEY);
          } else if (result.action === 'search_youtube' && c.env.YOUTUBE_API_KEY) {
              surcharge = 40;
              if (currentBalance < (10 + surcharge)) {
                  toolResult = "You do not have enough credits for YouTube Search (Requires 50 credits).";
                  surcharge = 0;
              } else {
                  toolResult = await searchYouTube(result.data.query, c.env.YOUTUBE_API_KEY);
              }
          } else if (result.action === 'get_news') {
              // News is free RSS. No surcharge. Total 10.
              toolResult = await getNews();
          } else {
              toolResult = "I'm sorry, I don't have the keys to check that right now.";
          }

          // Deduct Surcharge if any (Logic simplified: if we are here and surcharge > 0, we already checked balance)
          if (surcharge > 0) {
              await supabase.rpc('deduct_credits', { p_user_id: userId, amount: surcharge });
          }

          console.log('[Riva] Tool Result:', toolResult);
          
          // Re-prompt Groq with the tool result to get a natural response
          const finalPrompt = `
            User asked: "${text}"
            Tool Result: "${toolResult}"
            
            Task: Synthesize a friendly, spoken answer based on the tool result. 
            - If it's a video, mentioning "I found a video: [Title]" is enough.
            - If it's news, summarize the top 3 points.
            - Keep it short (1-2 sentences).
            
            **LANGUAGE**: Reply in the SAME language the user used. If the user spoke Hindi/Hinglish, reply in Hindi/Hinglish. If the user spoke English, reply in English. Do NOT default to Hindi.
          `;
          
          // Simple direct call for final answer (fast tier — short summarization)
          let finalMessage = toolResult;
          try {
              finalMessage = (await groqChat(
                  c.env.GROQ_API_KEY,
                  [{ role: 'user', content: finalPrompt }],
                  { model: MODEL_FOR_TASK.tool_answer, max_tokens: 300 }
              )) || toolResult;
          } catch (e) {
              console.warn('[Riva] Tool answer synthesis failed, returning raw result:', e);
          }
          
          let structuredData = {};
          try {
              if (result.action === 'search_youtube') {
                  structuredData = JSON.parse(toolResult);
              }
          } catch (e) { console.error("Failed to parse tool result for frontend", e); }

          return c.json({
              message: finalMessage,
              action: 'online_response', 
              data: { 
                  original_action: result.action,
                  tool_data: structuredData
              }
          });
      }

      if (result) {
        await logEvent(supabase, userId, 'riva_command', { action: result.action, transcript: text.slice(0, 100) });
        return c.json(cleanTaskTitlesInResponse(result));
      }
    } catch (e: any) {
        console.error('Groq Plan Failed:', e);
        errors.push(`Groq: ${e.message}`);
    }
  } else {
    errors.push('No GROQ_API_KEY found');
  }

  // 3. Fallback: Advanced Heuristic Parser
  console.log('[Riva] Using Heuristic Parser due to errors:', errors);
  const heuristicResult = parseCommandHeuristically(text);
  
  await logEvent(supabase, userId, 'riva_command', { action: heuristicResult.action, source: 'heuristic' });
  
  // Return errors in header for debugging
  c.header('X-Riva-Errors', JSON.stringify(errors));
  
  if (heuristicResult.action === 'unknown' && errors.length > 0) {
      // If heuristic failed too, explain why AI failed
      return c.json({
          message: `I'm having trouble connecting. Errors: ${errors.join(', ')}`,
          action: 'unknown',
          data: { errors }
      });
  }

  return c.json(cleanTaskTitlesInResponse(heuristicResult));
});

// POST /riva/morning-briefing - Generate morning briefing (text only, TTS handled by Gemini Live)
rivaRoutes.post('/morning-briefing', async (c) => {
  try {
    const { checkIn, userName } = await c.req.json();
    const userId = c.get('userId');

    if (!c.env.GROQ_API_KEY) {
      return c.json({ error: 'Missing Groq API Key' }, 500);
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    await logEvent(supabase, userId, 'morning_briefing', { mood: checkIn?.mood, energy: checkIn?.energy });

    const memory = await loadUserMemory(supabase, userId);
    const script = await generateMorningBriefing(c.env.GROQ_API_KEY, checkIn, userName, memory);

    let suggestionsLine = '';
    try {
      const { count } = await supabase
        .from('task_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');
      if (count && count > 0) {
        suggestionsLine = `I also spotted ${count} thing${count === 1 ? '' : 's'} in your inbox — want them added?`;
      }
    } catch (e) {
      console.warn('[Riva] suggestions count failed:', e);
    }

    return c.json({ text: suggestionsLine ? `${script} ${suggestionsLine}` : script, suggestionsLine });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /riva/search-video - Search YouTube for videos (used by replace_video in learning path editing)
rivaRoutes.post('/search-video', async (c) => {
  try {
    const { query, maxResults = 3 } = await c.req.json();
    const youtubeApiKey = c.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) return c.json({ error: 'YouTube API not configured' }, 500);

    const result = await searchYouTube(query, youtubeApiKey, maxResults);
    const parsed = JSON.parse(result);
    return c.json({ videos: Array.isArray(parsed) ? parsed : [parsed] });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default rivaRoutes;
