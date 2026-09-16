# Rivly

Productivity and wellness app: AI assistant (Riva), day planner, focus timer,
rhythm analytics. Web + Android/iOS via Capacitor.

## Stack

- `apps/web` — React + TypeScript + Vite frontend
- `worker` — Cloudflare Workers API (Hono)
- `packages/*` — shared core, api-client, ui, utils
- `supabase/` — Postgres migrations + edge functions
- `android/` — Capacitor Android wrapper

## Setup

```bash
npm install

# Frontend env — copy the template and fill in your own values
cp apps/web/.env.example apps/web/.env

npm run dev            # web (localhost:8080)
npm run dev:worker     # worker API (localhost:8787)
```

## Configuration you must provide

This repo contains **no credentials**. To run it you supply your own:

- A Supabase project (URL + anon key in `apps/web/.env`; service-role key set on
  the worker with `wrangler secret put`)
- Worker secrets (`wrangler secret put <NAME>`): Google OAuth client id/secret,
  AI provider keys, Cashfree keys. See `apps/web/.env.example` for the list.

## Build & test

```bash
npm run build          # web -> apps/web/dist
npm run typecheck
npm run test
cd worker && npm run deploy
```
