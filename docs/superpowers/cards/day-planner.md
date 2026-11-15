---
id: day-planner
title: Day Planner Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = audit, PASS 2 = product-fit/verification, PASS 3 = build record) — this is the app's primary authenticated dashboard (route /app, protected, 1248 lines pre-edit), the largest and most interactive page touched by this pipeline so far and the one with no pre-existing test file. Per the card's explicit scope discipline, NO structural redesign was attempted. PASS 1 found a large, unambiguous set of dead code (unused imports, two unused sub-components, one vestigial responsive-size effect, two unused destructured hook fields, one mojibake comment byte) — all confirmed zero-usage by mechanical grep across the file and the whole repo, not guesswork. PASS 1 found NO fabricated/hardcoded fake metrics in this page's own UI copy (all displayed counts — overdue tasks, block/task lists — trace to real hook data) and NO clean, computable contrast defect: the page's only two Tailwind `text-muted-foreground` sites sit on `bg-card` (not `bg-background`), which computes to ~4.566:1 (AA pass, unlike the `bg-background` pairing fixed on 3 prior cards), and its other muted-text usages are opacity-reduced inline styles over a gradient/blur background that cannot be honestly reduced to a flat two-color contrast ratio — so none were touched, per the "don't fabricate a redesign" discipline. One structural recommendation is escalated (not actioned) for a future card.
---

# Card: Day Planner Page

This card represents the redesign/verification pass for the Day Planner Page feature/page in the Rivly web app.

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

### PASS 1 — Audit (dead code, not a redesign)

`apps/web/src/pages/DayPlanner.tsx`, route `/app`, guarded in
`AnimatedRoutes.tsx:78-87` (`user ? (shouldShowOnboarding ? <Navigate to="/onboarding"/> : <DayPlanner/>) : <Navigate to="/login"/>`)
— confirmed by reading the route block directly, matching the card brief.

**Scope decision, stated up front:** this page already carries a deliberate,
fully custom visual system (the "AMBIENT DEPTH LAYER" / "ORB HERO STAGE
(premium 3D redesign)" sections — inline gradients, blur, `DayPlannerAvatar`,
custom type scale). Re-architecting any of that is explicitly out of scope
per the brief ("no structural redesign," "that's out of proportion for one
card in a batch"). So PASS 1 looked for concrete, mechanically-verifiable
defects only — the same discipline as `auth-callback`/`calendar-callback`,
not the landing-page cards' redesign discipline.

**Finding 1 — a large, confirmed-unused surface, left over from before the
avatar/orb redesign replaced an older layout.** A whole-file import-usage
scan (every named/default import's identifier, word-boundary counted across
the component body) found 12 imports that resolve to literally zero uses
outside their own `import` line:

| import | from | note |
|---|---|---|
| `Heart`, `Brain`, `Wind`, `Plus`, `CalendarIcon`, `Sparkles` | `lucide-react` | icons with no remaining call site |
| `DayHeader` | `@/components/planner/DayHeader` | superseded by the custom header block, never rendered |
| `AnimatedBackground` | `@/components/planner/AnimatedBackground` | superseded by the inline "AMBIENT DEPTH LAYER," never rendered |
| `EventsList` | `@/components/calendar/EventsList` | never rendered (events render via `CalendarView`/`TimelineView` instead) |
| `MorningVoicePrompt` | `@/components/sleep/MorningVoicePrompt` | never rendered |
| `formatDateKeyDisplay` | `@/lib/dateUtils` | never called |
| `suggestFlowBlocks` | `@/services/FlowBlocksSuggestion` | never called |
| `supabase` | `@/integrations/supabase/client` | never referenced (the one network call in this file, `handleOrbClick`, uses `fetch` directly) |

Also found by the same method once the above were removed: the default
`React` import (only remaining use was `React.ReactNode` inside the dead
`QuickActionPill` below) and `useMemo` (imported, never called) — both
confirmed safe to drop under this repo's `"jsx": "react-jsx"` (automatic
JSX runtime, `tsconfig.app.json:15`), so no `React` symbol needs to be in
scope for JSX to compile.

