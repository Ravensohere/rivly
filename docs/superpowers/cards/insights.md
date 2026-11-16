---
id: insights
title: Insights Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/InsightsPage.tsx (route /insights, protected, 1096 lines pre-edit), the second large no-prior-tests page in this pipeline after day-planner. No structural redesign attempted. Full stat-by-stat data-source trace found NO fabricated/hardcoded metrics. Fixed 6 hand-verified AA contrast failures (one bare text-muted-foreground-on-background recurrence matching 6+ prior pages, plus 4 related sites this page's own audit found: a toggle tab over bg-muted/50, and a severely-failing text-muted-foreground/70 opacity variant at ~2.65:1) and removed one dead import (AnimatePresence). Escalated two findings via in-source FIXME rather than fixing silently: a dual-source-of-truth risk (Rhythm Report reads a separate legacy localStorage store from the rest of the page's ledger-backed stats) and a no-op CTA button with no handler anywhere in the app.
---

# Card: Insights Page

This card represents the redesign/verification pass for the Insights Page feature/page in the Rivly web app.

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

### PASS 1 — Audit (stat-by-stat data-source trace + dead code)

Route confirmed in `AnimatedRoutes.tsx:12` (lazy import) and `:92`
(`<Route path="/insights" element={user ? <InsightsPage /> : <Navigate to="/login" replace />} />`)
— protected, matches the card brief.

**Every displayed stat/insight traced to its real computation — no fabrication found:**

| Displayed value | Source | Verified real? |
|---|---|---|
| Focus Time (`{h}h {m}m`, sessions subtitle) | `useFocusTotals()` → `deriveWeekFocusTotals`/`deriveTodayFocusTotals` over `useEventsLedgerContext().focusSessions` | Yes — real ledger derivation, not placeholder |
| Tasks Done + % days active | `totalCompletedTasks`/`totalCreatedTasks` (ledger `getActualCompletedTasks`/`getTotalCreatedTasks`) + hand-verified `activePercent = round(daysActive/totalDays*100)` set-union logic | Yes |
| Good Sleep nights | `sleepDistribution` from ledger's `getSleepDistribution(sleepEvents)` (real reduce over rated events) | Yes |
| Focus Streak | `focusStreak` from ledger's `calculateFocusStreak` (real consecutive-day-key logic, today/yesterday anchored) | Yes |
| Charts (Focus/Tasks/Sleep/Mood/Energy) | `focusByDay`/`tasksByDay`/`sleepByDay`/`moodByDay`/`energyByDay`, all from `useEventsLedger.ts`'s `groupXByDay` aggregations over real IndexedDB-backed events | Yes |
| "Patterns" insights | `getPatternInsights()` in `lib/patternInsights.ts` — real weekday-average computation over the same by-day arrays, capped at 5, not canned strings | Yes |
| "This week, do these 3 things" panel copy | All three adjustment cards branch on real `stats.*` values (`totalSessions`, `totalTasksCompleted`/`Created`, `goodSleepDays`/`daysWithSleepData`) | Yes |
| Rhythm Report ("See Your Month") | `generateMonthlyReport()` in `lib/rhythmReport.ts` — real per-session/task/checkin aggregation | Yes, **but see Finding 3 below** — different data source than everything else on this page |

**Finding 1 — dead import.** `AnimatePresence` (from `framer-motion`, line 29)
had zero JSX usage anywhere in the file (grep-confirmed) — leftover import,
removed.

**Finding 2 — a no-op CTA button presented as a working action.**
`<button onClick={() => {}}>Apply next week's plan →</button>` in the "3
Adjustments" panel has no implementation anywhere — grepped the whole repo
for any "apply next week"/"apply plan" logic and found none. This isn't a
miscalculated stat, it's a missing feature; per the established lesson
("verify precisely and escalate... rather than silently fixing... unless
the fix is a clear, scoped, obviously-correct bug fix"), implementing the
real behavior is new feature work, and removing a rendered, positioned UI
element felt like exactly the kind of structural change the brief told
this card to avoid. Left in place with an in-source `FIXME` comment and
escalated here instead.

**Finding 3 — dual source of truth for the Rhythm Report.** `allSessions`/
`allCheckIns` (feeding `generateMonthlyReport`) come from `useFocusSessions()`/
`useCheckIn()`, which read raw `localStorage` keys `dailyRhythm_focusSessions`/
`dailyRhythm_checkIns` (`hooks/useFocusSessions.ts:4`, `hooks/useCheckIn.ts:4`).
Every *other* stat on this same page reads `useEventsLedgerContext()`, which
`useFocusTotals.ts`'s own comment calls "the CANONICAL way to get focus
metrics — use this everywhere" / "SINGLE SOURCE OF TRUTH" (`InsightsPage.tsx`
line ~192, pre-existing comment). Grepped both hooks' call sites repo-wide:
neither is dead — `useFocusSessions().addSession` is called live from
`FocusPage.tsx`, and `useCheckIn().saveCheckIn` from `DayPlanner.tsx` — so
this is two real, independently-written data stores, not one abandoned one.
They are not guaranteed to agree, meaning the "See Your Month" report can
show different numbers than the charts/summary cards on the same page for
the same month. Verifying whether they actually drift (vs. happen to stay
in sync via some write-through path not found in this file) needs tracing
every write path across `FocusPage`/`DayPlanner`/`EventsLedger`, which is
disproportionate for this card — escalated via in-source `FIXME` at the
`rhythmReport` `useMemo` instead of silently reconciling the two stores.

