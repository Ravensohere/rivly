---
id: login
title: Login Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/LoginPage.tsx (route /login, public, redirects a real/non-guest user to /app, 271 lines pre-edit). Enumeration-safety check: signIn calls Supabase's signInWithPassword, which returns the identical generic "Invalid login credentials" error for a wrong password and for a nonexistent account alike (Supabase never differentiates); LoginPage itself renders no custom error text (delegated to the shared toast in useAuth.ts, untouched), so there is no component-level enumeration leak — verdict APPROVED, no change needed. Contrast audit: 7 total text-muted-foreground sites found (all plain text, no icon-only sites to exclude), 2 of them opacity-stacked via a `/0.6` alpha channel on the inline hsl() color (same opacity-stacking lesson flagged on learn.md). Hand-computed AA contrast (HSL->sRGB->relative-luminance, via a small Node script, not hand-rounded) against each site's real background — 2 sites (gradient-calm backdrop) got the real 3-stop gradient sampled at all 3 stops, not a flattened approximation. 3 of 7 sites failed and were fixed; 4 of 7 sites were computed to genuinely pass (4.557-4.798:1 against a flat, non-approximated --card background, not a hairline-by-approximation case) and were left untouched.
---

# Card: Login Page

This card represents the redesign/verification pass for the Login Page feature/page in the Rivly web app.

## Details

- **Status:** merged (review pass recorded below)
- **Owner:** task-4-agent
- **Target Branch:** riva/integrated-main

## Acceptance Criteria

- vite build passes
- npm test passes
- primary interaction verified
- no shared-component regression in holistic smoke pass

## Merge Gate

riva/integrated-main local-only (no push); no .env/secrets access; <=2 concurrent builds

## Handoff

### PASS 1 — Audit (contrast + route wiring)

Route confirmed in `AnimatedRoutes.tsx:25` (lazy import) and `:58`
(`<Route path="/login" element={!user || isGuest ? <LoginPage /> : <Navigate to="/app" replace />} />`)
— public, redirects an already-authenticated non-guest user away, matches
the card brief. `/forgot-password` (linked from this page) also confirmed
wired at `AnimatedRoutes.tsx:60`.

**Contrast audit (hand HSL->sRGB->relative-luminance math, via a Node
script — not rounded by hand)**, against this page's actual token values
(`--background: 38 35% 96%` / dark `230 22% 8%`, `--card: 38 30% 98%` /
dark `230 20% 11%`, `--muted-foreground: 230 10% 48%` / dark `230 10% 55%`)
and each site's *actual* composited background:

| Site | Background composite | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|
| "Home" link (top-left) | `var(--gradient-calm)` 3-stop gradient, sampled at all 3 stops directly | 4.28–4.39:1 | 4.89–5.11:1 | **Fails in light mode** (all 3 stops below 4.5; dark already passes) |
| Subtitle "Sign in to continue your daily flow" | flat `hsl(var(--card))` | 4.557:1 | 4.798:1 | **Passes** (exact flat-bg computation, not an approximation) — left untouched |
| "Forgot password?" link (`text-muted-foreground` class) | flat `hsl(var(--card))` | 4.557:1 | 4.798:1 | **Passes** — left untouched |
| "Don't have an account? Sign up" toggle button (`text-muted-foreground` class) | flat `hsl(var(--card))` | 4.557:1 | 4.798:1 | **Passes** — left untouched |
| "or" divider label — `hsl(var(--muted-foreground) / 0.6)` (opacity-stacked via alpha) | flat `hsl(var(--card))`, alpha-composited | 2.257:1 | 2.551:1 | **Fails badly** |
| "Continue as Guest" button | flat `hsl(var(--card))` (transparent button bg over card) | 4.557:1 | 4.798:1 | **Passes** — left untouched |
| Terms/Privacy paragraph — `hsl(var(--muted-foreground) / 0.6)` (opacity-stacked via alpha) | flat `hsl(var(--card))`, alpha-composited | 2.257:1 | 2.551:1 | **Fails badly** |

7 sites total (matches `grep -n muted-foreground LoginPage.tsx` exactly —
lines 67, 139, 213, 222, 235, 251, 260). No icon-only `text-muted-foreground`
sites exist on this page, so there was nothing to exclude on that basis.

