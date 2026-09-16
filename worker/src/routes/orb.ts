import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { createSupabaseClient } from '../services/supabase';
import { generateOrbGuide } from '../services/ai/groq';

const orbRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /orb-guide - Rhythm insight (text only, TTS handled by Gemini Live)
orbRoutes.post('/orb-guide', async (c) => {
  try {
    const { focusHistory, sleepHistory, user_id, userName } = await c.req.json();

    const apiKey = c.env.GROQ_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'Configuration Error: Missing API Key' }, 500);
    }

    const insightText = await generateOrbGuide(apiKey, focusHistory, userName);

    return c.json({
      insight: insightText,
      audioBase64: null
    });
  } catch (error: any) {
    console.error('Orb Guide Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default orbRoutes;
