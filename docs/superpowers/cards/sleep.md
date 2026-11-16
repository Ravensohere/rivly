---
id: sleep
title: Sleep Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/SleepPage.tsx (route /sleep, protected, 108 lines pre-edit). Confirms + extends the settings card's finding: defaultSleepSound/defaultSleepTimer/defaultAutoFade (written by SettingsPage) are read nowhere in this page's component tree — this page's own "Wind Down" sound/timer feature (WinddownContext) is a completely separate, real system with zero wiring to those dead settings. Real bug found and fixed: the Winddown Player's volume slider controlled only local UI state, never the actual Audio element's volume — wired it through WinddownContext so it now controls real playback volume. Also fixed: 5 AA-contrast sites (4 bg-secondary variant, 1 opacity-stacked variant) and removed a dead useSleep() destructure. Escalated, not fixed: 10 of 12 WINDDOWN_SOUNDS entries reference /audio/*.mp3 files that do not exist in public/audio (only brown-noise.mp3 exists) — the default "calm" pack's sounds will 404 and fail silently; and SleepBackground.tsx has no dark-mode styling (ambiguous whether intentional, like LandscapeBackground's self-contained palette, or an oversight).
---

# Card: Sleep Page

This card represents the redesign/verification pass for the Sleep Page feature/page in the Rivly web app.

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

Route confirmed in `AnimatedRoutes.tsx:11` (lazy import) and `:91`
(`<Route path="/sleep" element={user ? <SleepPage /> : <Navigate to="/login" replace />} />`)
— protected, matches the card brief.

**Cross-file impact.** `grep -rn SleepPage apps/web/src` → `AnimatedRoutes.tsx`
(the route) and this page's own new test file. Zero other files import a
symbol from `SleepPage.tsx` — fully local blast radius for any fix made
here. The child components it renders (`WinddownCard`, `WinddownPlayer`,
`SleepCheckInCard`, `MorningBridgeSettingsSection`, `SleepBackground`) are
each confirmed used **only** by `SleepPage.tsx` (grep-verified) — no other
page shares them, so fixes inside them are also zero-blast-radius for the
rest of the app. `WinddownProvider` wraps the whole app in `App.tsx`, but
`useWinddownContext()` itself is consumed only by `WinddownCard.tsx`,
`WinddownPlayer.tsx`, and `SleepPage.tsx` — confirmed no other page reads
this context, so widening its exposed interface (adding `volume`/`setVolume`)
is also zero-blast-radius.

**The dead-settings finding, confirmed and extended.** Per the `settings`
card's Handoff: `defaultSleepSound`/`defaultSleepTimer`/`defaultAutoFade`
are written by `SettingsPage.tsx` but grep-confirmed read **only** in
`SettingsPage.tsx`/`useUserPreferences.ts` themselves. This card confirms
that directly: `SleepPage.tsx` and its entire rendered component tree never
reference these three identifiers (repo-wide grep, zero hits outside
`SettingsPage.tsx`/`useUserPreferences.ts`/the settings test file). More
importantly, this page has its **own**, entirely separate, real sound/timer
system (`WinddownContext.tsx` + `WinddownCard.tsx` + `WinddownPlayer.tsx`):
a real `new Audio(...)` element (not a stub), `audio.loop = true`, a real
`window.setInterval` countdown that decrements every second and
auto-completes the session at zero, real `localStorage`-backed session
persistence across navigation, and a real session-history/weekly-count
system. So the dead settings aren't just "unread here" — they're orphaned
next to a fully-functional, independently-built feature that would have
been their natural integration point and never got connected to it.

**A second, smaller dead-code finding.** `SleepPage.tsx` also called
`useSleep()` (a *different*, richer hook — its own real
`localStorage`-backed sound/alarm/timer/preferences API, used by two
components: `SleepSoundsSection.tsx`/`SleepEnvironmentSection.tsx`) but only
destructured `{ prefs, updatePrefs }`, and used **neither** anywhere else in
the file — a dead hook call on every render. Confirmed safe to remove:
`useSleep()` has no side effects (pure `useLocalStorage` reads + memoized
callbacks, no `useEffect`), and its only other consumers
(`SleepSoundsSection`/`SleepEnvironmentSection`) are themselves confirmed
orphaned — grep-verified imported by **nothing** in `apps/web/src`, not even
by `SleepPage.tsx` itself. (No card of their own; out of this card's scope
to build or remove, same precedent as `settings`'/`profile`'s notes on
sibling dead components.)

**Every control mapped to its real effect:**

| Section / control | Real effect? | Evidence |
|---|---|---|
| Header greeting (firstName) | **Real** | `useUserPreferences().firstName` |
| Wind Down: duration/sound-pack pickers, Start | **Real** | `WinddownContext.startSession` → real `Audio` + real `setInterval` |
| Wind Down Player: play/pause | **Real** | `pauseSession`/`resumeSession` call `audioRef.current.pause()`/resume the interval |
| Wind Down Player: volume slider | **Was fake, now real** — see Finding below |
| Wind Down Player: End & Save / cancel (X) | **Real** | `completeSession`/`cancelSession`, both stop+null the real `Audio`, write session history |
| Sleep Check-in (quality + notes) | **Real** | `useEventsLedgerContext().recordSleepRating` |
| Morning Bridge settings (enable/wake time/actions) | **Real** | `useMorningBridge`, Supabase-backed when logged in, `localStorage` fallback for guests |
| Guest lock overlay | **Real** | `isGuest` from `useAuthContext`, blurs content + blocks pointer events, matches `insights`/`reflect-and-journal` precedent |
| `defaultSleepSound`/`defaultSleepTimer`/`defaultAutoFade` (from Settings) | **Dead, confirmed here too** | zero references anywhere in this page's tree |
| `useSleep()`'s `prefs`/`updatePrefs` | **Dead on this page** | destructured, never used — removed (see Findings) |

### PASS 2 — Product-fit / behavior check

**Finding 1 — Winddown Player's volume slider was non-functional (fixed).**
`WinddownPlayer.tsx` held `const [volume, setVolume] = useState(70)` and
rendered a `Slider` bound to it, but that state was **never applied to the
real `Audio` element** — the only place `audio.volume` was ever set was a
one-time hardcoded `0.7` inside `WinddownContext.tsx`'s audio-management
effect, at element-creation time only. Moving the slider changed the UI
thumb position and nothing else; it looked interactive while doing nothing
to actual playback. This is exactly the "does this control actually change
real behavior?" fabrication check the card brief calls for, and the answer
was no. **3-condition test:** unambiguous (a volume slider that doesn't
affect volume is clearly a bug, not a design choice — the UI explicitly
offers it as a playback control), additive (lifting `volume`/`setVolume`
into `WinddownContext` and feeding them to `audioRef.current.volume` adds
behavior without removing any), zero-blast-radius (confirmed above —
`useWinddownContext()` has exactly 3 consumers, all 3 files touched here) →
fixed in place: added `volume: number` + `setVolume` to
`WinddownContextType`/`WinddownProvider`, applied `volume / 100` both at
`Audio` creation and in a dedicated sync effect (so moving the slider
updates the *live* audio element without recreating/restarting it), and
`WinddownPlayer.tsx` now reads/writes the context's `volume` instead of its
own dead local state.

**Finding 2 — 10 of 12 `WINDDOWN_SOUNDS` point to missing audio files
(escalated, not fixed).** `types/winddown.ts` lists 12 sounds across 4
packs, each with an `audioUrl` like `/audio/rain.mp3`. Checked
`apps/web/public/audio/` directly: it contains **only** `brown-noise.mp3`.
Cross-referencing every entry: `calm-rain`/`calm-forest`/`focused-pink`/
`gentle-rain` → `rain.mp3` (missing), `calm-ocean`/`energized-meadow` →
`ocean.mp3` (missing), `energized-birds` → `forest.mp3` (missing),
`energized-stream`/`gentle-wind` → `mountains.mp3` (missing),
`gentle-crickets` → `night-crickets.mp3` (missing); only `focused-brown` and
`focused-white` resolve to the one file that actually exists
(`brown-noise.mp3`). The default sound pack (`defaultSoundPack: 'calm'`,
`defaultPrefs` in `WinddownContext.tsx`) is entirely among the missing
files. In production this means: for the default pack and 2 of the other 3
packs, `new Audio(url)` 404s, `audioRef.current.play().catch(console.error)`
swallows the rejection into a console log only, and the user sees a fully
real-looking timer/UI (countdown, "Gentle Rain" label, volume control) with
**no actual sound**, no error surfaced. This is a genuine, numerically
confirmed gap between the UI's claim (named ambient sounds) and reality
(near-silence for most selections) — but fixing it means sourcing or
producing 5 real audio assets, which is content/asset production, not a
code fix, and fails the zero-blast-radius/additive-only bar this card can
act on unilaterally. Escalated for a product decision: either source the
missing audio files, or collapse `WINDDOWN_SOUNDS`/`SOUND_PACK_INFO` to only
offer packs/sounds backed by a real file until more assets exist.

**Finding 3 — `SleepBackground.tsx` has no dark-mode variant (escalated,
not fixed).** Every other `text-muted-foreground`/`bg-card` token in this
page's tree is theme-aware (swaps via CSS vars), but `SleepBackground.tsx`'s
gradient/particle colors are hardcoded light-pastel `hsl(...)` literals with
**no** `dark:` classes or `hsl(var(--...))` usage anywhere in the file — it
renders the identical "Warm Sand → Moonlight Blue" dusk gradient regardless
of the app's theme setting. Checked the two other ambient/mood background
components for comparison: `AnimatedBackground.tsx` (day-planner) composes
via `hsl(var(--primary) / ...)` — genuinely theme-aware; `LandscapeBackground.tsx`
uses its own fixed, theme-independent weather-mood palette **by design**
(it's rendering weather conditions, not app chrome). `SleepBackground.tsx`'s
own comment calls it "Light Dusk Mode," which could mean either pattern —
an intentional always-dusk aesthetic (like `LandscapeBackground`'s
intentional weather-only palette) or an oversight that never got a dark
variant (unlike `AnimatedBackground`). This is a genuine ambiguity a
design/product call should resolve, not something this card's fix should
guess at. **Numerically confirmed downstream effect, fixed in isolation
(see contrast audit below):** because this backdrop never darkens, the
guest-lock overlay's `bg-card/90` container composited against it dropped
contrast to ~3.73:1 in dark mode (computed via the same
HSL→sRGB→relative-luminance method used by every prior contrast fix in this
pipeline) — below the 4.5:1 AA minimum. That specific downstream symptom is
fixed below (dropping the `/90` opacity modifier, per the `settings` card's
established precedent for this exact failure shape); the root
cause — whether `SleepBackground` itself should be theme-aware — is
escalated.

**Contrast audit** (same HSL→sRGB→relative-luminance method as every prior
card; tokens from `index.css`: light `--card: 38 30% 98%`, `--secondary: 260
30% 94%`, `--muted-foreground: 230 10% 48%`; dark `--card: 230 20% 11%`,
`--secondary: 260 22% 17%`, `--muted-foreground: 230 10% 55%`). 13
`text-muted-foreground` sites checked across `SleepPage.tsx`,
`WinddownCard.tsx`, `SleepCheckInCard.tsx`, `MorningBridgeSettingsSection.tsx`,
`SleepCard.tsx`:

| Site | Background | Ratio | Verdict |
|---|---|---|---|
| Page subtitle ("Prepare for restful sleep") | flat `bg-card` (header card) | 4.554 light / 4.809 dark | **Passes** — left untouched |
| Guest-lock Lock icon | `bg-secondary` (decorative icon, paired with adjacent heading text) | 4.03 / 4.10 | **Passes non-text 3:1 threshold; exempt as decorative** — left untouched (differentiated from the text sites below, which must clear 4.5:1) |
| Guest-lock body text ("Sign in to track...") | `bg-card/90` opacity-stacked over the theme-unaware `SleepBackground` gradient | **4.483 light / 3.732 dark** (computed) | **Fails light (barely) and dark (clearly)** — opacity-stacked fix applied: dropped `/90`, same precedent as `settings` card's "Voice uses credits" fix |
| Winddown duration pills (inactive) ×1, sound-pack pills (inactive) ×1 | `bg-secondary` | 4.03 / 4.10 | **Fails both** — bg-secondary-specific fix applied (`text-[hsl(230,10%,40%)] dark:text-[hsl(230,10%,60%)]`) |
| Sleep Check-in quality buttons (inactive) | `bg-secondary` | 4.03 / 4.10 | **Fails both** — same fix applied |
| Morning Bridge "shows within 3 hours" caption | `bg-secondary` (wake-time row) | 4.03 / 4.10 | **Fails both** — same fix applied |
| All other sites (SleepCard subtitle header, "Rest well tonight", "Duration"/"Sound pack" labels, "Your morning actions" label, action subtitles, "Add up to N actions", "Suggestions" label, X-remove icon, Clock icon) — all on plain `bg-card` | `bg-card` | ~4.56 light / 4.80 dark | **Passes** — left untouched, matching established precedent of leaving already-passing `bg-card` sites alone |

This is the first card in the pipeline to find the opacity-stacked defect
caused by a *different* root cause than the `settings` card's flat `/60`
case — here the degradation comes from compositing against a backdrop that
doesn't participate in theming at all, confirmed by direct calculation
rather than assumed from the `/60` precedent's ratio.

**Logic-bug check (3-condition test):** Finding 1 (volume slider) passed all
three conditions and was fixed in place. Findings 2 (missing audio assets)
and 3 (background's dark-mode ambiguity) do **not** pass
additive/zero-blast-radius (asset production and a product design decision,
respectively) — both escalated, not fixed.

**Verdict:** 1 real logic fix (volume now actually controls playback), 5
contrast fixes (4 bg-secondary variant, 1 opacity-stacked variant), 1
dead-code cleanup (removed unused `useSleep()` call), zero structural
redesign. Two significant findings escalated (missing audio assets for the
default sound pack; `SleepBackground`'s theme ambiguity).

### PASS 3 — Build / verification record

- **New test file:** `apps/web/src/pages/__tests__/SleepPage.test.tsx` (no
  prior test file existed). Module-mocks `@/hooks/useUserPreferences`,
  `@/hooks/useMorningBridge`, `@/contexts/AuthContext`,
  `@/contexts/EventsLedgerContext`. `WinddownProvider`/`WinddownCard`/
  `WinddownPlayer`/`SleepCheckInCard`/`MorningBridgeSettingsSection` are all
  rendered **real** (not stubbed) so the sound/timer/volume assertions
  exercise actual production logic, per the card brief's instruction to
  verify real behavior, not just UI. `window.Audio` is replaced with a
  recording stub (jsdom has no real media playback) to assert on real
  constructor args and `.play()`/`.pause()`/`.volume` without a browser.
  Added a `ResizeObserver` stub to `vitest.setup.ts` (Radix `Slider` needs
  it; jsdom doesn't provide one) — additive, affects no other test.
- **RED** (baseline run against the unmodified component, confirmed by
  `git stash` on just the two fix files and re-running): **11/12 passed, 1
  failed** — exactly the volume-wiring assertion
  (`expected 0.7 to be close to 0.75`), proving the slider never reached the
  real audio element before the fix. All 11 other tests — including the
  real `Audio` construction/`play()`/timer-countdown/pause/complete
  assertions and all 5 contrast assertions — passed against the
  **original** component first, confirming the fixtures exercise real logic
  and the baseline capture is correct.
- **GREEN** (post-implementation): **12/12 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **50/50 files, 593/593
  tests passed** (581 baseline + 12 net new).
- **ESLint:** `npx eslint` on the 6 changed source files + the test file →
  0 new errors on the components (pre-existing `react-hooks/exhaustive-deps`
  warnings on `WinddownContext.tsx`'s effects, matching the file's existing
  convention of selective dependency arrays, not a new regression in kind);
  the test file's 4 `no-explicit-any` findings are the same pre-existing
  mock-cast convention already present in `SettingsPage.test.tsx` and other
  merged cards' test files, not a regression.
- **Build:** `npm run build` → `✓ built in 14.75s`, no errors; `SleepPage`
  chunk **18.92 kB (gzip 5.48 kB)**.
- **Visual check — against the real built app:** `dist` served locally
  (`npx vite preview --port 4181`), driven via the `claude-in-chrome` MCP
  tools. Unauthenticated `/sleep` correctly redirects to `/login` ("Welcome
  back" rendered), **0 console errors**. "Continue as Guest" reached `/app`
  but then bounced back to `/login` when navigating to `/sleep` directly —
  same pre-existing guest/backend-reachability gate the `settings`/`profile`/
  `day-planner` cards already hit on a static build with no reachable
  backend, not caused by anything in this card's change — **0 console
  errors** throughout. The real authenticated page state (sound/timer/volume
  wiring, contrast fixes, guest overlay) is instead confirmed at the
  component level by the 12 passing tests, which render the **real**
  `SleepPage` component tree.
- **Primary interaction verified:** starting a wind-down session (real
  `Audio` creation + `play()`), the real per-second countdown, the volume
  slider now actually changing the real audio element's volume, pausing
  (real `audio.pause()`), ending early (real session-complete + audio stop),
  sleep check-in rating, Morning Bridge settings wiring, and the guest-lock
  overlay — all confirmed against real component logic; the route guard
  confirmed live against the real built app with zero console errors.

**Escalations for a future dedicated card/product decision:**
1. 10 of 12 `WINDDOWN_SOUNDS` entries (Finding 2) reference audio files that
   don't exist in `apps/web/public/audio/` — including the entire default
   "calm" pack — so most wind-down sessions play silently. Needs either
   sourcing the missing `.mp3` assets or trimming the sound list to what's
   actually backed by a file.
2. `SleepBackground.tsx` (Finding 3) never varies with the app's dark/light
   theme setting — unclear if intentional (an always-dusk mood, like
   `LandscapeBackground`'s self-contained weather palette) or an oversight
   (unlike `AnimatedBackground`, which does theme via CSS vars). Worth a
   product decision either way; the one contrast symptom it caused on this
   page (guest-lock overlay in dark mode) is already fixed here.
3. `defaultSleepSound`/`defaultSleepTimer`/`defaultAutoFade` (escalated by
   the `settings` card, confirmed here) remain fully orphaned relative to
   this page's real, working Wind Down sound/timer system — this page is
   the natural place to wire them in, if that's still wanted.
