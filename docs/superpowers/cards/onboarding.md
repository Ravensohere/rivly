---
id: onboarding
title: Onboarding Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/OnboardingPage.tsx (4-step first-win flow, gated route `/onboarding`, 773 lines pre-edit, NO structural changes made). Fixed a fabricated timing claim ("Takes about 90 seconds (we'll speed it up for demo)" vs. the actual hardcoded 5-minute timer with no speed-up logic anywhere), a stale "< 3 minutes" total-flow claim in the file's JSDoc header, removed one dead unused `handleSkip` function, corrected a mislabeled code comment, and fixed AA contrast on 10 flat-background `text-muted-foreground` sites plus 2 opacity-stacked gradient-circle sites that needed a stronger, dedicated fix (the flat-bg fix color alone still failed on the gradient composite in both themes). One `text-muted-foreground` site (the card-background "Today's intention" label) was audited and found to already pass AA — left unchanged.
---

# Card: Onboarding Page

This card represents the redesign/verification pass for the Onboarding Page feature/page in the Rivly web app.

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

Route confirmed in `AnimatedRoutes.tsx:24` (lazy import) and `:69-74`
(`<Route path="/onboarding" element={user && shouldShowOnboarding ?
<OnboardingPage /> : <Navigate to="/app" replace />} />`) — gated, not
public; verified live in Chrome that an unauthenticated visit to
`/onboarding` correctly redirects through `/app` to `/login` (no console
errors), confirming the guard works as coded.

**Cross-file impact.** `grep -rn OnboardingPage apps/web/src` → only
`AnimatedRoutes.tsx` (the one lazy-imported route) and this page's own
test file reference it. No other file imports any symbol from
`OnboardingPage.tsx` — zero cross-file risk from this card's fixes.

**Concrete defects found (no structural changes):**
1. Fabricated timing copy: the on-screen estimate under "Start Focus" read
   "Takes about 90 seconds (we'll speed it up for demo)", but
   `FOCUS_DURATION_SECONDS = 5 * 60` with a plain `setInterval(...,
   1000)` — there is no speed-up logic anywhere in the file. The real
   wait is 5 minutes, not 90 seconds.
2. The file's top JSDoc claimed "Gets users to their first win in < 3
   minutes" — contradicted by the same 5-minute fixed timer alone (total
   flow ≈ 5.5-6 min: ~30s step 1 + 300s step 2 + 4s step 3 + step 4's
   button delay).
3. Dead code: `handleSkip` was defined inside `Step1Intention` (original
   lines 110-114) but never wired to any element — confirmed via
   `grep -n handleSkip` (one match, its own definition).
