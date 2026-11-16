---
id: learn
title: Learn Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/LearnPage.tsx (route /learn, protected, 662 lines pre-edit). No landing-page marketing claim names this feature (grepped LandingPage.tsx for "Learn", no hits), so there was no advertised-vs-real cross-check to run, unlike the landscape card. The one page-local claim checked (EmptyState copy: "she'll create a curated roadmap with the best YouTube videos for you") traces to a real create_learning_path AI-planning action plus a real api.riva.searchVideo() call in useRivaLogic.ts — genuine mechanism behind marketing framing, not a fabricated statistic. Hand-computed AA contrast (HSL->sRGB->relative-luminance) for every text-muted-foreground site against its actual composited background (not just assumed): fixed 15 genuinely-failing sites (ratios computed ~2.60:1 to ~4.49:1, all below the 4.5:1 AA threshold) using the pipeline's established remediation; left the 2 TodayCard sites untouched since their bg-card/80 composite computed to ~4.51:1 (passing, barely) — explicitly flagged in-report as a hairline call given hand-calculation precision limits.
---

# Card: Learn Page

This card represents the redesign/verification pass for the Learn Page feature/page in the Rivly web app.

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

### PASS 1 — Audit (content-claim check + contrast + route wiring)

Route confirmed in `AnimatedRoutes.tsx:23` (lazy import) and `:99`
(`<Route path="/learn" element={user ? <LearnPage /> : <Navigate to="/login" replace />} />`)
— protected, matches the card brief.

**Content-claim check.** Grepped `LandingPage.tsx` for "Learn" — no
matches, so unlike `landscape` (card '01', "Living Landscape"), the
landing page makes no marketing claim naming this feature; there is no
advertised-vs-real clause-by-clause cross-check to run here. The one
claim worth checking is local to the page itself — `EmptyState`'s copy:
*"Tell Riva what you want to learn and she'll create a curated roadmap
with the best YouTube videos for you."* Traced: `useRivaLogic.ts`'s
`create_learning_path` action (line ~455) builds real checkpoints with
real `resources`/`videos` arrays from the AI planner's output, and the
`edit_learning_path` → `replace_video` action (line ~533) calls a real
`api.riva.searchVideo(searchQuery)` to re-pick a video. This is marketing
framing ("curated", "best") layered on a genuinely-implemented AI-planning
+ video-search mechanism — not a fabricated statistic needing a citation
the way the Problem section's uncited research stats did. "Best" is
ordinary subjective product copy, not a checkable research claim, so
there is nothing further to verify or flag here.

**Contrast audit (hand HSL→sRGB→relative-luminance math)** — the brief's
named recurring pattern, computed against this page's actual token values
(`--background: 38 35% 96%`, `--card: 38 30% 98%`, `--muted: 38 20% 92%`,
`--muted-foreground: 230 10% 48%`) and each site's *actual* composited
background (not assumed):

| Site | Background composite | Computed ratio | Verdict |
|---|---|---|---|
| TodayCard hours label / checkpoint list item | `bg-card/80` over page bg | ~4.51:1 | **Passes (barely)** — left untouched |
| SectionLabel ("Your Roadmaps" / "Today's Study") | inline style, page bg (`--gradient-calm`, ≈ `--background`) directly | ~4.38:1 | **Fails** |
| PathCard description / progress count / hours-left / chapters count | `bg-card/60` over page bg | ~4.48:1 | **Fails** (hairline below 4.5) |
| RoadmapView header "% done" | `bg-background/0.95` (≈ solid) | ~4.38:1 | **Fails** |
| RoadmapView description paragraph | solid `background: hsl(var(--background))` | ~4.38:1 | **Fails** |
| Checkpoint step-number badge (not done) | opaque `bg-muted` | ~4.00:1 | **Fails** |
| Checkpoint title (done, line-through) | `bg-primary/5` over page bg (≈ page bg) | ~4.38:1 | **Fails** |
| Checkpoint type chip ("Theory"/"Practice") | `bg-muted/50` composite | ~4.20:1 | **Fails** |
| Checkpoint description | `bg-card/70` (not done) over page bg | ~4.49:1 | **Fails** (hairline) |
| Checkpoint estimated-hours (`text-muted-foreground/70`) | same card, opacity-reduced text | ~2.60:1 | **Fails badly** |
| Notes label / note text | `bg-muted/30` composite | ~4.26:1 | **Fails** |
| Resources label / resource source label | card/chip composites, same family | ~4.2–4.5:1 | **Fails** |
| EmptyState body paragraph / hint | page bg (`--gradient-calm`) directly | ~4.38:1 | **Fails** |

