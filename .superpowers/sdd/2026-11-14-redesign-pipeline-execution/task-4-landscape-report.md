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
- **"Miss a day? The landscape waits, patient as nature itself"** — TRUE.
  Grepped the entire hook for any decay/subtractive write; none exists.
  `landscapeState` only ever improves or holds steady based on
  `focusDays`/`avgMinutesPerDay`; nothing shrinks trees or downgrades state
  for an inactive day.
- **"Plant Focus Seeds, watch them bloom"** — TRUE as a real mechanic (not
  literal bloom animation). Each completed session becomes a seed rendered
  as a real SVG tree in `PremiumLandscapeScene.tsx`, with type/size driven
  by real session duration (`<30min` seedling, `30-60` pine, `60-90` willow,
  `90+` oak; incomplete sessions render as small seedlings).

**Verdict: no fabrication found.** This is a genuinely data-driven feature
whose marketing description matches its real implementation — a clean
result, unlike some other cards in this pipeline that found fabricated or
mismatched claims.

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
attempted. No functional gaps (no-op buttons, dual data sources, etc.)
found worth escalating — this page's logic is internally consistent.

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

- None functional. The only gap versus a fully "verified in the running
  app" bar is the live browser click-through, blocked by the guest-mode
  waitlist network call described above — a pre-existing environment
  limitation, not something introduced or touched by this card's diff.
