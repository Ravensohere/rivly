---
id: landing-cta
title: Landing Page - CTA Section
owner: task-4-agent (solo; design + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = design, PASS 2 = product-fit, PASS 3 = build record) — PASS 2 found one fabricated/contradictory stat claim ("Join thousands of calm achievers") that contradicts the same button's own "Join the Waitlist" copy; deliberately NOT rewritten; flagged for product decision, with a matching in-source FIXME comment at the exact site.
---

# Card: Landing Page - CTA Section

This card represents the redesign/verification pass for the Landing Page - CTA Section feature/page in the Rivly web app.

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

**What is there now** (`LandingPage.tsx:1387-1436`, Chapter 7, the page's
final section before `Footer`)

A centered, non-dark closing CTA on `background: T.bg`: a radial indigo
glow sits absolutely behind everything; a small-caps chapter label
("Chapter 07 · Your story begins"); a 4-line giant display headline that
alternates weight/style/color per line — "Find your" (ink) / "flow."
(indigo, italic) / "Drop your" (ink) / "burnout." (muted, strikethrough) —
each line revealed on scroll via its own vertical-slide animation; a one-
line muted subcopy ("Join thousands of calm achievers. No card
required."); and a single pill CTA button that branches on auth state
(`Open Dashboard` → `/app` for a signed-in `user`, else `Join the
Waitlist` → `https://ravenso.in/#/`).

**Structural judgment, made on this section's own merits.** A closing CTA
built from glow + giant alternating-style headline + one-line subcopy +
single button is exactly the shape of real, distinctive closing-CTA
sections, not a generic "SaaS gradient box with a button" template:

- The 4-line headline's per-line alternation (upright/italic, solid/
  strikethrough, ink/indigo/muted) doing real wordplay ("find your flow" /
  "drop your burnout") is a specific authored moment, not filler — closer
  to how Arc / The Browser Company's closing download CTAs use oversized,
  irregular multi-line type to land one idea than to a boilerplate
  "Ready to get started?" banner.
- The radial glow + single centered button is the same minimal shape
  Linear's and Stripe's bottom-of-page CTA bands use: no card, no bullet
  list, no second button, no logo wall — one headline, one line of
  subcopy, one action.
- The auth-branched button (dashboard vs. waitlist) is real product logic,
  not decorative; it is wired to `useAuthContext()` and an actual
  `/api/waitlist` route (confirmed in PASS 2 below), not a placeholder
  href.

**Verdict: keep the structure exactly as built** — glow, 4-line headline,
subcopy line, single auth-branched button. The real, fixable defects here
are typographic/contrast/copy, not structural, matching the conclusion
every other landing card in this pipeline reached for its own section.

**The defects found (named, so the change is checkable)**

1. **The chapter label is the last of the page's 7 chapter labels still off
   the 9px convention** `ProblemSection`/`ManifestoSection`/
   `ContrastSection`/`FeaturesSection`/`RivaSection` already converged on
   (`LandingPage.tsx:581,665,728,1049,1176` are all `fontSize: 9`; this
   section's label at `:1399` is still `8.5`, the pre-convention value).
   (Chapter 06's label in `PromiseSection` is the only other page-wide
   straggler at 8.5/the-pilot-card's-original-value, but `PromiseSection`
   belongs to the already-closed `landing-whynot-promise` pilot card, not
   this one — out of scope here, named so it isn't mistaken for something
   this card missed.)
2. **`T.muted` on `T.bg` — the chapter label's and the subcopy paragraph's
   color/background pairing — measures 4.38:1, under the 4.5:1 normal-text
   AA floor.** Computed independently (sRGB-linearize → relative-luminance
   → WCAG contrast, Node script, not a lookup table): `T.muted` =
   `hsl(230,10%,48%)` → rgb(110,114,135); `T.bg` = `hsl(38,35%,96%)` →
   rgb(248,246,241); contrast = **4.38:1**. Both uses are normal-weight-
   or-500 text well under the large-text size threshold (label: 8.5/9px;
   subcopy: `0.96rem` ≈ 15.36px), so both need the full 4.5:1 floor, not
   the 3:1 large-text exception — and both currently miss it. (The
   headline's own muted strikethrough line, "burnout.", uses the same
   `T.muted`-on-`T.bg` pair but at `clamp(4rem,11vw,12.5rem)` — unambiguously
   large text even at its minimum size — so it only needs 3:1 and clears
   that with margin; it is correctly left alone.)

   This exact `T.muted`-on-`T.bg` pairing, at the same near-miss ratio, is
   also used by the already-merged `ProblemSection`'s Chapter 01 label
   (`:581`) — i.e. this is an inherited, page-wide token-level near-miss,
   not something newly introduced by this section. It is **not** this
   card's job to change the shared `T.muted` token (that would ripple into
   already-merged, already-reviewed sections, out of this card's one-
   function scope) — but it **is** this card's job to fix the two
   instances inside the function this card owns, the same way
   `landing-contrast` and `landing-riva` fixed real measured AA failures
   locally without touching shared tokens. The cross-section, token-level
   observation is recorded here for visibility, not silently left for the
   next person to rediscover.