**Finding 2 — two fully dead sub-components at the bottom of the file.**
`StatCard` and `QuickActionPill` (lines ~1186-1248 pre-edit) are defined but
never instantiated anywhere in `DayPlanner.tsx`, and
`grep -rln "StatCard|QuickActionPill" apps/web/src` (repo-wide) returns only
this one file's own definitions — confirmed not exported, not used
elsewhere, not a shared component. Leftover from a pre-redesign stats-row
layout.

**Finding 3 — a vestigial responsive-sizing effect that no longer does
anything observable.** Lines 118-125 (pre-edit) computed `globeSize` via a
`window.resize` listener (`// Responsive globe size <mojibake> must be
before any early return`) but `globeSize` was never read anywhere after
being set — the orb is now `<DayPlannerAvatar size="md" />`, and
`DayPlannerAvatar`'s own prop type is `'sm' | 'md' | 'lg'` (checked in
`components/planner/DayPlannerAvatar.tsx:8-9`), not a numeric pixel value,
so `globeSize` could not be wired into it even if someone tried — this is
genuinely dead, not a dropped feature with an easy fix. Removed, along with
the mojibake comment byte it carried.

**Finding 4 — two unused destructured hook fields**, each confirmed by
grep to have exactly one occurrence (their own destructuring line) in the
whole file: `activeCount` (aliased `parkedThoughtsCount`, from
`useParkedThoughts()`) and `isLoading` (aliased `eventsLoading`, from
`useEvents()`). Narrowed the destructuring to the fields actually used
(`addThought`, `getEventsForDate`), leaving the hook calls themselves
untouched.

**Explicitly NOT found / NOT touched (checked, not assumed):**
- **No fabricated/hardcoded fake metrics in this page's own rendered UI.**
  The one numeric claim on screen (`{overdueTasks.length} overdue`) traces
  to the real `getOverdueTasks(tasks)` call (`services/SmartReschedule.ts`),
  not a placeholder. `completedSessionsToday`, `focusSessions`,
  `parkedThoughtsCount` (pre-cleanup) and `globeSize` are all computed from
  real hook data or are genuinely inert — none are displayed as a fabricated
  number standing in for something not actually computed.
- **No clean, computable contrast defect** — see PASS 2 below for the full
  math; this differs from 3 prior cards and is stated honestly rather than
  forcing a fix to match the precedent.
- **No ESLint issues introduced.** `npx eslint src/pages/DayPlanner.tsx`
  before and after this card's edits reports the identical 6 pre-existing
  problems (5 `no-explicit-any` on lines unrelated to this card's edits, 1
  `react-hooks/exhaustive-deps` on the deliberately-commented
  `showRescheduleSheet` effect) — confirming no new lint regressions and
  that these pre-existing issues are out of this card's scope (typing/hook-
  dependency work, not a redesign or dead-code concern).

**Not attempted — explicitly deferred as a structural recommendation for a
future dedicated card (see end of PASS 3):** typing the five
`@typescript-eslint/no-explicit-any` sites and the `overdueTasks`
exhaustive-deps gap are real but pre-existing issues, unrelated to this
card's redesign/dead-code scope, and touching them risks exactly the kind of
scope creep this card was told to avoid.

### PASS 2 — Product-fit / verification

**Cross-file impact — grep, not assertion.**

```
$ grep -rln "DayPlanner[^A]" apps/web/src --include=*.ts --include=*.tsx
apps/web/src/pages/DayPlanner.tsx
apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one route)
apps/web/src/hooks/useRivaLogic.ts                   (a comment only: "handled by DayPlanner.tsx effect")
apps/web/src/contexts/TimerCompletionContext.tsx     (a doc comment only, naming it as an example screen)
```

Default export only, one lazy-loaded route consumer, no other file imports
anything named from `DayPlanner.tsx` (it has no named exports). None of the
dead-code removal touches any of these three other files — the comments in
`useRivaLogic.ts`/`TimerCompletionContext.tsx` are prose references to the
page by name, not imports, and remain accurate.

