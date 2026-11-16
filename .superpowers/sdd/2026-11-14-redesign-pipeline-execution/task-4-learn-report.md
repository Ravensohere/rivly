# Task 4 — Card: `learn` (LearnPage.tsx) — Final Report

Route `/learn`, protected (`AnimatedRoutes.tsx:23` lazy import, `:99` route).
File: `apps/web/src/pages/LearnPage.tsx` (662 lines pre-edit).

> **Fix round 2 (coordinator review) appended at the bottom of this report.**
> Two Important findings were raised against the original pass below: a
> missed `opacity-60`-stacked contrast failure (line 247) and an
> inconsistently-applied threshold policy on the 2 TodayCard sites. Both
> are fixed; see "## Fix round 2" at the end for the math, the diff, and
> re-run evidence. Everything above this note describes the original pass
> as submitted and is left unedited for the record.

## Audit findings

- **Route wiring confirmed.** `AnimatedRoutes.tsx:99`:
  `<Route path="/learn" element={user ? <LearnPage /> : <Navigate to="/login" replace />} />`.
  Matches the card brief; no dead-route or missing-wiring issue.
- **No landing-page marketing claim to cross-check.** Grepped
  `LandingPage.tsx` for "Learn" — zero matches. Unlike `landscape` (card
  '01', "Living Landscape"), nothing on the landing page advertises this
  feature, so there is no clause-by-clause marketing-vs-code trace to run
  here.
- **Pervasive AA contrast defect** (the brief's named recurring pattern,
  8+ prior pages): found on **15 sites** in this file — more pervasive
  than on `landscape`, because this page uses translucent `bg-card/60`,
  `bg-card/70`, `bg-card/80`, `bg-muted/30`, `bg-muted/50` composites
  throughout (vs. mostly-opaque `bg-card` elsewhere), and most of those
  composites compute just below the 4.5:1 AA threshold. Full math below.
- **No dead code, no no-op buttons, no structural issues found.** The
  `ResourceList` legacy-fallback chain (`resources[]` → `videos[]` →
  single `videoId` fields) is intentional, real backward-compat, exercised
  by two passing tests — not dead code.

## Product-fit / content-accuracy findings (with confidence levels)

**Claim checked:** `EmptyState` copy (line 650–651): *"Tell Riva what you
want to learn and she'll create a curated roadmap with the best YouTube
videos for you."*

- **High confidence — genuine mechanism, not fabricated:** Traced
  `create_learning_path` in `useRivaLogic.ts` (~line 455): it takes
  `plan.data.checkpoints` (from the AI planner) and maps real
  `resources`/`videos`/`videoId` fields into `addLearningPath(...)`, a
  real call into `useLearningPaths.ts`'s `addPath`. Separately,
  `edit_learning_path` → `replace_video` (~line 533) calls a real
  `api.riva.searchVideo(searchQuery)` and threads the result back via
  `replaceCheckpointVideo`. This is a real AI-planning + video-search
  pipeline behind the copy, not a static/fake placeholder.
- **Not independently checkable from this codebase, and not claimed
  to be:** Whether the planner's backend prompt actually optimizes for
  "best" (e.g., view count, relevance ranking) is server-side and out of
  this card's file scope — I did not trace into the backend prompt/ranking
  logic, and I'm not asserting it does or doesn't rank for "best." What I
  *can* say with confidence is that "best" is ordinary subjective product
  copy (not a statistic, not a "research shows" claim), so it doesn't
  carry the same fabrication risk as the Problem section's uncited
  numbers — there's no citable number here to be wrong about.
- **Verdict:** no fabrication found; marketing framing over a real
  mechanism. Nothing escalated.

## Contrast audit — full math (hand HSL→sRGB→relative-luminance)

Tokens (light mode): `--background: 38 35% 96%`, `--card: 38 30% 98%`,
`--muted: 38 20% 92%`, `--muted-foreground: 230 10% 48%`,
`--gradient-calm` ≈ same luminance family as `--background` (95–96% L).

Computed per-site (background composite → contrast ratio):