3. **The subcopy claims a specific headcount ("thousands of calm
   achievers") that is not verifiable and is directly undercut by the same
   button's own copy** (`Join the Waitlist` for every signed-out visitor —
   see PASS 2 below). Flagged, not fixed, per the brief's instruction.

**Proposed direction: fix the one font size and the one measured contrast
failure (applied at its two sites) in place; flag the headcount claim;
touch nothing else.**

- **A.** Chapter label `fontSize` → `9`, matching the five sibling
  sections' established convention.
- **B.** Chapter label color and subcopy-paragraph color → a locally
  darkened muted shade, `hsl(230, 10%, 42%)` (was `T.muted` =
  `hsl(230,10%,48%)`), applied only to these two inline `style` props
  inside `CTASection` — the shared `T.muted` token itself is untouched.
  Computed on `T.bg`: **5.42:1**, chosen with real margin over the bare
  4.5:1 floor (same reasoning `landing-riva` used for its own two fixes:
  margin, not a hairline pass), while staying visibly in the same muted
  blue-gray family as `T.muted` rather than jumping to `T.ink`.
- **C.** Add an in-source `FIXME` at the subcopy line flagging "thousands
  of calm achievers" as an unverified/contradicted headcount claim — not
  rewritten, not invented a replacement number.
- **Explicitly not changed:** the radial glow, the 4-line headline's
  structure/colors/animation/strikethrough (its own `T.muted`-on-`T.bg`
  use independently checked at **4.38:1 on a large-text pairing that only
  needs 3:1 — clears it, left alone**), "No card required" (independently
  checked in PASS 2 — true), the auth-branched button's logic/copy/href/
  colors (`white` on `T.indigo` = **4.88:1** and `white` on `T.ink` =
  **12.62:1**, both already clear AA, unchanged), `id="cta"`, and the
  function's signature/call site. None of these are defective.

**Reference sites (three, specific, each tied to a decision)**

1. **Linear (linear.app).** Its bottom-of-page closing CTA bands pair a
   radial glow/gradient background with one bold headline, one short
   subcopy line, and a single button — no card, no second CTA, no bullet
   list. Cited to justify *keeping* this section's glow + headline +
   subcopy + single-button shape exactly as structured.
2. **Arc / The Browser Company (arc.net).** Its closing download CTAs use
   oversized, irregularly-weighted multi-line type (mixed upright/italic,
   mixed color/strikethrough) to land one specific idea across several
   short lines rather than one flat headline sentence — the same shape as
   this section's "Find your flow. / Drop your burnout." alternating
   4-line reveal. Cited to justify leaving that headline's structure,
   animation, and per-line styling entirely alone.
3. **Stripe Press (press.stripe.com).** Reused a sixth time in this
   pipeline (pilot, Problem, Manifesto, Contrast, Features, Riva, now CTA)
   for the one thing this card touches typographically: small-caps/
   uppercase chapter labels at one consistent, legible size — justifying
   landing this section's last straggler label on the same 9px the other
   five already converged on.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Cross-file impact — grep, not assertion.**

