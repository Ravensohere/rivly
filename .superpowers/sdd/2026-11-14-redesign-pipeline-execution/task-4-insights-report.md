# Task 4 — Insights Page — Report

Card: `docs/superpowers/cards/insights.md` (state: `backlog` → `review` → `merged`)
File: `apps/web/src/pages/InsightsPage.tsx` (route `/insights`, protected, 1096 lines pre-edit)

## Scope decision

Per the card brief and the `day-planner` precedent: no structural redesign.
This page already has a deliberate layout (header → view-range toggle →
check-in summary → "3 Adjustments" panel → charts → patterns → summary
cards → heatmap → achievements → goals → tip → feedback/settings links →
modals/guest overlay). The work here is: (1) a full stat-by-stat trace of
every displayed number to its real data source, (2) concrete dead-code and
contrast fixes, (3) escalation (not silent fixing) of two real but
out-of-scope findings.

## Audit findings — stat-by-stat data-source trace

| Displayed value | Source chain | Verdict |
|---|---|---|
| Focus Time card (`{h}h {m}m`, "N sessions") | `useFocusTotals()` → `today`/`week` from `deriveTodayFocusTotals`/`deriveWeekFocusTotals(focusSessions)` in `lib/focusTotals.ts`, fed by `useEventsLedgerContext().focusSessions` (real IndexedDB-backed events via `lib/eventsDb.ts`) | Real, traced end-to-end |
| Tasks Done card + "% days active" | `totalCompletedTasks`/`totalCreatedTasks` from `useEventsLedger.ts`'s `getActualCompletedTasks`/`getTotalCreatedTasks` (real created/deleted/completed set-difference logic over `taskEvents`); `activePercent` computed in-component as `round(|daysWithFocus ∪ daysWithTasks| / focusByDay.length * 100)` — verified the set-union arithmetic by hand with a concrete fixture (see Tests) | Real; simplistic but correctly computed, not fabricated |
| Good Sleep card | `sleepDistribution` = `getSleepDistribution(sleepEvents)` — a real `reduce` counting `good`/`okay`/`poor` ratings | Real |
| Focus Streak card | `focusStreak` = `calculateFocusStreak(focusSessions)` — real consecutive-unique-day-key walk, anchored to require activity today or yesterday | Real |
| 5 charts (Focus/Tasks/Sleep/Mood/Energy) | `focusByDay`/`tasksByDay`/`sleepByDay`/`moodByDay`/`energyByDay`, all `groupXByDay(events, start, end)` aggregations in `useEventsLedger.ts`, built from real stored events, zero-filled for days without data | Real |
| "Patterns" section | `getPatternInsights(focusByDay, moodByDay, energyByDay, sleepByDay)` in `lib/patternInsights.ts` — read in full: computes real per-weekday averages and only emits a sentence when a real threshold is crossed (e.g. worst weekday average energy ≤4 with ≥2 samples), capped at 5 insights | Real; a legitimate (if simple) pattern-recognition algorithm, not canned copy |
| "This week, do these 3 things" panel | Each of the 3 adjustment cards branches on real `stats.totalSessions` / `stats.totalTasksCompleted`/`Created` / `stats.goodSleepDays`/`daysWithSleepData` | Real |
| Rhythm Report ("See Your Month" modal) | `generateMonthlyReport(allSessions, allCheckIns, allTasks, month, year)` in `lib/rhythmReport.ts` — read in full: real per-session-hour histogram (`bestFocusHour`), real `durationMinutes` sum, real avg-tasks-per-day over completed-task dates | Real computation, **but see Finding 3 — different data source than every other stat on this page** |

**No hardcoded/fabricated stat or insight found anywhere in this file.**

## Product-fit / calculation-verification findings (PASS 2)

- **Finding 1 (dead code):** `AnimatePresence` import (line 29) — zero JSX
  usage, confirmed by grep within the file. Removed.
- **Finding 2 (no-op CTA):** The "Apply next week's plan →" button
  (`onClick={() => {}}`) in the "3 Adjustments" panel has no implementation
  anywhere in the repo (grepped for any "apply next week"/"apply plan"
  logic). Not a stat/calculation issue, so not silently fixed or removed
  (removing a rendered, positioned element felt out of this card's
  dead-code scope) — left with an in-source `FIXME` and escalated in the
  card.
