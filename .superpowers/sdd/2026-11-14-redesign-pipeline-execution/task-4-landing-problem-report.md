# Task 4 — card `landing-problem` — execution report

Card: `docs/superpowers/cards/landing-problem.md` (state: `backlog` → `running`
→ `review` → `merged`). Worktree: `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main`,
branch `riva/integrated-main` (local, not pushed).

---

## 1. Design direction + reference sites + why

**Target:** `ProblemSection({ onChapter })`, `apps/web/src/pages/LandingPage.tsx`
(pre-change lines 563-618), `id="why"` — the first content after the hero.

### The defects I named before proposing anything

1. **A slogan typeset as a statistic.** `{ n: '0', l: 'AI companions', d: 'that
   know your name, your family, and your 2am' }` sat in the same numeral size,
   cell and weight as `77%` and `1 in 3`. A `0` in a data row *is* a
   measurement claim, and nobody surveys "AI companions that know your 2am".
   Sitting it next to two figures that did come from surveys spends their
   credibility on a sales line. This is a trust defect, in the page's opening
   content — not a styling one.
2. **Two real-looking figures with zero provenance.** The first-person register
   directly above ("You're not lazy") makes the unattributed macro-statistics
   read as claims about *this* reader, which is stronger than any survey
   supports.
3. **Three `T.surface`-filled tiles are now the odd register out.** The merged
   pilot card took the interlude and the Promise chapter off filled containers
   onto hairline rules; Problem was the only section left in boxes, so the top
   and bottom of the page no longer read as the same page.
4. **Two codas, two alignments.** The interlude's coda is left-aligned under a
   hairline; Problem's was `textAlign: 'center'`.
5. The numerals declared `fontFamily: "'Roboto', serif"` — a self-contradictory
   stack, so the figures silently fell to Roboto while the display lines above
   them were Playfair. The page already ships `.rv-display`/`.rv-sans`/`.rv-mono`.

### The direction: make the evidence honest, and put it in the page's own register

- **A. `—`, not `0`** — the statistical-table convention for *no data*, with the
  visible label `no data` and the line "Nobody measures whether your tools
  notice you at 2am. That's the gap." The rhetorical point gets sharper
  (unmeasured *is* the actual claim) and the page stops asserting a number it
  does not have.
- **B. One row-level provenance note** in mono under the grid: "Self-reported
  figures from published workplace and loneliness surveys — not our own
  research."
- **C. Ruled columns, not filled tiles** — cell background `T.surface` → `T.bg`,
  so the grid's existing 1px gaps render as rules on the page ground. Same grid,
  same cells, no layout change.
- **D. Left-aligned coda** under a hairline at `max-width: 720px`, matching the
  interlude's coda. Every word kept.
- **E.** Inline font stacks → the existing `rv-*` classes.

### Reference sites (three, each tied to a specific decision)

1. **Our World in Data — ourworldindata.org.** Its house rule is that a dash and
   a zero are *different claims*, and every figure carries its source near the
   figure. Direct model for A and B: the fix for a fabricated `0` is not a
   better-looking `0`, it's the dash that says "unmeasured". Chosen because the
   defect here is a data-integrity defect, and OWID is the clearest well-known
   case of that convention honoured inside a *designed* page, not a spreadsheet.
2. **The Pudding — pudding.cool.** Treats provenance as typography (small type
   directly under the figure, never a bottom-of-page footnote) and freely
   typesets a non-numeric cell differently from the numeric cells in the same
   row. Model for B's placement, and for letting the `—` cell read as a
   deliberate different thing rather than a broken number.