```
$ grep -rn "CTASection" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:1387:function CTASection({ onChapter }: ...
./apps/web/src/pages/LandingPage.tsx:1519:        <CTASection onChapter={onChapter} />
```

`CTASection` is not exported; its only consumer is the one call site in
the same file. **Confirmed: no cross-file impact.** `id="cta"` is
load-bearing (`IntersectionObserver` chapter map key `'cta': 7` and the
`ids` scroll-spy array in the root `LandingPage` component) and is
untouched by this card's diff.

**Fabrication / honesty check — every claim in `CTASection`'s copy
checked against the actual shipped codebase, not assumed honest.**

- **"Join the Waitlist" / `https://ravenso.in/#/` — real.** The worker
  ships an actual waitlist system: `worker/src/routes/waitlist.ts`
  (`GET /status`, join/approve flow), `worker/src/types/index.ts`'s
  `WaitlistEntry`, and `worker/src/config/constants.ts` listing
  `/api/waitlist` as a public endpoint. This is wired product
  infrastructure, not a placeholder link.
- **"No card required" — real.** Joining the waitlist hits the waitlist
  route, not the payment stack; Cashfree (`worker/src/routes/payment.ts`,
  `apps/web/src/hooks/useCashfree.ts`) is only invoked from
  `PricingPage.tsx`/`ProUpgradeModal.tsx` for the separate, later Pro-
  upgrade flow. A new visitor genuinely does not need a card to join.
- **"Join thousands of calm achievers" — FLAGGED, not fixed.** This is a
  specific, falsifiable headcount claim. Verifying the true number would
  require live production/Supabase data this card's merge gate explicitly
  forbids (`no .env/secrets access`), so it cannot be confirmed true —
  but it does not need live data to be flagged as **internally
  contradictory**: the same button, one line below, reads "Join the
  **Waitlist**" for every signed-out visitor (`:1428`), and the
  `Hero`/`Navbar` CTAs elsewhere on this same page (`:385`, `:508`) use
  the identical "Join Waitlist" framing. A page that consistently asks new
  visitors to join a *waitlist* — implying gated, not-yet-open access —
  is in direct tension with a subcopy line claiming *thousands* of people
  are already using the product as "calm achievers." Per the brief's
  instruction, this is disclosed via an in-source `FIXME` and here, not
  silently rewritten or replaced with an invented "safer" number.

**Contrast, computed, not assumed.**

| element | pairing | computed ratio | AA (4.5:1 / 3:1 large) |
|---|---|---|---|
| chapter label (before) | `T.muted` on `T.bg` | 4.38:1 | fail (needs 4.5) |
| chapter label (after) | `hsl(230,10%,42%)` on `T.bg` | 5.42:1 | pass |
| subcopy paragraph (before) | `T.muted` on `T.bg` | 4.38:1 | fail (needs 4.5) |
| subcopy paragraph (after) | `hsl(230,10%,42%)` on `T.bg` | 5.42:1 | pass |
| headline "burnout." line | `T.muted` on `T.bg` | 4.38:1 | pass (large text, needs 3; unchanged) |
| headline "flow." line | `T.indigo` on `T.bg` | 4.52:1 | pass (unchanged) |
| headline ink lines | `T.ink` on `T.bg` | 11.68:1 | pass (unchanged) |
| button text (signed-in) | `white` on `T.indigo` | 4.88:1 | pass (unchanged) |
| button text (signed-out) | `white` on `T.ink` | 12.62:1 | pass (unchanged) |

Computed via an independent sRGB-linearize → relative-luminance → WCAG
contrast Node script (not a lookup table, not a reused prior-card number
— `T.muted`/`T.bg`/`T.indigo`/`T.ink` were each converted from their exact
HSL source values and composited fresh for this section's specific
pairings).

