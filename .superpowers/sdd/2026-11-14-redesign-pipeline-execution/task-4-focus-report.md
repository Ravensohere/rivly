# Task 4 — Card: focus — Report

Route `/focus`, `apps/web/src/pages/FocusPage.tsx` (272 lines pre-edit).

## Audit findings

`FocusPage.tsx` is a thin state-machine orchestrator with almost no JSX of
its own — it switches between `FocusSetup` / `FocusSessionActive` / a break
`ActiveTimerDisplay` / `FocusFeedback` based on `focusState`
(`FocusTimerContext`) and `activeTimer` (`BackgroundTimer`), and owns the
feedback/session-recording path. Beyond those children it only renders the
"Park a thought" FAB + `ThoughtParkingSheet` and the dev-gated
`FocusDebugPanel`.

Route confirmed protected via `AnimatedRoutes.tsx:88`:
`<Route path="/focus" element={user ? <FocusPage /> : <Navigate to="/login" replace />} />`.

**Finding 1 — dead code, not fabrication.** Line 45 destructured
`today: todayFocus, focusStreak, totalSessions` from `useFocusTotals()` — a
real, `EventsLedgerContext`-backed hook, not a hardcoded stat. Grepped the
whole file: none of the three are ever read again (not rendered, not passed
to any child). Checked `FocusSetup.tsx` (the idle screen) too — no stats
shown there either. Removed the dead destructuring + now-unused import.

**Finding 2 — the recurring `text-muted-foreground`/`bg-background`
AA-contrast defect**, present in 3 of the page's 4 directly-rendered
children (`FocusSetup.tsx`, `FocusSessionActive.tsx`, `FocusFeedback.tsx`);
absent from `FocusDebugPanel.tsx` (its sites all sit on `bg-card`, which
passes) and absent from `FocusPage.tsx` itself (zero `text-muted-foreground`
usages in that file — it renders no raw text of its own beyond the FAB
button, which uses `variant="secondary"`, not muted text).

**Escalated, not touched:**
- `components/focus/FocusSession.tsx` and `CompletionCelebration.tsx` are
  unimported, superseded dead files (confirmed by repo-wide grep).
- `FocusSessionActive.tsx`'s `onCancel`/`handleCancel` prop chain
  (threaded from `FocusPage.tsx`) is defined but never invoked by any JSX
  element in that component — looks intentional (the exit dialog's own copy
  says "Progress still counts", i.e. no silent-discard path by design), not
  a bug. Left as unreachable plumbing; fixing it means touching a second
  file's prop contract, outside this card's named scope.
- The auto-submit-`'good'`-feedback-on-celebration behavior
  (`FocusPage.tsx` lines 159-166) means the real 3-outcome feedback screen
  only appears for early-ended sessions, never for normal full-duration
  completions — traced against `FocusTimerContext.tsx`/
  `TimerCompletionContext.tsx` and confirmed deliberate (code comment:
  "avoids double screens"). No UI copy contradicts this. Documented, not
  changed.

## Product-fit findings

**Grep result:** `FocusPage.tsx` has exactly one consumer —
`AnimatedRoutes.tsx`'s lazy route. The 3 components touched for the
contrast fix (`FocusSetup`/`FocusSessionActive`/`FocusFeedback`) are each
imported only by `FocusPage.tsx` — no shared-component regression risk.

**Fabrication check:** every value `FocusPage.tsx` passes downstream
(`sessionConfig.duration`, `sessionResult.actualMinutes`,
`sessionResult.endedEarly`, purpose label, `linkedTaskId`,
`todayBlocks`/`todayTasks`) traces to real hook/context state. Other
specific claims re-verified against source, not assumed:
- "Timer continues across pages & refresh" → `services/BackgroundTimer.ts`
  genuinely persists to `localStorage` and restores on load. True.
- "Debug Panel - only visible with ?debug=1" → `FocusDebugPanel.tsx`'s
  own early-return on `params.get('debug') !== '1'`. True.

The only inaccuracy-adjacent finding was **real-but-unused** data (Finding
1), not a false claim shown to a user — nothing fabricated was found in
this page's own UI copy.

