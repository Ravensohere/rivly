---
id: landing-whynot-promise
title: Landing Page - Why Not & Promise Sections
owner: task-2-agent (solo; design + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = design, PASS 2 = product-fit)
---

# Card: Landing Page - Why Not & Promise Sections

This card represents the redesign/verification pass for the Landing Page - Why Not & Promise Sections feature/page in the Rivly web app.

## Details

- **Status:** merged (review pass recorded below)
- **Owner:** task-2-agent
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

**What is there now** (`LandingPage.tsx:1169-1259`)

- `WhyNotSection` — a centred block of giant serif type: "ChatGPT answers when
  you ask. / Gemini answers when you ask. / *Riva shows up before you do.*",
  then a second centred italic shout: "That's not a feature difference. /
  That's a relationship difference." No chapter marker (every other section on
  the page has one).
- `PromiseSection` — 280vh sticky shell, scroll-driven `WordReveal` headline
  ("Not here to optimise you."), then **three icon + title + description cards**
  in a `md:grid-cols-3` with border, filled background, 22px radius and a
  `whileHover={{ y: -5 }}` lift; then a tinted quote box.

**The two real problems (not "it looks dated")**

1. **The WhyNot copy is a near-verbatim repeat.** `ProblemSection` already
   closes, 600 lines earlier, with "Every AI answers when you ask. Riva shows
   up before you do. That's the difference." (line 611). WhyNot says the same
   sentence again, louder, with competitor names attached. A calm product
   repeating its own differentiator twice in one scroll reads as anxious, and
   naming ChatGPT/Gemini to argue with them reads as defensive.
2. **The Promise cards are the page's *third* icon-card grid.** `FeaturesSection`
   has one, `RivaSection` has one (line 1140), `PromiseSection` has one. Same
   icon-top / title / small-grey-paragraph unit each time. That repetition — not
   any single card — is what makes the lower page read "generic SaaS". The page
   has exactly two registers (giant display type, and icon cards) and nothing in
   between.

**Proposed direction: show one artifact, then drop to a quieter register.**

