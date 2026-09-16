# Worker Backend Organization

This document describes the organized structure of the Vivly backend worker.

## 📁 Folder Structure

```
worker/src/
├── config/               # Configuration and constants
│   └── constants.ts      # App-wide constants (admin emails, CORS, AI config)
│
├── middleware/           # Request middleware
│   ├── auth.ts          # Authentication middleware
│   └── admin.ts         # Admin authorization helpers
│
├── services/            # Business logic and external services
│   ├── supabase.ts      # Supabase client factory
│   └── ai/              # AI service integrations
│       ├── grok.ts      # Grok AI for command planning
│       ├── groq.ts      # Groq AI for briefings and insights
│       └── sarvam.ts    # Sarvam AI for text-to-speech
│
├── routes/              # API route handlers
│   ├── health.ts        # Health check and DB init
│   ├── tasks.ts         # Task CRUD operations
│   ├── focus.ts         # Focus session management
│   ├── riva.ts          # Riva AI endpoints (plan, speak, briefing)
│   ├── orb.ts           # Orb guide rhythm insights
│   ├── insights.ts      # AI memory and pattern analysis
│   ├── admin.ts         # Admin analytics endpoints
│   └── waitlist.ts      # Public waitlist submission
│
├── types/               # TypeScript type definitions
│   └── index.ts         # All shared types and interfaces
│
├── utils/               # Utility functions
│   └── heuristic-parser.ts  # Offline command parser
│
└── index.ts             # Main application entry point
```

## 🔄 Migration from Monolithic Structure

The backend was reorganized from a single 1255-line `index.ts` file into a modular structure with clear separation of concerns:

### Before
- ❌ Everything in one file
- ❌ Hard to navigate and maintain
- ❌ Tight coupling between components
- ❌ Difficult to test individual modules

### After
- ✅ Organized by feature and responsibility
- ✅ Easy to locate and update code
- ✅ Loose coupling with clear interfaces
- ✅ Individual modules can be tested independently

## 📋 Component Responsibilities

### Config (`config/`)
Contains all application-wide configuration:
- Admin email whitelist
- Public endpoint definitions
- CORS configuration
- AI service endpoints and defaults

### Middleware (`middleware/`)
Handles cross-cutting concerns:
- **auth.ts**: Validates `x-user-id` header for protected routes
- **admin.ts**: Checks admin privileges for analytics endpoints

### Services (`services/`)
Encapsulates business logic and external integrations:
- **supabase.ts**: Creates Supabase clients (service role or anon)
- **ai/grok.ts**: Grok API for intelligent command parsing
- **ai/groq.ts**: Groq API for AI briefings and insights
- **ai/sarvam.ts**: Sarvam AI for Hindi text-to-speech

### Routes (`routes/`)
Each file handles a specific domain:
- **health.ts**: System health and initialization
- **tasks.ts**: Task management (GET, POST, PATCH, DELETE)
- **focus.ts**: Focus session tracking
- **riva.ts**: AI assistant features (planning, TTS, morning briefing)
- **orb.ts**: Rhythm insights and guidance
- **insights.ts**: User pattern analysis and AI-powered insights
- **admin.ts**: Platform analytics (stats, timeline, adoption)
- **waitlist.ts**: Public waitlist registration

### Types (`types/`)
Centralized TypeScript definitions:
- Environment bindings
- Request/response types
- Database model interfaces
- AI action types

### Utils (`utils/`)
Reusable utility functions:
- **heuristic-parser.ts**: Offline command parsing without AI (fallback mode)

## 🚀 Running the Worker

```bash
# Development
npm run dev

# Deploy
npm run deploy
```

## 🛠️ Adding New Features

### Adding a New Route
1. Create a new file in `routes/` (e.g., `routes/calendar.ts`)
2. Define your route handlers using Hono
3. Import and mount in `index.ts`:
   ```typescript
   import calendarRoutes from './routes/calendar';
   app.route('/api/calendar', calendarRoutes);
   ```

### Adding a New Service
1. Create a new file in `services/` (e.g., `services/notifications.ts`)
2. Export functions that encapsulate your logic
3. Import and use in your routes

### Adding New Types
1. Add interfaces/types to `types/index.ts`
2. Export them for use across the codebase

## 🔐 Security Notes

- All routes under `/api/*` require authentication (except `/health` and `/waitlist`)
- Admin routes check email against whitelist
- User isolation enforced via `user_id` from auth context
- Service role key used for database operations (bypasses RLS securely)

## 📦 Dependencies

- **hono**: Fast, lightweight web framework for Cloudflare Workers
- **@supabase/supabase-js**: Supabase client library
- **@google/generative-ai**: Google AI SDK (currently unused, can be removed)

## 🎯 Benefits of This Structure

1. **Maintainability**: Easy to find and update specific features
2. **Scalability**: New features don't bloat existing files
3. **Testability**: Each module can be tested in isolation
4. **Collaboration**: Multiple developers can work on different modules
5. **Code Reuse**: Services can be shared across routes
6. **Type Safety**: Centralized types ensure consistency