**Contrast audit (hand HSL→sRGB→relative-luminance math, not guessed) —
the brief's named recurring pattern plus related sites found by this
page's own audit:**

| Site | Background | Computed ratio | Verdict |
|---|---|---|---|
| "Loading insights..." text | page body (`--gradient-calm`, 3 near-identical stops ~95-96% L) | ~4.28–4.38 : 1 across all 3 gradient stops | **Fails AA (4.5:1)** |
| Header range label ("Last 7 days") | same page background, no card wrapper | ~4.3 : 1 | **Fails** |
| Header subtitle ("Your rhythm at a glance") | same | ~4.3 : 1 | **Fails** |
| "Settings & Preferences →" link | same | ~4.3 : 1 | **Fails** |
| Day/Week/Month inactive tab label | `bg-muted/50` pill (hand-composited: bg-muted token alpha-blended over the page background) | ~4.2 : 1 | **Fails** |
| `InsightCard` subtitle (`text-muted-foreground/70`) | `bg-card` (opaque, flat token) | **~2.65 : 1** (alpha-composite of the token at 70% over `bg-card`, both fully known flat colors) | **Fails badly** — well under even the 3:1 large-text floor |
| `InsightCard`/`ChartCard` title + plain subtitle (bare `text-muted-foreground`) | `bg-card` | ~4.566 : 1 | Passes — untouched (matches `day-planner`'s prior finding) |
| Chart tooltip text | `bg-popover` (hsl(38,30%,99%), ~identical to bg-card) | ~4.646 : 1 | Passes — untouched |
| "3 Adjustments" panel copy, Weekly Tip copy, Guest-overlay copy | gradient/opacity-tinted panels (`bg-gradient-to-br from-success/x to accent/x`, `bg-primary/5`, `bg-card/90 backdrop-blur-md`) | Not reducible to a flat two-color ratio without pixel sampling | **Not touched** — same "don't fabricate" discipline as `day-planner`'s inline-opacity exclusion |

Fixed the 6 failing, cleanly-computable sites with the pipeline's
established remediation (`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`,
or — for the `/70` opacity case — simply dropping the opacity modifier to
fall back to the token's own already-passing `bg-card` ratio). Each site
carries an inline comment with its measured ratio.

### PASS 2 — Product-fit / verification

**Cross-file impact.**
```
grep -rln "InsightsPage" apps/web/src
  apps/web/src/pages/InsightsPage.tsx
  apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one route)
```
Default export only, one lazy-loaded route consumer — no other file imports
anything named from `InsightsPage.tsx`.

**Verdict: APPROVED, scope as proposed in PASS 1** — 6 contrast fixes + 1
dead-import removal + 2 in-source `FIXME` escalations (no behavior/visual
change beyond the darkened text colors). No structural redesign attempted.

### PASS 3 — Build / verification record

- **RED** (new `InsightsPage.test.tsx`, baseline against unmodified file):
  12/17 passed, 5 failed exactly on the 5 then-unfixed contrast assertions
  (the 6th, the InsightCard `/70` case, was written as a negative assertion
  that also failed pre-fix). All non-contrast baseline tests (render for
  authenticated user, loading gate, guest lock overlay, computed-stat
  sanity checks, view-range toggle wiring) passed against the **original**
  component code first, confirming the test fixtures exercise real logic.
- **GREEN** (post-implementation): **17/17 passed.**
- **Full suite:** `cd apps/web && npx vitest run` (alone, not concurrent
  with the build) → **38/38 files, 413/413 tests passed.**
- **ESLint:** identical 7 pre-existing problems before and after (4
  `no-explicit-any` in tooltip renderers, 3 `react-hooks/exhaustive-deps`
  warnings on the `rhythmReport` `useMemo`'s `now`-derived deps) — confirmed
  via `git stash`/`eslint`/`git stash pop` diff, no new issues.
- **Build:** `npm run build` → `✓ built in 13.96s`, no errors; `InsightsPage`
  chunk **68.42 kB (gzip 17.38 kB)**.
- **Primary interaction verified:** the view-range toggle (Day/Week/Month)
  is confirmed wired to `setTimeRange` on the ledger context via a unit
  test clicking "Month" and asserting both the heading text changes and
  `setTimeRange('month')` is called — exercising the real `effectiveTimeRange`
  useMemo + sync-effect, not just a mocked stand-in.

**Escalations for a future dedicated card (not actioned here):**
1. Finding 3 above — reconcile or formally document why the Rhythm Report's
   `dailyRhythm_*` localStorage data and the EventsLedger-backed stats on
   the rest of this page are allowed to diverge.
2. Finding 2 above — either implement "Apply next week's plan" or remove
   the button; a product decision, not a redesign-pipeline one.
3. The 4 pre-existing `no-explicit-any` sites and the `rhythmReport`
   exhaustive-deps gap are real but out of this card's scope.
