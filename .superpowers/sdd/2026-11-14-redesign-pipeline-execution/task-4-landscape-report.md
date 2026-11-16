# Task 4 — Card: landscape

`apps/web/src/pages/LandscapePage.tsx`, route `/landscape`, protected, 362 lines pre-edit.

## Audit findings (incl. landing-page cross-check)

Route confirmed wired in `AnimatedRoutes.tsx:13` (lazy import) and `:93`
(protected route, `Navigate to="/login"` when logged out).

**Landing-page cross-check.** `LandingPage.tsx:1020` advertises this exact
feature under FeaturesSection card '01', "Living Landscape": *"A world that
grows with your focus sessions — not your streaks. Miss a day? The landscape
waits, patient as nature itself. Plant Focus Seeds, watch them bloom."*

Traced each clause against the real implementation:

- **"grows with your focus sessions — not your streaks"** — TRUE.
  `useLandscape.ts`'s `derivedSeeds` maps directly over
  `useEventsLedgerContext().focusSessions` (real ledger data). The weekly
  sky/water/light evolution (`updateLandscapeState`) is computed from
  `recentSeeds` (trailing 7 days of real sessions), never from the streak
  counter.
- **"Miss a day? The landscape waits, patient as nature itself"** — **TRUE
  for seeds/trees; PARTIALLY FALSE for ambient mood state.** Grepped the
  entire hook for any decay/subtractive write affecting seeds; none
  exists — seeds/trees never disappear or shrink for an inactive day.
  However, `updateLandscapeState()` unconditionally recomputes `skyState`/
  `waterState`/`lightState` from scratch on every call (including every
  page mount), purely from a **stateless trailing-7-day rolling window**
  (`recentSeeds = derivedSeeds.filter(s => s.date >= weekAgoStr)`), with
  **no ratchet or floor against the previous state**. A user who earned
  `golden` sky over an active week, then takes an 8+ day break, will see
  the ambient mood **visibly regress** toward `cloudy`/`dim` next time they
  open the page — not via any decay function, but because nothing holds
  the earned state steady once that week ages out of the lookback. Seeds
  wait patiently; the ambient mood does not. Flagged via in-source `FIXME`
  at `updateLandscapeState()` in `useLandscape.ts` (not fixed — shared hook
  logic, a product decision, outside this card's contrast-only scope).
- **"Plant Focus Seeds, watch them bloom"** — TRUE as a real mechanic (not
  literal bloom animation). Each completed session becomes a seed rendered
  as a real SVG tree in `PremiumLandscapeScene.tsx`, with type/size driven
  by real session duration (`<30min` seedling, `30-60` pine, `60-90` willow,
  `90+` oak; incomplete sessions render as small seedlings).

**Verdict: no outright fabrication, but one marketing clause is only
partially true.** Seeds/trees are a genuinely data-driven feature whose
"grows with real sessions, not streaks" and "plant seeds, watch them bloom"
clauses fully match the real implementation. The "landscape waits
patiently" clause does not hold for the ambient sky/water/light mood,
which can visibly regress after a long gap (see above) — a real gap
between the marketing copy and the implementation, escalated via
in-source `FIXME` rather than fixed.

**Contrast audit** (hand HSL→sRGB→relative-luminance math against this
page's actual tokens: `--background: 38 35% 96%`, `--muted-foreground:
230 10% 48%`, `--muted: 38 20% 92%`):

| Site | Background | Computed ratio | Verdict |
|---|---|---|---|
| Header subtitle ("Your focus journey visualized") | `bg-background/80` (≈ page bg) | ~4.39:1 | **Fails AA (4.5:1)** |
| Streak badge text ("N day streak") | `bg-muted/50` composited over page bg | ~4.20:1 | **Fails** |
| Inactive Day/Week/Month tab label | `bg-muted/50` container | ~4.20:1 | **Fails** |
| Landscape message paragraph | page bg directly | ~4.39:1 | **Fails** |
| Collectibles-discovered hint (`text-muted-foreground/60`) | page bg, opacity-reduced | ~2.21:1 | **Fails badly** |
| "Focus time" / "Sessions" stat labels (bare `text-muted-foreground`) | `bg-card` (opaque) | ~4.56:1 | Passes — untouched |

This confirms the recurring `text-muted-foreground`-on-background AA defect
(7+ prior pages) is present here too, in 5 distinct sites.

**Dead code.** `getSessionsByDateRange` was destructured from
`useLandscape()` but never referenced elsewhere in the file (grep-confirmed)
— removed.

## Product-fit findings (PASS 2)

```
grep -rln "LandscapePage" apps/web/src
  apps/web/src/pages/LandscapePage.tsx
  apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + one route)
```

Default export only, one lazy-loaded route consumer — no other file
depends on anything named from `LandscapePage.tsx`. No structural redesign
attempted. No no-op buttons or dual-source-of-truth data risks found. One
genuine functional gap found (ambient-mood regression, see above) —
escalated via in-source `FIXME` in `useLandscape.ts`, not fixed (shared
hook logic, a product decision, outside this card's contrast-only scope).

**Verdict: APPROVED**, scope as proposed in PASS 1 (5 contrast fixes + 1
dead-destructure removal, no behavior/visual change beyond text color).

## TDD Evidence (RED/GREEN)

New file: `apps/web/src/pages/__tests__/LandscapePage.test.tsx` (16 tests).

- **RED** (against unmodified `LandscapePage.tsx`): 11/16 passed, 5 failed
  — exactly the 5 contrast assertions. All 11 non-contrast tests (header/
  streak/collection-badge rendering from real mocked hook data, mount-effect
  wiring to `checkDailyGrowth`/`updateLandscapeState`/`checkAndUnlock`, real
  seed counts passed to `PremiumLandscapeScene`, day-view stat aggregation
  tracing to real `durationMinutes` sums, session-label singularization,
  zero-state copy, Week-view mode switching, date navigation incl. the
  disabled-next-button-on-today case and "Go to Today", and Collection Sheet
  open/close from both the trophy badge and the collectibles hint) passed
  against the **original** code first, confirming the fixtures exercise
  real component logic.
- **GREEN** (post-fix): **16/16 passed.**

## What I implemented

1. Removed the dead `getSessionsByDateRange` destructure (never used in the
   file) from the `useLandscape()` call.
2. Replaced `text-muted-foreground` with
   `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` (the pipeline's
   established AA-passing remediation) at 5 sites:
   - Header subtitle "Your focus journey visualized"
   - Streak badge wrapper div ("N day streak")
   - Inactive view-mode tab label (Day/Week/Month)
   - Landscape message paragraph
   - Collectibles-discovered hint button (also dropped the `/60` opacity
     modifier, replacing it with the fixed full-opacity color)

No other files changed; no behavioral/visual change beyond text color.

## Build + visual check

- Focused test: 16/16 passed (GREEN).
- Full suite: `npx vitest run` → **39/39 files, 429/429 tests passed.**
- ESLint: identical 3 pre-existing problems before/after (`git stash` diff
  confirmed) — 2 `no-explicit-any`, 1 `react-hooks/exhaustive-deps` — no new
  issues introduced.
- Build: `npm run build` → `✓ built in 14.30s`, no errors;
  `LandscapePage` chunk 21.49 kB (gzip 6.28 kB).
- Visual check: started the local dev server (HTTP 200 confirmed) and
  attempted a live click-through via the browser tool. The `/landscape`
  route requires an authenticated `user` (`AnimatedRoutes.tsx:93`); the
  login page's "Continue as Guest" path hit an app-level waitlist check that
  calls out to a network endpoint unreachable from this sandbox ("Not on
  Waitlist... Failed to fetch"), so no authenticated session could be
  reached without creating real credentials — out of proportion for a
  text-color-only change already covered by passing unit tests and a clean
  production build. This is an environment/connectivity limitation
  unrelated to the diff; no protected-route or guest-mode logic was touched.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\LandscapePage.tsx`
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\LandscapePage.test.tsx` (new)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\hooks\useLandscape.ts` (comment-only FIXME added in the review fix-up below; no logic change)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\landscape.md` (state → merged, handoff recorded)

## Self-review findings

- Fabrication/mismatch check performed, including the landing-page
  cross-check requested in the brief — result: no fabrication, the feature
  genuinely matches its marketing description.
- Recurring `text-muted-foreground`-on-background contrast defect was
  present and fixed (5 sites, hand-computed ratios, not guessed).
- All 16 new tests are positive/behavioral assertions covering real
  interactive states (view-mode switching, date navigation incl. disabled/
  enabled button states, stat aggregation arithmetic, Collection Sheet
  open/close from two entry points) — not snapshot-only or purely
  structural checks.
- Card file (`docs/superpowers/cards/landscape.md`) updated: state →
  `merged`, owner set, full PASS 1/2/3 handoff recorded in the same format
  as the `insights` precedent card.

## Concerns

- None functional in the diff itself. The only gap versus a fully
  "verified in the running app" bar is the live browser click-through,
  blocked by the guest-mode waitlist network call described above — a
  pre-existing environment limitation, not something introduced or
  touched by this card's diff.
- Escalated (not fixed): `updateLandscapeState()` in `useLandscape.ts`
  can visibly regress the ambient sky/water/light mood after an 8+ day
  gap — see the review fix-up note below.

## Review fix-up

Coordinator review flagged that the original PASS 1 verdict on *"Miss a
day? The landscape waits, patient as nature itself"* overclaimed — it was
marked flatly TRUE based on finding no decay/subtractive write, but missed
that `updateLandscapeState()` recomputes `skyState`/`waterState`/
`lightState` from a **stateless trailing-7-day rolling window** on every
call (including every mount), with **no ratchet against the previous
state**. Concretely: a user who earned `golden` sky over an active week,
then takes an 8+ day break, will see the ambient mood visibly fall back
toward `cloudy`/`dim` — seeds/trees are unaffected (they never decay), but
the ambient mood is not "patient" the way the marketing copy claims.

Verified the reviewer's finding directly against `useLandscape.ts:216-256`
before acting on it — confirmed accurate. Corrected:
1. `docs/superpowers/cards/landscape.md` — verdict text for that clause,
   the PASS 2 verdict paragraph, the "Escalations" section, and the
   frontmatter `handoff` summary all updated from flat TRUE to
   "TRUE for seeds/trees; PARTIALLY FALSE for ambient mood."
2. This report file — same correction applied in three places above.
3. Added an in-source `FIXME` comment at `updateLandscapeState()` in
   `apps/web/src/hooks/useLandscape.ts` documenting the exact gap
   (comment-only — no logic change, per the escalate-don't-fix rule this
   pipeline has used for shared-hook/out-of-scope findings on prior cards).

No test or code-behavior change was needed or made; the existing 16/16
focused + 429/429 full-suite results still stand unchanged.
