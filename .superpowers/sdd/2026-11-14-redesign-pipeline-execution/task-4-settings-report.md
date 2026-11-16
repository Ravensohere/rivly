# Task 4 — Settings Page — Report

Card: `docs/superpowers/cards/settings.md` (state: `merged`)
File: `apps/web/src/pages/SettingsPage.tsx` (route `/settings`, protected, 395 lines pre-edit)

## Audit findings (setting-by-setting real-effect trace)

Full table is in the card handoff. Summary:

**Real (verified wired to actual behavior):**
- Name edit → `updateAuthProfile` → real `supabase.from('profiles').update(...)` write (`useAuth.ts:370`), or local mock for guests
- Email display (read-only)
- Logout → real `signOut()` + local logout + hard navigate
- GoogleAccountSection / GoogleCalendarSection → real OAuth (re-confirmed via `privacy-policy` card's prior verification)
- InboxRadarSection → real, own hook, out of this card's scope
- Theme (Light/Dark/System) → real `useTheme` hook, applied to `document.documentElement`
- Reset Focus Timer Position → real `FocusTimerContext`
- Language → real, consumed by `lib/rivaLanguage.ts`/`lib/riva-offline.ts`/`hooks/useRivaLogic.ts`
- AI Companion toggle → real, `rivly_online_ai_enabled` read directly by `DayPlanner.tsx:230`
- Replay Tutorial / Reset Onboarding → real, `useOnboarding.ts`
- Clear Thoughts → real, `useParkedThoughts.clearAllThoughts()`
- Legal links (/privacy, /terms) → real routes

**Dead — write a real preference, but NOTHING in the app reads it (repo-wide grep):**
- Default Sound (`defaultSleepSound`)
- Default Timer (`defaultSleepTimer`)
- Auto-fade (`defaultAutoFade`)
- Voice Persona (`voiceId`)
- Daily Reminder + time (`dailyReminderEnabled`/`dailyReminderTime`)
- Wind Down + time (`windDownReminderEnabled`/`windDownReminderTime`)
- Gentle Wake (`gentleWakeEnabled`)

Verified by reading `SleepPage.tsx`/`SleepSoundsSection.tsx` (never reference these fields) and `hooks/useNotifications.ts` (the app's real notification engine — a completely separate entry-based reminder system with its own `reminder-settings` storage key, unrelated to these three preference flags).

## Product-fit findings (PASS 1/PASS 2)

- **Account-deletion/data-export check:** confirmed ABSENT from this page and from the entire app. `grep -riE "deleteAccount|exportData|account.deletion|data export"` across all of `apps/web/src` returns zero real hits (only unrelated `export type`/`export const` matches). The "Privacy" section here only has "Clear Reflections" and "Clear Thoughts" (local-data clears, not account-level deletion or export). This matches the `profile` card's finding that this feature isn't on the Profile page either — it isn't anywhere in the app. **Escalated, not built** (building it would mean new backend-deletion logic against the `profiles` table — outside a scoped redesign/verification pass).
- **Dead-settings fabrication check:** 7 controls (listed above) write real local state but have no consumer anywhere else in the codebase. This is the exact "does flipping it actually change real behavior?" check called for — answer is no for these 7. **Escalated, not built** (wiring real sleep playback / a notification scheduler / TTS voice-switching are each sizable new features, failing the zero-blast-radius condition for an in-place fix).
- **Logic bug found and fixed (passes 3-condition test):** Clear Reflections bypassed its own `useReflection().clearAllEntries` (destructured as `clearReflections` but left unused) and instead manually touched `window.localStorage` with a hardcoded duplicate of the hook's storage key. Not user-visible (a forced `reload()` immediately after masks any desync) but fragile/dead-code. Fixed: now calls `clearReflections()`.
- **Code-smell fixed (passes 3-condition test):** Voice Persona's `<select>` called `useUserPreferences()` a second time inline (`(useUserPreferences() as any).voiceId`, with two `@ts-ignore`s) even though `voiceId` was already a real field on the hook's return type. Fixed: destructured `voiceId` at the top-level call, removed the redundant call and both ts-ignores.
- Cross-file grep: only `AnimatedRoutes.tsx` (the route) and a stray comment in `useOnboarding.ts` reference `SettingsPage` — zero other files import from it. Fully local blast radius.

## Contrast sweep (incl. opacity-stacked and bg-secondary variants, as instructed)

| Site | Background | Light | Dark | Verdict |
|---|---|---|---|---|
| Page subtitle | flat `bg-background` | 4.385 | 5.109 | Fails light — established flat-bg fix |
| Theme pills (inactive) | `bg-secondary` | 4.03 | 4.10 | Fails both — bg-secondary-specific fix (reused from `reflect-and-journal`) |
| Language pills (inactive) | `bg-secondary` | 4.03 | 4.10 | Fails both — same fix |
| "Voice uses credits" | `bg-card` at `/60` opacity | 2.26 | 2.55 | Fails badly both modes — new finding (opacity-stacked), fixed by dropping `/60` |
| 5 other sites (SettingsRow descriptions, email, ghost buttons, Version) | `bg-card` | ~4.56 | ~4.80 | Passes — left untouched |

This is the first card to find both the `bg-secondary` variant and a new opacity-stacked (`/60`) variant in the same file.

## TDD Evidence

New file: `apps/web/src/pages/__tests__/SettingsPage.test.tsx`

- **RED** (against unmodified component, after fixing 2 test-authoring bugs — `getByText('Logout')`/`getByText('Reset')` ambiguity since both strings appear twice on the page, and missing `await act()` around async handlers): **26/31 passed, 5 failed** — exactly the 4 contrast-fix assertions + the Clear-Reflections-calls-the-real-hook assertion.
- **GREEN** (post-implementation): **31/31 passed.**
- **Full suite:** `npx vitest run` → **48/48 files, 576/576 tests passed** (545 baseline + 31 net new).

## What I implemented

1. 4 AA-contrast fixes in `SettingsPage.tsx` (page subtitle flat-bg fix; theme-pills and language-pills bg-secondary fix; "Voice uses credits" opacity-stacked fix by removing `/60`).
2. Clear Reflections now calls the real `clearReflections()` hook function instead of raw `localStorage` access.
3. Voice Persona select now reads `voiceId` from the single top-level `useUserPreferences()` call; removed the redundant second hook call and both `@ts-ignore`s.
4. New test file (31 tests) covering every real interaction, including the 7 "dead" settings' onChange/onClick wiring (which IS real and worth testing, even though no downstream consumer exists yet).
5. Updated `docs/superpowers/cards/settings.md` to `state: merged` with full PASS 1-3 handoff.

No structural redesign. No new features built for the two escalated findings (dead settings, missing account-deletion/export) — both documented in the card handoff for a future dedicated card/product decision.

## Build + visual check

- `npm run build` → `✓ built in 15.03s`, no errors; `SettingsPage` chunk 21.67 kB (gzip 6.84 kB).
- `npx eslint src/pages/SettingsPage.tsx src/pages/__tests__/SettingsPage.test.tsx` → 0 findings on the component; 12 `no-explicit-any` findings in the test file match the established mock-cast convention in other merged cards' tests (not a regression).
- Live check via `claude-in-chrome` against `vite preview --port 4179`: unauthenticated `/settings` correctly redirects to `/login`, 0 console errors. Attempted guest-mode access (same as `profile`/`day-planner` cards) — hit the same pre-existing waitlist/backend gate on a static local build with no reachable backend (expected, not caused by this card), 0 console errors throughout. Real authenticated-page wiring confirmed at the component level via the 31 passing tests against the real component code.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\SettingsPage.tsx` (4 contrast fixes, 1 logic cleanup, 1 code-smell cleanup)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\SettingsPage.test.tsx` (new, 31 tests)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\settings.md` (state → merged, full handoff)

## Self-review

- Mapped every setting to its real effect via repo-wide grep, not assumption — found 7 non-functional controls this way, which is the single largest finding across this batch so far.
- Checked specifically for account-deletion/export: confirmed absent from this page AND the whole app (not just "not here, maybe elsewhere" — verified it's nowhere).
- Fabrication check performed and documented per-setting in the card handoff table.
- Swept all `text-muted-foreground` sites including bg-secondary and opacity-stacked (`/60`) variants — found one of each, both genuinely new (opacity-stacked had not appeared on any prior card).
- Card file is clean: frontmatter updated (`state: merged`, `owner`, `handoff` summary), full PASS 1-3 body written.

## Concerns

- The 7 dead settings and the missing account-deletion/export control are real product gaps, escalated but not fixed — flagging again here so they aren't lost: both need a product decision (build the missing consumers / add account deletion, or remove the dead UI) in a future dedicated card.
- Real configured behavior of "Default Sound"/notification toggles obviously can't be verified against a running scheduler since none exists — this isn't a backend-access limitation (per the card's escalation clause), it's a confirmed absence, so no further verification is possible or needed here.
