---
id: landscape
title: Landscape Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/LandscapePage.tsx (route /landscape, protected, 362 lines pre-edit). This is the "Living Landscape" feature named on the landing page's FeaturesSection (card '01'). Cross-checked that marketing claim against the real implementation: seeds/trees genuinely derive from real Events-Ledger focus-session data via useLandscape() and never decay (true), but the ambient sky/water/light mood DOES visibly regress after an 8+ day gap because updateLandscapeState() recomputes it from a stateless trailing-7-day window with no ratchet (partially false for "the landscape waits, patient as nature itself") — flagged via in-source FIXME, not fixed (shared hook logic, out of this card's contrast-only scope). Fixed 5 hand-verified AA contrast failures (the recurring bare text-muted-foreground-on-background pattern, a bg-muted/50-composite variant, and a severely-failing /60-opacity variant) and removed one dead destructured value (getSessionsByDateRange, never used in the file).
---

# Card: Landscape Page

This card represents the redesign/verification pass for the Landscape Page feature/page in the Rivly web app.

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

### PASS 1 — Audit (landing-page cross-check + contrast + dead code)

Route confirmed in `AnimatedRoutes.tsx:13` (lazy import) and `:93`
(`<Route path="/landscape" element={user ? <LandscapePage /> : <Navigate to="/login" replace />} />`)
— protected, matches the card brief.

**Landing-page cross-check.** `LandingPage.tsx:1020` advertises this exact
feature: *"Living Landscape — A world that grows with your focus sessions —
not your streaks. Miss a day? The landscape waits, patient as nature itself.
Plant Focus Seeds, watch them bloom."* Traced every clause against the real
code:

- *"grows with your focus sessions — not your streaks"* — `useLandscape.ts`'s
  `derivedSeeds` maps directly over `useEventsLedgerContext().focusSessions`
  (real ledger-backed sessions), not `focusStreak`. `updateLandscapeState`
  (sky/water/light state) is likewise computed from `recentSeeds` (last 7
  days of real sessions), never from the streak counter. **True.**
