---
id: landing-problem
title: Landing Page - Problem Section
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

# Card: Landing Page - Problem Section

This card represents the redesign/verification pass for the Landing Page - Problem Section feature/page in the Rivly web app.

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

**What is there now** (`LandingPage.tsx:563-618`)

`ProblemSection({ onChapter })`, `id="why"`, the first content after the hero:
a chapter marker (`Chapter 01 · The Problem`), a three-line display denial
("You're not lazy. / You're not undisciplined. / *You're running on empty.*"),
a three-cell stat row built from the module-level `PAIN_POINTS` array
(`77%` / `1 in 3` / `0`, each in a `T.surface`-filled cell with 40/36 padding,
separated by the `gap: 1 + background: T.border` hairline trick), and a
centred italic coda ending "Every AI answers when you ask. Riva shows up
before you do. That's the difference. / We made something different."

**The defects (named, so the change is checkable — not "it looks dated")**

1. **A slogan typeset as a statistic.** `{ n: '0', l: 'AI companions', d:
   'that know your name, your family, and your 2am' }` gets the same numeral
   size, the same cell, the same weight as `77%` and `1 in 3`. A `0` in a data
   row *is* a measurement claim, and this one measures nothing — nobody
   surveys "AI companions that know your 2am". Sitting it beside two figures
   that did come from surveys spends their credibility on a sales line. This
   is a trust defect, and it is in the first content the reader meets after
   the hero.
2. **Two real-looking figures with no provenance at all.** 77% and 1-in-3 are
   presented bare. A calm/wellness product quoting burnout and loneliness
   numbers while accepting none of research's obligations is borrowing
   authority. The first-person register directly above ("You're not lazy")
   makes it worse: it reads as if the macro-statistics are about *this*
   reader, a stronger claim than any survey supports.
3. **Three filled tiles are now the odd register out.** The merged pilot card
   (`landing-whynot-promise`) took the interlude and the Promise chapter off
   filled containers onto hairline rules. Problem is the only section left
   whose evidence sits in `T.surface` boxes, so the top of the page and the
   bottom of the page no longer read as the same page.
4. **Two codas, two alignments.** The interlude's coda is now left-aligned
   under a hairline with a `max-width`; Problem's is `textAlign: 'center'`.
   Same rhetorical slot, inconsistent treatment.
5. Minor but real: the numerals declare `fontFamily: "'Roboto', serif"` — a
   self-contradictory stack (Roboto is not a serif), so the figures silently
   fall to Roboto while the display lines above them are Playfair. The page
   already ships `.rv-display` / `.rv-sans` / `.rv-mono` for exactly this.

**Proposed direction: make the evidence honest, and put it in the page's own register.**

- **A. `—`, not `0`.** The third cell's figure becomes an em dash — the
  statistical-table convention for *no data* — with the visible label `no
  data` and the line "Nobody measures whether your tools notice you at 2am.
  That's the gap." The rhetorical point survives and gets sharper, because
  "unmeasured" is the claim actually being made; the page stops asserting a
  number it does not have.
- **B. One provenance line under the row.** A mono note: "Self-reported
  figures from published workplace and loneliness surveys — not our own
  research." Row-level, not per-figure (see PASS 2 — inventing per-figure
  citations would reproduce the exact defect this card removes).
- **C. Ruled columns, not filled tiles.** Cell background `T.surface` →
  `T.bg`, so the grid's existing 1px gaps render as rules on the page ground.
  Same grid, same cell count, same copy positions — no layout change, no
  overflow risk — but now in the register the rest of the page uses.
- **D. Left-aligned coda** under a hairline with a `max-width`, matching the
  interlude's coda exactly. Every word kept, including the differentiator
  sentence at line 611 — which, since the pilot card cut the duplicate out of
  `WhyNotSection`, is now the page's **only** statement of it.
- **E. Font declarations** move to the existing `rv-display`/`rv-sans`/
  `rv-mono` classes; the contradictory inline stacks go.

**Reference sites (three, specific, each tied to a decision)**

1. **Our World in Data — ourworldindata.org.** Its house rule is that a blank
   or a dash and a zero are *different claims*, and that every figure carries
   its source stamp near the figure. Direct model for A and B: the fix for a
   fabricated `0` is not a better-looking `0`, it is the dash that says
   "unmeasured". Chosen because the defect here is a data-integrity defect,
   and OWID is the clearest well-known case of that convention being honoured
   inside a designed page rather than a spreadsheet.
2. **The Pudding — pudding.cool.** Treats provenance as typography (small
   type, immediately under the figure, never a footnote nobody scrolls to) and
   freely typesets a non-numeric cell differently from the numeric cells in
   the same row. Model for B's placement, and for letting the `—` cell read as
   a deliberate different thing rather than a broken number.