**Fix applied to the 3 failing sites**, the pipeline's established
remediation (`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`,
same fix already used on the merged `forgot-password` card):
- "Home" link: added the className, removed the inline `color` property
  (inline styles can't express a `dark:` variant).
- "or" divider label: added the className, **dropped the `/0.6` alpha
  entirely** rather than just swapping the color — re-verified with the
  fix color that *keeping* the alpha still computes to 2.499:1 (light) /
  2.551:1 (dark), still failing, so the opacity had to go, same lesson as
  the missed `opacity-60` site on `learn.md`.
- Terms/Privacy paragraph: same treatment (className + alpha dropped).

Re-verified post-fix: Home link now computes to 5.30–5.42:1 (light, all 3
gradient stops) / 4.89–5.11:1 (dark, unchanged since the dark fix color
equals the existing dark token value); "or"/Terms now compute to 5.634:1
(light) / 4.798:1 (dark) at full opacity against the flat card background.

**Hairline-pass honesty:** the 4 untouched sites compute to 4.557:1
(light) — a real pass, 0.057 above the 4.5 threshold, computed against an
exact flat `--card` color (no gradient-flattening approximation involved,
unlike the `learn.md` TodayCard case), so this is not treated as an
inconsistent or uncertain call.

### PASS 2 — Product-fit / security (enumeration-safety)

**The question:** does a wrong password vs. a nonexistent account give a
different signal on this page?

**Traced `signIn` in `useAuth.ts` (lines 194–217):** calls
`supabase.auth.signInWithPassword({ email, password })`. This is
Supabase's own API — it returns the identical generic
`"Invalid login credentials"` error for both a wrong password on a real
account and a password attempt against an email with no account at all.
Supabase deliberately never differentiates the two (same anti-enumeration
design already relied on by the `resetPassword` flow checked on the
`forgot-password` card).

**Traced `LoginPage.tsx`'s `handleSubmit` (lines 28–40):** on failure it
only does `setLoading(false)` — no custom error text is rendered on the
page itself. Error display is delegated entirely to the shared toast
system inside `useAuth.ts` (`toast({ title: 'Sign in failed', description:
error.message, ... })`), which this card's diff does not touch, and which
just echoes Supabase's own (non-differentiating) message verbatim.

**Verdict: APPROVED, no enumeration leak.** The component adds no
distinguishing behavior of its own; the backend it calls is already
enumeration-safe by design. No rate-limiting messaging exists on this page
to cross-check (Supabase's own rate-limiting, if any, would also only ever
surface through the same generic `error.message` passthrough) — nothing
found that claims rate-limit behavior this page would need to match.

**Cross-file impact.**
```
grep -rln "LoginPage" apps/web/src
  apps/web/src/pages/LoginPage.tsx
  apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one route)
```
Default export only, one lazy-loaded route consumer. `useAuth.ts` /
`AuthContext.tsx` are shared and consumed elsewhere, but this card touched
neither — only `LoginPage.tsx`'s own JSX (3 className/style edits,
text-color-only, no behavior change).

### PASS 3 — Build / verification record

- **RED** (new `LoginPage.test.tsx`, baseline against unmodified file):
  12 tests written; 9/12 passed, 3 failed exactly on the 3 then-unfixed
  contrast assertions (Home link, "or" label, Terms/Privacy paragraph).
  The 9 passing baseline tests (default sign-in render + Home/forgot-password
  link hrefs, empty-field guard, real `signIn` call + `/app` navigation on
  success, no-navigation + no custom error UI on a wrong-password failure,
  the identical no-navigation + no custom error UI on a nonexistent-account
  failure (enumeration-safety assertion), sign-up mode toggle + real
  `signUp` call, email-prefix default name, guest login + navigation, and
  the loading-spinner/disabled-button state) all passed against the
  **original** component first, confirming the fixtures exercise real
  logic, not mocks of the assertions themselves.
- **GREEN** (post-implementation): **12/12 passed.**
- **Full suite:** `cd apps/web && npx vitest run` (alone, not concurrent
  with the build) → **41/41 files, 461/461 tests passed.**
- **ESLint:** `npx eslint src/pages/LoginPage.tsx src/pages/__tests__/LoginPage.test.tsx`
  → clean, no output.
- **Build:** `npm run build` → `✓ built in 14.99s`, no errors; `LoginPage`
  chunk **6.05 kB (gzip 2.25 kB)**.
- **Primary interaction verified:** sign-in submit → `/app`, sign-up
  toggle + submit → `/app`, guest login → `/app`, empty-field guard,
  loading state, and both failure paths (wrong password / unknown account)
  staying on the page with no custom error UI — all covered by passing
  behavioral tests against real mocked hook calls (not snapshot-only
  assertions).
- **Visual check:** `npm run build` + `npx vite preview --port 4179`
  served the production build (HTTP 200 on `/login`). `/login` is a
  **public** route (unlike several prior protected-route cards), so it
  was reachable directly: navigated via Chrome and took a real screenshot
  — the sign-in form, "HOME" link, "OR" divider, and "Terms"/"Privacy
  Policy" paragraph all render legibly against the light gradient
  background. Zoomed in on the "HOME" label specifically to confirm the
  fixed color reads clearly against the gradient. No protected-route
  auth limitation applied here, unlike `landscape`/`learn`.

**Escalations for a future dedicated card:** none. No functional or
behavioral gap found; the only findings were the 3 contrast fixes above
(7 muted-foreground sites audited total, 3 fixed, 4 confirmed genuine
passes).
