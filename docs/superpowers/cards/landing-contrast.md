---
id: landing-contrast
title: Landing Page - Contrast Section
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

# Card: Landing Page - Contrast Section

This card represents the redesign/verification pass for the Landing Page - Contrast Section feature/page in the Rivly web app.

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

**What is there now** (`LandingPage.tsx:699-762`)

`const STORY` (7 bad/good copy pairs) feeds `ContrastSection({ onChapter })`,
`id="contrast"` — a 300vh scroll track with a `position: sticky` full-viewport
split: a left panel (`T.cream` background) showing the current story's "bad"
line struck through in a dark red, and a right panel (`T.indigo` background,
animating width 30%→60% across the scroll) showing the "good" line in italic
off-white. Each panel carries a small uppercase chapter/section label and a
row of progress dots keyed to `active` (driven by `scrollYProgress`).

**Verdict going in: this structure does not need a rebuild.** Unlike
`landing-problem`/`landing-manifesto`, which found filled badge-chip rows and
generic-SaaS stat pills, this section's actual mechanism — a sticky
scroll-driven split where the "good" panel visibly grows to take over the
screen as you scroll — is a specific, intentional editorial device, not a
templated card grid. The design pass's job here is to find and name concrete
defects, not invent a new layout to replace a sound one.

**The defects found (named, so the change is checkable)**