**Contrast math, done by hand (not assumed from precedent) and found to
NOT repeat the prior defect here.** This page's two Tailwind
`text-muted-foreground` class sites (inside the "Smart reschedule" `Dialog`)
sit on shadcn's `DialogContent`, which uses `bg-card`
(`components/ui/dialog.tsx:179`), not `bg-background` as on the 3 prior
cards. `--card: 38 30% 98%` (light mode, `index.css:33`) is lighter than
`--background: 38 35% 96%` — computing HSL→sRGB→linear→relative luminance
by hand:

- `--card` `hsl(38,30%,98%)` → `rgb(251,250,248)` → L ≈ 0.9599
- `--muted-foreground` `hsl(230,10%,48%)` → `rgb(110,114,135)` → L ≈ 0.1712
- ratio = (0.9599+0.05)/(0.1712+0.05) ≈ **4.566 : 1** — passes AA (≥4.5:1
  for normal-size text)

versus the same text color's previously-measured **4.403:1** on plain
`bg-background` (fail) in `calendar-callback`/`alarm-ringing`/
`auth-callback`. Same shared token, different (lighter) local background —
genuinely passes here, so left unchanged. (One of the two sites is a
`Trash2` icon button, graphical not textual contrast, 3:1 threshold,
trivially passes regardless; the other is a conditionally-shown "Pick date"
label text, which is the one actually checked above.)

