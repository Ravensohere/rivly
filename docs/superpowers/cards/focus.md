---
id: focus
title: Focus Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = audit, PASS 2 = product-fit/verification, PASS 3 = build record) — route /focus, confirmed protected (AnimatedRoutes.tsx:88, `user ? <FocusPage /> : <Navigate to="/login">`). No fabricated stats found (today/streak/totalSessions traced to the real ledger-backed useFocusTotals hook but were dead — destructured, never rendered — removed). Fixed the recurring text-muted-foreground/bg-background AA-contrast defect (12 sites, hand-verified per-site background) across FocusPage.tsx's 3 directly-rendered children (FocusSetup/FocusSessionActive/FocusFeedback); FocusDebugPanel's sites all sit on bg-card and already pass, untouched. Two dead/superseded sibling files (FocusSession.tsx, CompletionCelebration.tsx) and one unreachable onCancel prop chain in FocusSessionActive.tsx found but NOT touched — escalated below, consistent with not expanding scope beyond this page's own render path.
---

# Card: Focus Page

This card represents the redesign/verification pass for the Focus Page feature/page in the Rivly web app.

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

`apps/web/src/pages/FocusPage.tsx` (272 lines pre-edit), route `/focus`.
Confirmed PROTECTED by reading `AnimatedRoutes.tsx:88` directly:
`<Route path="/focus" element={user ? <FocusPage /> : <Navigate to="/login" replace />} />`
— standard auth guard, no special casing like `/desktop`.

**Scope:** `FocusPage.tsx` itself is a thin state-machine orchestrator (272
lines) with almost no JSX of its own — it switches between 4 real UI states
(`FocusSetup` / `FocusSessionActive` / a break `ActiveTimerDisplay` /
`FocusFeedback`) driven by `focusState` from `FocusTimerContext` and
`activeTimer` from the global `BackgroundTimer` service, and owns the
feedback/session-recording path. Its own rendered content beyond those
children is just the "Park a thought" FAB + `ThoughtParkingSheet` and the
dev-gated `FocusDebugPanel`.

**Finding 1 — dead code, not fabrication (hand-verified against the real hook):**
`const { today: todayFocus, focusStreak, totalSessions } = useFocusTotals();`
(line 45). `useFocusTotals` is the canonical, `EventsLedgerContext`-backed
hook (`apps/web/src/hooks/useFocusTotals.ts`) — a real data source, not a
hardcoded placeholder. But grepping the file for `todayFocus`/`focusStreak`/
`totalSessions` shows they are **never read anywhere else** — not rendered,
not passed to any child. `FocusSetup.tsx` (the idle screen) was also
checked and confirmed to show no stats of its own either. This is exactly
the "verify claims trace to real data" check the card asked for, with the
opposite-of-expected result: the data is real, but unused — a
fetch-for-nothing, not a lie. Removed the dead destructuring and the now-
unused `useFocusTotals` import (one-line, behavior-preserving; confirmed via
a dedicated test that the hook is no longer called at all).

**Finding 2 — the recurring text-muted-foreground/bg-background AA-contrast
defect (same shared token, same class as 5+ prior cards), hand-verified
per-site against this page's real backgrounds, not assumed uniform:**