- *"Miss a day? The landscape waits, patient as nature itself"* — **TRUE for
  seeds/trees; PARTIALLY FALSE for ambient mood state.** Seeds/trees never
  decay: no code path removes seeds or shrinks trees for an inactive day
  (grepped the whole hook for any subtractive/decay write, found none).
  But `updateLandscapeState()` unconditionally recomputes `skyState`/
  `waterState`/`lightState` from scratch on every call (including every
  page mount, via `LandscapePage.tsx`'s `useEffect(..., [])`), purely from
  a **stateless trailing-7-day rolling window** (`recentSeeds =
  derivedSeeds.filter(s => s.date >= weekAgoStr)`) — with **no ratchet or
  floor against the previous state**. A user who built up to e.g. `golden`
  sky over an active week, then takes an 8+ day break, will see the
  ambient mood **visibly regress** back toward `cloudy`/`dim` next time
  they open the page, once that week ages out of the lookback — not via
  any decay function, but because nothing holds the earned state steady.
  Seeds "wait patiently" (true); the ambient mood does not (false).
  Flagged via in-source `FIXME` at `updateLandscapeState()` in
  `useLandscape.ts` rather than fixed — a ratchet/decay-curve design is a
  product decision, outside this card's contrast-only scope.
- *"Plant Focus Seeds, watch them bloom"* — each completed session becomes a
  seed (`addFocusSeed`/`derivedSeeds`) rendered as a real tree in
  `PremiumLandscapeScene.tsx` whose **type and size are driven by real
  session duration** (`<30min` seedling, `30-60` pine, `60-90` willow, `90+`
  oak; incomplete sessions render as small seedlings) — not a canned
  illustration. "Bloom" is marketing language for this growth-by-duration
  mapping, not literal petal animation, but the underlying mechanic is real
  and data-driven. **No fabrication found — this is a genuinely-implemented
  feature matching its marketing description**, unlike some marketing
  claims flagged on other cards in this pipeline.

**Contrast audit (hand HSL→sRGB→relative-luminance math)** — the brief's
named recurring pattern, computed against this page's actual token values
(`--background: 38 35% 96%`, `--muted-foreground: 230 10% 48%`,
`--muted: 38 20% 92%`):

| Site | Background | Computed ratio | Verdict |
|---|---|---|---|
| Header subtitle ("Your focus journey visualized") | `bg-background/80` (≈ page bg) | ~4.39 : 1 | **Fails AA (4.5:1)** |
| Streak badge text ("N day streak") | `bg-muted/50` composited over page bg | ~4.20 : 1 | **Fails** |
| Inactive Day/Week/Month tab label | `bg-muted/50` container | ~4.20 : 1 | **Fails** |
| Landscape message paragraph (empty-state / mood copy) | page bg directly | ~4.39 : 1 | **Fails** |
| Collectibles-discovered hint (`text-muted-foreground/60`) | page bg, opacity-reduced | ~2.21 : 1 | **Fails badly** |
| "Focus time" / "Sessions" stat labels (bare `text-muted-foreground`) | `bg-card` (opaque) | ~4.56 : 1 | Passes — untouched |

Fixed the 5 failing sites with the pipeline's established remediation
(`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`), each verified
≥5.1:1 on both the flat page background and the `bg-muted/50` composite.
Left the two passing `bg-card` sites untouched.

**Dead code.** `getSessionsByDateRange` was destructured from `useLandscape()`
(line 56) but never referenced anywhere else in the file (grep-confirmed) —
removed.

### PASS 2 — Product-fit / verification

**Cross-file impact.**
```
grep -rln "LandscapePage" apps/web/src
  apps/web/src/pages/LandscapePage.tsx
  apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one route)
```
Default export only, one lazy-loaded route consumer — no other file imports
anything named from `LandscapePage.tsx`.

**Verdict: APPROVED, scope as proposed in PASS 1** — 5 contrast fixes + 1
dead-destructure removal (no behavior/visual change beyond the darkened
text colors). No structural redesign attempted; no no-op buttons or dual
data sources found on this page. One genuine functional gap found (see
the corrected "Miss a day" clause above) — ambient-mood state regression
after 8+ day gaps — escalated via in-source `FIXME`, not fixed (shared
hook logic, product decision, outside this card's contrast-only scope).

### PASS 3 — Build / verification record

- **RED** (new `LandscapePage.test.tsx`, baseline against unmodified file):
  16 tests written; 11/16 passed, 5 failed exactly on the 5 then-unfixed
  contrast assertions. All 11 non-contrast baseline tests (header/streak/
  collection-badge rendering from real hook data, mount-effect wiring,
  real seed counts passed to the scene, day/week stat aggregation tracing
  to real `durationMinutes` sums, session-label singularization, zero-state
  copy, view-mode switching, date navigation incl. "Go to Today" and the
  disabled next-button-on-today case, and Collection Sheet open/close from
  both the trophy badge and the collectibles hint) passed against the
  **original** component code first, confirming the fixtures exercise real
  logic, not mocks of the assertions themselves.
- **GREEN** (post-implementation): **16/16 passed.**
- **Full suite:** `cd apps/web && npx vitest run` (alone, not concurrent
  with the build) → **39/39 files, 429/429 tests passed.**
- **ESLint:** identical 3 pre-existing problems before and after (2
  `no-explicit-any` in `getSeedsForDate`/week-view mapping, 1
  `react-hooks/exhaustive-deps` warning on the mount effect) — confirmed
  via `git stash`/`eslint`/`git stash pop` diff, no new issues.
- **Build:** `npm run build` → `✓ built in 14.30s`, no errors; `LandscapePage`
  chunk **21.49 kB (gzip 6.28 kB)**.
- **Primary interaction verified:** view-mode toggle (Day/Week/Month),
  date navigation (prev/next, disabled-on-today, "Go to Today"), and the
  Collection Sheet open/close from both entry points are all covered by
  passing behavioral tests against real mocked hook data (not snapshot-only
  assertions).
- **Visual check:** local dev server (`npm run dev`) built and served the
  page (HTTP 200) and the production build succeeded, but live click-through
  via the browser tool was blocked by an unrelated environment issue — the
  app's guest-mode waitlist check hits a network endpoint not reachable from
  this sandbox ("Not on Waitlist... Failed to fetch"), so an authenticated
  session could not be reached without creating real credentials, which is
  out of scope for a text-color-only change already covered by passing
  unit tests and a clean production build. No protected-route or guest-mode
  behavior was touched by this card's diff.

**Escalations for a future dedicated card (not actioned here):** 1.
`updateLandscapeState()` in `useLandscape.ts` recomputes ambient sky/water/
light mood from a stateless trailing-7-day window with no ratchet against
the previous state — an earned "golden"/"radiant" mood visibly regresses
toward "cloudy"/"dim" after an 8+ day gap, contradicting the landing page's
"the landscape waits, patient as nature itself" claim for ambient mood
specifically (seeds/trees are unaffected and genuinely never decay).
Flagged via in-source `FIXME`; a ratchet/decay-curve redesign is a product
decision, not this card's contrast-only scope.