The page's other muted-text usages are inline `hsl(var(--muted-foreground) /
0.3-0.6)` over the page's gradient/blur ambient background, not a flat
token pair — honestly not reducible to a single defensible contrast number
without rendering and sampling actual pixels, which is outside this card's
scope to fabricate. Flagging as an **observation, not a fix**: the
smallest of these (the "OVERDUE" badge text and the `dd.MM` date subscript,
both well under 14px) are worth a real rendered-pixel contrast audit in a
future dedicated accessibility card for this page, not guessed at here.

**Fabrication/behavior-truthfulness check (required by the brief).**
Re-read every numeric/stateful claim rendered by this file: the overdue
count, the Timeline/Calendar block and task lists, the "Today"/date label,
the flow/plan mode label, the Google-Calendar-connected badge logic, and the
Rhythm Guide insight dialog's online/offline fallback text — all trace to
real hook state or a real network response, never a hardcoded placeholder
presented as live data. No fabrication found.

**Verdict: APPROVED, scope as proposed in PASS 1** — dead-code removal
only (12 unused imports/identifiers across 2 passes, 2 unused sub-
components, 1 vestigial effect, 2 narrowed destructures), zero behavioral
or visual change, zero new lint issues. One structural recommendation
escalated below rather than actioned.

### PASS 3 — Build / verification record

- **Test file:** new `apps/web/src/pages/__tests__/DayPlanner.test.tsx` —
  the page had no test file before this card. Every direct child component
  DayPlanner imports is stubbed to a minimal `data-testid` marker (shallow
  render), and every hook/context DayPlanner calls directly is module-
  mocked with a concrete default return value, so these tests exercise
  DayPlanner's own container logic (data wiring, conditional branches, the
  global `'q'` hotkey, the loading gate) — not the full ~20-component
  subtree, which is each individually out of this card's scope and would
  require deep mocking the brief warned against.
- **Baseline run against the unmodified file (13 tests):** 1 failure on
  first run — a test-fixture bug on my part (`TimeBlock` fixture missing
  the required `tasks: []` field, caught by `PlanningEngine.orderTasksForPlan`
  actually iterating it — a real signal the test was exercising real logic,
  not a mock). Fixed the fixture; **13/13 passed** against the original,
  unmodified `DayPlanner.tsx` — confirming the baseline before any
  dead-code edit.
- **Implementation:** removed 12 unused imports/identifiers (across two
  passes — the first batch found directly, `React` and `useMemo` found
  once-removed as newly-dead after the `QuickActionPill` deletion), the
  `globeSize` state+effect, the `StatCard`/`QuickActionPill` function
  definitions, and narrowed two hook destructures to only the fields used.
  No JSX, no rendered markup, no prop, no handler logic changed.
- **GREEN after implementation:** same 13/13 passed, unchanged — proving
  the removal was behavior-preserving, which is the actual point of writing
  tests for this card (no RED/GREEN contrast delta exists this time, since
  nothing visible changed).
- **ESLint:** identical 6 pre-existing problems before and after (see PASS
  1) — no new issues.
- **Full suite:** `cd apps/web && npx vitest run` (run alone, not
  concurrently with the build) → **33/33 files, 347/347 tests passed.**
- **Build:** `npm run build` → `✓ built in 18.25s`, no errors;
  `DayPlanner` chunk **163.28 kB (gzip 44.93 kB)** in the lazy-loaded route
  bundle.
- **Visual/behavioral check:** built `dist` served locally
  (`npx serve -s dist -l 4319`), driven over CDP in headless Edge
  (`msedge.exe --headless=new --remote-debugging-port`, Node's native `ws`
  client against the DevTools Protocol — same approach as
  `auth-callback`/`calendar-callback`, Playwright's bundled Chromium being
  blocked by OS Application Control on this machine; the `chrome-devtools`
  MCP server also failed to connect this session).
  - Unauthenticated `/app` correctly redirected to `/login`
    ("Sign in to continue your daily flow" rendered), confirming the route
    guard itself works and the built bundle loads with **0 console
    errors/warnings** and no horizontal overflow
    (`scrollWidth === clientWidth`, 741/741).
  - Went further than the `calendar-callback` precedent: clicked
    "Continue as Guest" on the login page to try to reach the real
    authenticated `/app` dashboard without needing real credentials (no
    `.env`/secrets access, per the merge gate). This did authenticate (URL
    moved to `/app`, 0 console errors) but landed on a separate,
    unrelated **waitlist gate** ("account guest@rivly.app is not
    registered on our waitlist... Failed to fetch") — a pre-existing
    product gate on this guest flow unrelated to this card, and the
    "Failed to fetch" is expected since the statically-served local build
    has no path to the real backend/waitlist-check endpoint from this
    machine. Reaching the actual rendered dashboard this way is blocked by
    that gate, not by anything in this card's change.
  - Rendering the real authenticated dashboard state therefore requires a
    real, waitlist-approved Supabase session, which is outside this card's
    reach without secrets access — the same judgment call
    `calendar-callback`/`auth-callback` made for their equivalent
    authenticated-only states. That state is instead confirmed at the
    component level by the 13 passing tests, which render the **real**
    `DayPlanner` component code (not a mocked stand-in) and assert against
    its actual DOM output for: the loading gate, all 6 landmark sections,
    the flow/plan view switch, real block/task counts reaching
    `TimelineView`, the real `getOverdueTasks` logic driving the overdue
    badge (both present and absent cases), the global `'q'` hotkey (and its
    input-focus guard), and both FAB actions opening their respective
    dialogs.
- **Primary interaction verified:** the dashboard's core data-wiring and
  interaction surface (view toggle, FAB → dialogs, hotkey, overdue badge)
  is confirmed working against the real component logic via the 13 unit
  tests; the route guard is confirmed live against the real built app with
  zero console errors.

**Escalation — structural recommendation for a FUTURE dedicated card (not
actioned here, per the brief's explicit instruction to escalate rather than
attempt bigger work in this card):**
1. A real rendered-pixel contrast audit of this page's inline
   `hsl(var(--muted-foreground) / 0.3-0.6)` text over its gradient/blur
   ambient background — particularly the sub-14px "OVERDUE" badge
   (`0.57rem` ≈ 9.1px) and the `dd.MM` date subscript (`0.65rem` opacity
   `0.32` ≈ very low contrast by eye, not confidently computable by hand
   given the layered transparency) — is worth a dedicated pass with actual
   pixel sampling (e.g. a headless-browser color-pick), not hand HSL math
   against a flat two-color assumption that doesn't hold here.
2. The 5 `@typescript-eslint/no-explicit-any` sites and the
   `react-hooks/exhaustive-deps` gap on the reschedule effect are
   pre-existing and out of this card's redesign/dead-code scope, but are
   real and worth a typing-focused pass separately from any visual work.