Fixed all 15 failing sites with the pipeline's established remediation
(`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`), replacing both
Tailwind-class and one inline-`style`-color instance (`SectionLabel`,
converted to the same className-based fix since inline styles can't
express a `dark:` variant). Left the two TodayCard sites untouched — their
`bg-card/80` composite computes to ~4.51:1, just over the 4.5 threshold.
**Flagging precisely rather than rounding up:** several of the "failing"
sites (PathCard composites, checkpoint description) compute to ~4.48–4.49,
and the one "passing" site computes to ~4.51 — these are hairline calls
within the margin of manual sRGB/log-based hand calculation, not clean
separations. I fixed every site that computed below 4.5 and left the one
that computed above, but a reader should treat the 4.48–4.51 band as "at
the threshold," not as a crisp pass/fail line.

**Icons excluded.** `ChevronUp`/`ChevronDown`/`Trash2` icon-only elements
using `text-muted-foreground` were left untouched — they are non-text UI
(WCAG 1.4.11 non-text contrast, 3:1), which the same color easily clears,
not the 4.5:1 text-contrast rule this defect is about.

### PASS 2 — Product-fit / verification

**Cross-file impact.**
```
grep -rln "LearnPage" apps/web/src
  apps/web/src/pages/LearnPage.tsx
  apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one route)
```
Default export only, one lazy-loaded route consumer — no other file
imports anything named from `LearnPage.tsx`. `useLearningPaths.ts` and
`useRiva.ts` are shared hooks consumed elsewhere (`useRivaLogic.ts`,
`LearningPathSheet.tsx`, etc.) but this card touched neither hook, only
`LearnPage.tsx`'s own JSX — no shared-logic risk.

**Verdict: APPROVED, scope as proposed in PASS 1** — 15 contrast fixes
(text-color-only, no layout/behavior change). No structural redesign
attempted; no no-op buttons or dual data sources found. The resource-list
legacy-fallback logic (`resources[]` → `videos[]` → single `videoId`
fields) was read and is exercised by real tests, not reworked — it's
existing, intentional backward-compat, out of a contrast-only card's scope.

### PASS 3 — Build / verification record

- **RED** (new `LearnPage.test.tsx`, baseline against unmodified file):
  17 tests written; 12/17 passed, 5 failed exactly on the 5 then-unfixed
  contrast assertions (section label, empty-state paragraph, roadmap
  description, path-card description, checkpoint estimated-hours). All 12
  non-contrast baseline tests (empty state + "Ask Riva" CTA wiring,
  today's-study-plan rendering and today-card → roadmap-overlay open,
  real `getProgress`-driven path-card fraction/hours-left/chapter-count,
  delete-with-stopPropagation, roadmap overlay open/close, checkpoint
  expand + real `markCheckpointComplete`/`uncheckCheckpoint` calls, rich
  `resources[]` rendering + real video-overlay `videoId` wiring, and the
  legacy single-`videoId` fallback path) passed against the **original**
  component first, confirming the fixtures exercise real logic, not mocks
  of the assertions themselves.
- **GREEN** (post-implementation): **17/17 passed.**
- **Full suite:** `cd apps/web && npx vitest run` (alone, not concurrent
  with the build) → **40/40 files, 446/446 tests passed.**
- **ESLint:** `npx eslint src/pages/LearnPage.tsx` → clean, no output.
- **Build:** `npm run build` → `✓ built in 14.90s`, no errors; `LearnPage`
  chunk **14.64 kB (gzip 4.37 kB)**.
- **Primary interaction verified:** today-card → roadmap overlay open,
  path-card → roadmap overlay open, overlay close, checkpoint
  expand/collapse, mark-done/mark-incomplete, resource-video playback
  (real `videoId` reaching the YouTube iframe `src`), and the legacy-video
  fallback are all covered by passing behavioral tests against real mocked
  hook data (not snapshot-only assertions).
- **Visual check:** `npm run build` + `npx vite preview --port 4178`
  served the production build (HTTP 200 on `/`). Navigating to `/learn`
  redirected to `/login` (protected route, no session) — same
  environment limitation already recorded on the `landscape` card: no
  authenticated session is reachable in this sandbox without creating
  real credentials, which is out of scope for a text-color-only change
  already covered by passing unit tests and a clean production build. No
  protected-route or auth behavior was touched by this card's diff.

**Escalations for a future dedicated card (not actioned here):** none.
Unlike `landscape`, no functional/behavioral gap was found on this page —
the resource-list legacy-fallback chain and the AI-planning/video-search
mechanism behind the EmptyState copy both check out against the real
code.