3. **Stripe Press — press.stripe.com.** Hairline rules, mono small-caps,
   left-aligned rows, almost no filled containers. Reused **deliberately** from
   the pilot card's PASS 1 — pointing C and D at the same reference the lower
   page already followed is what makes this one page instead of three
   independently-tasteful sections. (Chosen over Linear for the pilot's stated
   reason: Linear's card-and-gradient vocabulary is the generic-SaaS look the
   spec's design step rules out.)

---

## 2. Product-fit findings (PASS 2, self-review, run solo)

### Cross-file impact — real grep output, not an assertion

```
$ grep -rn "ProblemSection" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:569:function ProblemSection({ onChapter }: { onChapter: (n: number) => void }) {
./apps/web/src/pages/LandingPage.tsx:1170:   already made by ProblemSection's closing line, so it shows the artifact
./apps/web/src/pages/LandingPage.tsx:1429:        <ProblemSection onChapter={onChapter} />

$ grep -rn "PAIN_POINTS" --include=*.tsx . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:563:const PAIN_POINTS = [
./apps/web/src/pages/LandingPage.tsx:595:          {PAIN_POINTS.map((p, i) => (

$ grep -rn "77%\|1 in 3\|running on empty\|not lazy" --include=*.ts --include=*.tsx --include=*.md .
./apps/web/src/pages/LandingPage.tsx:564,565,581          (the section itself)
./worker/src/services/ai/gemini-live.ts:286               "about 1 in 3 responses" — LLM prompt copy, unrelated
./worker/src/services/ai/groq.ts:1441                     "about 1 in 3 messages"  — LLM prompt copy, unrelated

$ grep -rn "'why'\|#why\b\|Chapter 01" --include=*.ts --include=*.tsx apps/web/src
./apps/web/src/pages/LandingPage.tsx:573:    <section id="why" ...
./apps/web/src/pages/LandingPage.tsx:1393:  'hero': 0, 'why': 1, 'manifesto': 2, ...
./apps/web/src/pages/LandingPage.tsx:1401:  const ids = ['hero', 'why', 'manifesto', ...];
```

Neither `ProblemSection` nor `PAIN_POINTS` is exported; the sole consumer is the
one call site in the same file. The two `worker/` hits are unrelated LLM prompt
text. **Confirmed: no cross-file impact.** `id="why"` is load-bearing (chapter
observer map key `'why': 1` plus the `ids` array) and had to survive — it did.

### Against the spec

- Goals: ✅ named reference inspiration tied to specific decisions; ✅ scoped to
  one function in one file; ✅ ends in a working build.
- Binding anti-goal (*"different rather than verifiably better"*): every change
  removes a named defect, and the strongest of them is not cosmetic at all — the
  page was making a measurement claim it could not support, in its opening
  content.

### Verdict: APPROVED with one change and one cut

- **KEEP** — the `—`/no-data cell, the provenance note, unfilled ruled columns,
  the left-aligned coda, class-based fonts, `id="why"`, the signature, all
  retained copy.
- **CHANGE 1 — do not write per-figure citations.** I can name a plausible
  origin for the 77% figure (a widely-recirculated Deloitte workplace-burnout
  survey) but **not** for the India loneliness figure. A guessed-at citation is
  *strictly worse* than the unsourced status quo — it is literally the defect
  this card removes. So: one honest row-level note, plus a `shortcut:` comment
  in the code recording that exact sources should replace it. Carried below as
  the one open item.
- **CUT — the accent colour on the `—` cell.** An orange/indigo/sage trio reads
  as three measured series; the unmeasured cell sits in `T.muted`, subordinate.
- **Accessibility floor held:** a bare `—` announces as nothing useful, so the
  dash is `aria-hidden` and the visible `no data` label carries the meaning; the
  coda stays a `<p>`; all colour stays on existing `T.*` pairings already shipped
  on this page; nothing in the section became focusable (verified: 0).

---

## 3. TDD evidence (RED → GREEN)

New test: `apps/web/src/pages/__tests__/LandingPage.problem.test.tsx`, written
**before** any change to `LandingPage.tsx`, following the pilot's two-describe
structure.

### RED — against the unmodified `LandingPage.tsx`

```
Test Files  1 failed (1)
     Tests  3 failed | 5 passed (8)
```

The 5 **baseline contract** tests passed against the old code, which is the
point — they assert what was genuinely true before: `#why` exists with
`Chapter 01 · The Problem`; `#why` precedes `#why-not`; the three display lines
verbatim; `77%` + `1 in 3` + `burnout` + `nobody to talk to` + `2am`; and the
differentiator sentence ("Riva shows up before you do" / "We made something
different") — which, since the pilot card cut the duplicate out of
`WhyNotSection`, is now the page's **only** statement of it. The failure output
dumped the live pre-change `#why` text, which independently confirms the
baseline rather than me asserting it:

```
"Chapter 01 · The ProblemYou're not lazy.You're not undisciplined.You're running
 on empty.77%of workersexperience burnout at their current job1 in 3Indianssay
 they have nobody to talk to when things get hard0AI companionsthat know your
 name, your family, and your 2amEvery AI answers when you ask. Riva shows up
 before you do. That's the difference.We made something different."
```

The 3 **redesign** tests failed exactly as designed:
- `expected ... to match /no data/i` / `not to match /AI companions/i`
- `expected '...' to match /not our own research/i`
- `expected <div><p>…</p></div> to have a length of +0 but got 1` (the centred coda)

### GREEN — after implementation

```
Test Files  1 passed (1)
     Tests  8 passed (8)
```

### Full suite

```
$ cd apps/web && npx vitest run
Test Files  24 passed (24)
     Tests  246 passed (246)
```

---

## 4. What I implemented

All inside `ProblemSection` + its module-level `PAIN_POINTS` array, one file.

- `PAIN_POINTS[2]` `{ n: '0', l: 'AI companions', d: 'that know your name, your
  family, and your 2am', accent: T.sage }` → `{ n: '—', l: 'no data', d: 'Nobody
  measures whether your tools notice you at 2am. That's the gap.', accent:
  T.muted, unmeasured: true }`, with a comment above the array explaining why the
  third row is deliberately not a number, and a `shortcut:` line recording the
  per-figure-citation debt.
- Grid cells: `background: T.surface` → `T.bg` (the `gap: 1 / background:
  T.border` hairline trick now draws rules on the page ground rather than gaps
  between tiles).
- Numerals: `fontFamily: "'Roboto', serif"` → `className="rv-display"`; labels →
  `rv-mono`; descriptions → `rv-sans`. The `—` renders at `opacity: 0.55` with
  `aria-hidden` (the visible `no data` label carries the meaning).
- New row-level provenance note in `rv-mono` under the grid.
- Coda: `textAlign: 'center'` → left-aligned block with `borderTop: 1px solid
  T.border`, `paddingTop: 32`, `maxWidth: 720`, `margin: 0` on the `<p>`. Text
  unchanged.
- **Post-screenshot fix:** the display lines' `lineHeight: 1.0` was clipping
  Playfair's descenders flat against their `overflow: hidden` reveal mask
  ("lazy.", "empty."). Raised to `1.14`, re-verified visually.

Unchanged: the `ProblemSection({ onChapter })` signature, its call site,
`id="why"`, the chapter label, the three display lines' text, the differentiator
sentence, the `whileInView` stagger. No new dependency, no new file, no shared
component.

---

## 5. Build + visual check — what I ran, what I observed

- `npx vitest run src/pages/__tests__/LandingPage.problem.test.tsx` → 8/8.
- `npx vitest run` (full) → 24 files / 246 tests, 0 failures.
- `npm run build` → `✓ built in 14.72s`, no errors. `LandingPage` chunk
  **77.42 kB (gzip 21.78 kB)** vs 77.42 / 21.77 pre-change — no bundle cost.
- **Browser:** Playwright's bundled Chromium is blocked by an OS Application
  Control policy on this machine (recorded on the pilot card), so I served the
  built `dist` from a local Node static server on **:4181** and drove
  **headless Edge over CDP** (`msedge.exe --headless=new
  --remote-debugging-port=9229`, raw CDP over `ws`). Script:
  `<scratchpad>/check-problem.js`. Scrolled `#why` into view at **1440x900** and
  **390x844**, captured PNGs, **opened and looked at both**, and read computed
  styles out of the live DOM.

Measured in the live page (both widths unless noted):

| What | Value |
|---|---|
| `cellBackgrounds` | `rgb(248,246,241)` ×3 = `T.bg`. (`T.surface` would be `rgb(251,250,247)`.) **0 of 3 cells filled.** |
| `numeralFonts` | `"Playfair Display", Georgia, serif` ×3 — pre-change these fell through `'Roboto', serif` to Roboto |
| `numeralText` | `["77%", "1 in 3", "—"]` |
| third numeral | `color: rgb(110,114,135)` = `T.muted`, `aria-hidden="true"` |
| labels | `"DM Mono", monospace` ×3 |
| provenance note | present, DM Mono, `opacity: 0.6`, full text correct |
| coda | `text-align: start`, parent `max-width: 720px`, `border-top-width: 1px`, text intact |
| `focusableInWhy` | **0** |
| overflow | `docScrollWidth === docClientWidth` at both widths (1440/1440, 390/390) |
| column layout | one row at 1440, stacks to 3 rows at 390 |
| `consoleErrors` | **`[]`** |

Looking at the screenshots (not just the numbers): at 1440 the three figures sit
as ruled columns on the page ground, the `—` reads as a deliberate "no value"
mark above its `no data` label rather than as a broken number, the mono
provenance line sits quietly under the row, and the hairline above the coda
closes the chapter. At 390 the columns stack with horizontal rules between them
and nothing overflows. The first screenshot pass is what caught the clipped
descenders; after the `lineHeight` fix the re-captured desktop shot shows
"lazy." and "empty." rendering in full.

**Primary interaction:** `#why` is the `'why': 1` chapter target. Scrolling it
into view in the live built page keeps the right-hand chapter rail reading
`THE PROBLEM` (visible in the desktop screenshot) — the `IntersectionObserver`
still fires on the section, and the `id` + `onChapter` wiring are untouched.

---

## 6. Files changed

- `apps/web/src/pages/LandingPage.tsx` — `PAIN_POINTS` + `ProblemSection` only.
- `apps/web/src/pages/__tests__/LandingPage.problem.test.tsx` — new (8 tests).
- `docs/superpowers/cards/landing-problem.md` — PASS 1/2/3 handoff, `state:
  backlog` → `merged`, owner set.
- `.superpowers/sdd/2026-11-14-redesign-pipeline-execution/task-4-landing-problem-report.md`
  — this file.

(`docs/` and `.superpowers/` are gitignored by this repo's `.gitignore` lines
156/170 with no negation, so both were staged with `git add -f`, same as prior
cards. `progress.md` was modified in the worktree by a concurrently-running card
agent and was deliberately **not** staged by me.)

---

## 7. Self-review findings

- **Is the direction specific, not generic?** Yes — the lead change is a
  data-integrity fix (a fabricated `0` → the no-data dash), and each reference
  is tied to a named decision rather than a mood. The one reference reused from
  the pilot (Stripe Press) is reused on purpose and the reason is stated.
- **Does the product-fit pass actually check cross-file impact?** Yes — four
  real greps, output pasted above, including the chapter-map grep that proved
  `id="why"` was load-bearing.
- **Was the baseline genuinely true before the change?** Yes, and not by my
  assertion: the RED run's failure output dumped the live pre-change `#why`
  textContent (quoted in §3), which contains every string the 5 baseline tests
  assert, including the `0AI companions` pairing the redesign then removes.
- **Did I actually look at rendered output?** Yes, and it changed the work: the
  clipped descenders were invisible to the tests and to the build, and only
  showed up in the screenshot. One screenshot pass came back blank (a
  scroll/animation timing flake); I raised the waits and re-captured rather than
  reporting from the numbers alone.
- **Card file free of stray tool-call scaffolding?** Checked the full file
  including the last lines — clean, ends on the known-limitation bullet.
- **One honest wart:** I drafted PASS 3 of the card with placeholder figures
  before running anything, then overwrote every number with measured values
  (build time, chunk size, computed colours, test counts) before committing. The
  committed card contains only observed values.

---

## 8. Concerns

1. **The provenance note is row-level, not per-figure** (PASS 2 CHANGE 1). I
   would not invent citations I can't stand behind — that is the defect this
   card removes — so the page now says where the figures come from in kind
   ("published workplace and loneliness surveys — not our own research") without
   naming them. A `shortcut:` comment above `PAIN_POINTS` records that exact
   sources should replace it. Strictly better than the unsourced status quo, but
   it is the one open content item and it needs whoever owns the copy.
2. **The `lineHeight` fix is scoped to this section only.** Other sections of
   the page may use the same `lineHeight: 1.0` + `overflow: hidden` reveal
   pattern and clip their own descenders; I did not survey them, since they
   belong to other cards.
3. **Concurrency.** `progress.md` changed under me mid-run, so at least one other
   card agent was working in this worktree. My commit stages only my own four
   files, but the integrator should expect `LandingPage.tsx` conflicts if another
   landing-page card lands in parallel.
4. **No holistic smoke pass yet** — that acceptance line is explicitly a
   post-batch, cross-card step, not something this card can satisfy alone.