**Final whole-file sanity grep (per this card's extra instruction, since
it is the last landing-page section card).** Ran
`grep -noE "[0-9,]+%|[0-9]{2,}[+,]? ?(users|people|families|members|downloads|reviews|ratings|conversations|minutes|hours|days|stars?)"`
across the entire `LandingPage.tsx`. Every hit outside `RivaSection` is a
CSS percentage (keyframe/gradient/opacity values, e.g. the `T` token HSL
lightness numbers at `:41-54`, animation `0%`/`50%`/`100%` keyframes) —
**no new fabricated or suspicious round-number claim found** in any
already-redesigned section or in the as-yet-untouched `Hero`/`Navbar`/
`MarqueeStrip`/`WhyNotSection`/`Footer` code. The only numeric claims in
the whole file are the two already-escalated `RIVA_FEATURES[5]` "30/60
conversations" hits (`:1123,1131`, `landing-riva`'s escalation, unchanged
here) and this card's own "thousands of calm achievers" finding above —
both disclosed, neither silently fixed.

**Against the spec's goals/anti-goals** — named reference inspiration
tied to specific decisions; scoped to one function in one file; ends in a
working build; every copy claim cross-referenced against the actual
codebase rather than taken on faith; the diff is one font-size value, one
color value applied at two sites, and one comment, so "looks different"
is not a realistic risk.

**Verdict: APPROVED, scope as proposed in PASS 1, no cuts — plus an
escalation for human product review.**

- **KEEP** — the font-size fix, the two contrast fixes; the glow, 4-line
  headline (structure/colors/animation), subcopy wording itself, the
  auth-branched button's logic/copy/href/colors, `id="cta"`, all untouched.
- **No redesign of the section's structure** — PASS 1 already argued this
  section's glow+headline+subcopy+button shape matches real closing-CTA
  precedent (Linear, Arc), not a generic template; PASS 2 found no reason
  to revisit that call.
- **ESCALATED, not fixed:** "Join thousands of calm achievers" is an
  unverifiable headcount claim that contradicts the page's own consistent
  "Join the Waitlist" framing (this button, the Hero CTA, and the Navbar
  CTA). Needs a human product decision (cut it, soften to something that
  doesn't imply an existing large active user base, or confirm a real
  number), not a unilateral copy edit from this card.

### PASS 3 — Build / verification record (state: running -> review -> merged)

- **RED** (pre-implementation, unmodified `CTASection`): new
  `LandingPage.cta.test.tsx` → **5 passed / 3 failed**. The 5 baseline
  contract tests passed against the old code — confirming the baseline was
  genuinely established, not assumed — including `#cta`'s chapter-07
  marker, its document-order position after `#promise`, the 4-line
  headline verbatim, the subcopy paragraph verbatim, and the signed-out
  waitlist link's text/href. The 3 redesign tests failed on exactly the
  predicted old values: the chapter label read `8.5px` (expected `9px`),
  and both the chapter label's and subcopy's color read `rgb(110, 114,
  135)` = `T.muted` (expected `rgb(96, 100, 118)` = the fixed
  `hsl(230,10%,42%)`) — matching the hand-identified, independently-
  measured defects exactly before any code changed.
- **GREEN** (post-implementation): **8/8 passed** — chapter label reads
  `9px`, and both the chapter label and subcopy paragraph read
  `rgb(96, 100, 118)`, matching the independently-computed targets, with
  every baseline assertion still holding.
- **Implementation:** changed exactly one `fontSize` value (8.5 → 9) and
  one color value applied at two sites (`T.muted` → `hsl(230, 10%, 42%)`,
  local to this function, shared token left untouched) inside
  `CTASection`, each with an inline comment recording the measured
  before/after ratio. Added one in-source `FIXME` comment above the
  subcopy line documenting the escalated "thousands of calm achievers"
  finding at its exact site, per the `landing-features`/`landing-riva`
  precedent. No other line in the function changed.
- **Full suite:** `cd apps/web && npx vitest run` (run alone, not
  concurrent with the build) → **29/29 files, 291/291 tests passed**
  clean on this run, including all 8 of this card's new tests and all 9 of
  `landing-riva`'s — no flaky failures observed this time.
