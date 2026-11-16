---
id: profile
title: Profile Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/ProfilePage.tsx (route /profile, protected, 385 lines pre-edit). No account-deletion/data-export features present on this page (N/A for this card's privacy check). No fabricated/hardcoded stats found — every displayed value traces to a real hook/ledger source. Fixed 2 hand-verified AA contrast failures (bare text-muted-foreground on flat bg-background) and removed 4 dead-code items (2 unused icon imports, 2 unused destructured hook fields). Escalated one minor weekly-stat dedup inconsistency via this handoff (not fixed — see PASS 2).
---

# Card: Profile Page

This card represents the redesign/verification pass for the Profile Page feature/page in the Rivly web app.

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

Route confirmed in `AnimatedRoutes.tsx:15` (lazy import) and `:95`
(`<Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />`)
— protected, matches the card brief.

**Cross-file impact.** `grep -rn ProfilePage apps/web/src` → only
`AnimatedRoutes.tsx` (the lazy-imported route) and this page's own new test
file reference the page itself. The page renders three private sub-
components (`EditProfileSheet`, `ShareProgressCard`, `AchievementDetailSheet`
under `components/profile/`) that are each used *only* by `ProfilePage` (grep-
confirmed) and have no individual card in this pipeline — per the `day-
planner`/`insights` precedent (card scope = the named page file, child
components shallow-stubbed in tests, not edited), their internals were left
untouched; this page's own JSX was the only file edited.

**Dead code found (mechanical, zero usage outside the import line):**
- `Calendar` and `Zap` icon imports (line 5) — grepped the whole file body,
  zero JSX usage of either. Removed.
- `dailyFocusGoal`/`dailyTaskGoal` destructured from `useUserPreferences()`
  (line 83) — never read anywhere else in this file (the real goal values
  live inside `EditProfileSheet`'s own separate call to the same hook, not
  passed down as props). Removed from the destructure.

**No fabricated/hardcoded stats found — every displayed value traces to a
real source:**

| Displayed value | Source | Verified real? |
|---|---|---|
| Quick Stats: Focus / Sessions / Streak | `useFocusTotals().week.formatted` / `.sessions`, `.focusStreak` — real ledger derivation | Yes |
| Quick Stats: Tasks (weekly) | Local `weekTasksCompleted` memo: `taskEvents` filtered to `dateKey >= 7 days ago`, net `completed - uncompleted` | Yes, but see Finding 1 below |
| Achievement progress (`{unlockedCount}/{totalCount}`, %) | `useAchievements()` — real ledger-derived unlock state (`useAchievements.ts`) | Yes |
| Trophy Case showcase | `allAchievements.filter(isUnlocked)` sorted by real tier, same hook | Yes |
| Lifetime Stats (Focus Time, Sessions, Tasks Completed, Longest Streak) | `useAchievements().stats` — `totalFocusMinutes`/`totalSessions`/`totalTasksCompleted`/`longestStreak`, each a real reduce/derivation over `focusSessions`/`taskEvents`/activity-streak calculation, no date-range filter (genuinely lifetime) | Yes |
| "Member since" | `createdAt` from `useUserPreferences()`, set once in `App.tsx`/`ProfileOnboarding.tsx` at first real profile hydration (`prev.createdAt \|\| new Date().toISOString()`) | Yes — a genuine locally-recorded timestamp, not a placeholder |
| Motivation message copy | Branches on real `stats.totalSessions` thresholds (50/10) | Yes |

**Finding 1 — minor weekly-stat dedup inconsistency (escalated, not
fixed).** The page's own `weekTasksCompleted` memo sums raw
`completed`/`uncompleted` event counts in the last 7 days without
deduplicating by `taskId`. `useAchievements.ts`'s lifetime
`totalTasksCompleted` (used two sections below, in "Lifetime Stats") instead
builds a `Map<taskId, boolean>` and takes the *last* event per task
("last-event-wins"). If the same task is toggled completed/uncompleted
multiple times within one week, the page's weekly count can over-count
relative to the lifetime stat's dedup strategy — same category of finding as
the `insights` card's Finding 3 (dual-source inconsistency), but much
smaller blast radius (a counting-method mismatch between two stats on the
same page, not two different data stores). Redesigning the weekly
computation to match the lifetime dedup strategy is a behavior change beyond
this card's "no structural redesign" scope, so it is escalated here rather
than silently changed.

**No account-deletion or data-export feature on this page** — `ProfilePage.tsx`
only renders Edit Profile (local preference fields), Share Week (clipboard/
image share of local stats), and an Achievements detail sheet. None of these
write to or delete any backend account record, so the card's privacy-control
check (verify deletion/export claims against real behavior) is **N/A** for
this page — no such claim exists here to verify. (Account-level
deletion/export, if it exists at all in this app, would live on a settings
page outside this card's scope.)

**Contrast audit** (hand HSL→sRGB→relative-luminance, same tokens as prior
cards: `--background: 38 35% 96%` / dark `230 22% 8%`; `--card: 38 30% 98%` /
dark `230 20% 11%`; `--muted-foreground: 230 10% 48%` / dark `230 10% 55%`).
8 `text-muted-foreground` sites total in this file, split by actual
background per the `day-planner`/`focus`/`insights` precedent (bare
`text-muted-foreground` on `bg-card` computes to ~4.566:1, already passing):

| Site | Background | Verdict |
|---|---|---|
| `QuickStat` label ("Focus"/"Sessions"/"Tasks"/"Streak") | flat `bg-background` (no card wrapper in the Quick Stats row) | **Fails** (~4.385:1 light, matching every prior `bg-background` finding) |
| "Member since ..." line | flat `bg-background` (Profile Header has no card wrapper) | **Fails** |
| Achievement count (`{unlocked}/{total}`), progress caption, 4 Lifetime-Stats row labels (Total Focus Time / Focus Sessions / Tasks Completed / Longest Streak) | `bg-card` (all 3 live inside a `bg-card rounded-2xl` container) | **Passes** (~4.566:1) — left untouched, matching the `day-planner` precedent |

**Fix applied:** the 2 failing sites → established fix
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`, re-verified passing
light/dark. The 6 `bg-card` sites were left on bare `text-muted-foreground`
(already AA-passing, no change needed).

### PASS 2 — Product-fit / privacy-feature check

Repeated the card's required privacy-relevance check explicitly: searched
this page and its 3 sub-components for any account-deletion, data-export, or
similar privacy-control feature. None exist — Edit Profile only writes local
`UserPreferences` fields (name/tagline/timezone/wake time/goals), Share Week
only reads stats to build clipboard text / a `html-to-image` PNG for the Web
Share API or a local download, and the Achievement sheet is read-only. There
is no claim on this page about data deletion, export, or retention to verify
against backend behavior, so this check is **N/A** — correctly distinct from
`privacy-policy`'s card, which did have such claims to verify.

Re-verified every stat claim in PASS 1's table against the actual hook/lib
source code (not just the component) — all traced to real computation, no
placeholders. The one inconsistency found (Finding 1 above) is a counting-
method mismatch, not a fabricated value.

**Verdict: scope as proposed in PASS 1** — 2 contrast fixes + 4 dead-code
removals (2 imports, 2 destructured fields), zero behavior/visual change
beyond the darkened text color, zero structural redesign. Finding 1
escalated via this handoff, not actioned.

### PASS 3 — Build / verification record

- **New test file:** `apps/web/src/pages/__tests__/ProfilePage.test.tsx` (no
  prior test file existed for this page). The 3 sheet children are shallow-
  stubbed to open/closed markers; `useAchievements`/`useFocusTotals`/
  `useEventsLedgerContext`/`useUserPreferences` are module-mocked with
  concrete fixture data (including a `dateKeyDaysAgo()` helper so the weekly-
  task fixture stays valid regardless of what day the suite runs).
- **RED** (baseline run against the unmodified component, after fixing 2 of
  my own fixture bugs — `??` silently discarding an intentional `null`
  override for `firstName`/`createdAt`, switched to an `in`-check): 19/21
  passed, exactly the 2 contrast-fix assertions failed (Quick Stat label,
  "Member since" line) because the original file still used bare
  `text-muted-foreground` on both. All 19 other tests — baseline rendering,
  fallback copy, computed-stat tracing (weekTasksCompleted, week focus/
  sessions/streak), motivation-message branching, all 4 primary interactions
  (Edit Profile / Share Week / Settings nav / showcase badge → detail sheet),
  and the bg-card non-regression check — passed against the **original**
  component code first, confirming the fixtures exercise real logic and the
  baseline capture is correct.
- **GREEN** (post-implementation): **21/21 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **45/45 files, 510/510
  tests passed** (489 baseline after `privacy-policy` + 21 net new).
- **ESLint:** `npx eslint src/pages/ProfilePage.tsx
  src/pages/__tests__/ProfilePage.test.tsx` → 0 findings on the component;
  the test file's 9 `no-explicit-any` findings are the same pre-existing
  mock-cast convention already present in `InsightsPage.test.tsx` (13
  identical findings) and other merged cards' test files, not a regression.
- **Build:** `npm run build` → `✓ built in 14.63s`, no errors; `ProfilePage`
  chunk **34.74 kB (gzip 10.60 kB)**.
- **Visual/behavioral check — against the real built app:** `dist` served
  locally (`npx vite preview --port 4176`), driven via the `claude-in-chrome`
  MCP tools (connected this session). Confirmed: unauthenticated `/profile`
  correctly redirects to `/login` ("Welcome back" rendered), **0 console
  errors**. Went further, per the `day-planner`/`focus` precedent: clicked
  "Continue as Guest" to try to reach the real authenticated `/profile` page
  without real credentials (no `.env`/secrets access, per the merge gate).
  This authenticates client-side (toast "Welcome Guest — You are now in guest
  mode") but a subsequent navigation lands on the same pre-existing
  **waitlist gate** `day-planner` hit ("account guest@rivly.app is not
  registered on our waitlist... Failed to fetch") — expected, since the
  locally-served static build has no path to the real backend/waitlist-check
  endpoint. Reaching the rendered authenticated `/profile` DOM this way is
  blocked by that pre-existing, unrelated gate, not by anything in this
  card's change. The real authenticated page state is instead confirmed at
  the component level by the 21 passing tests, which render the **real**
  `ProfilePage` component code (not a mocked stand-in).
- **Primary interaction verified:** Edit Profile / Share Week sheet-opening,
  Settings icon navigation (`navigate('/settings')`), and showcase-badge →
  Achievement Detail sheet wiring are all confirmed against the real
  component logic via the test suite; the route guard is confirmed live
  against the real built app with zero console errors.

**Escalations for a future dedicated card:** Finding 1 (weekly
`weekTasksCompleted` dedup mismatch vs. the lifetime stat's per-task
last-event-wins logic) — a minor counting-method inconsistency, not a
fabricated value, left unfixed per this card's no-structural-redesign scope.
