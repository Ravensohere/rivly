---
id: landing-manifesto
title: Landing Page - Manifesto Section
owner: task-4-agent (solo; design + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = design, PASS 2 = product-fit, PASS 3 = build record)
---

# Card: Landing Page - Manifesto Section

This card represents the redesign/verification pass for the Landing Page - Manifesto Section feature/page in the Rivly web app.

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

### PASS 1 — Design proposal (design step, no code)

**What is there now** (`LandingPage.tsx:639-678`)

`ManifestoSection({ onChapter })`, `id="manifesto"` — a 300vh scroll track with a
`position: sticky` full-viewport panel. Inside, centred and capped at 900px:
an indigo 9px chapter marker (`Our manifesto · Chapter 02`), a `WordReveal`
word-by-word reveal of the manifesto sentence ("Productivity was never meant to
cost you your peace…"), and — revealed between scroll progress 0.45 and 0.60 — a
row of three **pills**: `73% / lower task anxiety`, `0 / streaks to break`,
`1 / session at a time`, each `borderRadius: 99` with a `T.surface` fill and a
`T.border` outline, numerals in `T.indigo`, labels in 8.5px `T.muted` mono. A
background tint animates from `rgba(237,237,252,0)` to `rgba(237,237,252,0.55)`
across the track.

**The defects (named, so the change is checkable — not "it looks dated")**

1. **`73% lower task anxiety` is a fabricated efficacy claim, and it is the most
   serious one on the page.** `grep -rn "73%"` over the whole repo returns
   exactly one hit: this line. There is no study, no `n`, no citation, nothing.
   This is a *stronger* defect class than the `0 AI companions` that
   `landing-problem` removed: that was a sales line wearing a numeral, whereas
   this asserts a measured **outcome of using Rivly** on a mental-health
   variable. On a calm/wellness product that edges toward a health-efficacy
   claim. It also sits directly after a section that now carries an explicit
   "primary sources not verified by us" disclosure — so the page apologises for
   two borrowed macro-figures and then, one scroll later, invents one of its own.
2. **`0 streaks to break` is contradicted by the shipped product.** Not
   unverifiable — *false*. The app ships streaks that explicitly end:
   `apps/web/src/lib/rivaLanguage.ts:130` → `streakEnded: "Streak ended. No
   worries, start fresh tomorrow!"`, streak achievements at 3/7/14/30 days
   (`apps/web/src/hooks/useAchievements.ts:208-242`, `category: 'streaks'`),
   current/longest streak derivation (`apps/web/src/lib/activityDerivation.ts:153`),
   and a 0-100 rhythm score (`apps/web/src/hooks/useRhythmScore.ts:3`). The
   landing page is telling prospects the product has no streaks while the
   product counts them, congratulates them, and announces when they break.
3. **`1 session at a time` is a duplicate, not evidence.** The identical string
   is already in the `MQ2` marquee (`LandingPage.tsx:531`, `'One session at a
   time'`) which scrolls past earlier on the same page. Restating it as a
   numeral in a stat row is the same credibility-borrowing move as (1) and (2),
   for a line the reader has already seen.
4. **Three filled pills are now the loudest thing in the page's quietest
   moment.** The merged pilot (`landing-whynot-promise`) and `landing-problem`
   took the interlude, the Promise chapter and the Problem evidence grid off
   filled containers onto hairline rules. `borderRadius: 99` badge chips on a
   `T.surface` fill are the generic-SaaS vocabulary the spec's design step rules
   out, and they are sitting inside the one full-viewport "stop and read" beat.
5. **8.5px labels, below any legible floor, at a colour that fails AA here.**
   `fontSize: 8.5` uppercase with `.12em` tracking in `T.muted` — and `T.muted`
   is *worse* than the page-wide 4.40:1 inside this section, because the
   animated tint darkens the effective ground: **4.23:1** at tint α 0.55
   (computed, see PASS 2).
6. **Minor: the chapter marker is the only one on the page in reverse order.**
   Problem reads `Chapter 01 · The Problem`, Contrast reads `Chapter 03 · The
   default world`, Manifesto reads `Our manifesto · Chapter 02`.

**Proposed direction: delete the fabricated evidence; sign the manifesto instead.**

- **A. Cut the whole three-pill row.** Every one of the three items is
  independently unusable: one fabricated (73%), one contradicted by shipped code
  (streaks), one a verbatim duplicate of the marquee (session). There is no
  honest subset to keep, and a manifesto does not need a stat row — the deletion
  *is* the fix. Net code removed, not added.
- **B. Put the manifesto's signature in the vacated reveal slot.** The slot
  cannot simply be emptied: the reveal is keyed to scroll 0.45-0.60 of a 300vh
  track, so deleting its content leaves the last ~40% of the scroll with nothing
  to reveal — dead scroll. It gets a hairline rule and two lines that introduce
  **zero new claims**: a register disclaimer, `Our working principle — not a
  metric, and not a promise about your results.`, and the attribution,
  `— The Rivly team`. The disclaimer does for this section exactly what the
  provenance note did for Problem: it tells the reader what kind of statement
  they are reading, which is the honest version of what the `73%` was
  pretending to be.
- **C. Hairline register, no pills.** The signature block is `border-top: 1px
  solid T.border` over a `max-width`, matching Problem's coda frame and the
  interlude — so the page reads as one page. No fill, no radius, no outline.
- **D. Contrast-safe disclosure colour, measured against the *tinted* ground.**
  `hsl(230, 10%, 44%)` at 11px — the same value `landing-problem` landed on, but
  re-derived for this section, because the animated tint makes the reference
  background different (see PASS 2 for the real numbers; the prior card's
  5.04:1 does **not** apply here).
- **E. Chapter marker reordered** to `Chapter 02 · Our Manifesto`, matching 01
  and 03. One string.

**Reference sites (three, specific, each tied to a decision)**

1. **Dieter Rams' *Ten Principles* as published by Vitsœ — vitsoe.com/gb/about/good-design.**
   A manifesto page that states principles and signs them, and that carries no
   metrics whatsoever — because a principle is not an outcome and the page knows
   the difference. This is the direct model for A and B: the honest form of
   "using this makes you calmer" is a stated principle with an author, not a
   percentage. Chosen over any SaaS "results" page precisely because it is the
   clearest well-known case of a product-maker's manifesto earning authority by
   *declining* to quantify itself.
2. **The Pudding — pudding.cool.** Reused deliberately from `landing-problem`'s
   PASS 1: provenance and register stated as typography, small, immediately
   adjacent to the claim, never a footnote nobody reaches. Model for where the
   disclaimer line sits and how small it may be before it stops being a
   disclosure (it is why D is 11px, not 8.5px).
3. **Stripe Press — press.stripe.com.** Hairline rules, mono small-caps,
   almost no filled containers. Reused **deliberately** from both prior cards:
   pointing C at the same reference the rest of the page already followed is
   what makes this a page rather than four independently-tasteful sections.
   (Chosen over Linear for the pilot's recorded reason: Linear's
   card-and-gradient vocabulary is the generic-SaaS look the spec rules out —
   and `borderRadius: 99` pills are exactly that vocabulary.)

**Explicitly unchanged** (so the diff stays reviewable and nothing regresses):
`ManifestoSection({ onChapter })` keeps its signature and its call site at line
1446; `id="manifesto"` stays (the `IntersectionObserver` chapter map keys
`'manifesto': 2` and the `ids` array, lines 1409/1417); `height: '300vh'` and the
sticky panel stay, so the scroll choreography is unchanged; `WordReveal` is not
touched and the manifesto sentence stays **verbatim**; `bgTint`, `eyeOp` and
`textProgress` stay as they are; the section stays centred (it is the page's one
full-viewport beat — Problem is left-aligned on purpose, and matching them would
flatten a deliberate contrast); no new dependency, no new file, no shared
component touched.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Cross-file impact — grep, not assertion.**

```
$ grep -rn "ManifestoSection" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:639:function ManifestoSection({ onChapter }: ...
./apps/web/src/pages/LandingPage.tsx:1446:        <ManifestoSection onChapter={onChapter} />

$ grep -rn "73%" --include=*.ts --include=*.tsx --include=*.md . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:667   (this section only — one hit in the entire repo)

$ grep -rn "task anxiety|streaks to break|session at a time" . (apps/, worker/, docs/)
./apps/web/src/pages/LandingPage.tsx:531   ('One session at a time' — the MQ2 marquee: the duplicate)
./apps/web/src/pages/LandingPage.tsx:667   (the stat row itself)
```

`ManifestoSection` is not exported; the only consumer is the one call site in the
same file; the stat row is inline, not a module-level const, so nothing else can
reach it. **Confirmed: no cross-file impact** (as expected by the brief).
`id="manifesto"` is load-bearing (chapter observer, key 2) and must survive.

**Fabrication / honesty check (the pattern `landing-problem` established).**

Two findings, both disclosed rather than papered over:

- **`73%` — fabricated, no source exists.** One hit in the repo. I can name no
  study, and per the prior card's precedent I will **not invent a plausible
  citation** — a guessed-at source is strictly worse than deleting the claim.
  Deleted, not sourced.
- **`0 streaks to break` — not merely unsourced but contradicted by shipped
  code** (`rivaLanguage.ts:130` streakEnded; `useAchievements.ts:208-242`
  streak_3/7/14/30; `activityDerivation.ts:153`; `useRhythmScore.ts:3` 0-100
  score). This is the find a design-only pass would have missed, and it is
  escalated as a product decision, not silently rewritten: **which is wrong, the
  landing page or the streak feature?** I have deleted the marketing claim
  because that is the change this card can safely make, but someone owning the
  product has to decide whether Rivly is a no-streaks product (then the
  achievements need to go) or a streaks product (then the "calm, nothing to keep
  up with" positioning across the page needs revisiting). Carried into the
  report and the known-limitations list.
- **Checked my own replacement copy for the same defect.** My first drafts
  included "No score to chase" and "Nothing to keep up with" as honest-sounding
  replacements for the 73%. Both would have reproduced defect (2) exactly —
  there *is* a 0-100 rhythm score. Cut before implementation. The surviving copy
  ("our working principle", "not a promise about your results", "— The Rivly
  team") asserts nothing falsifiable about the product at all, which is the
  point.

**Contrast, computed, not assumed.** The brief's page-wide note (`T.muted` on
`T.bg` = 4.40:1) does not describe this section, because the sticky panel
animates a `rgba(237,237,252,α)` tint over `T.bg`, α → 0.55. Flattened:

| ground | `T.muted` (48%) | `hsl(230,10%,44%)` |
|---|---|---|
| `T.bg` bare, α=0 — rgb(248,246,241) | 4.40:1 | 5.04:1 |
| α=0.33 — rgb(244,243,245) | 4.30:1 | 4.92:1 |
| α=0.55 worst case — rgb(242,241,247) | **4.23:1** | **4.84:1** |

So (a) the deleted 8.5px labels were worse than the page-wide figure, and (b)
`hsl(230,10%,44%)` clears AA here too, with margin, at the worst case — but at
4.84:1, not the 5.04:1 the prior card recorded. Verified by independent
sRGB-luminance computation, not by reusing the prior card's number.

**Against the spec's goals** — ✅ named reference inspiration, each tied to a
specific decision; ✅ scoped to one function in one file; ✅ ends in a working
build, not a mockup.

**Against the binding anti-goal** (*"ending this pass with the UI looking
'different' rather than verifiably better"*) — the primary change is the removal
of a fabricated efficacy claim and a claim the codebase disproves. That is not
cosmetic in any reading. The remaining changes each retire a named defect: three
filled pills (the page's last badge chips), an 8.5px sub-AA label, a reversed
chapter marker, and a duplicated marquee line.

**Verdict: APPROVED with two cuts.**

- **KEEP** — deleting all three pills (A); the signed hairline block (B, C); the
  measured disclosure colour at 11px (D); the chapter marker reorder (E);
  `id="manifesto"`, the signature, the 300vh track, `WordReveal` and the
  manifesto sentence verbatim.
- **CUT 1 — do not replace the pills with three new "commitment" lines.** My
  PASS 1 draft had the row surviving as `No score to chase / No streaks to
  break / One session at a time` on rules instead of pills. Rejected by this
  pass: two of those three are false (see above), and a row of three
  freshly-authored product promises is a *larger* unverifiable surface than the
  row being removed. The slot takes the one thing that needs no verification —
  an attribution.
- **CUT 2 — do not reuse Problem's em-dash/no-data device here.** It was the
  right answer there because the dash sat in a table beside two real figures and
  inherited that table's convention. There is no table of figures here, so a
  lone `—` would read as a styling tic rather than a convention, and would
  re-assert the numeral register this card is removing.
- **Accessibility floor held:** nothing in the section becomes focusable or
  clickable (it was not before); the disclosure is real text, not an aria
  afterthought; the attribution em dash sits inside a sentence that reads
  correctly aloud, so unlike Problem's standalone dash it needs no
  `aria-hidden`; every colour is either an existing `T.*` token or the one
  measured value above. The 8.5px type is removed, not re-homed.
- **Noted, deliberately not fixed (out of scope):** the chapter marker's
  `T.indigo` on the tinted ground computes to ~4.35:1, and it is also the only
  chapter marker on the page not in `T.muted`. I am changing its *string*, not
  its colour, so per the brief's rule this is a pre-existing pairing left alone
  — but it is a real finding for whoever does the page-wide token pass.

### PASS 3 — Build / verification record (state: running -> review -> merged)

- **RED** (pre-implementation, unmodified `LandingPage.tsx`):
  `LandingPage.manifesto.test.tsx` → **4 passed / 6 failed**. The 4 baseline
  contract tests passed against the old code — confirming the baseline was
  genuinely established, not assumed — and the dumped `#manifesto` textContent
  in the failure output confirmed the old copy verbatim: "…73%lower task
  anxiety0streaks to break1session at a time" and "Our manifesto · Chapter 02"
  (reversed). The 6 redesign tests failed exactly as intended.
- **GREEN** (post-implementation): **10/10 passed**.
- **Implementation:** cut the three-pill stat row entirely (A); put a signed,
  hairline-ruled principle statement in the vacated reveal slot (B, C) —
  `Our working principle — not a metric, and not a promise about your
  results.` / `— The Rivly team`, at `hsl(230, 10%, 44%)` / 11px (D); reordered
  the chapter marker to `Chapter 02 · Our Manifesto` (E). `ManifestoSection`'s
  signature, `id="manifesto"`, the 300vh track, `WordReveal`, and the
  manifesto sentence are untouched, exactly as PASS 1/2 specified.
- **signOp/signY investigation — real, pre-existing bug found and fixed.**
  While verifying the new signature block in a live browser (not just jsdom),
  `signOp` (the opacity motion value driving the signature block's reveal,
  `useTransform(scrollYProgress, [0.45, 0.6], [0, 1])`) stayed at inline style
  `opacity: 0` across the *entire* scroll range, while the paired `signY`
  (`y: useTransform(scrollYProgress, [0.45, 0.6], [24, 0])`) updated
  correctly (`translateY(24px)` → `none`). Root-caused by diffing against the
  original code: **confirmed pre-existing** — `git stash`, rebuilt the
  unmodified `LandingPage.tsx`, and drove the *old* three-pill row
  (`statsOp`/`statsY`, byte-for-byte the same `useTransform` calls, just
  renamed) through the same CDP scroll sweep. Its `opacity` was stuck at `0`
  at the same scroll point, identically — so the three pills this card
  removes were themselves invisible in production before this card, an
  additional, previously-unknown defect. Isolated further: removing the `y`
  companion didn't fix it (opacity alone, same `useTransform` range, still
  stuck), so the bug is specific to a direct, non-zero-start, array-based
  `useTransform(scrollYProgress, [midRange], [...])` binding to `opacity`
  when sibling array-based transforms on the same `scrollYProgress` already
  exist (`eyeOp [0,0.1]`, `textProgress [0,0.4]`, `bgTint [0,1]`) — chaining
  through one function-based pass-through transform first (`signBase =
  useTransform(scrollYProgress, v => v)`, mirroring the pattern `WordReveal`'s
  per-word opacity already uses successfully) fixes it. **This was load-bearing
  for whether my own redesigned section is visible** — a stuck `opacity: 0`
  on the attribution/disclosure block would have made the entire point of
  this card's change (replacing the pill row with a signed statement in that
  slot) invisible to real users — so per the brief's rule this was in scope to
  fix, and the fix is two lines, scoped to `ManifestoSection` only. Documented
  inline above the `signBase` declaration for the next person who touches this
  function. Not otherwise investigated deeper into framer-motion internals;
  the empirical fix is verified correct in a real browser (see below) and the
  same pattern already ships successfully elsewhere on this page.
- **Full suite:** `cd apps/web && npx vitest run` → **25 files, 258 tests, all
  passing.** (One run on this machine, executed concurrently with a `vite
  build`, produced spurious 5000ms timeouts across several unrelated test
  files including this one — a resource-contention artifact, not a
  regression, exactly the risk the brief's "no concurrent heavy builds" rule
  exists to prevent. Re-run alone, clean: 258/258. Also re-run with
  `--testTimeout=20000` for a second confirmation: still 258/258, same zero
  failures, just slower per-test timings under whatever else was using the
  machine at the time.)
- **Build:** `npm run build` → `✓ built` (15.93s standalone), no errors;
  `LandingPage` chunk **77.31 kB (gzip 21.78 kB)** vs **77.42 kB (gzip 21.77
  kB)** pre-change — the chunk is smaller, consistent with net code removed
  (one three-item map with inline pill markup replaced by two static `<p>`
  tags).
- **Visual / interaction check:** built `dist` served from a local static
  server (`npx serve`) and driven over CDP in **headless Edge**
  (`msedge.exe --headless=new --remote-debugging-port=<port>`; Playwright's
  bundled Chromium is blocked by OS Application Control on this machine, per
  the pilot and `landing-problem` cards). Scrolled `#manifesto` into view,
  then scrolled to ~56% of its 300vh track (inside the 0.45-0.6 reveal
  window) at **1440×900** and **390×844**, captured screenshots, **looked at
  them**, and read computed styles off the live DOM:
  - `frameOpacity: "1"`, `frameTransform: "none"` at both widths — the
    signature block is fully visible and settled (confirms the `signBase` fix
    in the actual production build, not just the dev server).
  - `noteFontSize: "11px"`, `noteColor: "rgb(101, 105, 123)"` — matches
    `hsl(230, 10%, 44%)` independently re-derived by hand (sRGB-linearize →
    relative luminance → contrast ratio), giving **4.84:1** against this
    section's worst-case tinted ground (`rgba(237,237,252,0.55)` over
    `T.bg`, flattening to `rgb(242,241,247)`) — clears AA with margin, and is
    *not* the prior card's 5.04:1 (different, lighter ground here).
  - `noteText`/`signText` exact, full copy present, no truncation.
  - `chapterText: "Chapter 02 · Our Manifesto"`.
  - `pillCount: 0` — no `border-radius: 99px` elements left in `#manifesto`.
  - `docScrollWidth === docClientWidth` at both widths (1425/1425 desktop,
    390/390 mobile) — no horizontal overflow.
  - `focusableInManifesto: 0` — nothing newly focusable or clickable.
  - `consoleErrors: 0` at both widths.
  - Screenshots: the full manifesto sentence renders across 4 lines
    (desktop) / 7 lines (mobile) with no clipping, the hairline sits cleanly
    under it, the disclosure and attribution are both legible at a glance,
    and the page keeps its calm, uncluttered register — no pills, no filled
    boxes, nothing competing with the sentence above it.
- **Primary interaction verified:** `#manifesto` is the `'manifesto': 2`
  chapter target and its `IntersectionObserver` wiring is untouched; the
  300vh sticky track still drives `bgTint`/`eyeOp`/`textProgress` exactly as
  before, and now also drives the signature reveal correctly (previously
  broken, see above).
- **Known limitation / escalation carried forward (not fixed here, per PASS
  2's scope):** the shipped product has streak achievements and a 0-100
  rhythm score (`useAchievements.ts`, `useRhythmScore.ts`, `rivaLanguage.ts`),
  which directly contradicted the deleted "0 streaks to break" marketing
  line. This card removes the false marketing claim; it does not resolve
  which of the two — the landing page's "nothing to keep up with"
  positioning, or the shipped streak/rhythm-score features — should change.
  That is a product decision for whoever owns both surfaces.
