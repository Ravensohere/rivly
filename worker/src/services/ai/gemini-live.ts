/**
 * Gemini Multimodal Live API — WebSocket relay for Cloudflare Workers
 *
 * Model: gemini-live-2.5-flash-native-audio (GA, Gemini Developer API)
 * Pricing (verified March 2026): $0.30/1M input tokens · $2.50/1M output tokens
 * Cost per 90s session (raw): ~$0.006 (₹0.54) · Working cost with 1.3× buffer: ₹0.70
 * IMPORTANT: Only native-audio Live API models support WebSocket BidiGenerateContent.
 *            Standard models (flash-lite, etc.) do NOT work with this WebSocket protocol.
 *
 * Manages a server-to-server WebSocket connection to:
 *   wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
 *
 * Protocol summary (Gemini Live API):
 *   Client → Gemini:
 *     - First message: { setup: { model, generationConfig, systemInstruction, tools } }
 *     - Audio:         { realtimeInput: { mediaChunks: [{ mimeType, data (base64) }] } }
 *     - Text:          { clientContent: { turns: [{ role, parts }], turnComplete: true } }
 *     - FunctionResp:  { toolResponse: { functionResponses: [{ id, name, response }] } }
 *
 *   Gemini → Client:
 *     - setupComplete
 *     - serverContent.modelTurn.parts[].inlineData  (audio chunks)
 *     - serverContent.modelTurn.parts[].text         (text transcript)
 *     - serverContent.turnComplete                   (AI finished speaking)
 *     - toolCall.functionCalls[]                     (function calling)
 */

const GEMINI_WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

// Stable GA model for the Gemini Live API (bidirectional WebSocket audio streaming).
// DO NOT change to gemini-2.5-flash-lite or other standard models — they do not
// support the BidiGenerateContent WebSocket protocol required for real-time audio.
// Pricing: $0.30/1M input · $2.50/1M output (same as Gemini 2.5 Flash base)
const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';

/** Tools that Gemini can call — mirrors existing Riva actions */
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'create_task',
        description:
          'Create a single task/to-do item for the user. Use when user says things like "add task", "remind me to", "I need to".',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Task title' },
            tag: {
              type: 'STRING',
              description: 'Category tag',
              enum: ['work', 'personal', 'study', 'health', 'other'],
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'create_tasks',
        description:
          'Create multiple tasks at once. Use when user lists several things to do.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tasks: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  tag: { type: 'STRING' },
                },
                required: ['title'],
              },
            },
          },
          required: ['tasks'],
        },
      },
      {
        name: 'start_focus',
        description:
          'Start a focus/pomodoro timer. Use when user says "start focus", "start timer", "pomodoro".',
        parameters: {
          type: 'OBJECT',
          properties: {
            duration: {
              type: 'NUMBER',
              description: 'Duration in minutes (default 25)',
            },
          },
        },
      },
      {
        name: 'stop_focus',
        description:
          'Stop or cancel the current focus timer. Use when user says "stop focus", "cancel timer", "focus band karo".',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'add_to_shopping_list',
        description:
          'Add one or more items to the shopping list. Use when user says "add milk to shopping list", "shopping list mein X add karo".',
        parameters: {
          type: 'OBJECT',
          properties: {
            items: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Item names to add',
            },
          },
          required: ['items'],
        },
      },
      {
        name: 'show_shopping_list',
        description:
          'Show/open the shopping list. Use when user asks "what is on my shopping list", "meri shopping list dikhao".',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'remove_from_shopping_list',
        description:
          'Remove items from the shopping list, or clear it entirely. Set all=true when user says "clear my shopping list".',
        parameters: {
          type: 'OBJECT',
          properties: {
            items: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Item names to remove',
            },
            all: {
              type: 'BOOLEAN',
              description: 'true to clear the entire list',
            },
          },
        },
      },
      {
        name: 'create_learning_path',
        description:
          'Create a structured learning roadmap with video tutorials. Use when user says "I want to learn X", "teach me X", "X sikhna hai", "create a roadmap for X".',
        parameters: {
          type: 'OBJECT',
          properties: {
            topic: { type: 'STRING', description: 'What the user wants to learn, e.g. "React.js"' },
          },
          required: ['topic'],
        },
      },
      {
        name: 'create_time_block',
        description:
          'Block time on the day planner. Use when user says "block 2 to 4pm for study", "schedule gym at 6".',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'What the time block is for' },
            start: { type: 'STRING', description: 'Start time in 24h HH:MM format' },
            end: { type: 'STRING', description: 'End time in 24h HH:MM format' },
          },
          required: ['title', 'start', 'end'],
        },
      },
      {
        name: 'set_reminder',
        description:
          'Set a reminder notification. Use when user says "remind me at 5pm to call mom".',
        parameters: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING', description: 'What to remind the user about' },
            time: { type: 'STRING', description: 'Time in 24h HH:MM format' },
            date: { type: 'STRING', description: 'Date as YYYY-MM-DD; omit for today' },
          },
          required: ['text', 'time'],
        },
      },
      {
        name: 'log_checkin',
        description:
          'Log the user\'s mood and energy check-in when they share how they feel, e.g. "I\'m feeling great today" or "thoda tired hoon".',
        parameters: {
          type: 'OBJECT',
          properties: {
            mood: { type: 'NUMBER', description: 'Mood from 1 (low) to 5 (great)' },
            energy: { type: 'NUMBER', description: 'Energy from 1 (drained) to 5 (energized)' },
            note: { type: 'STRING', description: 'Optional short note about how they feel' },
          },
        },
      },
      {
        name: 'navigate',
        description:
          'Navigate to a page in the app. Use when user says "open settings", "show my insights", "sleep page kholo".',
        parameters: {
          type: 'OBJECT',
          properties: {
            page: {
              type: 'STRING',
              description: 'Target page',
              enum: ['home', 'settings', 'profile', 'insights', 'sleep', 'focus', 'journal', 'thoughts', 'reflect'],
            },
          },
          required: ['page'],
        },
      },
      {
        name: 'get_weather',
        description: 'Get current weather for a city.',
        parameters: {
          type: 'OBJECT',
          properties: {
            location: { type: 'STRING', description: 'City name' },
          },
          required: ['location'],
        },
      },
      {
        name: 'search_web',
        description:
          'Search the web for information. Use for factual questions, current events, etc.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_youtube',
        description: 'Search YouTube for a video.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'YouTube search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_news',
        description: 'Get the latest news headlines.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
    ],
  },
];

