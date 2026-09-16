/**
 * /api/riva/live — WebSocket relay between browser and Gemini Multimodal Live API
 *
 * Protocol (browser <-> worker):
 *   Client -> Worker:
 *     { type: "audio", data: "<base64 PCM 16kHz mono>" }
 *     { type: "text",  text: "typed command" }
 *
 *   Worker -> Client:
 *     { type: "setup_complete" }
 *     { type: "audio", audio: "<base64 PCM 24kHz mono>" }
 *     { type: "text",  text: "transcript chunk" }
 *     { type: "turn_complete" }
 *     { type: "interrupted" }
 *     { type: "function_call", name: "create_task", args: {...}, id: "..." }
 *     { type: "function_result", name: "create_task", result: {...} }
 *     { type: "error", message: "..." }
 */

import { Bindings } from '../types';
import { createClient } from '@supabase/supabase-js';
import {
  connectToGemini,
  sendAudioChunk,
  sendTextMessage,
  sendFunctionResponses,
  type GeminiLiveSession,
  type GeminiServerMessage,
} from '../services/ai/gemini-live';
import { summarizeMemoryForPrompt } from '../services/ai/groq';
import { getWeather, searchWeb, searchYouTube, getNews } from '../services/tools';

/**
 * Load the user's Riva memory and turn it into a prompt-ready summary so the
 * voice session feels personal (facts, exam countdowns, routines). Best-effort:
 * a failure just means a generic session, never a broken one.
 */
async function loadPersonalContext(env: Bindings, userId: string): Promise<string> {
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase
      .from('profiles')
      .select('riva_memory')
      .eq('user_id', userId)
      .single();
    if (data?.riva_memory && typeof data.riva_memory === 'object') {
      return summarizeMemoryForPrompt(data.riva_memory);
    }
  } catch (e) {
    console.warn('[RivaLive] Memory load failed (continuing without):', e);
  }
  return '';
}

/**
 * Execute a function call from Gemini using existing tool implementations.
 */
async function executeFunctionCall(
  name: string,
  args: Record<string, any>,
  env: Bindings,
): Promise<Record<string, any>> {
  try {
    switch (name) {
      case 'create_task':
        return { success: true, task: { title: args.title, tag: args.tag || 'other' } };

      case 'create_tasks': {
        const tasks = (args.tasks || []).map((t: any) => ({ title: t.title, tag: t.tag || 'other' }));
        return { success: true, tasks };
      }

      case 'start_focus':
        return { success: true, duration: args.duration || 25 };

      // Local-effect functions: the browser applies the side-effect when it
      // receives the function_result; we just acknowledge so Gemini can confirm.
      case 'stop_focus':
        return { success: true };

      case 'add_to_shopping_list':
        return { success: true, items: args.items || [] };

      case 'show_shopping_list':
        return { success: true };

      case 'remove_from_shopping_list':
        return { success: true, items: args.items || [], all: !!args.all };

      case 'create_learning_path':
        return { success: true, topic: args.topic, status: 'generating' };

      case 'create_time_block':
        return { success: true, title: args.title, start: args.start, end: args.end };

      case 'set_reminder':
        return { success: true, text: args.text, time: args.time, date: args.date };

      case 'log_checkin':
        return { success: true, mood: args.mood, energy: args.energy, note: args.note };

      case 'navigate':
        return { success: true, page: args.page };

      case 'get_weather': {
        if (!env.OPENWEATHER_API_KEY) return { error: 'Weather API not configured' };
        const result = await getWeather(args.location, env.OPENWEATHER_API_KEY);
        return { result };
      }

      case 'search_web': {
        if (!env.TAVILY_API_KEY) return { error: 'Search API not configured' };
        const result = await searchWeb(args.query, env.TAVILY_API_KEY);
        return { result };
      }

      case 'search_youtube': {
        if (!env.YOUTUBE_API_KEY) return { error: 'YouTube API not configured' };
        const result = await searchYouTube(args.query, env.YOUTUBE_API_KEY);
        return { result };
      }

      case 'get_news': {
        const result = await getNews();
        return { result };
      }

      default:
        return { error: `Unknown function: ${name}` };
    }
  } catch (err: any) {
    console.error(`[RivaLive] Function call error (${name}):`, err);
    return { error: err.message || 'Function execution failed' };
  }
}

/**
 * Handle WebSocket upgrade for /api/riva/live.
 *
 * Called directly from the top-level fetch handler (bypasses Hono middleware)
 * because Cloudflare Workers WebSocket responses (status 101 + webSocket)
 * cannot have extra headers added by CORS or other middleware.
 */