1. **Left chapter label fails AA, worse than the page-wide bug.** `color:
   T.muted` on `background: T.cream` (not `T.bg` — this panel's own ground is
   `hsl(38,35%,92%)`, darker than the page's `hsl(38,35%,96%)`). Computed via
   independent sRGB-relative-luminance: **4.05:1**, under the 4.5:1 AA floor
   for normal text, and worse than the page-wide `T.muted`/`T.bg` figure
   (4.40:1) this pipeline's brief already flags as a known issue.
2. **Right chapter label fails AA hard.** `color: T.indigoXL` on `background:
   T.indigo` computes to **2.12:1** — less than half the AA floor. This is a
   materially worse defect than (1): at 2.12:1 the label is close to
   unreadable for a meaningful fraction of users, not merely under the
   nice-to-have threshold.
3. **Both labels are 8.5px**, one size below the 9px this file's two
   already-redesigned sections (`ProblemSection`, `ManifestoSection`) moved
   their own chapter markers to. Leaving Contrast at 8.5 would make it the
   odd one out among the sections this pipeline has already touched.

**Proposed direction: fix the two measured contrast failures in place; touch
nothing else.**

- **A.** Left label color → `hsl(230, 10%, 40%)` (a darker muted variant,
  same move `landing-problem`/`landing-manifesto` made for their own
  under-AA labels, re-derived for this panel's actual `T.cream` ground, not
  copied from either prior card's number). Computed: **5.38:1**.
- **B.** Right label color → `#FAFAF7` — reusing the off-white already used
  a few lines below for this same panel's "good" headline text, so no new
  color is introduced. Computed: **4.67:1**. (Tried first: reducing opacity
  on white for visual hierarchy instead of full-opacity — rejected, see PASS
  2, because any alpha under ~0.95 drops back under 4.5:1 on this
  background.)
- **C.** Both labels' `fontSize` → `9`, matching `ProblemSection`'s and
  `ManifestoSection`'s already-landed fix.
- **Explicitly not changed:** the 300vh sticky track, the `scrollYProgress`
  → `active` index derivation, the `rightW` width animation (30%→60%), the
  struck-through red "bad" copy treatment, the italic off-white "good" copy
  treatment, the progress dots, the `STORY` array's content and order,
  `id="contrast"`, and the function's signature/call site. None of these are
  defective — the two label colors and one font size are the whole fix.

**Reference sites (three, specific, each tied to a decision)**

1. **Basecamp's HEY.com marketing site.** The canonical real-world example
   of exactly this device — a struck-through "old way" statement set against
   a clean, un-struck "new way" statement, used to carry an entire marketing
   narrative without a stat or a card grid in sight. Cited to justify
   *keeping* the strikethrough/split mechanism rather than replacing it: it
   is a specific, well-executed pattern, not the generic-SaaS vocabulary the
   spec rules out.
2. **The Pudding (pudding.cool).** Reused from `landing-problem`'s PASS 1,
   here for the mechanism rather than the disclosure convention: Pudding's
   scrollytelling pieces commonly drive a sticky side-by-side comparison off
   scroll progress, exactly this section's `useScroll`/`scrollYProgress` →
   `active` index wiring. Cited to confirm the existing mechanism is already
   the right reference-grade pattern, not a cliché to swap out.
3. **Stripe Press (press.stripe.com).** Reused deliberately a third time
   (pilot, Problem, Manifesto, now Contrast) for the one thing this card
   does touch typographically: uppercase mono/sans small-caps labels at a
   consistent, legible size — justifying landing on the same 9px this file's
   other two redesigned sections already converged on, rather than a size
   unique to this section.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Cross-file impact — grep, not assertion.**

```
$ grep -rn "ContrastSection" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:709:function ContrastSection({ onChapter }: ...
./apps/web/src/pages/LandingPage.tsx:1471:        <ContrastSection onChapter={onChapter} />

$ grep -rn "\bSTORY\b" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:699,714,734,737,757,760   (all inside ContrastSection, same file)
./apps/web/src/pages/__tests__/LandingPage.contrast.test.tsx:82  (this card's own test, a comment)
```

`ContrastSection` is not exported; its only consumer is the one call site in
the same file. `STORY` is a module-local const used only inside
`ContrastSection`. **Confirmed: no cross-file impact.** `id="contrast"` is
load-bearing (`IntersectionObserver` chapter map key `'contrast': 3`, and the
`ids` array at line ~1433) and is untouched by this card's diff.

**Fabrication / honesty check (the pattern `landing-problem` and
`landing-manifesto` established) — every line in the `STORY` array examined
for a falsifiable claim, not just the two numeric-stat shapes the prior two
cards found.**

`STORY` has no numbers at all, so the obvious "fabricated stat" defect class
(`73%`, `0 streaks`) does not apply here. But two of its seven lines make
specific, checkable product claims rather than pure mood/register copy, and
both were verified against the shipped codebase rather than assumed honest
because they "sound fine":

- **`'Break the streak, lose it all'` (bad) / `'Both kinds of days count'`
  (good) — checked directly against the exact defect class the prior card
  found, and found NOT false.** `landing-manifesto` found `'0 streaks to
  break'` false because the shipped product has streaks. This line makes a
  narrower, different claim — not "Rivly has no streaks" but "a bad day
  doesn't erase what came before" — and that one holds up:
  `activityDerivation.ts:174-213` computes `currentStreak` (resets to 0 on a
  break) **and** `longestStreak` (a running max that never decreases) as
  separate values; `useAchievements.ts:366,433-434` keys every streak
  achievement's unlock state off `longestStreak`, not `currentStreak`, so a
  broken current streak does not revoke an earned achievement; and
  `rivaLanguage.ts:130` ships `streakEnded: "Streak ended. No worries, start
  fresh tomorrow!"` — explicitly non-punitive. "Both kinds of days count" is
  an accurate, if compressed, description of that behavior. Kept as-is; not
  part of this card's diff since it is correct.
- **`'Your parents are in another city'` (bad) / `'Riva takes care of them
  too'` (good) — checked for an invented feature, and found consistent with
  a shipped example, not a standalone fabrication.** `RIVA_FEATURES` in this
  same file (`LandingPage.tsx:1087`, `'Voice Commands'`) ships the exact
  worked example `'"Create a task to call mom."'` as a feature description
  elsewhere on this same page — so the couplet is compressed marketing
  language for an existing reminder/task-creation capability, not a claim
  that Riva independently contacts or monitors a third party. No
  caregiving/elder-monitoring feature exists in the codebase (`grep -i
  "caregiv|elder"` across `apps/web/src` returns nothing), and the couplet
  does not claim one. Kept as-is.
- **`'No one to talk to at 2am'` (bad) / `'Riva. Always.'` (good)** —
  treated as aspirational-availability marketing copy (the same register as
  `RIVA_FEATURES`'s `'She Reaches Out'` / `'She shows up'` language a few
  hundred lines below), not a literal uptime SLA. No shipped code
  contradicts it (no rate-limit or "Riva unavailable" messaging found).
  Flagged as the softest of the three, but not actionable without a general,
  page-wide policy on how literally to read aspirational companion-AI
  copy — out of scope for a single-section card to adjudicate alone.
- **The other four `STORY` lines are pure register/mood contrasts** ("Rush
  through everything" / "Focus on one thing at a time", etc.) with no
  checkable factual content — same category as the copy `landing-problem`
  and `landing-manifesto` left untouched.

**Result: no fabricated or false claim found in `ContrastSection`,** unlike
the prior two cards. This is reported explicitly rather than silently
skipped, per the brief's instruction to run this check "even if you find
none."

**Contrast, computed, not assumed.** The brief's page-wide note (`T.muted` on
`T.bg` = 4.40:1) does not describe either of this section's two labels,
because neither panel sits on bare `T.bg`:

| element | pairing | computed ratio | AA (4.5:1) |
|---|---|---|---|
| left label (before) | `T.muted` on `T.cream` | 4.05:1 | fail |
| left label (after) | `hsl(230,10%,40%)` on `T.cream` | 5.38:1 | pass |
| right label (before) | `T.indigoXL` on `T.indigo` | 2.12:1 | fail (hard) |
| right label (after) | `#FAFAF7` on `T.indigo` | 4.67:1 | pass |

Computed via independent sRGB-linearize → relative-luminance → WCAG contrast
formula (Node script, not a lookup table or reused prior-card number — this
section's backgrounds, `T.cream` and `T.indigo`, are different tokens from
either `T.bg` or the tinted ground `landing-manifesto` measured). Also
checked and rejected: dimming the right label via alpha instead of a flat
color change — every alpha tested below ~0.95 on white-over-`T.indigo` drops
under 4.5:1 (0.90 → 4.31:1, 0.85 → 4.04:1), so the fix stays fully opaque.

**Against the spec's goals** — named reference inspiration tied to specific
decisions; scoped to one function (plus the module-local `STORY` const it
alone reads) in one file; ends in a working build.

**Against the binding anti-goal** (*"ending this pass with the UI looking
'different' rather than verifiably better"*) — the diff is two hex/hsl color
values and one font-size number, each tied to a measured AA failure. Nothing
about the layout, copy, or motion changes, so "looks different" is not a risk
here; "measurably more legible, no visual regression" is the actual effect.

**Verdict: APPROVED, scope as proposed in PASS 1, no cuts.**

- **KEEP** — both color fixes (A, B), the font-size fix (C); the 300vh
  track, the scroll-to-`active` wiring, the width animation, the
  strikethrough/italic copy treatment, the `STORY` content and order,
  `id="contrast"`, all untouched.
- **No redesign of the split mechanism** — PASS 1 already argued this is a
  specific, non-generic device (HEY.com precedent); PASS 2 found no reason
  to revisit that call.
- **Accessibility floor held:** nothing in the section becomes focusable or
  clickable (it was not before); both label fixes clear 4.5:1 with margin;
  no color was removed from the existing token set (hex/hsl additions are
  one-off literals, same pattern `landing-manifesto` used for its own fix).
- **Noted, deliberately not fixed (out of scope):** `'Riva. Always.'`
  treated as acceptable aspirational copy rather than adjudicated as a
  literal availability claim — flagged above for whoever eventually sets a
  page-wide policy on how literally to read this kind of companion-AI
  marketing language, but not something one section's card can decide
  alone.

### PASS 3 — Build / verification record (state: running -> review -> merged)

- **RED** (pre-implementation, unmodified `LandingPage.tsx`):
  `LandingPage.contrast.test.tsx` → **5 passed / 2 failed**. The 5 baseline
  contract tests passed against the old code — confirming the baseline was
  genuinely established, not assumed — including the first `STORY` pair
  verbatim ("Rush through everything" / "Focus on one thing at a time") and
  the `#contrast` chapter-03 marker. The 2 redesign tests failed on exactly
  the predicted old computed colors: `rgb(110, 114, 135)` (old `T.muted`) and
  `rgb(163, 167, 220)` (old `T.indigoXL`) — matching the hand-computed
  baseline ratios (4.05:1, 2.12:1) exactly, confirming the math was right
  before any code changed.
- **GREEN** (post-implementation): **7/7 passed** — both labels now read
  `rgb(92, 95, 112)` / `rgb(250, 250, 247)` at `9px`, matching the
  independently-computed target colors, with the positive assertions (exact
  label text, first story pair, document order) still holding.
- **Implementation:** changed exactly two `color` values and two `fontSize`
  values inside `ContrastSection`, each with an inline comment recording the
  measured before/after ratio. No other line in the function changed.
- **Full suite:** `cd apps/web && npx vitest run` (run alone, not concurrent
  with the build) → **26 files, 265 tests, all passing.**
- **Build:** `npm run build` → `✓ built in 13.19s`, no errors;
  `LandingPage` chunk **77.33 kB (gzip 21.80 kB)** vs manifesto-card's
  recorded **77.31 kB (gzip 21.78 kB)** pre-this-change — a ~20-byte
  increase consistent with two longer literal color strings replacing two
  shorter token references, not a regression.
- **Visual / interaction check:** built `dist` served from a local static
  server (`npx serve -l 4512 dist`) and driven over CDP in **headless Edge**
  (`msedge.exe --headless=new --remote-debugging-port=<port>`, driven via
  Node's native `WebSocket` client against the DevTools Protocol —
  Playwright's bundled Chromium is blocked by OS Application Control on this
  machine, per the pilot and all three prior cards). Scrolled `#contrast`
  into view and ~50% further into its 300vh track (landing on the 2nd
  `STORY` pair, "Burnout as discipline" / "Rest without guilt" — confirming
  the scroll-driven `active` index still advances correctly) at **1440×900**
  and **390×844**, captured screenshots, **looked at them**, and read
  computed styles off the live DOM:
  - `leftColor: "rgb(92, 95, 112)"`, `rightColor: "rgb(250, 250, 247)"`,
    `leftFontSize`/`rightFontSize: "9px"` at both widths — matches the
    independently re-derived target colors exactly, in the actual production
    build, not just jsdom.
  - `leftText`/`rightText` exact ("Chapter 03 · The default world" / "The
    Rivly rhythm"), no truncation.
  - `docScrollWidth === docClientWidth` at both widths (1425/1425 desktop,
    390/390 mobile) — no horizontal overflow introduced.
  - Separate console-error check (`Log.enable` + `Runtime.enable`,
    listening for `Log.entryAdded` level `error` and
    `Runtime.exceptionThrown` across a fresh page load): **0 errors.**
  - Screenshots (both widths): the left label is now plainly legible dark
    gray-indigo text where it was previously a pale, hard-to-read gray; the
    right label is now crisp white where it was previously a washed-out
    lavender barely distinguishable from the indigo background behind it —
    the computed-math fix is visibly, not just numerically, a legibility
    improvement. The struck-through red headline, the italic off-white
    headline, the progress dots, and the 30%→60% panel-width split all
    render exactly as before; no layout shift, no clipping at either width.
- **Primary interaction verified:** `#contrast` is the `'contrast': 3`
  chapter target and its `IntersectionObserver` wiring is untouched; the
  300vh sticky track still drives `active` (and therefore which `STORY` pair
  renders) and `rightW` (the panel-width animation) exactly as before —
  confirmed live by observing the active pair change correctly between the
  two scroll positions captured above.
- **No new known limitations or escalations** from this card specifically —
  the one soft finding (`'Riva. Always.'` as aspirational vs. literal
  copy) is noted above as a page-wide policy question, not a defect this
  card's scope can or should resolve unilaterally.
