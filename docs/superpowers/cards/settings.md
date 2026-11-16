---
id: settings
title: Settings Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/SettingsPage.tsx (route /settings, protected, 395 lines pre-edit). Major finding: 7 of this page's controls (Default Sound, Default Timer, Auto-fade, Voice Persona, Daily Reminder, Wind Down, Gentle Wake) write a real local preference but are consumed by NOTHING else in the app (repo-wide grep) — escalated, not built (would require new sleep-playback/notification-scheduler/TTS-voice features, outside this card's redesign scope). No account-deletion/data-export control exists on this page or anywhere in the app (repo-wide grep) — escalated, matching the profile/privacy-policy cards' same finding. Fixed: 4 AA-contrast sites (1 flat-bg, 2 new bg-secondary-specific, 1 new opacity-stacked /60-on-bg-card), 1 real logic cleanup (Clear Reflections bypassed its own hook's clear function via raw localStorage access), 1 dead-code/smell cleanup (Voice Persona called useUserPreferences() a second time inline with @ts-ignore/as any instead of using the already-destructured voiceId).
---

# Card: Settings Page

This card represents the redesign/verification pass for the Settings Page feature/page in the Rivly web app.

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

### PASS 1 — Audit

Route confirmed in `AnimatedRoutes.tsx:14` (lazy import) and `:94`
(`<Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" replace />} />`)
— protected, matches the card brief.

**Cross-file impact.** `grep -rn SettingsPage apps/web/src` → `AnimatedRoutes.tsx`
(the route), `useOnboarding.ts` (a stray comment, "Back-compat exports (used
by SettingsPage currently)" — not an actual import), and this page's own new
test file. Zero other files import a symbol from `SettingsPage.tsx` — fully
local blast radius for any fix made here.

**Every setting mapped to its real effect** (grep-verified against the whole
`apps/web/src` tree, not just this file):

| Section / control | Real effect? | Evidence |
|---|---|---|
| Profile: Name edit | **Real** | `updateAuthProfile` → `useAuth.ts:370` `updateProfile` writes `supabase.from('profiles').update(...)` (or a local mock update for guests) |
| Profile: Email | Read-only display | n/a |
| Profile: Logout | **Real** | `signOut()` (real Supabase sign-out) + `logoutLocal()` + hard navigate to `/` |
| Account (GoogleAccountSection) | **Real** | separate component, OAuth — verified real in the `privacy-policy` card's PASS 2 |
| Calendar (GoogleCalendarSection) | **Real** | same, Google Calendar OAuth, verified real in `privacy-policy` PASS 2 |
| Inbox (InboxRadarSection) | **Real** | separate component with its own hook (`useInboxRadar`), out of this card's scope (no card of its own, same precedent as `profile`'s sheet children) |
| Appearance: Theme | **Real** | `setTheme` → `useTheme.ts`, persisted + applied to `document.documentElement` |
| Appearance: Reset Timer Position | **Real** | `resetTimerPosition` → `FocusTimerContext.tsx` |
| Sound & Sleep: Default Sound/Timer/Auto-fade | **Dead** | `defaultSleepSound`/`defaultSleepTimer`/`defaultAutoFade` are written to `UserPreferences` but repo-wide grep finds them read **only** in `SettingsPage.tsx` and `useUserPreferences.ts` itself — `SleepPage.tsx`/`SleepSoundsSection.tsx` never read them (confirmed by reading both files; `SleepPage` only pulls `firstName` from the same hook) |
| Voice & Assistant: Language | **Real** | `rivaLanguage` is consumed by `lib/rivaLanguage.ts`, `lib/riva-offline.ts`, `hooks/useRivaLogic.ts` |
| Voice & Assistant: Voice Persona | **Dead** (+code smell) | `voiceId` is grep-confirmed read **only** in `SettingsPage.tsx`/`useUserPreferences.ts` — no TTS call site consumes it anywhere. Also had a code smell fixed below (double `useUserPreferences()` call) |
| Voice & Assistant: AI Companion | **Real** | `rivly_online_ai_enabled` localStorage key read directly by `DayPlanner.tsx:230` |
| Notifications: Daily Reminder / Wind Down / Gentle Wake | **Dead** | `dailyReminderEnabled`/`windDownReminderEnabled`/`gentleWakeEnabled` (+ their `*Time` fields) are grep-confirmed read **only** in `SettingsPage.tsx`/`useUserPreferences.ts`. The app's only real notification engine, `hooks/useNotifications.ts`, is a completely separate entry-based reminder system (`reminder-settings` localStorage key, task/time-block reminders) that has no knowledge of these three preference flags |
| Tutorial: Replay / Reset Onboarding | **Real** | `useOnboarding.ts` |
| Privacy: Clear Reflections | **Real, but was bypassing its own hook** — see PASS 2 fix below |
| Privacy: Clear Thoughts | **Real** | `clearAllThoughts()` from `useParkedThoughts.ts` |
| Legal: Privacy/Terms links | **Real** | routes confirmed in `AnimatedRoutes.tsx:53-54` |
| About | Static display | n/a |

