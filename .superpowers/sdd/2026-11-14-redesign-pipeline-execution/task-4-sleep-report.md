# Task 4 — Sleep Page — Report

Card: `docs/superpowers/cards/sleep.md` (state: `merged`)
File: `apps/web/src/pages/SleepPage.tsx` (route `/sleep`, protected, 108 lines pre-edit)

## Audit findings

**Route/wiring:** confirmed in `AnimatedRoutes.tsx:11` (lazy import) and `:91`
(`user ? <SleepPage /> : <Navigate to="/login" replace />`). Zero other files
import a symbol from `SleepPage.tsx` (grep-verified); its 5 child components
(`WinddownCard`, `WinddownPlayer`, `SleepCheckInCard`,
`MorningBridgeSettingsSection`, `SleepBackground`) are each used **only** by
this page (grep-verified) — fully local blast radius.

**`defaultSleepSound`/`defaultSleepTimer`/`defaultAutoFade` consumption
check (the specific thing this card was asked to verify, per the `settings`
card's finding):** confirmed dead here too. Repo-wide grep for these three
identifiers returns zero hits outside `SettingsPage.tsx`/
`useUserPreferences.ts`/the settings test file — `SleepPage.tsx` and its
entire rendered tree never reference them. More significant than "unread":
this page has its **own**, fully separate, real sound/timer system
(`WinddownContext.tsx`) — a real `new Audio(...)` element, real
`window.setInterval` countdown, real `localStorage`-backed session
persistence — that never got wired to the dead settings at all. The settings
page's "Default Sound/Timer/Auto-fade" controls and this page's real Wind
Down feature are two completely disconnected systems.

**Second dead-code finding:** `SleepPage.tsx` called `useSleep()` (a
*different* hook — its own real sound/alarm/prefs API used elsewhere) but
only destructured `prefs`/`updatePrefs`, neither used anywhere in the file.
Confirmed safe to remove: `useSleep()` has no side effects, and its only
other consumers (`SleepSoundsSection.tsx`/`SleepEnvironmentSection.tsx`) are
themselves confirmed orphaned (imported nowhere in `apps/web/src`). Removed
the dead call + import.

**Every control mapped to its real effect:** full table in the card handoff.
Summary — real: header greeting, Wind Down start/pause/resume/end (real
Audio + real timer), sleep check-in rating (`useEventsLedgerContext`),
Morning Bridge settings (Supabase-backed / localStorage fallback), guest
lock overlay. Was fake, now real: the Wind Down Player's volume slider (see
Product-fit Finding 1). Dead: the three Settings-page sleep defaults;
`useSleep()`'s unused `prefs`/`updatePrefs`.

## Product-fit findings (PASS 1/PASS 2)

- **Finding 1 — volume slider was non-functional (fixed).** `WinddownPlayer.tsx`
  held its own `useState(70)` for volume, bound to the `Slider`, but that
  value was never applied to the real `Audio` element — the only place
  `audio.volume` was ever set was a one-time hardcoded `0.7` at element
  creation in `WinddownContext.tsx`. Moving the slider changed only the UI
  thumb. This is the exact "does this control actually change real
  behavior?" check the card brief calls for — answer was no. **3-condition
  test passed** (unambiguous bug; additive fix; zero-blast-radius —
  `useWinddownContext()` has exactly 3 consumers, all touched here) → fixed:
  lifted `volume`/`setVolume` into `WinddownContext`, applied it both at
  `Audio` creation and via a dedicated sync effect so the *live* element's
  volume follows the slider without restarting playback.
