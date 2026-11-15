# Task 4 — Card: day-planner

Page: `apps/web/src/pages/DayPlanner.tsx`, route `/app` (primary authenticated
dashboard, protected in `AnimatedRoutes.tsx:78-87`). 1248 lines pre-edit, no
pre-existing test file (only `DayPlannerAvatar` had one). Per the card brief,
**no structural redesign was attempted** — scope was concrete, mechanically
verifiable defects only.

## Audit findings (PASS 1)

**No fabricated/hardcoded UI metrics found.** The one numeric claim rendered
on screen, `{overdueTasks.length} overdue`, traces to the real
`getOverdueTasks(tasks)` call (`services/SmartReschedule.ts`). All other
state surfaced (block/task lists, flow/plan label, Google-Calendar-connected
badge, Rhythm Guide insight dialog) comes from real hook data or a real
network response — never a placeholder standing in for unbuilt data.

**No clean, computable contrast defect** (unlike the shared
`text-muted-foreground`-on-`bg-background` bug fixed on `landing-cta`,
`alarm-ringing`, `auth-callback`, `calendar-callback`). This page's two
Tailwind `text-muted-foreground` sites live inside the "Smart reschedule"
`Dialog`, which uses shadcn's `DialogContent` → `bg-card`
(`components/ui/dialog.tsx:179`), not `bg-background`. Hand math (HSL→sRGB→
linear→relative luminance), done independently against this repo's actual
tokens:

- `--card` `hsl(38,30%,98%)` → `rgb(251,250,248)` → L ≈ 0.9599
- `--muted-foreground` `hsl(230,10%,48%)` → `rgb(110,114,135)` → L ≈ 0.1712
- ratio = (0.9599+0.05)/(0.1712+0.05) ≈ **4.566:1** — passes AA (≥4.5:1)

versus the same color's previously-measured 4.403:1 (fail) on plain
`bg-background` in the 3 prior cards. Genuinely different result because the
local background differs — not forced to match precedent. The page's other
muted-text usages are `hsl(var(--muted-foreground) / 0.3-0.6)` inline styles
over a gradient/blur ambient background (the "AMBIENT DEPTH LAYER" /
"ORB HERO STAGE" sections) — not a flat two-color pair, so not honestly
reducible to a single contrast number by hand. Left untouched and escalated
(see Concerns) rather than guessed at.

**Found instead: a large, mechanically-confirmed dead-code surface**, left
over from before the current orb/avatar redesign replaced an older layout.
A whole-file import-usage scan (every import identifier, word-boundary
counted across the component body) found:

| Dead item | Evidence |
|---|---|
| `Heart, Brain, Wind, Plus, CalendarIcon, Sparkles` (lucide-react) | 0 occurrences outside the import line |
| `DayHeader` import | 0 occurrences — superseded by the custom inline header, never rendered |
| `AnimatedBackground` import | 0 occurrences — superseded by the inline "AMBIENT DEPTH LAYER," never rendered |
| `EventsList` import | 0 occurrences — events render via `CalendarView`/`TimelineView` instead |
| `MorningVoicePrompt` import | 0 occurrences |
| `formatDateKeyDisplay` import | 0 occurrences |
| `suggestFlowBlocks` import | 0 occurrences |
| `supabase` import | 0 occurrences — the file's one network call (`handleOrbClick`) uses `fetch` directly |
| default `React` import | 0 occurrences once `QuickActionPill` (the only `React.ReactNode` use) is removed; confirmed safe under `"jsx": "react-jsx"` (`tsconfig.app.json:15`) |
| `useMemo` import | 0 occurrences, never called |
| `StatCard`, `QuickActionPill` function definitions | 0 call sites in this file; `grep -rln` repo-wide finds only their own definitions, confirming not exported/shared |
| `globeSize` state + `window.resize` effect | set, never read; `DayPlannerAvatar`'s prop type is `'sm'\|'md'\|'lg'` (`DayPlannerAvatar.tsx:8-9`), not a pixel value, so it could not have been wired in even if intended — genuinely dead, not a dropped feature with an easy fix |
| `activeCount` (aliased `parkedThoughtsCount`) from `useParkedThoughts()` | 1 occurrence (its own destructure line) |
| `isLoading` (aliased `eventsLoading`) from `useEvents()` | 1 occurrence (its own destructure line) |

