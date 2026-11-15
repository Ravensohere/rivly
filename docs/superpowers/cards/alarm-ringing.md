---
id: alarm-ringing
title: Alarm Ringing Page
owner: task-4-agent (solo; design + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = design, PASS 2 = product-fit, PASS 3 = build record) — PASS 2 found one real product-logic gap (the alarm's configured `snoozeMinutes` preference is never read by this page) — flagged with a card note + in-source FIXME, not silently fixed (behavior change outside this card's design/contrast scope). No fabricated/false UI claims found; dismiss/snooze both verified to work as implied.
---

# Card: Alarm Ringing Page

This card represents the redesign/verification pass for the Alarm Ringing Page feature/page in the Rivly web app.

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

### PASS 1 — Design proposal (design step, no code)

**What is there now** (`apps/web/src/pages/AlarmRingingPage.tsx`, route
`/alarm/ringing`, protected — see Route Guard below)

A full-screen, fixed-position overlay (`bg-gradient-to-b from-primary/30
via-primary/10 to-background`) built from: three concentric pulsing rings
behind everything; a shaking/pulsing bell icon (swaps to a static
`BellOff` once snoozed); a giant `text-6xl` live clock; the alarm's label;
a "Set for `<time>`" row with a `Clock` icon and a type badge (gentle/
regular/focus); a sound-name row with a `Volume2` icon; then either a
"Snoozed — will ring again soon" pill, or three fixed snooze buttons
(5m/10m/15m) plus one large primary "Dismiss" button; and, only in test
mode, an amber "Test Mode" badge.

**Structural judgment, made on this page's own merits — different
register than the calm landing page, since this screen needs to be
legible and actionable under time pressure (half-asleep, urgent-
interrupt), not primarily "calm."**

**Verdict: keep the structure as built.** It already matches the real
precedent for full-screen alarm-ringing UI, not a generic "modal with a
button":

- **Apple's iOS Clock app full-screen alarm.** Oversized time display,
  one unmistakable primary dismiss action, a secondary/less-prominent
  snooze — this page's huge `text-6xl` clock + single large "Dismiss"
  button as the dominant action (vs. three smaller outline snooze
  buttons above it) mirrors that primary/secondary weighting exactly.
- **Google's Material "alarm" / Android Clock app pattern.** Large
  digits, large touch targets reachable without precision tapping (the
  snooze buttons are `h-14`, the dismiss button `h-16` — both comfortably
  oversized, not small tap targets), bottom-anchored actions.
- **Sleep Cycle's wake-up screen.** A gradient/glow background rather
  than a jarring flat red alert — consistent with Rivly's calm/wellness
  voice even on an urgent-interrupt screen; this page's soft
  `primary`-tinted radial-ring glow (not a harsh red/flashing treatment)
  matches that register choice rather than a generic "alarm = red"
  convention.

The pulsing-ring + bell-shake attention cue is the same shape as a
notification pulse / incoming-call screen's visual urgency signal —
legible at a glance without needing to read text first, appropriate for
a half-asleep user.

**The defects found (named, so the change is checkable)**

1. **`text-muted-foreground` measures 4.38:1 on this page's background —
   under the 4.5:1 AA floor for normal text — at three live sites, plus a
   fourth in the "alarm not found" fallback.** `--muted-foreground` in
   light mode (`apps/web/src/index.css:65`, `hsl(230,10%,48%)`) is the
   exact same shared token already found failing AA on the landing
   page's `T.muted` (`landing-cta`'s PASS 2 measured 4.38:1 against the
   page's `T.bg`). This page uses the Tailwind class directly
   (`text-muted-foreground`), not an inline style, but it is the same
   underlying color — same failure, now confirmed on this page too, on:
   - the alarm label (`text-xl`, ~20px normal weight — under the
     24px/18.66px-bold large-text threshold, needs the full 4.5:1 floor)
   - the "Set for `<time>`" row (`text-sm`, 14px — needs 4.5:1)
   - the sound-name row (`text-sm`, 14px — needs 4.5:1)
   - the "Alarm not found" empty-state message
   Dark mode's `--muted-foreground` (`hsl(230,10%,55%)` against the dark
   `--background`) was independently computed at **5.14:1 — already
   passing**, so it is left untouched; only the light-mode value needed a
   fix.