| Site (file line, pre-fix) | Background | Ratio | Verdict |
|---|---|---|---|
| TodayCard hours/checklist text (234, 243) | `bg-card/80` over page bg | **4.51:1** | Pass — left untouched |
| SectionLabel inline style (198) | page bg direct | **4.38:1** | Fail → fixed |
| PathCard description (288) | `bg-card/60` | **4.48:1** | Fail (hairline) → fixed |
| PathCard progress count (299) | `bg-card/60` | **4.48:1** | Fail → fixed |
| PathCard hours-left (304) | `bg-card/60` | **4.48:1** | Fail → fixed |
| PathCard chapters count (311) | `bg-card/60` | **4.48:1** | Fail → fixed |
| RoadmapView "% done" (360) | `bg-background/0.95` | **4.38:1** | Fail → fixed |
| RoadmapView description (378) | solid `background` | **4.38:1** | Fail → fixed |
| Step-number badge, not-done (411) | opaque `bg-muted` | **4.00:1** | Fail → fixed |
| Checkpoint title, done/line-through (419) | `bg-primary/5` ≈ page bg | **~4.38:1** | Fail → fixed |
| Type chip text (423) | `bg-muted/50` composite | **~4.20:1** | Fail → fixed |
| Checkpoint description (434) | `bg-card/70` | **4.49:1** | Fail (hairline) → fixed |
| Estimated-hours, `/70` opacity (436) | same card, opacity-reduced | **~2.60:1** | Fail badly → fixed |
| Notes label + text (470/471) | `bg-muted/30` | **~4.26:1** | Fail → fixed |
| Resources label (582) | card/70-family | **~4.49:1** | Fail → fixed |
| Resource source label (595) | `bg-muted/40` composite | **~4.2–4.3:1** | Fail → fixed |
| EmptyState paragraph (650) | page bg direct | **4.38:1** | Fail → fixed |
| EmptyState hint (657) | page bg direct | **4.38:1** | Fail → fixed |

**Honesty about precision.** The 4.48–4.51 band (PathCard, checkpoint
description, TodayCard) is within the margin of manual sRGB-gamma /
natural-log hand calculation — I'm not claiming lab-instrument precision.
I fixed every site I computed below 4.5 and left the one (TodayCard,
4.51) I computed above; a careful reader should treat anything in that
band as "at the threshold," not as a clean pass/fail line. This mirrors
the lesson from the `landscape` card's fix-round: say exactly what was
traced and where the uncertainty is, rather than rounding to "clean."

**Icons excluded on purpose.** `ChevronUp`/`ChevronDown`/`Trash2` icon-only
uses of `text-muted-foreground` were left alone — WCAG's non-text contrast
rule (1.4.11, 3:1) applies to them, not the 4.5:1 text rule this defect is
about, and all computed backgrounds clear 3:1 easily.

## TDD Evidence

**RED** (`apps/web/src/pages/__tests__/LearnPage.test.tsx`, new file, run
against the unmodified component): 17 tests, **12 passed / 5 failed**.
The 5 failures were exactly the 5 contrast assertions targeting
then-unfixed sites (section label, empty-state paragraph, roadmap
description, path-card description, checkpoint estimated-hours). All 12
behavioral tests passed against the original code — confirming they
exercise real rendering/hook-call logic, not mocks of their own
assertions:
- empty state + "Ask Riva" → `setIsCommandBarOpen(true)`
- today's-study-plan rendering + today-card → roadmap-overlay open
- path-card real `getProgress()` fraction/hours-left/chapter-count
- delete button calls real `deletePath('p1')` with `stopPropagation`
  (overlay doesn't open)
- path-card click opens roadmap overlay; close button closes it
  (via `waitFor`, since `AnimatePresence` unmounts after its exit
  transition)
- checkpoint expand + real `markCheckpointComplete`/`uncheckCheckpoint`
  calls with correct `(pathId, checkpointId)` args
- rich `resources[]` rendering, video resource opens the overlay with the
  real `videoId` reaching the YouTube iframe `src`
- legacy single-`videoId` fallback (no `resources[]`/`videos[]`) still
  resolves and plays

Two test-authoring bugs were found and fixed during RED (not code bugs):
ambiguous `getByRole('heading', {name})` matches across the PathCard's
`<h3>` and the overlay's `<h2>` (fixed with `level: 2`/`level: 3`), the
Trash2 icon's actual rendered class (`lucide-trash2`, no hyphen before
`2`, confirmed via a throwaway debug test against the real DOM) vs. my
first guess (`lucide-trash-2`), and one `getByText` collision where the
same description string renders in both the PathCard (`line-clamp-1`) and
the open overlay (fixed by filtering on the distinguishing class).

**GREEN** (post-implementation): **17/17 passed.**

## What I implemented

Text-color-only changes in `apps/web/src/pages/LearnPage.tsx`: replaced
`text-muted-foreground` (and one inline `color: 'hsl(var(--muted-foreground))'`
style) with `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` — the
pipeline's established remediation — at the 15 sites listed in the audit
table above. The `SectionLabel` component's inline style was converted to
a Tailwind className (inline `style` can't express a `dark:` variant; the
dark-mode value `hsl(230,10%,55%)` is literally the app's own
`--muted-foreground` dark-theme value, so dark mode is visually
unchanged). No layout, behavior, prop, or data-flow changes.

## Build + visual check

- **Full suite:** `cd apps/web && npx vitest run` → **40/40 files,
  446/446 tests passed** (run once, not concurrent with the build).