Also found: one mojibake byte in a comment (`// Responsive globe size <?>
must be before any early return`) — removed along with the dead block that
carried it.

## Product-fit / verification findings (PASS 2)

**Cross-file impact**, grepped not assumed:
```
apps/web/src/pages/DayPlanner.tsx
apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one route)
apps/web/src/hooks/useRivaLogic.ts                   (comment only, names the page)
apps/web/src/contexts/TimerCompletionContext.tsx     (doc comment only, names the page)
```
Default export only, one lazy-loaded route consumer, no named exports used
elsewhere. None of the dead-code removal touches those other 3 files.

**Route wiring confirmed** against `AnimatedRoutes.tsx:78-87`: `/app` renders
`<DayPlanner/>` only when `user` is truthy and `!shouldShowOnboarding`,
otherwise redirects to `/onboarding` or `/login` — matches the card brief.

**Fabrication/behavior-truthfulness check**: re-read every numeric/stateful
claim rendered by the file — none found hardcoded/fabricated (see Audit
section above).

**Verdict: APPROVED, scope as proposed** — dead-code removal only, zero
behavioral/visual change, zero new ESLint issues (`npx eslint
src/pages/DayPlanner.tsx` reports the identical 6 pre-existing problems
before and after: 5 `no-explicit-any`, 1 `react-hooks/exhaustive-deps` on
the deliberately-commented reschedule effect — none touched, out of this
card's scope).

## TDD Evidence (RED/GREEN)

New file: `apps/web/src/pages/__tests__/DayPlanner.test.tsx`. Since the
fixes are dead-code removal (no visible/behavioral change), there is no
contrast-style RED-before/GREEN-after delta this time — instead the tests
serve as a behavior-preservation harness, which is the real risk on a page
this size and complexity.

Every direct child component DayPlanner imports is shallow-stubbed to a
`data-testid` marker, and every hook/context it calls directly is
module-mocked with a concrete default return value, so the tests exercise
DayPlanner's own container logic (data wiring, conditional branches, the
global `'q'` hotkey, the loading gate) rather than the full ~20-component
subtree (each with its own hook/context dependencies, explicitly out of
scope and flagged in the brief as a deep-mocking risk).

- **Baseline run against the unmodified file:** first run surfaced 1
  failure — a bug in my own test fixture (a `TimeBlock` fixture missing the
  required `tasks: []` array, which `PlanningEngine.orderTasksForPlan`
  actually iterates — a good signal the test was exercising real logic).
  Fixed the fixture; **13/13 passed** against the original, unmodified
  `DayPlanner.tsx`.
- **GREEN after implementation:** same **13/13 passed**, unchanged —
  confirming the dead-code removal was fully behavior-preserving.

## What I implemented

All changes confined to `apps/web/src/pages/DayPlanner.tsx`:
1. Removed 12 confirmed-unused imports/identifiers (6 lucide icons,
   `DayHeader`, `AnimatedBackground`, `EventsList`, `MorningVoicePrompt`,
   `formatDateKeyDisplay`, `suggestFlowBlocks`, `supabase`), plus the
   default `React` import and `useMemo` once newly-dead after step 3.
2. Removed the `globeSize` state + `window.resize` effect (and its mojibake
   comment byte).
3. Removed the two fully-dead sub-components `StatCard` and
   `QuickActionPill`.
4. Narrowed two hook destructures to only the fields actually used
   (`useParkedThoughts()` → `addThought` only; `useEvents()` →
   `getEventsForDate` only).

No JSX, prop, handler, or rendered markup changed.

## Build + visual check

- **ESLint**: `npx eslint src/pages/DayPlanner.tsx` — identical 6
  pre-existing issues before and after (no new issues).
- **Focused test**: `npx vitest run src/pages/__tests__/DayPlanner.test.tsx`
  — 13/13 passed (before and after the edit, run separately).
- **Full suite** (run alone, not concurrently with the build): `npx vitest
  run` → **33/33 files, 347/347 tests passed.**
- **Build**: `npm run build` → `✓ built in 18.25s`, no errors; `DayPlanner`
  chunk **163.28 kB (gzip 44.93 kB)** in its lazy-loaded route bundle.