- **Finding 3 (dual source of truth):** The Rhythm Report consumes
  `useFocusSessions()`/`useCheckIn()`, which read **raw `localStorage`**
  (`dailyRhythm_focusSessions`, `dailyRhythm_checkIns` — `hooks/useFocusSessions.ts:4`,
  `hooks/useCheckIn.ts:4`), while every other stat on the page reads
  `useEventsLedgerContext()`, explicitly documented elsewhere in this file
  as the "SINGLE SOURCE OF TRUTH". Verified both legacy hooks are **not**
  dead — `useFocusSessions().addSession` is called live in `FocusPage.tsx`,
  `useCheckIn().saveCheckIn` in `DayPlanner.tsx` — so this is two real,
  independently-written stores that are not guaranteed to agree. This is
  exactly the class of finding the brief told this card to escalate rather
  than silently "fix" (reconciling the two stores requires tracing every
  write path across `FocusPage`/`DayPlanner`/`EventsLedger`, which is a
  separate, bigger investigation). In-source `FIXME` added at the
  `rhythmReport` `useMemo`; escalated in the card as a future-card item.
- **Cross-file impact:** `grep -rln "InsightsPage" apps/web/src` → only
  `InsightsPage.tsx` itself and `AnimatedRoutes.tsx` (lazy import + the one
  route). No other file imports anything from this one.

### Contrast audit (hand HSL→sRGB→relative-luminance math)

The brief named the recurring `text-muted-foreground` pattern (6+ prior
pages) to check for specifically. Found it here in 4 forms plus 1 derived
(opacity-reduced) variant this page's own audit surfaced:

