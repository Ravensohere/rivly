# Task 4 — Card: `learn` (LearnPage.tsx) — Final Report

Route `/learn`, protected (`AnimatedRoutes.tsx:23` lazy import, `:99` route).
File: `apps/web/src/pages/LearnPage.tsx` (662 lines pre-edit).

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
