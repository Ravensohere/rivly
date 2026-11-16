# Task 4 — Card: `onboarding`

Target: `apps/web/src/pages/OnboardingPage.tsx` (773 lines pre-edit), route
`/onboarding`, gated (`AnimatedRoutes.tsx:24` lazy import, `:69-74` route:
`user && shouldShowOnboarding ? <OnboardingPage /> : <Navigate to="/app"
replace />`). Conservative scope: NO structural redesign — concrete defects
only, per the day-planner/insights risk profile.

## Audit findings (incl. existing test coverage summary)

**Existing test coverage** (`OnboardingPage.test.tsx`, pre-edit, 17 tests):
Step 1 (intention) — renders, 4-dot progress, Start button disabled/enabled,
task creation + advance, "30 seconds" copy. Step 2 (timer) — renders with
"5:00", "90 seconds" copy (this was the bug, see below), pause button,
reset button. Steps 3-4 explicitly stubbed as "requires manual testing"
(the real 5-minute timer makes automated completion impractical) — this
project's own established limit, not something I worked around. One edge
case: empty-intention Enter key.

**Concrete defects found (no structural changes):**
1. **Fabricated timing copy.** The Step 2 "not started" screen said "Takes
   about 90 seconds (we'll speed it up for demo)" but
   `FOCUS_DURATION_SECONDS = 5 * 60` and the countdown runs on a plain
   `setInterval(..., 1000)` — there is no speed-up logic anywhere in the
   file. Real wait: 5 minutes, not 90 seconds.
2. **Stale top-of-file claim.** The JSDoc header said "Gets users to their
   first win in < 3 minutes" — contradicted by the same fixed 5-minute
   timer alone (total flow ≈ 5.5-6 min).
3. **Dead code.** `handleSkip` was defined in `Step1Intention` (original
   lines 110-114) but never referenced anywhere else — confirmed via grep
   (one match: its own definition).
4. **Mislabeled comment.** `{/* Skip hint (only on step 1) */}` guarded
   `step === 0`; the text itself ("This helps us personalize your
   experience") isn't a skip hint.
5. **AA contrast** — see below, the main finding.

## Product-fit findings

**PASS 1 (audit):** route wiring confirmed correct and gated (verified live
in Chrome: unauthenticated `/onboarding` → `/app` → `/login`, no console
errors). Cross-file impact: `grep -rn OnboardingPage apps/web/src` → only
`AnimatedRoutes.tsx` (its one lazy-imported route) and this page's own test
file reference it. Zero cross-file risk.

**PASS 2 (product-fit, step-by-step flow claims vs. actual code):**
- Step 1 "no skipping" claim holds — no skip button exists in the rendered
  UI; the one unused `handleSkip` handler (now removed) never wired to
  anything, so it never actually offered a skip path either.
- Step 2 "5-minute countdown timer" (header doc) is accurate; it was the
  *in-app* copy and the *other* header line that lied about duration — both
  fixed. Did not touch the timer's actual duration (a product decision,
  out of this card's scope) — fixed the copy to match reality instead.
- Step 3 (landscape, fixed 4000ms auto-advance) — no numeric claim to
  verify, none found wrong.
- Step 4 (welcome) — "Explore Vivly" → `handleComplete` → sets onboarding
  completed, navigates `/planner`. No fabricated claim found; "12,400
  others focused today too" is static marketing copy, not a verifiable
  behavioral claim.

## TDD Evidence (RED/GREEN)

**RED** (extended `OnboardingPage.test.tsx` against unmodified source):
- Rewrote the existing "shows estimated time (90 seconds for demo)" test
  to assert the *correct* copy ("Takes about 5 minutes", and that "90
  seconds" is no longer present) — failed against the original file.
- Added 5 new contrast tests (flat-background sites ×3, gradient-circle
  sites ×2) asserting the fixed `className` values — all 5 failed against
  the original file (still had `text-muted-foreground`).
- Result: 6 failed, 12 pre-existing tests still passed unmodified — 18
  total, confirming fixtures exercise real rendered output.

**GREEN** (post-implementation): 18/18 passed.

## What I implemented

1. Removed dead `handleSkip` function (Step1Intention).
2. Fixed JSDoc header: "< 3 minutes" → "under 6 minutes (dominated by the
   fixed 5-minute focus timer in step 2 below)".
3. Fixed copy: "Takes about 90 seconds (we'll speed it up for demo)" →
   "Takes about 5 minutes" (matches the real timer and the step's own "5
   min focus" label already shown in the circle).
4. Corrected comment: "Skip hint (only on step 1)" → "Personalization note
   — shown only on step 1 of 4 (intention input)".
5. **Contrast fix, 10 flat-background sites** (step subtitles, time
   estimates, "Continuing in", social proof row, personalization note) →
   `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` (the pipeline's
   established fix, identical tokens/ratios to the `not-found` card: fails
   light at 4.385:1, passes dark at 5.109:1; fix re-verified at 5.422:1
   light / 5.109:1 dark).
6. **Contrast fix, 2 gradient-circle sites** ("5 min focus", "Keep going!"
   labels inside the `from-primary/20 to-primary/5` timer-circle gradient)
   → a **dedicated, stronger** fix: `text-[hsl(230,10%,38%)]
   dark:text-[hsl(230,10%,60%)]`. The established flat-bg fix color still
   failed here (4.230:1 light / 3.990:1 dark at the gradient's 20% end) —
   this composite background needed its own computation (see math below).
7. **Left unchanged:** the one card-background site ("Today's intention"
   label) — audited and found to already pass AA in both themes (4.557:1
   light / 4.798:1 dark). No unnecessary diff.

### Contrast math (hand HSL→sRGB→relative-luminance, Node script, not
hand-rounded)

Tokens (identical to the `not-found`/mobile-app cards): `--background: 38
35% 96%` / dark `230 22% 8%`; `--muted-foreground: 230 10% 48%` / dark `230
10% 55%`; `--card: 38 30% 98%` / dark `230 20% 11%`; `--primary: 235 35%
55%` / dark `235 40% 62%`.

| Site type | Count | Background | Light | Dark | Verdict |
|---|---|---|---|---|---|
| Flat `bg-background` | 10 | flat | 4.385:1 | 5.109:1 | Fails light |
| `bg-card` ("Today's intention") | 1 | flat, lighter than page bg | 4.557:1 | 4.798:1 | Passes both |
| Gradient timer circle (midpoint ≈12.5% primary; swept 5%-20%) | 2 | opacity-stacked over `bg-background` | 3.422-4.130:1 | 3.990-4.860:1 | Fails both, whole range |

Fix verification (swept the same 5%-20% range for the gradient sites):
flat fix `hsl(230,10%,42%)/hsl(230,10%,55%)` → 5.422:1 light / 5.109:1
dark on flat bg (passes), but only 4.230-5.106:1 light / 3.990-4.860:1
dark on the gradient composite (**still fails at the 20% end in both
themes**). Dedicated gradient fix `hsl(230,10%,38%)/hsl(230,10%,60%)` →
4.898-5.912:1 light / 4.761-5.799:1 dark across the full 5%-20% range
(passes AA everywhere in range, both themes).

## Build + visual check

- `cd apps/web && npx vitest run src/pages/__tests__/OnboardingPage.test.tsx`
  → 18/18 passed.
- `cd apps/web && npx vitest run` (full suite, alone, not concurrent with
  build) → **43/43 files, 481/481 tests passed** (476 baseline + 5 net new).
- `npx eslint src/pages/OnboardingPage.tsx
  src/pages/__tests__/OnboardingPage.test.tsx` → 4 findings, all confirmed
  via `git diff` to be pre-existing and outside this card's changed lines
  (3× `@typescript-eslint/no-explicit-any` in pre-existing mock setup, 1×
  `react-hooks/exhaustive-deps` in pre-existing `Step2Timer` code).
- `npm run build` → `✓ built in 15.03s`, no errors;
  `OnboardingPage-BdODE9Qe.js` chunk built cleanly (12.74 kB).
- **Visual check:** served the production build with `vite preview`.
  Confirmed in Chrome that an unauthenticated visit to `/onboarding`
  redirects correctly through `/app` to `/login` with no console errors
  (route guard behaves as coded — PASS 1). Could not reach the
  authenticated on-screen view in this local preview: the login page's
  "Continue as Guest" flow (the only path to a `user` session without real
  credentials, which the merge gate forbids anyway) hit an unrelated
  backend waitlist-check endpoint unreachable from this local preview
  ("Not on Waitlist" / "Failed to fetch") — an environment limitation, not
  a regression from this card's changes. Visual verification instead rests
  on the jsdom-rendered test suite, which asserts the actual computed
  `className` string (not just text presence) for every one of the 12
  contrast-fixed sites, plus the hand-computed contrast math above.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\OnboardingPage.tsx`
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\OnboardingPage.test.tsx`
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\onboarding.md`

## Self-review findings

- Read and built on the existing test file rather than duplicating: kept
  all 12 unaffected pre-existing tests untouched, only rewrote the one
  test that encoded the bug (the "90 seconds" assertion) and added 5 new
  tests for the contrast fixes — no redundant coverage.
- Stayed scoped to concrete defects: no component restructuring, no new
  props/exports, no change to the timer's actual duration or step order.
- Fabrication/mismatch check performed explicitly on all 4 flow-step
  claims (PASS 2 above) — found and fixed the "90 seconds"/"< 3 minutes"
  mismatch; no other claims mismatched.
- Contrast fix applied where needed: swept all 13 `text-muted-foreground`
  sites, classified by actual background (flat/card/gradient), computed
  real ratios for each, fixed the 12 that failed, left the 1 that already
  passed untouched.
- Card file updated: state `backlog` → `merged`, owner assigned, handoff
  filled with both PASS write-ups and the full verification record.

## Concerns

None blocking. Two observations for awareness (not structural
recommendations, per scope):
1. The 5-minute focus timer is real, intended product behavior, now
   accurately described by the copy — if product intent was actually a
   <3-minute/~90-second demo flow, that's a decision about the timer's
   actual duration, which is out of this conservative card's scope.
2. Live on-screen browser verification of this specific gated route needs
   either a real Supabase test account or a working guest/waitlist backend
   in the preview environment, neither available in this worktree's local
   preview — noted for whoever next needs full end-to-end visual QA on
   this page.