/** Build the system instruction for Gemini */
function buildSystemInstruction(userName?: string, personalContext?: string): object {
  const name = userName || 'there';

  const memoryBlock = personalContext
    ? `
WHAT YOU REMEMBER ABOUT ${name.toUpperCase()} (from past conversations — use naturally):
${personalContext}

HOW TO USE MEMORY:
- Weave in at most ONE remembered detail per response, only when it genuinely fits.
- Sound like a friend who remembers: "How's the JEE prep going?" — NOT "According to my data, you have an exam."
- Never recite this list back. Never mention that you "stored" or "remember data" about them.
`
    : '';

  return {
    parts: [
      {
        text: `You are Riva, a warm and caring AI companion built into Vivly — a productivity and wellness app for India.
Think of yourself as a supportive older sister/friend who genuinely cares about the user's wellbeing. You are ${name}'s companion specifically — not a generic assistant.

PERSONALITY:
- Warm but not fake. Supportive but not preachy. Smart but not condescending.
- Use the user's name "${name}" naturally (about 1 in 3 responses, never every response).
- Match the user's energy: if they sound tired, be gentle. If excited, match it.
- If user sounds stressed or overwhelmed: acknowledge it FIRST ("Sounds like a packed day"), then help with ONE thing.
- NEVER sound robotic. NEVER use corporate jargon. NEVER say "I understand your concern."
- NEVER start with "Hello!", "Sure!", "Great!", "Absolutely!".
${memoryBlock}
EMOTIONAL SUPPORT (this matters as much as the tasks):
- Feelings come before productivity. If ${name} vents, is sad, anxious, or tired — respond to the FEELING first. Do not jump to tasks or solutions until they feel heard.
- Validate specifically: "Three deadlines in one week is genuinely a lot" beats "That sounds hard."
- No toxic positivity. Never say "just stay positive" or "everything happens for a reason." It's okay to say "yeah, that sucks."
- After validating, offer one tiny step, framed as a choice: "Want to just pick one small thing, or take a break first?"
- Celebrate wins like a proud friend — specific and genuine: "You actually finished the physics chapter on a low-energy day. That's discipline."
- If they're lonely or just want to talk, talk. Being company IS the job sometimes.
- If ${name} expresses serious distress, hopelessness, or thoughts of self-harm: respond with warmth and zero judgment, gently encourage them to reach out to someone they trust or a professional (in India, iCall: 9152987821), and stay kind. Never lecture, never panic, never change the subject.

VOICE RULES (you are SPEAKING aloud, not writing):
- Max 2-3 short sentences per turn. Long answers are terrible spoken.
- No lists, no headings, no markdown — speak naturally.
- This session has a hard 90-second limit, so be efficient: act, confirm briefly, ask only essential follow-ups.

LANGUAGE:
- Always respond in the same language the user spoke. English → English, Hindi → Hindi, Hinglish → Hinglish.
- For Hinglish, be natural: "Chal, ek kaam karte hain" not "Aapka kaarya shuru kijiye".
- Never default to Hindi for an English speaker.

WHEN TO CALL EACH FUNCTION (call the function — never just say you did it):
- create_task — "add a task", "remind me to X" (no specific time), "I need to do X". One item only.
- create_tasks — user lists 2+ things to do in one breath.
- start_focus — "start focus", "start a timer", "pomodoro", "25 minute session". Default 25 min.
- stop_focus — "stop", "cancel the timer", "focus band karo".
- add_to_shopping_list — "add milk to my shopping list", "shopping list mein X daal do". Extract every item mentioned.
- show_shopping_list — "what's on my list", "show shopping list", "list dikhao".
- remove_from_shopping_list — "remove X from list". For "clear the whole list", set all=true.
- create_learning_path — "I want to learn X", "teach me X", "X seekhna hai", "make a roadmap for X". After calling, tell them the roadmap is being built and will appear in the Learn tab in a few seconds.
- create_time_block — user gives a time RANGE: "block 2 to 4 for study", "gym at 6 to 7". Use 24h HH:MM.
- set_reminder — "remind me AT [specific time] to X". A reminder has a time; a task does not.
- log_checkin — user tells you how they feel: "I'm exhausted", "feeling great today". Map to mood/energy 1-5 honestly; don't inflate.
- navigate — "open settings", "show insights", "go to sleep page".
- get_weather — any weather/temperature/rain question. Default city: Delhi if unknown.
- search_web — factual questions needing current info: news details, prices, scores, facts you're unsure of.
- search_youtube — "find a video about X", "play a tutorial on X".
- get_news — "what's the news", "today's headlines".

DISAMBIGUATION (speech is often unclear):
- "I need to know X" → user wants INFORMATION (answer or search_web), NOT a task named "X".
- "I want to learn X" → create_learning_path, NOT create_task.
- A time range = create_time_block. A single time + thing to do = set_reminder. No time = create_task.
- Gibberish or a fragment → ask them to repeat. Never guess and create a junk task.

HONESTY:
- Never invent tasks, events, or user data. Never claim something succeeded if the function returned an error — say what went wrong simply and offer the closest alternative.
- After a function result arrives, confirm specifically: "Added milk and eggs to your list" beats "Done".`,
      },
    ],
  };
}