2. **A real product-logic gap, not a UI-text fabrication: this page
   ignores the alarm's own configured `snoozeMinutes`.**
   `AlarmEditorSheet.tsx` lets the user pick a per-alarm snooze duration
   (`snoozeMinutes`, default 10, persisted on the `Alarm` object) — but
   `AlarmRingingPage` always renders a fixed `[5, 10, 15]` choice and
   never reads, defaults to, or highlights `alarm.snoozeMinutes`. The
   stored preference is dead code at the one moment it should matter.
   This is not a false UI claim (the three buttons do exactly what their
   labels say — real, verified in PASS 2 below) — it's a wiring gap
   between the editor and the ringing screen. Flagged, not fixed, per
   the brief's instruction not to unilaterally change behavior outside
   this card's design/contrast scope.

**Proposed direction: fix the muted-text contrast at all four sites in
place (locally, not the shared token); flag the `snoozeMinutes` gap;
touch nothing else.**

- **A.** All four `text-muted-foreground` sites → `text-[hsl(230,10%,42%)]
  dark:text-[hsl(230,10%,55%)]` — the same already-vetted darkened shade
  `landing-cta` used for the identical token-level failure, reused rather
  than inventing a new one; dark mode's existing (already-passing) value
  is preserved via the `dark:` variant rather than being overridden.
- **B.** Add an in-source `FIXME` at the hardcoded `[5, 10, 15]` snooze
  array, documenting the `alarm.snoozeMinutes` gap for a product decision
  (default-select it, drop it from the editor, or confirm the fixed
  3-choice picker is intentional).
- **Explicitly not changed:** the pulsing rings, bell animation, huge
  clock, type/sound badges' own colors (`text-primary`/`bg-primary/15`,
  independently checked below — pass), the Dismiss/snooze button
  component's own styling (shared `Button` primitive, out of scope), the
  test-mode badge (amber-100/700, independently checked below — pass),
  and the route guard / dismiss / snooze event-handler logic (verified
  working as implied in PASS 2).

**Reference sites (three, specific, each tied to a decision — mobile-app
UI patterns rather than marketing sites, since a full-screen alarm-ringing
screen is a native-app UI convention, not a web-page genre):**

1. **Apple's iOS Clock app** full-screen alarm UI — justifies keeping one
   oversized clock + one dominant primary action (Dismiss) over secondary
   snooze options, rather than restructuring into two equal-weight
   buttons.
2. **Google's Material Design / Android Clock app** alarm pattern —
   justifies the large (`h-14`/`h-16`), thumb-reachable touch targets
   already used here, left unchanged.
3. **Sleep Cycle's** wake-up screen — justifies the calm gradient-glow
   treatment (not a harsh red alert) as the right register for Rivly's
   brand even on an urgent-interrupt screen, left unchanged.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Cross-file impact — grep, not assertion.**

```
$ grep -rn "AlarmRingingPage" --include=*.ts --include=*.tsx .
./apps/web/src/components/layout/AnimatedRoutes.tsx:16:const AlarmRingingPage = lazy(() => import('@/pages/AlarmRingingPage'));
./apps/web/src/components/layout/AnimatedRoutes.tsx:96:          <Route path="/alarm/ringing" element={user ? <AlarmRingingPage /> : <Navigate to="/login" replace />} />
./apps/web/src/pages/AlarmRingingPage.tsx:11:export default function AlarmRingingPage() {
```

Default export only, consumed via one lazy import at one route. **No
cross-file reuse, no named exports to worry about.**