export function handleRivaLiveWebSocket(request: Request, env: Bindings): Response {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  if (!userId) {
    return new Response('Missing userId query parameter', { status: 401 });
  }
  const userName = url.searchParams.get('userName') || undefined;

  if (!env.GEMINI_API_KEY) {
    return new Response('Gemini API key not configured', { status: 500 });
  }

  // Create the WebSocket pair for the client connection
  const pair = new WebSocketPair();
  const [clientWs, serverWs] = [pair[0], pair[1]];

  // Accept the server side of the pair
  serverWs.accept();

  // Session timeout (90 seconds)
  const SESSION_TIMEOUT_MS = 90_000;
  let sessionTimer: ReturnType<typeof setTimeout> | null = null;
  let geminiSession: GeminiLiveSession | null = null;

  /** Send a JSON message to the browser client */
  function sendToClient(msg: Record<string, any>) {
    try {
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(JSON.stringify(msg));
      }
    } catch (err) {
      console.error('[RivaLive] Failed to send to client:', err);
    }
  }

  /** Clean up everything */
  function cleanup() {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
      sessionTimer = null;
    }
    geminiSession?.close();
    geminiSession = null;
    try {
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.close(1000, 'session ended');
      }
    } catch { /* already closed */ }
  }

  // Start the session timeout
  sessionTimer = setTimeout(() => {
    console.log(`[RivaLive] Session timeout (${SESSION_TIMEOUT_MS / 1000}s) for user ${userId}`);
    sendToClient({ type: 'error', message: 'Session timed out (90s limit)' });
    cleanup();
  }, SESSION_TIMEOUT_MS);

  // Load the user's memory, then connect to Gemini. Runs async after the 101
  // response is returned — the browser waits for setup_complete anyway, and a
  // failed connect is reported over the socket instead of an HTTP status.
  (async () => {
  const personalContext = await loadPersonalContext(env, userId);
  try {
    geminiSession = connectToGemini(
      env.GEMINI_API_KEY,

      // onMessage — relay Gemini responses to the browser
      async (msg: GeminiServerMessage) => {
        switch (msg.type) {
          case 'setup_complete':
            sendToClient({ type: 'setup_complete' });
            break;
          case 'audio':
            sendToClient({ type: 'audio', audio: msg.audio });
            break;
          case 'text':
            sendToClient({ type: 'text', text: msg.text });
            break;
          case 'turn_complete':
            sendToClient({ type: 'turn_complete' });
            break;
          case 'interrupted':
            sendToClient({ type: 'interrupted' });
            break;
          case 'function_call': {
            if (!msg.functionCalls?.length) break;

            for (const fc of msg.functionCalls) {
              sendToClient({ type: 'function_call', id: fc.id, name: fc.name, args: fc.args });
            }

            const responses = await Promise.all(
              msg.functionCalls.map(async (fc) => {
                const result = await executeFunctionCall(fc.name, fc.args, env);
                sendToClient({ type: 'function_result', id: fc.id, name: fc.name, result });
                return { id: fc.id, name: fc.name, response: result };
              }),
            );

            if (geminiSession) {
              sendFunctionResponses(geminiSession, responses);
            }
            break;
          }
          case 'error':
            sendToClient({ type: 'error', message: 'Gemini error' });
            break;
        }
      },

      // onClose
      (code, reason) => {
        console.log(`[RivaLive] Gemini closed: ${code} ${reason}`);
        sendToClient({ type: 'error', message: `Gemini disconnected: ${reason}` });
        cleanup();
      },

      // onError
      (err) => {
        console.error('[RivaLive] Gemini error:', err);
        sendToClient({ type: 'error', message: 'Connection to AI failed' });
        cleanup();
      },

      userName,
      personalContext,
    );
  } catch (err: any) {
    console.error('[RivaLive] Failed to connect to Gemini:', err);
    sendToClient({ type: 'error', message: 'Failed to connect to AI' });
    cleanup();
  }
  })();

  // Handle messages from the browser client
  serverWs.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(
        typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer),
      );

      if (!geminiSession?.ready) {
        console.log('[RivaLive] Message received before Gemini ready, type:', msg.type);
        return;
      }

      switch (msg.type) {
        case 'audio':
          if (msg.data) sendAudioChunk(geminiSession, msg.data);
          break;
        case 'text':
          if (msg.text) sendTextMessage(geminiSession, msg.text);
          break;
        default:
          console.log('[RivaLive] Unknown client message type:', msg.type);
      }
    } catch (err) {
      console.error('[RivaLive] Failed to parse client message:', err);
    }
  });

  serverWs.addEventListener('close', () => {
    console.log(`[RivaLive] Client disconnected: user ${userId}`);
    cleanup();
  });

  serverWs.addEventListener('error', (err) => {
    console.error('[RivaLive] Client WebSocket error:', err);
    cleanup();
  });

  // Return the WebSocket upgrade response
  return new Response(null, {
    status: 101,
    webSocket: clientWs,
  });
}