- **ESLint:** `npx eslint src/pages/LearnPage.tsx` → clean, zero output.
- **Build:** `npm run build` → `✓ built in 14.90s`, no errors;
  `LearnPage` chunk 14.64 kB (gzip 4.37 kB).
- **Visual check:** `npx vite preview --port 4178` served the production
  build (HTTP 200 on `/`). Navigating to `/learn` redirected to `/login`
  — protected route, no session reachable in this sandbox without real
  credentials. Same environment limitation already recorded on the
  `landscape` card (guest-mode waitlist network check unreachable from
  this sandbox). Out of scope to force for a text-color-only change
  already covered by passing unit tests exercising the exact DOM/classes
  changed, plus a clean production build. No protected-route or auth
  behavior was touched by this diff.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\LearnPage.tsx` — 15 contrast fixes (text-color-only).
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\LearnPage.test.tsx` — new test file, 17 tests.
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\learn.md` — state backlog → running → merged, handoff filled in.

## Self-review

- Verified claims precisely: did not assert the EmptyState's "best
  YouTube videos" claim is categorically true — traced what's checkable
  (a real AI-planning + search mechanism exists) and explicitly said what
  isn't checkable from this codebase (server-side ranking quality), per
  the landscape-overclaim lesson.
- Contrast: computed actual composited backgrounds per site (not assumed
  "on background" for every occurrence) — found 2 sites (TodayCard,
  bg-card/80) that genuinely pass and left them untouched, and flagged the
  4.48–4.51 band explicitly as within hand-calculation margin rather than
  presenting a false-precision pass/fail line.
- Positive test assertions: all 12 non-contrast tests assert real
  outcomes (hook calls with real args, real DOM content from real mock
  data, real iframe `src` containing the real `videoId`) — confirmed by
  running them against the **unmodified** component first and seeing them
  pass, proving they don't just mirror the implementation.
- Card file: states transitioned backlog → running → merged; handoff
  section is substantive (table + math), not a placeholder.

## Concerns

- The 4.48–4.51:1 band is a genuine precision limit of manual
  sRGB-gamma/log hand calculation (no browser contrast-checker tool was
  available in this pass) — if a future automated contrast check
  disagrees with any of the borderline calls (TodayCard left unfixed;
  PathCard/checkpoint-description fixed), that's the first place to
  recheck, not a sign this report was careless.
- Visual click-through of the actual protected `/learn` page was not
  possible in this sandbox (same pre-existing environment limitation as
  `landscape`) — verification rests on passing unit tests against the
  exact DOM/classes changed plus a clean production build, not a live
  authenticated screenshot.

## Fix round 2 (coordinator review)

Two Important findings came back from review. Both independently
verified and fixed; neither involved my 15 originally-fixed sites, the
test coverage for them, or the content-accuracy check — those were
confirmed accurate. This round is about audit *completeness* (one site
missed) and *consistency* (a stated policy not applied uniformly), not
an overclaim.

### Finding 1 — missed site: `LearnPage.tsx:247` (TodayCard estimated-hours, `opacity-60`)

**Missed in the original audit.** `<span className="ml-auto text-[0.65rem] opacity-60">{cp.estimatedHours}h</span>`
sits inside the `<li>` at line 243 (TodayCard's per-checkpoint row), which
itself carried plain `text-muted-foreground`. The span has no color class
of its own — it inherits the `<li>`'s muted-foreground color, then
`opacity-60` stacks on top, compounding an already-borderline color down
further. This is the numeral "Nh" (real content, not an icon), so the
icon-exclusion rule in the original pass does not cover it. This is the
same failure *category* as the `/70`-opacity checkpoint-estimated-hours
case I did catch and fix in round 1 (line 436 originally) — I simply
didn't check every opacity-stacked span exhaustively, just the one I'd
already spotted.

**Reviewer's number:** ~2.25:1 (badly failing). My own recompute, using
the TodayCard's actual `bg-card/80`-over-page-bg background (sRGB
≈ (0.9836, 0.97802, 0.9684), linear luminance ≈0.9518):

- Fix color (`hsl(230,10%,42%)`) at full opacity: linear luminance
  ≈0.1292 → contrast ≈5.59:1 (passes).
- **Fix color composited AT 0.6 opacity over that same background**
  (alpha-blend in sRGB space, *then* convert to linear and compute
  contrast — per the review's explicit instruction to verify this before
  calling it done): resultant sRGB ≈ (0.620, 0.626, 0.665) → linear
  luminance ≈0.352 → contrast ≈**2.49:1**. **Still fails** even with the
  corrected color, because opacity-blending toward a light background
  erodes contrast regardless of which dark color you start from.

**Fix applied:** dropped `opacity-60` entirely (not just swapped the
color) — the span now renders at full opacity, inheriting the `<li>`'s
fixed `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` color
(≈5.59:1, comfortably passing), per the review's explicit fallback
instruction ("if dropping to opacity-60 still fails even with the fixed
color, drop the opacity entirely too").

### Finding 2 — inconsistent policy: the 2 TodayCard sites left unfixed

Round 1 computed the TodayCard's `bg-card/80`-over-page-bg background as
a single flat color (≈4.51:1) and left those 2 sites (the "~Nh today"
label and the per-checkpoint `<li>`) unfixed on that basis, while fixing
every *other* site that computed to 4.48–4.49 as "within hand-calculation
margin." That's the inconsistency flagged: treating one end of the same
margin as "pass, leave it" and the other end as "fail, fix it anyway"
is not a coherent policy once you've already said the margin is real.

The reviewer additionally pointed out something round 1 got wrong on the
input, not just the policy: `--gradient-calm` is a **3-stop diagonal**
(`linear-gradient(160deg, hsl(38 35% 96%) 0%, hsl(38 25% 95%) 50%, hsl(260 20% 96%) 100%)`),
not a flat color — round 1's math approximated it as flat `--background`.
Recomputing at the gradient's actual stops gives a real range (reviewer:
~4.50–4.52:1), meaning part of the TodayCard's actual backdrop is below
4.5:1 depending on where in the card the text sits.

**Fix applied:** both TodayCard sites (the "~Nh today" label, line 234,
and the per-checkpoint `<li>`, line 243) now use the same
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` remediation as the
other 17 sites in this file (15 from round 1 + the line-247 fix above).
This also makes the fix uniform across every `text-muted-foreground` text
site in `LearnPage.tsx` — zero remaining bare `text-muted-foreground`
instances on text (icon-only uses of the token are intentionally
unchanged; see round 1's icon-exclusion rationale).

### Covering tests (added to `LearnPage.test.tsx`)

Three new tests in the existing contrast `describe` block:

1. `'the TodayCard "~Nh today" label uses the AA-passing muted color'` —
   asserts the label's className no longer contains `text-muted-foreground`
   and does contain the fixed-color class.
2. `'the TodayCard per-checkpoint list item uses the AA-passing muted
   color'` — same assertion on the `<li>`.
3. `'the TodayCard checkpoint estimated-hours span no longer stacks
   opacity-60 on the muted color'` — asserts the span's className no
   longer contains `opacity-60` (covering the "drop the opacity, not just
   the color" requirement specifically, since a color-only swap would
   still fail this review's own bar).

### Re-run evidence

- **Focused file:** `npx vitest run src/pages/__tests__/LearnPage.test.tsx`
  → **20/20 passed** (17 from round 1 + 3 new).
- **Full suite:** `npx vitest run` → **40/40 files, 449/449 tests
  passed** (446 + 3 new; run once, not concurrent with the build).
- **ESLint:** `npx eslint src/pages/LearnPage.tsx` → clean, zero output.
- **Build:** `npm run build` → `✓ built in 14.46s`, no errors; `LearnPage`
  chunk now 14.69 kB (gzip 4.36 kB) — negligible change from round 1's
  14.64 kB, consistent with a 3-line text-only diff.

### Self-review of this fix round

- Verified the reviewer's ~2.25:1 number independently via my own
  sRGB-alpha-blend-then-linear-luminance math (got ≈2.49:1 for the
  corrected-color-at-0.6-opacity case, same "fails badly" conclusion,
  small numeric difference consistent with hand-calculation variance
  between two independent reviewers, not a disagreement on the verdict).
  Did not simply trust the reviewer's number without redoing the
  calculation myself, per this card's standing instruction to be precise
  rather than round up to confident.
- Did not silently assume color-swap-only would fix the opacity-60 site —
  explicitly recomputed with the fix color at 0.6 opacity first, found it
  still fails, then applied the fallback (drop the opacity) the review
  specified for exactly that outcome.
- Resolved the TodayCard inconsistency by fixing both flagged sites
  rather than re-arguing the original 4.51:1 call — the reviewer's point
  that the backdrop is a gradient, not a flat color, independently
  undermines the single-number basis for leaving them unfixed, so fixing
  is the correct response, not just the path of least resistance.
- No other `text-muted-foreground` text sites remain in `LearnPage.tsx`
  after this round (confirmed via `grep -n "text-muted-foreground"
  apps/web/src/pages/LearnPage.tsx` — every remaining hit is on an
  icon-only element, consistent with round 1's documented exclusion).

### Concerns (updated)

- All concerns from round 1 stand except the TodayCard hairline-call
  concern, which this round resolves by fixing both sites instead of
  leaving a judgment call in place.
- The gradient-background point is a reminder that any future contrast
  audit on a page using `--gradient-calm` (several other pages in this
  app do) should sample the gradient's actual stops, not approximate it
  as flat `--background` — worth carrying forward to other in-flight or
  future cards in this pipeline, though re-auditing already-merged cards
  is outside this card's scope to action unilaterally.