| Site | Background (verified, not assumed) | Ratio (hand-computed) | Fixed? |
|---|---|---|---|
| "Loading insights..." | page body `--gradient-calm` (3 stops, all ~95–96% L) | ~4.28–4.38:1 across all 3 stops | Yes |
| Header range label ("Last 7 days") | same page background, no card wrapper | ~4.3:1 | Yes |
| Header subtitle ("Your rhythm at a glance") | same | ~4.3:1 | Yes |
| "Settings & Preferences →" link | same | ~4.3:1 | Yes |
| Day/Week/Month inactive tab | `bg-muted/50` composited over the page background (both known flat tokens) | ~4.2:1 | Yes |
| `InsightCard` subtitle `text-muted-foreground/70` | `bg-card` (opaque flat) | **~2.65:1** — alpha-composite of the muted-fg token at 70% over bg-card, both exactly known | Yes (dropped the `/70` modifier, falling back to the already-passing plain-token ratio) |
| `InsightCard`/`ChartCard` title + plain subtitle | `bg-card` | ~4.566:1 | No — already passes (matches `day-planner`'s prior finding) |
| Chart tooltips | `bg-popover` (≈ bg-card) | ~4.646:1 | No — passes |
| "3 Adjustments"/Weekly Tip/guest-overlay copy | gradient/opacity-tinted panels, not a flat two-color pair | not honestly computable without pixel sampling | No — same "don't fabricate" discipline `day-planner` used |

Full derivations (HSL→RGB, linearization, WCAG relative luminance formula)
done by hand for `--background`, `--card`, `--popover`, `--muted`,
`--muted-foreground`, all 3 `--gradient-calm` stops, and the `/70`
alpha-composite case; cross-checked against `day-planner`'s previously
published numbers for `--card`/`--muted-foreground` (matched to 3 decimal
places). Fix color reused verbatim from the `calendar-callback` precedent:
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` (light-mode darkened,
dark-mode left as today's already-passing default).

## TDD Evidence

New file: `apps/web/src/pages/__tests__/InsightsPage.test.tsx` (this page
had no test file before this card).

- **RED** (ran against the unmodified file first): **12/17 passed, 5
  failed** — all 5 failures were the contrast assertions (header range
  label, header subtitle, settings link, inactive tab, and a check that
  also caught the InsightCard `/70` case as a 6th assertion inside a test
  that otherwise passed pre-fix on its positive claims). Every other test —
  render for an authenticated user, the loading gate, the guest-lock
  overlay, the 4 computed-stat sanity checks (Focus Time "2h 5m", Tasks
  Done "7"/"57% days active", Good Sleep "3 nights"/"of 5 nights rated
  good", Focus Streak "4"/"on fire!"), and the view-range-toggle wiring —
  passed against the real, unmodified component logic, confirming the
  fixtures exercise genuine behavior rather than mocks standing in for it.
- **GREEN** (after implementation): **17/17 passed.**
- Mocking approach matches the `day-planner` precedent: every direct child
  component (`GoalsSection`, `AchievementsSection`, `ActivityHeatmap`,
  `DebugPanel`, `FeedbackModal`, `RhythmReportCard`, `PageTransition`) is
  stubbed to a `data-testid` marker; `recharts` is stubbed to pass-through
  divs (chart internals need real DOM layout, out of scope for a
  container-logic smoke test); every hook/context InsightsPage calls
  directly (`useAuthContext`, `useUserPreferences`, `useEventsLedgerContext`,
  `useFocusTotals`, `useFocusSessions`, `useTasks`, `useCheckIn`) is
  module-mocked with concrete fixture data. `lib/patternInsights.ts` and
  `lib/rhythmReport.ts` were deliberately left **real/unmocked** so the
  "computed values trace to real data" tests exercise actual arithmetic,
  not a mock standing in for it.
- The computed-stat fixture (`FOCUS_BY_DAY`/`TASKS_BY_DAY`, 7 days each,
  3 and 2 non-zero days respectively, overlapping on one day) was chosen so
  `activePercent = round(|{d1,d3,d6} ∪ {d1,d4}| / 7 * 100) = round(4/7*100)
  = 57` is a non-trivial, hand-checkable assertion — not a value that would
  pass by coincidence.

## What I implemented

1. Removed the dead `AnimatePresence` import.
2. 6 contrast fixes (see table above), each with an inline comment stating
   the measured ratio and reasoning.
3. 2 in-source `FIXME` comments (no-op CTA button; dual-source-of-truth
   Rhythm Report) — escalated in the card, not silently resolved.

No JSX structure, prop, handler logic (other than the two already-no-op
sites left untouched), or layout changed.

## Build + visual check

- `npx eslint src/pages/InsightsPage.tsx`: identical **7** pre-existing
  problems before and after (verified via `git stash`/eslint/`git stash
  pop`) — 4 `no-explicit-any` in tooltip renderers (untouched lines), 3
  `react-hooks/exhaustive-deps` warnings on the `rhythmReport` `useMemo`.
  No new lint issues.
- Focused test: `npx vitest run src/pages/__tests__/InsightsPage.test.tsx`
  → 17/17 passed.
- Full suite: `npx vitest run` (alone, not concurrent with the build) →
  **38/38 files, 413/413 tests passed.**
- Build: `npm run build` → `✓ built in 13.96s`, no errors; `InsightsPage`
  chunk **68.42 kB (gzip 17.38 kB)**.
- Visual/live check: not performed against a real authenticated session in
  this pass (no `.env`/secrets access per the merge gate, consistent with
  prior cards' judgment call on authenticated-only pages) — confirmed
  instead at the component level via the 17 passing tests against the
  real, unmodified-except-for-this-card's-fixes component code, plus the
  clean production build.

## Files changed

- `apps/web/src/pages/InsightsPage.tsx` — dead import removal, 6 contrast
  fixes, 2 FIXME escalation comments.
- `apps/web/src/pages/__tests__/InsightsPage.test.tsx` — new test file.
- `docs/superpowers/cards/insights.md` — state updated to `merged`, full
  handoff recorded.

## Self-review

- **Traced every displayed stat to its real data source?** Yes — see the
  audit table above; every number/insight resolves through a named,
  read-in-full function back to real ledger/localStorage-backed data. No
  placeholder found.
- **Stayed scoped, avoided structural redesign?** Yes — only className/
  import/comment changes; no JSX structure, props, or handlers changed
  (the two FIXME'd issues are pre-existing behavior, left as-is).
- **Smoke tests actually useful?** Yes — they assert on real arithmetic
  (hand-checked activePercent, focus-time formatting, sleep/streak copy)
  with a fixture specifically designed so a wrong implementation would
  fail, not just "renders without throwing."
- **Contrast math verified?** Yes — full hand HSL→RGB→luminance
  derivations for every token involved, cross-checked against `day-planner`'s
  previously published numbers where the same tokens recur, plus a new
  alpha-composite derivation for the `/70` opacity case.
- **Card file clean?** Yes — state `merged`, owner recorded, handoff
  written in the pipeline's established PASS 1/2/3 format.

## Concerns

1. **Escalated, not fixed:** the Rhythm Report's dual-source-of-truth risk
   (Finding 3) and the no-op "Apply next week's plan" button (Finding 2) —
   both documented in-source (`FIXME`) and in the card for a future,
   dedicated card.
2. **Structural recommendation for a future card:** none beyond the two
   escalations above — this page's existing layout/composition was judged
   sound and out of scope to restructure.
3. Pre-existing lint issues (4 `no-explicit-any`, `rhythmReport`
   exhaustive-deps) are unrelated to this card's scope and were left alone,
   consistent with precedent.