A. `WhyNotSection` → **"the message you didn't have to send"**. Replace the
   declamation with the thing itself, side by side:
   - an interlude micro-label (`Interlude · The difference`) so the section
     joins the chapter spine it currently skips — *without* renumbering
     chapters (renumbering would mean touching the `IntersectionObserver` map
     and `ChapterLabel`, outside this card);
   - left: a **dead prompt field** — an empty, disabled input specimen with the
     placeholder every assistant shows ("Ask me anything…") and a mono caption
     "waits for you to type";
   - right: a **message that already arrived** — an indigo-tinted bubble,
     "Didn't see your check-in this morning. Rough start, or just a slow one?",
     with a mono stamp "08:41 · she messaged first";
   - the one line worth keeping ("That's not a feature difference. That's a
     relationship difference.") survives as a small left-aligned coda under a
     hairline — stated once, quietly, instead of shouted centred.
   This adds the page's missing third register: a **product specimen**. The page
   currently has zero UI of the actual product in it — only type, decorative
   SVGs and cards. Rivly is a voice/WhatsApp companion, so a message bubble is
   product-true, not decoration.

B. `PromiseSection` → **ledger rows, not a card grid**. Keep the 280vh sticky
   shell, `id="promise"`, the chapter label, the `WordReveal` headline and the
   `showCards` scroll gate (all load-bearing). Change the three cards into three
   **hairline-ruled rows**: small mono index (`01/02/03`), a low-opacity indigo
   glyph (keeps the existing `Sun`/`Moon`/`Wind` imports), title, one line of
   copy — left-aligned, single column, no box, no fill, no hover lift. Nothing
   on a page about rest should jump 5px when the cursor nears it. The closing
   quote keeps its words but loses the tinted panel, so the chapter lands on a
   hairline rather than on a fourth box.
   Copy loses its sales clauses: "Distraction-aware. Flow starts here." →
   "Nothing else asking for you."; "You earned this." → "no earning it first".

**Reference sites (specific, and why these three)**

1. **Things — culturedcode.com/things.** The calmest well-known productivity
   site: it argues by showing one real, quietly-framed screen of the product
   instead of a grid of capability cards. Direct model for A — the dead prompt
   field vs. the message that already arrived *is* the argument, so no slogan
   has to make it.
2. **Stripe Press — press.stripe.com.** Editorial register built from hairline
   rules, mono numerals and left-aligned rows with generous whitespace, almost
   no filled containers. Direct model for B's ruled ledger, and for the
   small-type/large-type contrast the page is missing. (Chosen over Linear,
   whose restraint is admirable but whose card-and-gradient vocabulary is
   exactly the "generic SaaS dashboard" look the spec's design step rules out.)
3. **iA Writer — ia.net/writer.** Makes the product's own text the hero and
   lets type weight and a single accent colour carry hierarchy where other
   sites reach for icons. Model for the indigo/muted type pairing in A and for
   demoting the icons in B to a quiet glyph rather than the card's lead element.

**Explicitly unchanged** (so the diff stays reviewable and nothing regresses):
`WhyNotSection()` still takes no props; `PromiseSection({ onChapter })` keeps
its signature and call order at line ~1394-1395; `id="why-not"` and
`id="promise"` both stay (the navbar links `#promise`, and the chapter observer
keys on it); the 280vh/sticky/100dvh scroll mechanics stay; no new dependency,
no new file, no shared component touched.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Cross-page impact — grep, not assertion.**
`grep -rn "WhyNotSection|PromiseSection"` across the repo returns **4 hits, all
in `apps/web/src/pages/LandingPage.tsx`**: the two definitions (1169, 1190) and
the two call sites (1394, 1395). Neither is exported. A second grep for
`why-not|#promise|"Not here to optimise"|"relationship difference"|"Space to
focus"` across `apps/`/`docs/` found no other consumer: the only `#promise`
reference is the `Footer` link in the same file (plus the navbar's `Promise`
item, which builds `#promise` from its label), and the remaining hits are the
plan/brief docs. **Confirmed: no cross-page impact. Both `id`s must survive
(footer + navbar anchors, and the `IntersectionObserver` chapter map keys
`'promise': 6`).**

**Against the spec's goals** — ✅ named reference inspiration (3 real sites,
each tied to a specific decision); ✅ stays inside one card's file region; ✅
ends in a working build, not a mockup.

**Against the anti-goals** — the binding one is *"ending this pass with the UI
looking 'different' rather than verifiably better."* PASS 1 passes only because
each change names a defect it removes: a duplicated differentiator claim (vs.
line 611), the third instance of one card pattern, a missing chapter marker, and
a hover-lift that contradicts the section's own subject. Plus one measurable
win: three ruled rows are ~270px tall stacked on mobile where three filled
cards are ~480px, inside a `100dvh` sticky frame — so the Promise chapter stops
overflowing on short phone viewports. That is a real improvement, not a
restyle.

**Verdict: APPROVED with two changes and one cut.**

- **KEEP** — the two-panel prompt-vs-message specimen (A); the ruled ledger (B);
  the interlude label; dropping the hover lift; both `id`s and both signatures.
- **CHANGE 1** — the dead prompt field must not look operable. A focusable
  empty `<input>` invites a click that does nothing, which is worse than the
  slogan it replaced. Render it as a non-interactive `div` specimen with
  `aria-hidden` on the decorative send glyph, so nothing in it is reachable by
  keyboard or offers a dead click target.
- **CHANGE 2** — don't put competitor names in the panel label. "Every other
  assistant" carries the same meaning without the page picking a fight; it also
  keeps the claim true as the market changes.
- **CUT** — the `data-h="true"` custom-cursor flag on the Promise rows. `data-h`
  swells the cursor ring to signal "this is interactive"; the rows are plain
  content. The current cards carry it incorrectly too; this card fixes it in
  the region it owns.
- **Accessibility floor held:** the bubble and caption are real text (not an
  image), the quote stays a `<p>`, and contrast stays on existing `T.*` tokens
  — `T.indigo` on `T.indigoSub`, `T.muted` on `T.bg` — i.e. the same pairings
  already shipped elsewhere on this page, so no new contrast risk is introduced.

### PASS 3 — Build / verification record (state: running -> review -> merged)

- **RED** (pre-implementation, unmodified `LandingPage.tsx`): 4 passed / 2 failed.
  The 3 "baseline contract" tests passed (baseline established, per brief Step 4);
  the redesign tests failed on `expected '...' to contain 'Every other assistant'`
  and `expected '...' to contain '01'`.
- **GREEN** (post-implementation): 6/6 passed.
- **Full suite:** `npm test` -> 23 files, 238 tests, all passing.
- **Build:** `npm run build` -> `built in ~24s`, no errors; `LandingPage` chunk
  76.93 kB (gzip 21.61 kB).
- **Visual / interaction check:** built `dist` served on :4178 and driven over
  CDP in headless Edge (Playwright's chromium is blocked by an OS Application
  Control policy on this machine). Scrolled to both sections at 1440x900 and
  390x844 and captured screenshots, which were reviewed.
  Observed: both why-not panels render side by side at desktop and stacked on
  mobile with no horizontal overflow, opacity 1; 0 focusable elements inside
  `#why-not` (the prompt specimen is genuinely inert); the Promise ledger shows
  3 ruled rows indexed 01/02/03, revealed by the scroll gate (opacity 1 only
  after scrolling past ~45% of the 280vh shell), 0 `data-h` hover-lift nodes,
  quote with no box; Promise content 780px inside a 900px desktop frame and
  478px inside an 844px mobile frame (the old cards overflowed short phones);
  **0 console errors**.
- One fix made after looking at the screenshot: the ledger's description column
  did not align across rows (titles vary in width), so the title span got
  `md:min-w-[185px]`. Re-verified after the fix.
