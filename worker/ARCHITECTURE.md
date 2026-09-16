# Backend Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VIVLY WORKER API                            │
│                      (Cloudflare Worker)                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │       index.ts            │
                    │    (Main Entry Point)     │
                    │    - CORS Middleware      │
                    │    - Auth Middleware      │
                    │    - Route Mounting       │
                    └─────────────┬─────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
    ┌───────▼────────┐   ┌────────▼────────┐   ┌──────▼──────┐
    │  MIDDLEWARE    │   │    ROUTES       │   │   SERVICES  │
    │                │   │                 │   │             │
    │  ┌──────────┐  │   │  ┌───────────┐ │   │  ┌────────┐ │
    │  │  auth    │  │   │  │  health   │ │   │  │supabase│ │
    │  └──────────┘  │   │  └───────────┘ │   │  └────────┘ │
    │  ┌──────────┐  │   │  ┌───────────┐ │   │             │
    │  │  admin   │  │   │  │   tasks   │ │   │  ┌────────┐ │
    │  └──────────┘  │   │  └───────────┘ │   │  │   AI   │ │
    └────────────────┘   │  ┌───────────┐ │   │  │        │ │
                         │  │   focus   │ │   │  ├────────┤ │
    ┌───────────────┐    │  └───────────┘ │   │  │ grok   │ │
    │     TYPES     │    │  ┌───────────┐ │   │  │ groq   │ │
    │               │◄───┤  │   riva    │ │   │  │ sarvam │ │
    │  • Bindings   │    │  └───────────┘ │   │  └────────┘ │
    │  • Variables  │    │  ┌───────────┐ │   └─────────────┘
    │  • Task       │    │  │    orb    │ │
    │  • AI Types   │    │  └───────────┘ │   ┌─────────────┐
    └───────────────┘    │  ┌───────────┐ │   │    UTILS    │
                         │  │ insights  │ │   │             │
    ┌───────────────┐    │  └───────────┘ │   │  ┌────────┐ │
    │    CONFIG     │    │  ┌───────────┐ │   │  │heuris- │ │
    │               │◄───┤  │   admin   │ │   │  │  tic   │ │
    │  • ADMIN_EMAILS│   │  └───────────┘ │   │  │ parser │ │
    │  • CORS_CONFIG│    │  ┌───────────┐ │   │  └────────┘ │
    │  • AI_CONFIG  │    │  │ waitlist  │ │   └─────────────┘
    └───────────────┘    │  └───────────┘ │
                         └─────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       REQUEST FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

    Client Request
         │
         ▼
    ┌────────┐
    │  CORS  │  (Allow origins, methods, headers)
    └────┬───┘
         │
         ▼
    ┌────────────┐
    │  Auth?     │  (Public or Protected?)
    └─────┬──────┘
          │
    ┌─────▼─────┐
    │ Route     │  (Match endpoint)
    └─────┬─────┘
          │
    ┌─────▼──────┐
    │ Controller │  (Route handler)
    └─────┬──────┘
          │
    ┌─────▼──────┐
    │  Service   │  (Business logic)
    └─────┬──────┘
          │
    ┌─────▼──────┐
    │  Database  │  (Supabase)
    └─────┬──────┘
          │
          ▼
     JSON Response

┌─────────────────────────────────────────────────────────────────────┐
│                    ROUTE ORGANIZATION                               │
└─────────────────────────────────────────────────────────────────────┘

/api
├── /health              [GET]   Health check
├── /init-db            [POST]  DB guidance
├── /tasks              [GET]   List tasks
│   ├── /               [POST]  Create task
│   ├── /:id            [PATCH] Update task
│   └── /:id            [DELETE] Delete task
├── /focus              [POST]  Create focus session
├── /riva
│   ├── /plan           [POST]  AI command planning
│   ├── /speak          [POST]  Text-to-speech
│   └── /morning-briefing [POST] AI briefing
├── /orb-guide          [POST]  Rhythm insights
├── /insights
│   └── /memory         [POST]  AI pattern analysis
├── /admin              (⚠️ Admin Only)
│   ├── /stats          [GET]   Platform metrics
│   ├── /user-timeline  [GET]   Activity timeline
│   └── /feature-adoption [GET] Feature usage
└── /waitlist           [POST]  Public signup

┌─────────────────────────────────────────────────────────────────────┐
│                    SERVICE RESPONSIBILITIES                         │
└─────────────────────────────────────────────────────────────────────┘

SUPABASE SERVICE
├── createSupabaseClient()      → Service role client
└── createSupabaseAnonClient()  → Anon client

AI SERVICES
├── Grok   → callGrokAPI()           (Command understanding)
├── Groq   → generateMorningBriefing() (AI briefings)
│          → generateAIInsights()     (Pattern analysis)
│          → generateOrbGuide()       (Rhythm insights)
└── Sarvam → generateSpeech()        (Text-to-speech)

UTILS
└── heuristic-parser
    ├── parseCommandHeuristically()  (Main parser)
    ├── parseTimeBlock()            (Time block parsing)
    ├── parseTask()                 (Task parsing)
    ├── parseNavigation()           (Nav parsing)
    ├── parseTheme()                (Theme parsing)
    ├── parseCheckIn()              (Check-in parsing)
    └── parseSleep()                (Sleep parsing)

┌─────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW EXAMPLES                               │
└─────────────────────────────────────────────────────────────────────┘

EXAMPLE 1: Create Task
─────────────────────
POST /api/tasks
  │
  ├─→ authMiddleware (validate x-user-id)
  │
  ├─→ taskRoutes.post('/')
  │     │
  │     └─→ createSupabaseClient()
  │           │
  │           └─→ supabase.from('tasks').insert()
  │
  └─→ JSON { task: {...} }

EXAMPLE 2: AI Command
──────────────────────
POST /api/riva/plan { transcript: "focus for 20 mins" }
  │
  ├─→ authMiddleware
  │
  ├─→ rivaRoutes.post('/plan')
  │     │
  │     ├─→ callGrokAPI() ─── (if GROK_API_KEY exists)
  │     │     └─→ Grok API
  │     │
  │     └─→ parseCommandHeuristically() ─── (fallback)
  │           └─→ heuristic logic
  │
  └─→ JSON { message, action, data }

EXAMPLE 3: Admin Analytics
───────────────────────────
GET /api/admin/stats
  │
  ├─→ authMiddleware
  │
  ├─→ requireAdmin() (check email whitelist)
  │
  ├─→ adminRoutes.get('/stats')
  │     │
  │     └─→ createSupabaseClient()
  │           │
  │           ├─→ Query events_ledger
  │           ├─→ Query focus_sessions
  │           ├─→ Query tasks
  │           └─→ Calculate metrics
  │
  └─→ JSON { users, engagement, waitlist }

┌─────────────────────────────────────────────────────────────────────┐
│                    BENEFITS OF STRUCTURE                            │
└─────────────────────────────────────────────────────────────────────┘

✅ MAINTAINABILITY    → Easy to locate and update code
✅ SCALABILITY        → Add features without bloating files
✅ TESTABILITY        → Test modules in isolation
✅ COLLABORATION      → Multiple devs work independently
✅ REUSABILITY        → Services shared across routes
✅ TYPE SAFETY        → Centralized type definitions
✅ SECURITY           → Clear auth boundaries
✅ DOCUMENTATION      → Self-documenting structure
```