3. **Stripe Press — press.stripe.com.** Hairline rules, mono small-caps,
   left-aligned rows, almost no filled containers. Reused **deliberately**
   from the pilot card's PASS 1: pointing C and D at the same reference the
   lower page already followed is what makes this a page rather than three
   independently-tasteful sections. (Chosen over Linear for the pilot's
   reason: Linear's card-and-gradient vocabulary is the generic-SaaS look the
   spec's design step rules out.)

**Explicitly unchanged** (so the diff stays reviewable and nothing regresses):
`ProblemSection({ onChapter })` keeps its signature and its call site at line
1429; `id="why"` stays (the `IntersectionObserver` chapter map keys `'why': 1`
and the `ids` array, lines 1393/1401); the chapter label text stays; the three
display lines stay verbatim; the closing differentiator sentence stays
verbatim; `PAIN_POINTS` stays a module-level const in place; `2am` survives in
the copy; no new dependency, no new file, no shared component touched.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Cross-file impact — grep, not assertion.**

```
$ grep -rn "ProblemSection" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:569:function ProblemSection({ onChapter }: ...
./apps/web/src/pages/LandingPage.tsx:1170:   already made by ProblemSection's closing line, so it shows the artifact
./apps/web/src/pages/LandingPage.tsx:1429:        <ProblemSection onChapter={onChapter} />

$ grep -rn "PAIN_POINTS" --include=*.tsx . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:563:const PAIN_POINTS = [
./apps/web/src/pages/LandingPage.tsx:595:          {PAIN_POINTS.map((p, i) => (

$ grep -rn "77%|1 in 3|running on empty|not lazy" (apps/, worker/, docs/)
./apps/web/src/pages/LandingPage.tsx:564,565,581   (the section itself)
./worker/src/services/ai/gemini-live.ts:286        ("1 in 3 responses" — prompt text, unrelated)
./worker/src/services/ai/groq.ts:1441              ("1 in 3 messages" — prompt text, unrelated)
```

Neither `ProblemSection` nor `PAIN_POINTS` is exported; the only consumer is
the one call site in the same file. The two `worker/` hits are unrelated LLM
prompt copy. **Confirmed: no cross-file impact.** `id="why"` is load-bearing
(chapter observer) and must survive.

**Against the spec's goals** — ✅ named reference inspiration, each tied to a
specific decision; ✅ scoped to one function in one file; ✅ ends in a working
build, not a mockup.

**Against the binding anti-goal** (*"ending this pass with the UI looking
'different' rather than verifiably better"*) — every change removes a named
defect: a fabricated statistic, missing provenance, the page's last three
filled containers, an inconsistent coda alignment, a contradictory font stack.
The strongest of those is not cosmetic at all: the page currently makes a
measurement claim it cannot support, in its opening content.

**Verdict: APPROVED with one change and one cut.**

- **KEEP** — the `—`/no-data cell (A); the row-level provenance note (B); the
  unfilled ruled columns (C); the left-aligned coda (D); the class-based fonts
  (E); `id="why"`, the signature, and all retained copy.
- **CHANGE 1 — do not write per-figure citations.** I can name a plausible
  origin for the 77% figure (a widely-recirculated Deloitte workplace-burnout
  survey) but not for the India loneliness figure, and a fabricated or
  guessed-at citation is *strictly worse* than the unsourced status quo — it
  is precisely the defect this card exists to remove. So: one honest
  row-level provenance note, plus a `shortcut:` comment in the code recording
  that exact per-figure sources should replace it once whoever owns the copy
  confirms them. Carried into the report as a known limitation.
- **CUT — the per-figure accent colour on the `—` cell.** An
  orange/indigo/sage trio reads as three measured series. The unmeasured cell
  must sit in `T.muted`, visually subordinate, or the dash just becomes a
  fourth-colour number. (`accent` stays on the two real figures.)
- **Accessibility floor held:** a bare `—` is announced as nothing useful, so
  the dash is `aria-hidden` and the cell's visible `no data` label carries the
  meaning; the coda stays a `<p>`; all colour stays on existing `T.*` token
  pairings already shipped on this page (`T.muted`/`T.ink` on `T.bg`), so no
  new contrast risk. Nothing in the section becomes focusable or clickable.

### PASS 3 — Build / verification record (state: running -> review -> merged)

- **RED** (pre-implementation, unmodified `LandingPage.tsx`):
  `LandingPage.problem.test.tsx` → **5 passed / 3 failed**. The 5 "baseline
  contract" tests passed against the old code (baseline genuinely established,
  per brief Step 4) — and the dumped `#why` textContent in the failure output
  confirms it ("…1 in 3Indianssay they have nobody to talk to when things get
  hard**0AI companions**that know your name, your family, and your 2am…").
  The 3 "redesign" tests failed exactly as intended: the `no data` / not-`AI
  companions` assertion, `expected ... to match /not our own research/i`, and
  `expected ... to have a length of +0 but got 1` (the centred coda).
- **GREEN** (post-implementation): **8/8 passed**.
- **Full suite:** `cd apps/web && npx vitest run` → **24 files, 246 tests, all
  passing** (0 failures).
- **Build:** `npm run build` → `✓ built in 14.72s`, no errors; `LandingPage`
  chunk 77.42 kB (gzip 21.78 kB) vs 77.42/21.77 pre-change — i.e. no
  meaningful bundle cost.
- **Visual / interaction check:** built `dist` served from a local static
  server on :4181 and driven over CDP in **headless Edge** (`msedge.exe
  --headless=new --remote-debugging-port=9229`; Playwright's bundled Chromium
  is blocked by an OS Application Control policy on this machine, as recorded
  on the pilot card). Scrolled `#why` into view at 1440x900 and 390x844,
  captured screenshots and **looked at them**, and read computed styles out of
  the live DOM. Measured:
  - `cellBackgrounds: ["rgb(248,246,241)" x3]` = `T.bg`. `T.surface` would be
    `rgb(251,250,247)` — **0 of 3 cells are filled**; the grid's 1px gaps read
    as rules on the page ground.
  - `numeralFonts: ["Playfair Display, Georgia, serif" x3]` — the figures now
    match the display lines above them; pre-change they fell through the
    contradictory `'Roboto', serif` stack to Roboto.
  - `numeralText: ["77%", "1 in 3", "—"]`; `thirdNumeralColor:
    rgb(110,114,135)` = `T.muted` (no accent, per PASS 2's cut);
    `thirdNumeralAriaHidden: "true"` with the visible `no data` label carrying
    the meaning.
  - provenance note present in DM Mono at opacity 0.6, full text verified.
  - coda: `text-align: start`, parent `max-width: 720px`, `border-top: 1px`,
    text still "…Riva shows up before you do. That's the difference. / We made
    something different."
  - `focusableInWhy: 0`; `docScrollWidth === docClientWidth` at both widths
    (1440/1440, 390/390) — **no horizontal overflow**; columns sit in one row
    at 1440 and stack to three rows at 390.
  - **`consoleErrors: []`** at both widths.
- **Primary interaction verified:** `#why` is the `'why': 1` chapter target.
  Scrolling it into view in the live built page keeps the chapter rail showing
  `THE PROBLEM` (visible in the desktop screenshot) — the `IntersectionObserver`
  still fires on the section, and the `id` plus the `onChapter` wiring are
  untouched.
- **One fix made after looking at the screenshot:** Playfair's descenders
  ("lazy.", "empty.") were being clipped flat by the reveal mask — the display
  lines sat at `lineHeight: 1.0` inside an `overflow: hidden` wrapper. Raised
  to `1.14` and re-verified visually; descenders now render in full. A
  pre-existing defect, but in this card's own region and in the page's first
  content.
- **Known limitation carried forward (PASS 2 CHANGE 1):** the provenance note
  is row-level, not per-figure. A `shortcut:` comment above `PAIN_POINTS`
  records that exact citations should replace it. Not a blocker — it strictly
  improves on the unsourced status quo — but it is the one open content item.

### PASS 4 — Coordinator review fixes (state: merged, re-verified)

Two Important findings, both fixed; both Minor suggestions taken.

1. **Disclosure contrast (Important).** The provenance note rendered at
   `fontSize: 9` / `opacity: 0.6` on `T.muted`. Confirmed the reviewer's
   figure exactly: flattened against `T.bg`, that is **2.22:1** — far under the
   4.5:1 AA floor, on the one element carrying the card's honesty disclosure.
   Dropping the opacity and lifting to 11px got it to **4.40:1 — still short**,
   because `T.muted` itself only reaches 4.40:1 on `T.bg`. So the note now uses
   `hsl(230, 10%, 44%)` — `T.muted`'s own hue and saturation, four lightness
   points down — measuring **5.04:1**. Visually near-identical, legible, still
   subordinate to the 13.6px cell descriptions above it.
2. **Wording (Important).** "Self-reported figures from published workplace and
   loneliness surveys — not our own research" asserted a provenance class that
   could not be backed (no source was identified for the 1-in-3 figure). Now:
   **"Widely circulated workplace and loneliness figures; primary sources not
   verified by us."**
3. **Coda test (Minor, taken).** The old assertion only caught centring and
   would have passed if the coda were deleted. It now also asserts the positive:
   the differentiator sentence is still present, its frame has `border-top: 1px
   solid` and `max-width: 720px`.
4. **No-data cell test (Minor, taken).** New test pins the em dash itself
   (`rv-display` element whose text is `—`) and its `aria-hidden="true"`, so
   re-fabricating a numeral there fails the suite.

Re-verified: `LandingPage.problem.test.tsx` **10/10**; full suite **24 files /
248 tests, 0 failures**; `npm run build` ✓ in 15.30s, `LandingPage` 77.42 kB
(gzip 21.77 kB). Re-checked in headless Edge over CDP at 1440x900 and 390x844 —
note computes to `rgb(101, 105, 123)` at `11px` with flattened opacity `1`,
text matches the new wording, `focusableInWhy: 0`, no horizontal overflow at
either width, `consoleErrors: []`. Screenshots re-captured (switched to
`Page.captureScreenshot` with a `clip` on `#why` plus `captureBeyondViewport`,
since Lenis kept snapping the scroll back to the hero) and reviewed: the
disclosure is now plainly readable and the full coda is visible, left-aligned
under its hairline.

The two uncited figures (77%, 1-in-3) remain open as a human content decision,
escalated by the coordinator — no code action taken here.