### PASS 2 — Product-fit / behavior check

**Finding 1 — 7 dead/non-functional controls (escalated, not built).** Per
the table above, two entire sections ("Sound & Sleep", "Notifications") plus
one row in "Voice & Assistant" ("Voice Persona") write a real preference to
local storage but are **never read by any consumer anywhere in the app**.
This is exactly the "does flipping it actually change real behavior?"
fabrication check the card brief calls for, and the answer for these 7
controls is no — the toggle UI is honest about *writing* a preference (it's
not lying about that), but nothing downstream *acts* on 6 of the 7
preferences (`voiceId`, `defaultSleepSound`, `defaultSleepTimer`,
`defaultAutoFade`, `dailyReminderEnabled`/`Time`,
`windDownReminderEnabled`/`Time`, `gentleWakeEnabled`). Building the missing
consumers (real sleep-sound playback wiring, a real notification scheduler,
real TTS voice-switching) would each be a sizable new feature — not a
scoped redesign/verification fix, and well outside "additive, zero-blast-
radius" per the reflect-and-journal 3-condition test for in-place fixes.
Escalated here for a future dedicated card/product decision, matching the
precedent set by `profile`'s Finding 1 and `privacy-policy`'s Google
Analytics disclosure gap (both escalated rather than fixed in-scope).

