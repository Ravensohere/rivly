# Task 4 — Card: `alarm-ringing`

Page: `apps/web/src/pages/AlarmRingingPage.tsx`, route `/alarm/ringing`
(protected). First standalone-page card after the 7 landing-page section
cards. Full process (design → product-fit → TDD → implement → verify →
merge) run solo in-agent, same discipline as `landing-cta` and its
predecessors.

## Design direction + reference sites

**Verdict: keep the page's structure exactly as built** — pulsing rings,
shaking bell, huge live clock, label/time/sound rows, three outline
snooze buttons (5/10/15m) under one large primary Dismiss button, test-
mode badge. This is a register shift from the landing page's "calm"
brief: an alarm-ringing screen needs to be legible and actionable under
time pressure, not primarily calming.

Reference sites/products, each tied to a specific decision:
1. **Apple's iOS Clock app** full-screen alarm — justifies one oversized
   clock + one dominant primary action (Dismiss) over secondary snooze,
   matching this page's weighting exactly.
2. **Google's Material / Android Clock app** alarm pattern — justifies
   the large, thumb-reachable touch targets (`h-14`/`h-16`) already used.
3. **Sleep Cycle's** wake-up screen — justifies the soft gradient-glow
   treatment (not a harsh red alert) as right for Rivly's brand even on
   an urgent-interrupt screen.

Full reasoning recorded in `docs/superpowers/cards/alarm-ringing.md`
(PASS 1).

## Product-fit findings