- **Build:** `npm run build` → `✓ built in 14.48s`, no errors;
  `LandingPage` chunk **77.36 kB (gzip 21.81 kB)** — within rounding of
  `landing-riva`'s recorded **77.33 kB (gzip 21.81 kB)**, consistent with
  a two-value, two-comment-block diff, not a regression.
- **Visual / interaction check:** built `dist` served from a local static
  server (`npx serve -l 4519 dist`) and driven over CDP in **headless Edge**
  (`msedge.exe --headless=new`, driven via Node's native `WebSocket` client
  against the DevTools Protocol — Playwright's bundled Chromium is blocked
  by OS Application Control on this machine, per the pilot and all prior
  cards). `scrollIntoView` had no effect on the real Lenis-driven scroll
  (confirmed: `#cta`'s rect stayed ~19100px away, i.e. the page never
  moved), so — matching `landing-riva`'s approach exactly — the section
  was reached by dispatching real synthetic `Input.dispatchMouseEvent`
  wheel ticks via CDP while polling `#cta`'s `getBoundingClientRect().top`
  until the section was in view, at **1440×900** and **390×844**,
  captured screenshots, **looked at them**, and read computed styles off
  the live DOM:
  - `labelFontSize: "9px"` at both widths — matches the target.
  - `labelColor`/`subcopyColor: "rgb(96, 100, 118)"` at both widths —
    matches the target exactly (the `hsl(230,10%,42%)` source value,
    browser-normalized), in the actual production build, not just jsdom.
  - `linkText: "Join the Waitlist"`, `linkHref: "https://ravenso.in/#/"`
    at both widths — the signed-out CTA's wiring is intact and unchanged.
  - `docScrollWidth === docClientWidth` at both widths (1425/1425 desktop,
    390/390 mobile) — no horizontal overflow introduced.
  - Separate console-error check (`Log.enable` + `Runtime.enable`,
    listening for `Log.entryAdded` level `error` and
    `Runtime.exceptionThrown` across two fresh page loads and scrolls):
    **0 errors**, at both widths.
  - Screenshots (both widths, both saved and viewed): the "CHAPTER 07 ·
    YOUR STORY BEGINS" label renders crisply at the new 9px (fully visible
    in the mobile capture); the subcopy "Join thousands of calm achievers.
    No card required." is now plainly legible muted-gray-on-cream — at
    the old 4.38:1 it would have read as a slightly washed-out line, a
    smaller but real version of the same issue `landing-riva` fixed for
    its own feature-grid desc text; the "Join the Waitlist" pill button,
    the 4-line alternating headline (including the "burnout." strike-
    through, unchanged and still clearly legible as large text), and the
    page's closing `Footer` (nav links, "© 2026 Rivly") all render
    correctly immediately below with no clipping or layout shift at
    either width — confirming `CTASection` still transitions cleanly into
    `Footer`, the page's last two components.
- **Primary interaction verified:** `#cta` is the `'cta': 7` chapter
  target and its `IntersectionObserver` wiring, the signed-out waitlist
  link's href, and the auth-branching logic (untouched, unit-tested via
  the existing `useAuthContext` mock) are all confirmed live with no
  console errors across two independent scroll runs at both widths.
- **Escalation, not a defect in this card's own scope:** the one product-
  fit finding above ("Join thousands of calm achievers" contradicting this
  page's own consistent "Join the Waitlist" framing) is a real issue in
  the shipped marketing copy but is **not** fixed by this card's diff, per
  the brief's explicit instruction not to silently rewrite or invent cover
  for an unverifiable claim. An in-source `FIXME` marks the exact site.
  This needs a human product decision before (or independent of) any
  further redesign work on this section.
- **Final whole-file sanity grep (per this card's extra Task-4 instruction,
  as the last landing-page section card):** re-confirmed clean — see PASS 2
  above for the full grep and result (no new fabricated/suspicious
  round-number claim found anywhere in `LandingPage.tsx` outside the two
  already-escalated `RIVA_FEATURES[5]` hits and this card's own finding).
- **state: merged.**