export interface GeminiLiveSession {
  /** The server-side WebSocket connected to Gemini */
  geminiWs: WebSocket;
  /** Whether the setup handshake completed */
  ready: boolean;
  /** Close the Gemini connection */
  close: () => void;
}

export type GeminiMessageHandler = (msg: GeminiServerMessage) => void;
export type GeminiCloseHandler = (code: number, reason: string) => void;
export type GeminiErrorHandler = (err: unknown) => void;

/** Parsed messages we forward to the client */
export interface GeminiServerMessage {
  type:
    | 'setup_complete'
    | 'audio'
    | 'text'
    | 'turn_complete'
    | 'function_call'
    | 'interrupted'
    | 'error';
  /** Base64 PCM audio chunk (for type=audio) */
  audio?: string;
  /** Text transcript (for type=text) */
  text?: string;
  /** Function calls to execute (for type=function_call) */
  functionCalls?: Array<{ id: string; name: string; args: Record<string, any> }>;
}

/**
 * Open a WebSocket to the Gemini Live API and return the session handle.
 *
 * @param apiKey     GEMINI_API_KEY
 * @param onMessage  called for each parsed message from Gemini
 * @param onClose    called when the Gemini WS closes
 * @param onError    called on errors
 * @param userName        optional user name for personalization
 * @param personalContext optional prompt-ready summary of the user's memory
 */