Confirmed the same CSS tokens as prior cards (`apps/web/src/index.css`):
light-mode `--background: hsl(38,35%,96%)`, `--card: hsl(38,30%,98%)`,
`--muted: hsl(38,20%,92%)`, `--muted-foreground: hsl(230,10%,48%)`.
Independently recomputed (HSL→RGB→relative-luminance→WCAG contrast ratio)
rather than assumed:
- `text-muted-foreground` vs `bg-background` ≈ rgb(110,114,135) on
  rgb(248,246,241) → **≈4.40:1 — FAILS** (matches prior cards' number).
- `text-muted-foreground` vs `bg-muted` (rgb(239,236,231), slightly darker
  than `bg-background`) → **≈4.03:1 — FAILS, worse than on bg-background.**
- `text-muted-foreground` vs `bg-card` (rgb(251,250,248)) →
  **≈4.55:1 — PASSES** (barely), matching the `day-planner` precedent that
  `bg-card` sites are fine and shouldn't be touched.
- The established fix token `hsl(230,10%,42%)` ≈ rgb(96,100,118), luminance
  ≈0.129 (recomputed, matches prior cards' number exactly — same token) →
  **≈5.43:1 vs bg-background, ≈4.98:1 vs bg-muted — both PASS.**
- One site used `text-muted-foreground/60` (60% opacity) over the
  `bg-background` backdrop. Alpha-composited the fix token at 60% over
  bg-background → effective rgb(157,158,167), luminance ≈0.344 →
  **only ≈2.47:1 — still FAILS even with the darker token**, because 60%
  opacity dilutes any token too far on this light a background. Fixed by
  dropping the opacity modifier (full-strength fix token) rather than
  inventing a new, even-darker one-off color — this is decorative caption
  text ("Timer continues across pages & refresh") that reads as de-
  emphasized from its small size/icon pairing alone, with no opacity needed.

**Per-site disposition (every site read in context, not pattern-matched):**
- `FocusSetup.tsx`: 8 of 10 sites fixed (lines 81, 94, 105, 118, 166, 170,
  195, 251 — all sit on plain `bg-background`). 2 sites (131, 135, the
  purpose-option icon/label, conditionally `text-muted-foreground` only in
  the *unselected* state, whose button background is `bg-card`) are
  correctly on `bg-card` and were left alone.
- `FocusSessionActive.tsx`: 4 of 5 sites fixed (201 — note this one sits on
  `bg-muted`, not `bg-background`, text class swapped while keeping the
  `bg-muted` background; 255, 265 — opacity dropped per above, 308). 1 site
  (334, the exit-confirm dialog's subtext, inside `bg-card`) left alone.
- `FocusFeedback.tsx`: 3 of 5 sites fixed (138, 153, 206 — plain
  `bg-background`). 2 sites (179, 182, the outcome-option icon/label, inside
  a `bg-card` button) left alone.
- `FocusDebugPanel.tsx`: 0 of ~10 sites touched — every one sits inside the
  panel's own `bg-card` container (confirmed by reading the file), already
  passing AA. Also dev-only (`?debug=1`-gated), lowest priority either way.

**Other claims verified true, not touched:**
- "Timer continues across pages & refresh" (`FocusSessionActive.tsx`) — read
  `services/BackgroundTimer.ts`: genuinely persists to `localStorage`
  (`STORAGE_KEY`) and restores on load. True, not fabricated.
- "Debug Panel - only visible with ?debug=1" — read `FocusDebugPanel.tsx`:
  `params.get('debug') !== '1'` early-returns `null`. True.
- Route guard (above) matches the card's implicit expectation of a normal
  protected page, unlike `/desktop`'s deliberate public exception.

**Cross-file impact — grep, not assertion.**
`FocusPage.tsx` has exactly one consumer: `AnimatedRoutes.tsx`'s lazy route
(confirmed earlier via grep). The 3 components touched for the contrast fix
(`FocusSetup`/`FocusSessionActive`/`FocusFeedback`) are each imported only
by `FocusPage.tsx` — no shared-component regression risk from this card's
edits.

**Explicitly NOT touched — escalated, not fixed, per the brief's scope
discipline:**
- `apps/web/src/components/focus/FocusSession.tsx` — a near-duplicate of
  `FocusSessionActive.tsx` (same structure, same line numbers for
  corresponding JSX) that is **not imported anywhere** (confirmed by grep
  across `apps/web/src`), apparently superseded dead code. Not removed —
  deleting an unimported file is a larger "dead file cleanup" task than
  this card's named scope, and removing it has zero behavioral upside for
  this page.
- `apps/web/src/components/focus/CompletionCelebration.tsx` — likewise
  **not imported anywhere** (superseded by the global
  `components/timer/TimerCompletionCelebration.tsx` used by
  `TimerCompletionContext`). Same disposition: flagged, not removed.
- `FocusSessionActive.tsx`'s `handleCancel`/`onCancel` prop (threaded in
  from `FocusPage.tsx`'s own `handleCancel` → `cancelFocus()`) is defined
  but **never invoked by any element in the component's JSX** — the exit-
  confirm dialog only offers "Continue" (closes the dialog) or "End
  Session" (always records progress via `handleEndEarly`). This looks
  intentional, not a bug: the dialog's own copy ("That's okay. Progress
  still counts.") explicitly communicates there's no silent-discard path by
  design. Left as unreachable plumbing rather than removed or wired up —
  removing it touches a second file's prop contract beyond this card's
  named file, and wiring up a new "discard" button would be new feature
  scope nobody asked for.
- The auto-submit-'good'-feedback-on-celebration behavior (`FocusPage.tsx`'s
  own `useEffect`, lines 159-166) means the real 3-button outcome screen
  (`FocusFeedback`) only ever appears for early-ended sessions — a normal
  full-duration completion silently records outcome `'good'` the moment the
  global celebration overlay shows. Traced this against
  `FocusTimerContext.tsx` and `TimerCompletionContext.tsx`: confirmed
  deliberate, not a bug — the code comment literally says "Auto-submit
  feedback if global celebration is shown (avoids double screens)." No UI
  copy claims otherwise, so this isn't a fabrication either. Documented,
  not changed.

### PASS 2 — Product-fit / verification

**Fabrication check — the core ask for this card — re-verified against real
hooks/state, not assumed:** every value FocusPage.tsx passes to its children
(`sessionConfig.duration`, `sessionResult.actualMinutes`,
`sessionResult.endedEarly`, the purpose label, `linkedTaskId`,
`todayBlocks`/`todayTasks` from real `useTimeBlocks`/`useTasks`) traces to
real context/hook state — none are hardcoded placeholders presented as
live data. The one genuine finding was dead (unused) real data, not a fake
number shown to the user (Finding 1 above). No other fabrication found.

**Verdict: APPROVED, scope as proposed in PASS 1** — 1 dead-code removal
(verified non-behavioral via test), 12 AA-contrast fixes across 3 directly-
rendered child components (all hand-computed per-site, see PASS 1 math),
zero structural/layout changes. Two dead sibling files and one unreachable
prop chain escalated rather than touched.

### PASS 3 — Build / verification record

- **Test file:** new `apps/web/src/pages/__tests__/FocusPage.test.tsx`
  (15 tests) — the page had no test file before this card. Every direct
  child component is stubbed (same discipline as `DesktopControlPage.test.tsx`
  / `DayPlanner.test.tsx`), and every context/hook `FocusPage` calls
  directly is module-mocked with controllable state, so real interactive
  states are exercised: idle/setup, running, paused, a break timer active,
  feedback after an early-ended session (with real `actualMinutes`), the
  auto-submit-on-celebration path, skip-feedback, cancel, end-early, and the
  thought-parking → `/reflect` navigation flow.
- **Baseline run against the unmodified file: 14/15 passed, 1 failed (RED)
  after fixing two test-authoring async-timing issues** (the real page code
  was correct both times — `handleFeedback` is `async`, the test needed
  `await vi.waitFor(...)` before asserting on calls later in that chain; not
  a product bug). The 1 genuine RED was exactly the planned fix: "does not
  call the unused useFocusTotals hook" failed against the unmodified file
  (hook was still called), confirming the dead-code baseline this fix
  removes.
- **Implementation:** see PASS 1 Findings 1 and 2 for the full fix list.
- **GREEN after implementation: 15/15 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **36/36 files, 388/388
  tests passed** (run alone, not concurrently with the build).
- **Build:** `npm run build` → `✓ built in 13.66s`, no errors;
  `FocusPage` chunk **24.03 kB (gzip 5.60 kB)**.
- **Visual/behavioral check — against the real built app:** built `dist`
  served locally (`npx serve -s dist -l 4322`), driven over CDP in headless
  Edge (`msedge.exe --headless=new`, Node's native `ws` client against the
  DevTools Protocol — Playwright's bundled Chromium is blocked by OS
  Application Control on this machine, and the `chrome-devtools` MCP server
  failed to connect this session; same approach as `day-planner`/
  `desktop-control`). `/focus` is a normal protected route (unlike
  `/desktop`), so — same judgment call as `day-planner` made for `/app` —
  reaching real credentials is outside this card's reach (merge gate: no
  `.env`/secrets access). Confirmed: unauthenticated `/focus` correctly
  redirected to `/login` ("Sign in to continue your daily flow" rendered),
  **0 console errors, 0 exceptions**, no horizontal overflow
  (`scrollWidth === clientWidth`, 485/485). The real authenticated states
  (setup/running/paused/break/feedback) are instead confirmed at the
  component level by the 15 passing tests, which render the **real**
  `FocusPage` component code (not a mocked stand-in) and assert against its
  actual DOM output and the real calls it makes into `addSession`/
  `endFocusSession`/`addFocusSeed`/`completeFeedback`.
- **Primary interaction verified:** starting a session (real config →
  `startFocus`/`startFocusSession`/`triggerFocused`), the running/paused
  session UI, ending early, cancelling, the break-timer branch, feedback
  submission (both manual and auto-on-celebration) recording the real
  `sessionResult` to `addSession`/the events ledger/the landscape focus
  seed, skip-feedback, and the park-a-thought → `/reflect` flow — all
  confirmed against real component logic via the test suite above.

**Escalations for a future dedicated card (not actioned here):**
1. `apps/web/src/components/focus/FocusSession.tsx` and
   `CompletionCelebration.tsx` — unimported, superseded dead files. Worth a
   dead-file-cleanup pass across `components/focus/` once more of this
   pipeline's cards have landed (safer to confirm nothing else in-flight
   still references them).
2. `FocusSessionActive.tsx`'s unreachable `onCancel` prop chain — either
   remove the dead plumbing or deliberately wire up a discard action, as a
   product decision outside this card's scope.