**Per-site contrast math** (reused the exact same CSS tokens as 5+ prior
cards, confirmed in `apps/web/src/index.css`; recomputed HSL→RGB→luminance→
contrast independently rather than assuming uniformity across different
backgrounds):
- `text-muted-foreground` vs `bg-background` ≈ **4.40:1 — fails**
  (matches prior cards' number).
- `text-muted-foreground` vs `bg-muted` (slightly darker) ≈
  **4.03:1 — fails, worse**.
- `text-muted-foreground` vs `bg-card` ≈ **4.55:1 — passes** (barely),
  matching the `day-planner` precedent — left untouched everywhere it
  occurs.
- Fix token `hsl(230,10%,42%)` ≈ **5.43:1 vs bg-background, 4.98:1 vs
  bg-muted — both pass.**
- One site used `/60` opacity; even the fix token at 60% alpha only reaches
  **≈2.47:1 — still fails** against this background, so that site's
  opacity modifier was dropped (full-strength token) rather than inventing
  a new ad-hoc darker color.

Verdict: **APPROVED, scope as proposed** — 1 dead-code removal, 12
AA-contrast fixes across 3 files, zero structural changes.

## TDD Evidence

New file: `apps/web/src/pages/__tests__/FocusPage.test.tsx` (15 tests,
page had none before). Every direct child component stubbed; every
context/hook `FocusPage` calls directly is module-mocked with controllable
state, covering real interactive states: idle/setup, running, paused, a
break timer active, feedback after an early-ended session, auto-submit-on-
celebration, skip-feedback, cancel, end-early, and park-a-thought →
`/reflect`.

- **RED:** baseline run against the unmodified file → 14/15 passed, 1
  failed. (Two other failures appeared first but were test-authoring
  async-timing bugs in my own test — `handleFeedback` is `async` and the
  test needed `await vi.waitFor(...)` before asserting later calls in the
  chain; fixed in the test, not the product code, then re-ran clean at
  14/15.) The 1 genuine RED: "does not call the unused useFocusTotals hook"
  — failed because the hook was still called pre-fix. Exactly the planned
  change.
- **GREEN:** 15/15 after removing the dead `useFocusTotals()` call.

## What I implemented

1. `apps/web/src/pages/FocusPage.tsx` — removed the dead
   `useFocusTotals` import and its unused destructured result
   (`today`/`focusStreak`/`totalSessions`), which were fetched from the
   real ledger-backed hook but never rendered anywhere.
2. `apps/web/src/components/focus/FocusSetup.tsx` — fixed 8 of 10
   `text-muted-foreground` sites (lines 81, 94, 105, 118, 166, 170, 195,
   251 — all on plain `bg-background`) to
   `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`. Left 2 sites
   (131, 135 — the purpose-option icon/label, `bg-card` background in the
   unselected state) untouched.
3. `apps/web/src/components/focus/FocusSessionActive.tsx` — fixed 4 of 5
   sites (201 — kept the `bg-muted` background class, swapped only the
   text color; 255; 265 — dropped the `/60` opacity modifier per the math
   above; 308). Left site 334 (inside `bg-card` exit-confirm dialog)
   untouched.
4. `apps/web/src/components/focus/FocusFeedback.tsx` — fixed 3 of 5 sites
   (138, 153, 206 — plain `bg-background`). Left 2 sites (179, 182 — inside
   a `bg-card` outcome button) untouched.
5. New test file: `apps/web/src/pages/__tests__/FocusPage.test.tsx`.

## Build + visual check

- Full suite: `cd apps/web && npx vitest run` → **36/36 files, 388/388
  tests passed** (includes the 15 new FocusPage tests; run alone, not
  concurrently with the build).
- Build: `npm run build` → `✓ built in 13.66s`, no errors; `FocusPage`
  chunk **24.03 kB (gzip 5.60 kB)**.
- Visual/behavioral check against the real built app: served `dist`
  locally (`npx serve -s dist -l 4322`), drove headless Edge
  (`msedge.exe --headless=new`) over raw CDP via Node's `ws` client
  (Playwright's bundled Chromium is blocked by OS Application Control on
  this machine; the `chrome-devtools` MCP server failed to connect this
  session). `/focus` is a normal protected route — same judgment call as
  the `day-planner` card made for `/app`: reaching real authenticated
  content needs real Supabase credentials, outside this card's reach per
  the merge gate (no `.env`/secrets access). Confirmed: unauthenticated
  `/focus` correctly redirects to `/login` ("Sign in to continue your daily
  flow" rendered), **0 console errors, 0 exceptions**, no horizontal
  overflow (`scrollWidth === clientWidth`, 485/485). Both headless-Edge and
  the static server processes were cleaned up afterward. The real
  authenticated states (setup/running/paused/break/feedback) are confirmed
  instead by the 15 passing tests rendering the real `FocusPage` component
  code.

## Files changed

- `apps/web/src/pages/FocusPage.tsx`
- `apps/web/src/components/focus/FocusSetup.tsx`
- `apps/web/src/components/focus/FocusSessionActive.tsx`
- `apps/web/src/components/focus/FocusFeedback.tsx`
- `apps/web/src/pages/__tests__/FocusPage.test.tsx` (new)
- `docs/superpowers/cards/focus.md` (state → merged, full handoff recorded)

## Self-review findings

- Fabrication/mismatch check: performed with real verification (read
  `useFocusTotals.ts`, `BackgroundTimer.ts`, `FocusDebugPanel.tsx`,
  `FocusTimerContext.tsx`, `TimerCompletionContext.tsx` directly; grepped
  for every stat/claim's actual consumer before concluding anything).
- Real interactive states tested: yes — running, paused, break-active,
  early-ended feedback, auto-celebration feedback, skip, cancel — not just
  an idealized initial idle render.
- Contrast fix applied where the known pattern recurred (12 sites across 3
  files), with per-site background verification rather than a blanket
  find-and-replace (6 sites on `bg-card` correctly left alone; 1 `/60`-
  opacity site required dropping the opacity, not just swapping the token).
- Card file updated to `state: merged` with full PASS 1/2/3 handoff.

## Concerns

- Two escalations left for a future card (see focus.md "Escalations"):
  dead-file cleanup for `FocusSession.tsx`/`CompletionCelebration.tsx`, and
  a product decision on `FocusSessionActive.tsx`'s unreachable `onCancel`
  prop chain. Neither blocks this card — both are pre-existing, out-of-
  scope-by-brief issues, not regressions introduced here.
- The authenticated-state visual check relies on component-level tests
  (real `FocusPage` code, mocked children/hooks) rather than a live
  Supabase-backed browser render, per the merge gate's no-secrets
  constraint — same judgment call the `day-planner` card made for its own
  protected route.