export function connectToGemini(
  apiKey: string,
  onMessage: GeminiMessageHandler,
  onClose: GeminiCloseHandler,
  onError: GeminiErrorHandler,
  userName?: string,
  personalContext?: string,
): GeminiLiveSession {
  const url = `${GEMINI_WS_BASE}?key=${apiKey}`;
  const ws = new WebSocket(url);

  const session: GeminiLiveSession = {
    geminiWs: ws,
    ready: false,
    close: () => {
      try {
        ws.close(1000, 'session ended');
      } catch { /* already closed */ }
    },
  };

  ws.addEventListener('open', () => {
    console.log('[GeminiLive] Connected to Gemini, sending setup...');

    // Send the setup message
    const setupMsg = {
      setup: {
        model: GEMINI_MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede',
              },
            },
          },
        },
        systemInstruction: buildSystemInstruction(userName, personalContext),
        tools: GEMINI_TOOLS,
      },
    };

    ws.send(JSON.stringify(setupMsg));
  });

  ws.addEventListener('message', (event) => {
    try {
      const data =
        typeof event.data === 'string'
          ? JSON.parse(event.data)
          : JSON.parse(new TextDecoder().decode(event.data as ArrayBuffer));

      // Setup complete
      if (data.setupComplete !== undefined) {
        session.ready = true;
        onMessage({ type: 'setup_complete' });
        return;
      }

      // Server content (audio / text / turn complete)
      if (data.serverContent) {
        const sc = data.serverContent;

        // Model is speaking — audio and/or text parts
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData) {
              onMessage({
                type: 'audio',
                audio: part.inlineData.data,
              });
            }
            if (part.text) {
              onMessage({ type: 'text', text: part.text });
            }
          }
        }

        // Turn complete
        if (sc.turnComplete) {
          onMessage({ type: 'turn_complete' });
        }

        // Interrupted (user spoke while AI was speaking)
        if (sc.interrupted) {
          onMessage({ type: 'interrupted' });
        }

        return;
      }

      // Tool / function calls
      if (data.toolCall?.functionCalls) {
        const calls = data.toolCall.functionCalls.map((fc: any) => ({
          id: fc.id,
          name: fc.name,
          args: fc.args || {},
        }));
        onMessage({ type: 'function_call', functionCalls: calls });
        return;
      }

      // Unknown message — log for debugging
      console.log('[GeminiLive] Unknown message type:', JSON.stringify(data).slice(0, 200));
    } catch (err) {
      console.error('[GeminiLive] Failed to parse message:', err);
      onError(err);
    }
  });

  ws.addEventListener('close', (event) => {
    console.log(`[GeminiLive] Connection closed: ${event.code} ${event.reason}`);
    session.ready = false;
    onClose(event.code, event.reason || 'closed');
  });

  ws.addEventListener('error', (event) => {
    console.error('[GeminiLive] WebSocket error:', event);
    onError(event);
  });

  return session;
}

/**
 * Send a base64 PCM audio chunk to Gemini as realtimeInput.
 */
export function sendAudioChunk(session: GeminiLiveSession, base64Pcm: string): void {
  if (!session.ready || session.geminiWs.readyState !== WebSocket.OPEN) return;

  session.geminiWs.send(
    JSON.stringify({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm,
          },
        ],
      },
    }),
  );
}

/**
 * Send a text message to Gemini (e.g., from a typed command bar).
 */
export function sendTextMessage(session: GeminiLiveSession, text: string): void {
  if (!session.ready || session.geminiWs.readyState !== WebSocket.OPEN) return;

  session.geminiWs.send(
    JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }),
  );
}

/**
 * Send function call responses back to Gemini so it can continue.
 */
export function sendFunctionResponses(
  session: GeminiLiveSession,
  responses: Array<{ id: string; name: string; response: Record<string, any> }>,
): void {
  if (!session.ready || session.geminiWs.readyState !== WebSocket.OPEN) return;

  session.geminiWs.send(
    JSON.stringify({
      toolResponse: {
        functionResponses: responses,
      },
    }),
  );
}