**Finding 2 — no account-deletion/data-export control anywhere in the app
(repo-wide check, not just this page).** Per the card brief's specific
instruction to check whether this feature — found missing from `profile` —
actually lives here instead: it does not. `grep -riE
"deleteAccount|exportData|account.deletion|data export"` across the entire
`apps/web/src` tree returns zero real hits (the only matches are unrelated,
e.g. TypeScript `export type`/`export const` declarations and an npm
package's own unrelated export function). The "Privacy" section on this
page only offers "Clear Reflections" and "Clear Thoughts" — both local-data
clears, not an account-level delete or an export of the user's data. This is
a genuine feature gap, consistent with the undisclosed-tracking gap already
flagged by the `privacy-policy` card — escalated for a product/legal
decision, not built here (building real account deletion against the
`profiles` table and associated Supabase data would be exactly the kind of
backend-tied, non-additive change this card's scope excludes).

**Finding 3 — Clear Reflections bypassed its own hook (fixed).** The
original code ignored the already-destructured `clearReflections` (aliased
from `useReflection().clearAllEntries`) and instead reached directly into
`window.localStorage.removeItem('dailyRhythm_reflections')` +
`setItem(..., '[]')`. This happened to produce the same end state as calling
the hook (same storage key, and a forced `window.location.reload()`
immediately after masks any missed React-state sync), so it wasn't an
end-user-visible bug — but it's fragile (duplicates the hook's own storage
key as a string literal, and would desync any other mounted consumer of
`useReflection()` if the reload line were ever removed) and left
`clearReflections` as dead code. **3-condition test applied:** unambiguous
(the hook's own clear function exists for exactly this purpose), additive
(removes a landmine, doesn't change the user-visible outcome), zero-blast-
radius (`useReflection`'s `clearAllEntries` is a 1-line `setReflections([])`
call, confirmed by reading the hook) → fixed in place: replaced the manual
localStorage access with `clearReflections()`.

**Finding 4 — Voice Persona double-hook-call code smell (fixed).** The
`<select>`'s `value` called `(useUserPreferences() as any).voiceId` —
invoking the hook a **second time** inline inside JSX, with two
`@ts-ignore` comments, even though `voiceId` is already a real field on the
`UserPreferences` interface (`useUserPreferences.ts:43`) and was already
available from the single call at the top of the component. Same 3-condition
test: unambiguous (the type already has the field, no reason for the
second call to exist), additive (removes redundant hook invocation +
silences two suppressed type errors), zero-blast-radius (same localStorage-
backed value either way) → fixed: added `voiceId` to the top-level
destructure, removed the inline second call and both `@ts-ignore`s.

**Contrast audit** (same HSL→sRGB→relative-luminance method as every prior
card; tokens confirmed from `index.css`: light `--background: 38 35% 96%`,
`--card: 38 30% 98%`, `--secondary: 260 30% 94%`, `--muted-foreground: 230
10% 48%`; dark `--background: 230 22% 8%`, `--card: 230 20% 11%`,
`--secondary: 260 22% 17%`, `--muted-foreground: 230 10% 55%`). 8
`text-muted-foreground` sites total:

| Site | Background | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|
| Page subtitle ("Customize your experience") | flat `bg-background` | 4.385 | 5.109 | **Fails light** — established flat-bg fix applied |
| Theme pills (inactive) | `bg-secondary` | 4.03 | 4.10 | **Fails both** — new bg-secondary-specific fix applied (reusing the exact formula discovered in the `reflect-and-journal` card: `text-[hsl(230,10%,40%)] dark:text-[hsl(230,10%,60%)]`, verified 5.356 light / 4.981 dark on this token pair) |
| Language pills (inactive) | `bg-secondary` | 4.03 | 4.10 | **Fails both** — same bg-secondary fix applied |
| "Voice uses credits" | `bg-card`, opacity-stacked at `/60` | 2.26 | 2.55 | **Fails badly, both modes** — the `/60` opacity blend over `bg-card` drops contrast far below the already-marginal 4.56 that bare `text-muted-foreground` gets on `bg-card`. Fix: dropped the `/60` modifier entirely (now bare `text-muted-foreground`, which already passes on `bg-card` per the `profile` card's precedent) |
| SettingsRow descriptions, email row, ghost-button labels, "View" buttons, "Version 1.0.0" (5 sites, all on `bg-card`) | `bg-card` | ~4.56 light | ~4.80 dark | **Passes** — left untouched, matching the `profile`/`reset-password` precedent of leaving already-passing `bg-card` sites alone |

This is the first card in the pipeline to find both the `bg-secondary`
variant (previously found once, on `reflect-and-journal`) **and** a new
opacity-stacked variant (`/60` on `bg-card`) in the same file, exactly the
two non-obvious cases the card brief called out to sweep for.

**Logic-bug check (3-condition test from `reflect-and-journal`):** both
Finding 3 and Finding 4 passed all three conditions and were fixed in place.
Findings 1 and 2 (dead controls, missing account-deletion/export) do **not**
pass the zero-blast-radius condition — fixing them means building new
features — so both are escalated, not fixed.

**Verdict:** 4 contrast fixes (1 flat-bg reuse, 2 bg-secondary reuse, 1 new
opacity-stacked fix), 1 real cleanup (Clear Reflections now calls its own
hook), 1 code-smell cleanup (Voice Persona's redundant hook call removed),
zero structural redesign. Two significant findings escalated (7 dead
settings; missing account-deletion/export), neither fixed in-scope.

### PASS 3 — Build / verification record

- **New test file:** `apps/web/src/pages/__tests__/SettingsPage.test.tsx`
  (no prior test file existed). Module-mocks `@/contexts/AuthContext`,
  `@/hooks/useTheme`, `@/hooks/useUserPreferences`, `@/hooks/useOnboarding`,
  `@/hooks/useReflection`, `@/hooks/useParkedThoughts`,
  `@/contexts/FocusTimerContext`, and `sonner`; shallow-stubs
  `GoogleAccountSection`/`GoogleCalendarSection`/`InboxRadarSection`/
  `WheelTimePicker`/`TimePickerTrigger` (no card of their own, same
  precedent as `profile`'s sheet children). `AI Companion` is tested against
  the **real** `useLocalStorage` hook (not mocked) to prove the preference
  actually reaches `localStorage`, matching its real consumer in
  `DayPlanner.tsx`.
- **RED** (baseline run against the unmodified component, after fixing two
  of my own test-selector bugs — `getByText('Logout')`/`getByText('Reset')`
  are ambiguous since both strings appear twice on this page; switched to
  `getByRole('button', {name: ...})` and indexed `getAllByRole` — and
  wrapping the async `handleSaveName`/`handleLogout` clicks in `await
  act(async () => ...)`): **26/31 passed, 5 failed** — exactly the 4
  contrast-fix assertions and the Clear-Reflections-calls-the-real-hook
  assertion, because the original component still used bare/wrong
  `text-muted-foreground` classes and bypassed `clearReflections` via raw
  localStorage. All 26 other tests — including the 2 "dead setting" tests
  (Default Sound/Timer/Auto-fade/Notifications onChange wiring, which *is*
  real and correctly tested even though nothing downstream consumes those
  values) — passed against the **original**, unmodified component first,
  confirming the fixtures exercise real logic and the baseline capture is
  correct.
- **GREEN** (post-implementation): **31/31 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **48/48 files, 576/576
  tests passed** (545 baseline after `reset-password` + 31 net new).
- **ESLint:** `npx eslint src/pages/SettingsPage.tsx
  src/pages/__tests__/SettingsPage.test.tsx` → **0 findings on the
  component**; the test file's 12 `no-explicit-any` findings are the same
  pre-existing mock-cast convention already present in `ProfilePage.test.tsx`
  and other merged cards' test files, not a regression.
- **Build:** `npm run build` → `✓ built in 15.03s`, no errors; `SettingsPage`
  chunk **21.67 kB (gzip 6.84 kB)**.
- **Visual check — against the real built app:** `dist` served locally
  (`npx vite preview --port 4179`), driven via the `claude-in-chrome` MCP
  tools. Unauthenticated `/settings` correctly redirects to `/login`
  ("Welcome back" rendered), **0 console errors**. Clicked "Continue as
  Guest" to try to reach the real authenticated `/settings` page without
  real credentials (no `.env`/secrets access, per the merge gate) — same
  pre-existing waitlist/backend gate the `profile` and `day-planner` cards
  already hit (guest mode bounces back to `/login` on a static build with
  no reachable backend), not caused by anything in this card's change, and
  **0 console errors** throughout. The real authenticated page state (every
  setting's wiring) is instead confirmed at the component level by the 31
  passing tests, which render the **real** `SettingsPage` component code.
- **Primary interaction verified:** name edit (real Supabase write for
  authenticated users, local-only for guests), logout (confirm-gated,
  real sign-out), theme switching, focus-timer reset (disabled at default
  position), all preference writes (sound/timer/auto-fade/language/voice/
  AI-companion/notifications), tutorial replay/reset, both clear actions
  (now both real and confirm-gated), and legal navigation — all confirmed
  against real component logic; the route guard confirmed live against the
  real built app with zero console errors.

**Escalations for a future dedicated card/product decision:**
1. The 7 dead settings (Finding 1) — need either real feature wiring
   (sleep-sound playback, a notification scheduler, TTS voice-switching) or
   a product decision to remove them from the UI if they're not planned.
2. No account-deletion/data-export control exists anywhere in the app
   (Finding 2) — same category of gap the `privacy-policy` card flagged for
   analytics disclosure; worth a product/legal decision on whether and where
   to add one (this page is the natural home for it).