4. Mislabeled comment: `{/* Skip hint (only on step 1) */}` guarded
   `step === 0`, but the text itself ("This helps us personalize your
   experience") isn't a skip hint at all.

**Contrast audit** (hand HSL->sRGB->relative-luminance math via a Node
script, against this page's actual token values — identical tokens to
the `not-found` card: `--background: 38 35% 96%` / dark `230 22% 8%`,
`--muted-foreground: 230 10% 48%` / dark `230 10% 55%`,
`--card: 38 30% 98%` / dark `230 20% 11%`, `--primary: 235 35% 55%` / dark
`235 40% 62%`). 13 `text-muted-foreground` sites total, three distinct
background types:

| Site type | Count | Background | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|---|
| Flat page background (`bg-background`, 10 sites: step subtitles, time estimates, "Continuing in", social proof, personalization note) | 10 | flat | 4.385:1 | 5.109:1 | **Fails light** (same as `not-found`) |
| Card background ("Today's intention" label) | 1 | flat `bg-card` (lighter than page bg) | 4.557:1 | 4.798:1 | **Passes both** — no fix needed |
| Gradient timer-circle labels ("5 min focus", "Keep going!") | 2 | opacity-stacked `from-primary/20 to-primary/5` diagonal over `bg-background`; text sits at the diagonal midpoint ≈12.5% primary, computed across the full 5%-20% range | 3.422-4.130:1 | 3.990-4.860:1 | **Fails both themes across the whole gradient range** |

The gradient sites are worse than the flat case and the flat fix doesn't
cover them: re-checked the established `text-[hsl(230,10%,42%)]
dark:text-[hsl(230,10%,55%)]` fix against the gradient composite and it
still failed (4.230:1 light / 3.990:1 dark at the 20% end). Needed a
dedicated, stronger color for those two sites.

**Fixes applied:**
- 10 flat-background sites → established fix
  `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`, re-verified
  5.422:1 light / 5.109:1 dark.
- 2 gradient-circle sites → dedicated fix
  `text-[hsl(230,10%,38%)] dark:text-[hsl(230,10%,60%)]`, re-verified
  across the full 5%-20% alpha range: 4.898-5.912:1 light,
  4.761-5.799:1 dark (both margins above 4.5:1 everywhere in range).
- Card-background site: audited, already passes AA both themes — left
  untouched (no unnecessary diff).
- Timing copy fixed to "Takes about 5 minutes" (matches the real timer
  and the step's own "5 min focus" label already shown in the circle).
- JSDoc header updated to "under 6 minutes" (matches the real fixed
  5-minute timer step plus the other steps' durations).
- Removed the dead `handleSkip` function.
- Corrected the mislabeled comment to "Personalization note — shown only
  on step 1 of 4 (intention input)".

### PASS 2 — Product-fit

**Step-by-step flow claim check** (the file's own doc comment: "Flow (4
steps, no skipping): 1. Set intention... 2. First focus session →
5-minute countdown timer 3. Watch landscape grow... 4. Welcome
message..."):
- Step 1 (intention) → correctly creates a task via `addTask` and
  advances; "no skipping" claim holds — no skip button exists (and the
  one unused `handleSkip` handler that could have implied one was dead
  code, now removed).
- Step 2 ("5-minute countdown timer") → the header comment itself
  correctly said 5 minutes; it was the *in-app* copy ("90 seconds... demo")
  and the *other* header line ("< 3 minutes") that were wrong — both
  fixed above, no behavior change to the timer itself (changing the
  timer's actual duration would be a product decision, out of this
  card's conservative scope; fixing the copy to match reality is a
  concrete-defect fix, not a redesign).
- Step 3 (landscape growth) → auto-advances after a fixed 4000ms
  `setTimeout`; copy doesn't make a hard numeric time claim here, no
  mismatch found.
- Step 4 (welcome) → "Explore Vivly" button appears after 800ms and
  calls `handleComplete`, which sets onboarding completed, calls
  `completeOnboarding()`, and navigates to `/planner`. No fabricated
  claim found (the "12,400 others focused today too" social-proof number
  is static marketing copy, not a verifiable behavioral claim — out of
  scope for a code-behavior fabrication check).

No cross-file regression risk (PASS 1's grep). No structural changes
proposed or made.

### PASS 3 — Build / verification record

- **RED** (test file extended, baseline against unmodified
  `OnboardingPage.tsx`): 6 new/changed assertions — 1 updated existing
  test (the stale "90 seconds" assertion, rewritten to expect the
  correct "5 minutes" copy) + 5 new contrast tests — all 6 failed against
  the original file; the other 12 pre-existing tests in the file
  continued to pass unmodified, confirming the fixtures exercise real
  rendered output (18 total, 12 pass / 6 fail pre-fix).
- **GREEN** (post-implementation): **18/18 passed** in
  `OnboardingPage.test.tsx`.
- **Full suite:** `cd apps/web && npx vitest run` (alone, not concurrent
  with the build) → **43/43 files, 481/481 tests passed** (476 baseline
  + 5 net new).
- **ESLint:** `npx eslint src/pages/OnboardingPage.tsx
  src/pages/__tests__/OnboardingPage.test.tsx` → 4 findings, all
  pre-existing and outside this card's diff (3 `@typescript-eslint/no-explicit-any`
  in the pre-existing mock setup, 1 `react-hooks/exhaustive-deps` warning
  in pre-existing `Step2Timer` code) — confirmed via `git diff` that none
  fall inside the changed lines.
- **Build:** `npm run build` → `✓ built in 15.03s`, no errors;
  `OnboardingPage-BdODE9Qe.js` chunk built cleanly at 12.74 kB.
- **Primary interaction verified:** via the behavioral test suite against
  real rendered DOM — Step 1 intention input/validation/submit (creates
  task, advances), Step 2 timer start/pause/reset, and all 12 contrast +
  copy fixes, all passing against the real component.
- **Visual check:** `npm run build` + `npx vite preview` served the
  production build; confirmed in Chrome that an unauthenticated visit to
  `/onboarding` redirects correctly to `/login` with no console errors
  (route guard behaves as coded). Could not reach the authenticated
  on-screen view itself in this local preview: the login page's
  "Continue as Guest" flow (the only path to a `user` session without
  real credentials, which this card's merge gate forbids touching) hit
  an unrelated backend waitlist-check endpoint that isn't reachable from
  this local preview ("Not on Waitlist" / "Failed to fetch") — an
  environment limitation, not a regression from this card's changes.
  Visual verification instead rests on the jsdom-rendered test suite,
  which asserts the actual computed `className` strings (not just text
  presence) for every contrast fix, plus the hand-computed contrast math
  above.

**Escalations for a future dedicated card:** none required. Two notes
for awareness, not structural recommendations: (1) the 5-minute focus
timer is real product behavior that's now accurately described, but if
product intent was genuinely a <3-minute or ~90-second demo flow, that's
a product decision on the timer's actual duration — out of this
conservative card's scope, flagged here only as an observation; (2) live
on-screen browser verification of this specific gated route needs either
a real Supabase test account or a working guest/waitlist backend in the
preview environment — not available in this worktree's local preview.