- **Finding 2 — 10 of 12 `WINDDOWN_SOUNDS` point to missing audio files
  (escalated, not fixed).** `public/audio/` contains only `brown-noise.mp3`;
  `types/winddown.ts` references `rain.mp3`/`ocean.mp3`/`forest.mp3`/
  `mountains.mp3`/`night-crickets.mp3` — none of which exist — across 10 of
  12 sound IDs, including the entire default "calm" pack. In production:
  `new Audio(url)` 404s, the play() rejection is swallowed into
  `console.error` only, and the user gets a fully real-looking timer/UI with
  near-silent playback most of the time. Fixing this means sourcing/producing
  real audio assets — content production, not a code fix — so it fails the
  additive/zero-blast-radius bar and is escalated for a product decision
  (source the files, or trim the sound list to what's actually backed).
- **Finding 3 — `SleepBackground.tsx` has no dark-mode variant (escalated,
  not fixed).** Unlike `AnimatedBackground.tsx` (theme-aware via
  `hsl(var(--primary)/...)`), `SleepBackground.tsx`'s gradient is hardcoded
  light-pastel `hsl(...)` literals with zero `dark:` classes — it renders
  the same "dusk" gradient regardless of theme. Ambiguous whether intentional
  (like `LandscapeBackground`'s deliberately theme-independent weather
  palette) or an oversight — escalated as a design question rather than
  guessed at. Its one confirmed, numerically-verified downstream contrast
  symptom (the guest-lock overlay's `bg-card/90` dropping to ~3.73:1 in dark
  mode because it composites against this never-darkening backdrop) **is**
  fixed below, since that fix (drop the opacity modifier) is unambiguous and
  zero-blast-radius regardless of what happens with the background itself.
- **Contrast audit:** 13 `text-muted-foreground` sites checked across
  `SleepPage.tsx` + its 4 real children; full ratio table in the card
  handoff. 4 `bg-secondary`-variant fails fixed (Winddown duration pills,
  sound-pack pills, sleep-quality buttons, Morning Bridge wake-window
  caption) + 1 new-shape opacity-stacked fail fixed (guest-lock body text on
  `bg-card/90` composited against the theme-unaware background — 4.483 light
  / **3.732 dark**, computed via the same HSL→sRGB→luminance method as every
  prior card). One decorative icon on `bg-secondary` (the guest-lock Lock
  icon) was differentiated from text sites and left alone — it clears the
  3:1 non-text threshold (4.03/4.10) and WCAG exempts purely decorative
  icons from the stricter text requirement.
- **Logic-bug check (3-condition test):** Finding 1 passed all three
  conditions, fixed in place. Findings 2 and 3 fail
  additive/zero-blast-radius (asset production; a product design decision)
  — both escalated.

## TDD Evidence (RED/GREEN)

New test file: `apps/web/src/pages/__tests__/SleepPage.test.tsx`.
`WinddownProvider`/`WinddownCard`/`WinddownPlayer`/`SleepCheckInCard`/
`MorningBridgeSettingsSection` are rendered **real** (not stubbed) so the
sound/timer/volume assertions exercise actual production logic. `window.Audio`
replaced with a recording stub (jsdom has no real media playback) to assert
real constructor args, `.play()`/`.pause()`/`.volume` writes. Added a
`ResizeObserver` stub to `vitest.setup.ts` (Radix `Slider` needs it; jsdom
doesn't provide one — additive, scoped to the test env, affects no other
test).

- **RED:** confirmed by `git stash` on just the 2 fix files
  (`WinddownContext.tsx`, `WinddownPlayer.tsx`) and re-running: **11/12
  passed, 1 failed** — exactly `expected 0.7 to be close to 0.75` on the
  volume-wiring assertion, proving the slider never reached the real audio
  element pre-fix. All 11 other tests (real Audio construction/play, real
  timer countdown, real pause/complete, all 5 contrast assertions) passed
  against the **original** component, confirming the fixtures exercise real
  logic and the baseline is correct.
- **GREEN** (post-implementation, stash popped back): **12/12 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **50/50 files, 593/593
  tests passed** (581 baseline + 12 net new).

## What I implemented

1. `apps/web/src/contexts/WinddownContext.tsx` — added `volume: number` +
   `setVolume` to the context type/provider; applied `volume / 100` at
   `Audio` creation and via a new sync effect so the live element's volume
   tracks the slider without recreating/restarting playback.
2. `apps/web/src/components/sleep/WinddownPlayer.tsx` — removed the dead
   local `useState(70)`; reads/writes `volume`/`setVolume` from
   `WinddownContext` instead.
3. Contrast fixes (bg-secondary-variant formula
   `text-[hsl(230,10%,40%)] dark:text-[hsl(230,10%,60%)]`):
   `WinddownCard.tsx` (duration pills, sound-pack pills),
   `SleepCheckInCard.tsx` (quality buttons),
   `MorningBridgeSettingsSection.tsx` (wake-window caption).
4. `apps/web/src/pages/SleepPage.tsx` — dropped the opacity-stacked `/90` on
   the guest-lock overlay container (`bg-card/90` → `bg-card`); removed the
   dead `useSleep()` call + import.
5. `apps/web/vitest.setup.ts` — added a `ResizeObserver` stub (Radix
   `Slider` dependency missing in jsdom).

## Build + visual check

- `npm run build` → `✓ built in 14.75s`, no errors; `SleepPage` chunk
  **18.92 kB (gzip 5.48 kB)**.
- `npx eslint` on the 6 changed source files + test file → 0 new errors on
  the components (pre-existing `react-hooks/exhaustive-deps` warnings on
  `WinddownContext.tsx`, matching the file's existing selective-deps
  convention, not a new regression in kind); the test file's 4
  `no-explicit-any` findings match the established mock-cast convention used
  in every other merged card's test file.
- Visual: `dist` served locally (`vite preview --port 4181`), driven via
  `claude-in-chrome`. Unauthenticated `/sleep` correctly redirects to
  `/login`, 0 console errors. "Continue as Guest" reached `/app` but bounced
  back to `/login` navigating to `/sleep` directly — same pre-existing
  guest/backend-reachability gap the `settings`/`profile`/`day-planner`
  cards already hit on a static build with no reachable backend, not caused
  by this card. 0 console errors throughout. Real authenticated behavior
  (sound/timer/volume, contrast, guest overlay) confirmed at the component
  level by the 12 passing tests against the real component tree.

## Files changed

- `apps/web/src/contexts/WinddownContext.tsx`
- `apps/web/src/components/sleep/WinddownPlayer.tsx`
- `apps/web/src/components/sleep/WinddownCard.tsx`
- `apps/web/src/components/sleep/SleepCheckInCard.tsx`
- `apps/web/src/components/sleep/MorningBridgeSettingsSection.tsx`
- `apps/web/src/pages/SleepPage.tsx`
- `apps/web/vitest.setup.ts`
- `apps/web/src/pages/__tests__/SleepPage.test.tsx` (new)
- `docs/superpowers/cards/sleep.md`

## Self-review

- Dead-settings consumption check: done explicitly, confirmed and extended
  past the `settings` card's finding (this page has its own real, disconnected
  sound/timer system).