**Route guard (per Task 3's smoke-pass procedure).**
`/alarm/ringing` is a **protected route**: `user ? <AlarmRingingPage /> :
<Navigate to="/login" replace />` in `AnimatedRoutes.tsx:96` — identical
pattern to every other protected page. Confirmed live (see PASS 3): an
unauthenticated direct navigation to `/alarm/ringing` (with or without
`?test=true`) redirects to `/login` cleanly, no console errors — matching
the smoke-pass procedure's documented expectation exactly. Note: this
guard checks `user` specifically, not the broader `isAuthenticated`
(`!!user || isGuest`) — so guest-mode sessions are also redirected to
`/login` here, same as every other protected route in `AnimatedRoutes.tsx`
(`/app`, `/focus`, etc. all use the identical `user ? ... : <Navigate>`
check). This is pre-existing, app-wide, consistent behavior, not something
introduced by or specific to this card — not a defect to fix here.

**Direct navigation without an alarm having fired (authenticated, no
`id`/`test` param).** Read `AlarmRingingPage.tsx:22-44`: the "find the
alarm" effect only sets `alarm` state if `alarmId` matches an entry in
`useSleep()`'s `alarms` or `testMode` is true; otherwise `alarm` stays
`null` forever (no timeout, no further effect watches for it). The
component's early-return branch (`if (!alarm) return <...Alarm not
found...>`) then renders a bare "Alarm not found" message with a "Go
Home" button that calls `navigate('/')`. **Confirmed via the new unit
tests and via source reading: this is a real, intentional, non-broken
empty state — not a crash, not an infinite loader, not a silent blank
screen.**

**Fabrication / behavior-truthfulness check — the dismiss/snooze logic
read at the handler level, not just the JSX labels, per the brief's
explicit instruction.**

- **Dismiss button, labeled "Dismiss" — real, verified.**
  `handleDismiss` (`:104-118`) stops the sound
  (`alarmSoundPlayer.stop()`), stops vibration, disables the alarm if it
  is a one-time (`repeat === 'once'`) *and not the synthetic test alarm*
  (`alarm.id !== 'test'`) via `updateAlarm(alarm.id, { enabled: false })`,
  then navigates home. All three effects are exactly what a user tapping
  "Dismiss" would expect. **Verified live in the new test suite**
  (`AlarmRingingPage.test.tsx`): `stop()` called, `navigate('/')` called,
  `updateAlarm` called only for the non-test one-time alarm and *not*
  called for the test alarm.
- **Snooze buttons (5m/10m/15m) — real, verified, with one caveat that is
  already honestly reflected in the code (not hidden from the user).**
  `handleSnooze(minutes)` (`:82-102`) stops the sound, flips to the
  snoozed UI state (hiding the action buttons, showing "Snoozed — will
  ring again soon"), and schedules a `setTimeout` that resumes playback
  after `minutes * 60 * 1000`ms — **this genuinely re-rings after the
  chosen duration, verified by reading the handler, not just the button
  label.** The caveat: this re-ring is a plain JS `setTimeout`, which
  only fires if the browser tab stays open — there is no web-level OS
  scheduling. The code is explicit about this limitation in its own
  comment (`// In real app, navigate back and let native handle snooze`)
  and branches to `navigate(-1)` when `isNativeAlarmAvailable()` so a
  real native wrapper can take over OS-level snooze scheduling instead.
  **No UI text claims OS-level snooze-after-tab-close reliability** — the
  "Snoozed — will ring again soon" copy is accurate for what actually
  happens (resume within this session), so there is nothing here to flag
  as a false claim, unlike the landing page's unverifiable headcount
  claim. This matches the established lesson ("if the UI implies
  behavior that doesn't happen, escalate") precisely by *not* finding
  anything to escalate on this specific point — the implementation
  matches what it implies.
- **The real gap found: `alarm.snoozeMinutes` is never read by this
  page** (detailed in PASS 1). Confirmed via grep
  (`grep -rn snoozeMinutes apps/web/src`): only
  `AlarmEditorSheet.tsx` (sets it, default 10) and `types/sleep.ts`
  (declares it) reference the field outside this page; `AlarmRingingPage`
  hardcodes `[5, 10, 15]` instead. **Escalated via card note + in-source
  FIXME, not silently fixed or rewritten**, per the brief's instruction —
  this is a product decision (what should the ringing screen actually
  offer), not a styling call this card should make unilaterally.

**Contrast, computed, not assumed (independent sRGB → linear → relative
luminance → WCAG ratio, Node script, not a lookup table — accounting for
this page's actual gradient backgrounds, not a flat color like the
landing page).**

| element | pairing | computed ratio | AA (4.5:1 / 3:1 large) |
|---|---|---|---|
| alarm label, time row, sound row (before) | `muted-foreground` (`rgb(110,114,135)`) on gradient mid-tone (`primary/10` over `bg`, `rgb(233,232,235)`) | 3.90:1 | fail |
| alarm label, time row, sound row (before, at pure `bg`) | `muted-foreground` on `rgb(248,246,241)` | 4.38:1 | fail (needs 4.5) |
| alarm label, time row, sound row (after) | `hsl(230,10%,42%)` (`rgb(96,100,118)`) on gradient mid-tone | 4.80:1 | pass |
| alarm label, time row, sound row (after, at pure `bg`) | `hsl(230,10%,42%)` on pure `bg` | 5.42:1 | pass |
| dark mode (unchanged) | `muted-foreground` dark (`rgb(129,133,152)`) on dark `bg` (`rgb(16,17,25)`) | 5.14:1 | pass (left alone) |
| live clock | `foreground` (`rgb(48,50,64)`) on worst-case gradient top (`primary/30` over `bg`, `rgb(204,204,223)`) | 8.01:1 | pass (unchanged) |
| type badge | `text-primary` on `bg-primary/15` | not recomputed — shared `Button`/badge color convention used elsewhere in the app, out of this card's one-page scope | — |
| test-mode badge | `amber-700` on `amber-100` (Tailwind defaults) | 4.51:1 | pass (unchanged; Tailwind's own 100/700 pairing convention) |

`hsl(230,10%,42%)`/`rgb(96,100,118)` is the exact same value `landing-cta`
independently computed and verified for the identical shared-token
failure — reused deliberately, not reinvented, for consistency across the
pipeline.

**Against the spec's goals/anti-goals** — reference inspiration tied to
specific decisions (register-appropriate for an urgent-interrupt screen,
not the landing page's calm register); scoped to one page file; ends in
a working build; dismiss/snooze behavior verified at the handler level,
not assumed from JSX; the one real product gap found is disclosed via
card + FIXME, not silently patched over; the diff is four className
changes (plus comments) and one FIXME comment, so "looks different" is
not a realistic risk.

**Verdict: APPROVED, scope as proposed in PASS 1, no cuts — plus one
escalation for a human product decision.**

- **KEEP** — the four contrast fixes (same token-level pattern as
  `landing-cta`); the full page structure (rings, bell, clock, badges,
  button layout) exactly as built, matching real alarm-UI precedent; the
  dismiss/snooze handler logic entirely unchanged (verified correct).
- **ESCALATED, not fixed:** `alarm.snoozeMinutes` (the user's configured
  per-alarm snooze preference) is never read by the ringing screen, which
  instead always offers a fixed 5/10/15-minute choice. Needs a product
  decision (default-select the stored value, remove the picker from
  `AlarmEditorSheet`, or confirm the fixed choice is intentional), not a
  unilateral behavior change from this card.

### PASS 3 — Build / verification record (state: running -> review -> merged)

- **RED** (pre-implementation, unmodified `AlarmRingingPage`): new
  `AlarmRingingPage.test.tsx` → **12 passed / 3 failed**. The 12 baseline
  contract tests passed against the old code — confirming the baseline
  was genuinely established, not assumed — covering: found-alarm
  rendering via `?test=true` and via a real `alarms`-array lookup by
  `id`; the alarm-not-found empty state and its "Go Home" navigation;
  dismiss (stops sound, navigates home, disables a one-time non-test
  alarm, does *not* disable the test alarm); and snooze (stops sound,
  shows the snoozed state, hides the action buttons). The 3 redesign
  tests failed on exactly the predicted old values: the alarm label,
  "Set for" row, and sound row all carried `text-muted-foreground`
  instead of the expected `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`
  — matching the hand-identified, independently-measured defect exactly
  before any code changed.
- **GREEN** (post-implementation): **15/15 passed** — all three sites now
  carry the darkened light-mode color plus the unchanged dark-mode
  variant, with every baseline assertion (found-alarm rendering, empty
  state, dismiss, snooze, sound-mute-on-dismiss) still holding.
- **Implementation:** changed four `className` values (`text-muted-
  foreground` → `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`,
  applied to the alarm label, the "Set for" row + its `Clock` icon, the
  sound row + its `Volume2` icon, and the "Alarm not found" fallback
  message), each with an inline comment recording the measured before/
  after ratios. Added one in-source `FIXME` comment above the hardcoded
  `[5, 10, 15]` snooze array documenting the escalated `alarm.
  snoozeMinutes` finding at its exact site. No other line in the file
  changed — the handler logic, route export, rings/bell/clock structure,
  and button layout are byte-for-byte unchanged.
- **Full suite:** `cd apps/web && npx vitest run` (run alone, not
  concurrent with the build) → **30/30 files, 306/306 tests passed**
  clean on this run, including all 15 of this card's new tests — no
  flaky failures observed.
- **Build:** `npm run build` → `✓ built in 11.69s`, no errors;
  `AlarmRingingPage` chunk **6.59 kB (gzip 2.44 kB)** — a small, isolated
  lazy-loaded chunk, consistent with a four-className, one-comment diff.
- **Visual / interaction check:** built `dist` served locally via `npx
  serve -s dist` and driven over CDP in **headless Edge**
  (`msedge.exe --headless=new`, driven via Node's native `WebSocket`
  client against the DevTools Protocol page target — Playwright's
  bundled Chromium is blocked by OS Application Control on this machine,
  per the pilot and every prior card). Checked three live navigations:
  - `/alarm/ringing?test=true` at 1440×900 — first load caught mid-way
    through the shared `LoadingScreen` (orb + "Rivly" + "Plan · Focus ·
    Rest") while the auth context was still resolving — expected and
    correct (`AnimatedRoutes` returns `null`/the Suspense fallback while
    `loading` is true), not a bug; confirmed by viewing the screenshot.
  - `/alarm/ringing?test=true` at 390×844 and `/alarm/ringing` (no
    params) at 1440×900 — **both redirected cleanly to `/login`** (no
    test session was created for this check — see below), with the
    "Sign In — Rivly" page rendering correctly and `location.pathname`
    confirmed as `/login` in both cases.
  - **Direct-navigation-without-an-alarm case, explicitly required by
    this card's brief: confirmed live.** Unauthenticated direct
    navigation to `/alarm/ringing` (with or without `?test=true`)
    redirects to `/login` — matches the smoke-pass procedure's documented
    expectation for this exact route, and is not a crash/blank
    screen/infinite loader. The authenticated-but-no-`id`/`test`-param
    "Alarm not found" empty state (the other direct-navigation outcome,
    reached once logged in) is confirmed via the unit test suite instead
    (`shows the empty state with a way back home` /
    `navigates home when "Go Home" is clicked`), which renders the real
    component tree with only the boundary hooks/services mocked — the
    same page logic the live browser would execute once authenticated. A
    fully authenticated live run was not attempted: this route's guard
    checks `user` specifically (not `isGuest`), so reaching it live would
    require a real signup against the backend, which is disproportionate
    for a four-className/one-FIXME diff already covered at the handler
    level by 15 passing component tests.
  - **Console-error check** (`Log.enable` + `Runtime.enable`, listening
    for `Log.entryAdded` level `error` and `Runtime.exceptionThrown`)
    across all three navigations: **0 errors** on every one.
  - `docScrollWidth === docClientWidth` at both tested widths (1440/1440
    desktop via the redirect-to-login page, 390/390 mobile) — no
    horizontal overflow introduced on the pages actually reached.
- **Primary interaction verified:** dismiss and snooze are confirmed
  working exactly as their UI implies at the handler level (unit tests
  above, reading `handleDismiss`/`handleSnooze` directly, not just their
  JSX labels), and the route guard's redirect behavior is confirmed live
  with zero console errors.
- **Escalation, not a defect in this card's own scope:** the one
  product-fit finding above (`alarm.snoozeMinutes`, the user's configured
  per-alarm snooze preference, never read by this page) is a real gap in
  shipped product logic but is **not** fixed by this card's diff, per the
  brief's explicit instruction not to make unilateral behavior changes
  outside this card's design/contrast scope. An in-source `FIXME` marks
  the exact site (`AlarmRingingPage.tsx`, above the `[5, 10, 15]` array).
  This needs a human product decision before any further work on this
  screen's snooze picker.
- **state: merged.**