- **Visual/behavioral check**: served the built `dist` locally (`npx serve
  -s dist -l 4319`), drove it with headless Edge over CDP (`msedge.exe
  --headless=new --remote-debugging-port`, Node's native `ws` client against
  the DevTools Protocol — Playwright's bundled Chromium is blocked by OS
  Application Control on this machine, and the `chrome-devtools` MCP server
  also failed to connect this session).
  - Unauthenticated `/app` correctly redirected to `/login` ("Sign in to
    continue your daily flow" rendered), confirming the route guard and that
    the built bundle loads with **0 console errors/warnings**, no horizontal
    overflow (`scrollWidth === clientWidth`, 741/741).
  - Went further than the `calendar-callback`/`auth-callback` precedent:
    clicked "Continue as Guest" on the login page to try reaching the real
    authenticated dashboard without needing real credentials (no `.env`/
    secrets access, per the merge gate). This did authenticate (URL moved to
    `/app`, 0 console errors) but landed on an unrelated, pre-existing
    **waitlist gate** ("account guest@rivly.app is not registered on our
    waitlist... Failed to fetch" — expected, since the statically-served
    local build has no path to the real backend from this machine). Reaching
    the actual rendered dashboard this way is blocked by that gate, not by
    anything in this card's change.
  - Rendering the real authenticated dashboard therefore requires a real,
    waitlist-approved Supabase session — outside this card's reach without
    secrets access, the same judgment call `auth-callback`/`calendar-callback`
    made for their own authenticated-only states. That state is instead
    confirmed at the component level by the 13 passing tests, which render
    the real `DayPlanner` component code (not a mocked stand-in) and assert
    on its actual DOM output.

## Files changed

- `apps/web/src/pages/DayPlanner.tsx` (dead-code removal only)
- `apps/web/src/pages/__tests__/DayPlanner.test.tsx` (new, 13 tests)
- `docs/superpowers/cards/day-planner.md` (state → merged, full handoff)
- `.superpowers/sdd/2026-11-14-redesign-pipeline-execution/progress.md`
  (appended day-planner entry)

Commit: `302ea9e` — "day-planner: remove confirmed-dead code, add baseline
test coverage"

## Self-review

- **Stayed scoped to concrete defects, no structural redesign**: yes — every
  change is a deletion of confirmed-unused code; zero JSX/markup/handler
  changes.
- **User-facing stats/metrics checked against real data sources**: yes — the
  overdue count and all other rendered state verified to trace to real hook
  data, not placeholders (see Audit section).
- **Smoke tests genuinely useful, not trivial**: yes — they assert on real
  component output (loading gate, landmark sections, view switching, real
  `getOverdueTasks` logic present/absent, the hotkey's input-focus guard,
  both FAB actions) against the actual `DayPlanner` source, and one test
  fixture bug was caught and fixed because a mocked service call actually
  ran real logic (`orderTasksForPlan` iterating `block.tasks`).
- **Contrast math verified with real HSL→RGB→luminance**: yes — computed by
  hand against this repo's actual `--card`/`--muted-foreground` tokens, and
  explicitly did NOT fabricate a ratio for the inline opacity-based text
  over the gradient background, flagging it as a future-card item instead.
- **Card file clean**: yes — `day-planner.md` updated with `state: merged`,
  owner, and full PASS 1/2/3 handoff.

## Concerns (structural recommendations for a future card, not actioned here)

1. A real pixel-sampled contrast audit (not hand HSL math) of this page's
   inline `hsl(var(--muted-foreground) / 0.3-0.6)` text over its gradient/
   blur ambient background — particularly the sub-14px "OVERDUE" badge
   (`0.57rem` ≈ 9.1px) and the `dd.MM` date subscript (opacity `0.32`) —
   since a flat two-color contrast assumption doesn't honestly hold against
   a blurred, animated gradient backdrop.
2. 5 pre-existing `@typescript-eslint/no-explicit-any` sites and 1
   `react-hooks/exhaustive-deps` gap (the deliberately-commented
   `overdueTasks` omission in the reschedule-plan effect) — real but
   unrelated to this card's dead-code/redesign scope.

No product-logic bugs or fabricated UI claims were found worth escalating
this card (unlike `alarm-ringing`'s `snoozeMinutes` gap or the landing-page
cards' marketing-copy fabrications).