- **Grep result:** `AlarmRingingPage` has no named exports and only one
  consumer (`AnimatedRoutes.tsx`'s lazy import + its one route). No
  cross-file impact.
- **Route guard:** `/alarm/ringing` is protected (`user ? <Page/> :
  <Navigate to="/login"/>`), identical pattern to every other protected
  route — including that it checks `user` specifically, so guest sessions
  are also redirected (consistent app-wide, not specific to this page).
- **Behavior verification (handler-level, not JSX-level):**
  - Dismiss (`handleDismiss`): stops sound, stops vibration, disables a
    one-time non-test alarm, navigates home — all real, all verified via
    unit tests that assert the mock calls directly.
  - Snooze (`handleSnooze`): stops sound, flips to the snoozed UI, and a
    real `setTimeout` resumes playback after the chosen duration — real,
    verified. The code's own comment already discloses the tab-must-
    stay-open limitation and branches to native handling when available;
    no UI text overclaims reliability here, so nothing to escalate on
    this specific point.
  - **Real gap found (escalated, not fixed):** the alarm's configured
    `snoozeMinutes` preference (set in `AlarmEditorSheet.tsx`, default
    10) is never read by this page, which always shows a fixed
    `[5, 10, 15]` choice instead. Confirmed via grep
    (`grep -rn snoozeMinutes apps/web/src`). Documented in the card
    handoff + an in-source `FIXME` above the hardcoded array. Not a false
    UI claim — a dead-preference wiring gap — so flagged for a product
    decision rather than silently fixed.
- **Direct navigation without an alarm having fired:** confirmed via
  source + tests. Unauthenticated → redirects to `/login` (live-verified,
  0 console errors). Authenticated but no `id`/`test` param → `alarm`
  state stays `null` forever and the component renders a dedicated
  "Alarm not found" + "Go Home" empty state (verified via unit test,
  including that "Go Home" calls `navigate('/')`). Neither path is
  broken.

## TDD Evidence

**RED** (`apps/web/src/pages/__tests__/AlarmRingingPage.test.tsx` against
unmodified code): 15 tests, **12 passed / 3 failed**. The 3 failures were
exactly the predicted redesign assertions — the alarm label, "Set for"
row, and sound row all carried `text-muted-foreground` instead of the
expected `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`.

**GREEN** (after implementation): **15/15 passed.**

## What I implemented

Real contrast failure, computed independently (sRGB → linear →
relative-luminance → WCAG ratio), not assumed: `--muted-foreground`
(light mode, `hsl(230,10%,48%)`, used via Tailwind's `text-muted-
foreground` class) measures **3.90–4.38:1** against this page's gradient
background at the alarm label, "Set for" row, sound row, and the "Alarm
not found" fallback — under the 4.5:1 AA floor for normal text at all
four sites (none qualify as large text). This is the exact same shared
token `landing-cta` already found failing (`T.muted`/`T.bg` = 4.38:1).
Dark mode's `--muted-foreground` (`hsl(230,10%,55%)`) was independently
computed at 5.14:1 against the dark background — already passing, left
untouched.

**Fix:** replaced `text-muted-foreground` with `text-[hsl(230,10%,42%)]
dark:text-[hsl(230,10%,55%)]` at all four sites (reusing `landing-cta`'s
exact already-vetted darkened shade, not inventing a new one) — now
**4.80–5.42:1**, passing with margin. Dark mode's class carries the
original, already-passing value forward unchanged via the `dark:`
variant.

Added one in-source `FIXME` comment above the hardcoded `[5, 10, 15]`
snooze-duration array, documenting the escalated `alarm.snoozeMinutes`
finding.

No other line changed — handler logic, route export, and the rings/
bell/clock/button structure are untouched.

## Build + visual check

- `cd apps/web && npx vitest run src/pages/__tests__/AlarmRingingPage.test.tsx`
  → RED 12/15, then GREEN 15/15 after the fix.
- `cd apps/web && npx vitest run` (full suite, alone, not concurrent with
  build) → **30/30 files, 306/306 tests passed.**
- `cd apps/web && npm run build` → `✓ built in 11.69s`, no errors;
  `AlarmRingingPage` chunk 6.59 kB (gzip 2.44 kB).
- Visual check: served `dist` via `npx serve -s dist`, drove headless
  Edge (`msedge.exe --headless=new`) over CDP via Node's native
  `WebSocket` (Playwright's bundled Chromium is OS-blocked on this
  machine, per every prior card). Checked `/alarm/ringing?test=true` and
  `/alarm/ringing` (no params), at 1440×900 and 390×844.
  - **Direct-navigation-without-an-alarm case:** unauthenticated direct
    nav to both URLs redirected cleanly to `/login`, 0 console errors —
    matches the smoke-pass procedure's documented expectation for this
    route exactly, confirming the behavior is a real redirect, not a
    crash or blank screen.
  - One first-load screenshot caught the shared `LoadingScreen` mid-way
    through auth-context resolution (orb + "Rivly" + "Plan · Focus ·
    Rest") — expected (`AnimatedRoutes` renders `null`/Suspense fallback
    while `loading`), confirmed by viewing the screenshot, not a defect.
  - The authenticated-but-no-param "Alarm not found" empty state was
    **not** reached live (this route's guard requires a real `user`, not
    just `isGuest`, so reaching it live needs a genuine signup against
    the backend — disproportionate for this diff's size). It is instead
    verified via the unit test suite, which renders the real component
    tree with only the boundary hooks mocked.
  - 0 console errors on every live navigation attempted.

## Files changed

- `apps/web/src/pages/AlarmRingingPage.tsx` — 4 className fixes (+
  comments recording the measured ratios) + 1 FIXME comment.
- `apps/web/src/pages/__tests__/AlarmRingingPage.test.tsx` — new, 15
  tests.
- `docs/superpowers/cards/alarm-ringing.md` — state → `merged`, full
  PASS 1/2/3 handoff.

## Self-review

- Fabrication/behavior-mismatch check: performed at the handler level
  (`handleDismiss`/`handleSnooze` read directly), not just JSX labels.
  No false UI claim found — the one real finding (`snoozeMinutes` unused)
  is a wiring gap, not a false claim, and is disclosed via card + FIXME,
  not silently fixed.
- Contrast math: independently computed (sRGB → linear → luminance →
  WCAG ratio) for both the failing light-mode case and the already-
  passing dark-mode case, at the page's actual gradient background (not
  a flat color), accounting for position-dependent gradient tint.
- Positive test assertions: all 15 tests assert presence (rendered text,
  called-with mock args, present classes) rather than absence, except
  one `not.toBeInTheDocument()` assertion for "buttons hidden once
  snoozed," which is the natural way to assert a state transition
  removed an element — the primary assertions throughout are positive.
- Card file: clean, state `merged`, handoff filled in, no leftover
  placeholder text.
- Direct-navigation-without-alarm case: checked both sub-cases
  (unauthenticated → redirect; authenticated-no-param → empty state) and
  documented which was verified live vs. via unit test, with reasoning
  for not forcing a live authenticated run.

## Concerns

- The authenticated "Alarm not found" empty state's live browser render
  was not captured (only unit-tested) — reaching it live would require a
  real backend signup, judged disproportionate for this diff. If a
  reviewer wants that confirmed in a real browser, it would need either a
  test Supabase account or a temporary auth-bypass for QA, neither of
  which this card should do unilaterally.
- The `alarm.snoozeMinutes` gap is a genuine, pre-existing product-logic
  inconsistency (not introduced by this card) that needs a human
  decision; flagged via FIXME + card handoff, intentionally not fixed.

## Fix report (post-review, PASS 4)

**Reviewer finding:** a 5th occurrence of the same contrast defect at
`AlarmRingingPage.tsx:263` — the "Snoozed - will ring again soon" message
inside the `bg-muted` pill, `text-muted-foreground` on `bg-muted` =
4.03:1, under the 4.5:1 AA floor. Missed because the `snoozed` state was
never actually triggered in the CDP visual check (never reached an
authenticated session) or asserted by color in the test suite (the
original snooze test only checked text presence).

**Independently re-verified:** confirmed `rgb(110,114,135)` on
`rgb(239,236,231)` (`--muted` light, converted from `hsl(38,20%,92%)`) =
**4.034:1** — matches the reviewer's number exactly.

**Fix applied:** same pattern as the other 4 sites —
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`. Verified against
this specific background: `rgb(96,100,118)` on `rgb(239,236,231)` =
**4.976:1** — passes.

**New finding surfaced while fixing (disclosed, not silently patched):**
unlike the other 4 sites, this site's dark-mode pairing is against
`--muted` dark (`rgb(31,34,45)`), not `--background` dark
(`rgb(16,17,25)`) — a lighter dark-mode token. The existing (unchanged)
dark `--muted-foreground` value on it computes to **4.33:1**, also under
AA, and was already failing before this card touched anything; the
`dark:` variant carries it forward unchanged per the reviewer's "same
pattern" instruction rather than inventing a new, unreviewed dark-mode
value. Flagged in the card handoff and via an in-source comment at the
site as a pre-existing, shared-token-level near-miss needing a separate
decision — not fixed by this diff.

**Test added:** a new test that actually clicks a snooze button to enter
the `snoozed` state, then asserts the rendered message's `className`
contains the fixed color classes (addressing the reviewer's root-cause
note directly — color, not just text presence). Also added one
previously-missing color-assertion test for the "alarm not found"
fallback message (caught during this same pass; it was fixed in the
original diff but never had its own color test).

**Re-run:**
- Focused file: **17/17 passed** (was 15/15).
- Full suite: `cd apps/web && npx vitest run` → **30/30 files, 308/308
  tests passed** (was 306/306).
- Build: `npm run build` → `✓ built in 11.47s`, no errors;
  `AlarmRingingPage` chunk **6.62 kB** (was 6.59 kB).

**Files changed (this pass):** `apps/web/src/pages/AlarmRingingPage.tsx`
(1 more className fix + comment), `apps/web/src/pages/__tests__/AlarmRingingPage.test.tsx`
(2 more tests), `docs/superpowers/cards/alarm-ringing.md` (PASS 4
section + handoff update), this report.