- Real audio/timer behavior: verified via real `Audio`/`setInterval` logic
  exercised by tests against the real component tree, not assumed — and a
  real, previously-undetected bug (the volume slider) was found and fixed
  with a confirmed RED/GREEN pair, plus a second real defect (missing audio
  assets) found and escalated rather than silently left unverified.
- Muted-text sweep: covered flat-bg, bg-secondary, and opacity-stacked
  variants across all 5 rendered files; a decorative-icon-on-bg-secondary
  site was explicitly differentiated (3:1 non-text threshold) rather than
  blanket-fixed, and the opacity-stacked case here was numerically computed
  from scratch (not assumed from the `settings` card's `/60` precedent)
  since the root cause (theme-unaware backdrop) differs.
- Tests: positive/behavioral assertions on real sound creation+playback,
  real per-second countdown, real volume-to-audio wiring, real pause/complete,
  plus the 5 contrast assertions — 12/12, all against the real component
  tree.
- Card file: `state: merged`, `owner` set, full PASS 1/2/3 handoff written,
  matching the `settings` card's structure.

## Concerns

- Two escalations left genuinely unresolved by design (outside this card's
  scope): the missing audio assets for most wind-down sounds (including the
  default pack), and `SleepBackground.tsx`'s theme-independence being
  ambiguous rather than confirmed-intentional. Both are documented in the
  card handoff for a future card/product decision.
- Visual confirmation of the authenticated page state in a real browser was
  not possible (no backend reachable from this static build, consistent with
  every prior card that hit the same gate) — compensated by the 12
  component-level tests exercising the real component tree directly.
