---
id: landing
title: Landing Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — this card owns the PAGE-LEVEL wrapper only (everything in LandingPage.tsx outside the 7 already-merged *Section functions: Hero, Navbar, Footer, MarqueeStrip, SEO usage, ReactLenis setup, chapter-nav orchestration, root assembly). Found and fixed 6 measured AA contrast failures in that scope (Hero, Navbar, Footer) plus one dead import; flagged (not rewritten) one page-level SEO-copy fabrication echo and one pre-existing index.html/Helmet duplicate-meta-description inconsistency, both out of this card's file scope.
---

# Card: Landing Page

This card represents the redesign/verification pass for the Landing Page feature/page in the Rivly web app — specifically its PAGE-LEVEL wrapper, as distinct from the 7 already-merged section-content cards (landing-problem, landing-manifesto, landing-contrast, landing-features, landing-riva, landing-whynot-promise, landing-cta).

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

### Scope

`LandingPage.tsx` is a `page`-kind card like all 24 routed pages (per
`docs/superpowers/cards/_inventory.md`), but 7 of its internal `*Section`
functions already got their own `landing-section` cards and are merged. This
card's remaining scope is everything else in the file: `SEO` usage,
`ReactLenis` setup, the chapter-navigation state/`IntersectionObserver`
wiring, the root `LandingPage` component's section assembly, and every
top-level function that isn't one of the 7 `*Section`s — `Hero`, `Navbar`,
`Footer`, `MarqueeStrip`, `Cursor`, `ScrollProgress`, `ChapterLabel`, `Mag`,
`WordReveal`, the `T` token table, and `GLOBAL_CSS`.

### PASS 1 — Audit (design step)

Read the full current file (1537 lines, after all 7 section cards'
changes) end to end, focused outside the 7 `*Section` functions.
**Structural verdict: the wrapper's architecture is sound — one
`IntersectionObserver` keyed to an 8-entry chapter map (`hero:0` … `cta:7`),
matching the `CHAPTERS` label array and every section's `id`, assembled in
the same order in the root component's JSX. No redesign of the wrapper's
shape; this pass found concrete, scoped defects only, matching the
conclusion every other card in this pipeline reached.**

**Defects found (all independently measured, none assumed):**

1. **Hero's eyebrow pill** (`YOUR AI LIFE COMPANION · RIVLY`) uses `color:
   T.indigo` on `background: T.indigoSub` — the exact pairing
   `landing-features` already found and fixed inside `FeaturesSection`
   (measured 3.86:1, fails the 4.5:1 AA floor) — just not inside Hero,
   which that card didn't own.
2. **Hero's subcopy paragraph** and **scroll-cue label** both use `T.muted`
   on `T.bg` — measured 4.38:1 (via sRGB-linearize → relative-luminance →
   WCAG contrast, independently computed, not a lookup table), the same
   inherited token-level near-miss `landing-cta`, `landing-riva`, and
   others already fixed locally inside their own sections.
3. **Navbar's light-mode nav links and "Log in" link** use the same
   `T.muted`-on-`T.bg` pairing (4.38:1, fails).
4. **Navbar's dark-mode nav links** (`rgba(255,255,255,0.4)` on `T.night`,
   shown during the Riva AI chapter) measured **3.83:1**, fails.
5. **Footer's copyright line** (`© 2026 Rivly`) dims `T.muted` to
   `opacity: 0.35` on `T.surface` — composited, this measures **~1.56:1**,
   failing even the large-text 3:1 floor by a wide margin, the worst
   failure found in this pass. (Footer's other text — the "Rivly" wordmark
   and its nav links, plain `T.muted` on `T.surface` with no opacity — was
   independently measured at **4.56:1** and correctly left alone: a real,
   if narrow, AA pass.)
6. **Dead import**: `useLenis` imported from `@studio-freight/react-lenis`
   but never referenced anywhere in the file.
7. **SEO fabrication echo**: the page's `<SEO description=... />` prop
   includes "...and your family and checks in before you ask," directly
   repeating the `FEATURES[7]` "Family Care" claim that `landing-features`'
   PASS 2 already confirmed does not exist anywhere in the codebase. That
   card's fix only touched the in-component FIXME inside `FeaturesSection`
   — this page-level SEO copy duplicates the same unverified claim outside
   that scope.

**Checked, not touched (judgment calls, named so they aren't mistaken for
things this pass missed):**

- `ChapterLabel`'s fixed vertical wayfinding label (`rgba(61,59,191,0.35)`,
  ~1.82:1 on a typical backdrop) is a genuinely low-contrast pairing, but is
  deliberately ultra-subtle ambient chrome (same design category as the
  scroll-progress bar and grain texture, not primary content), and its real
  navigation function is duplicated by the fully-legible `Navbar`. Bringing
  it to AA would materially change its intended ghost-label character — a
  design call, not a contrast bug fix. Left alone; flagged here for a human
  product/design decision if desired.
- `MarqueeStrip`'s two text colors (`T.muted` and `T.indigo`, both on
  `T.surface`) measured 4.56:1 and 4.68:1 respectively — both pass, no fix.
- Navbar's theme-switching (`dark` prop keyed only to `chapter === 5`)
  doesn't account for `ContrastSection`'s own internal light/dark split —
  pre-existing design quirk predating all 7 section cards, not a regression
  introduced by any of them, and fixing it would mean redesigning the
  nav's theme logic, not a scoped contrast fix. Out of this card's scope.
- `apps/web/src/index.html`'s static `<meta name="description">` (and its
  `og:`/`twitter:` duplicates) carry an *older* wording of this same
  description with an em dash, inconsistent with `LandingPage.tsx`'s own
  `SEO` prop (no em dash) — confirmed live in the built page: two
  `meta[name="description"]` tags exist simultaneously (the static one and
  react-helmet-async's managed one). `index.html` is not part of
  `LandingPage.tsx`, so out of this card's file scope; flagged for
  whoever owns the shared SEO/meta infrastructure.
- `"Built in India"` (SEO description) and the `"WhatsApp"` SEO keyword:
  checked against the codebase rather than assumed. Multiple real,
  India-specific implementation choices support "Built in India" as
  defensible (Cashfree — an India-only payment gateway — `indianCalendar.ts`,
  Indian-English voice preference in `DayPlanner.tsx`), and real (if minor)
  WhatsApp touchpoints exist (`RhythmReportCard`'s share-to-WhatsApp button,
  `ProUpgradeModal`'s WhatsApp priority-support line, `WaitlistForm`'s
  phone/WhatsApp field) — unlike "your family," neither is contradicted by
  a "this doesn't exist" grep. Left unflagged.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Chapter-nav end-to-end check (the mini holistic pass this card's brief
calls for, since it's first to touch the page after all 7 sections
landed).** Confirmed by direct read, then confirmed live in the built app
(PASS 3 below): the `IntersectionObserver`'s chapter map
(`hero:0,why:1,manifesto:2,contrast:3,features:4,riva-ai:5,promise:6,cta:7`)
and `ids` array both match the 8 actual section ids exactly; `CHAPTERS`
(`ChapterLabel`'s display strings) has 8 entries aligned to the same
indices; `isDark = chapter === 5` correctly targets `RivaSection`'s dark
background. No drift found from any of the 7 sections' redesigns — the
wiring survived all 7 cards intact.

**Fabrication / honesty check — SEO/meta claims checked against the
shipped codebase, same discipline as section copy.** See PASS 1 items 7
and the "checked, not touched" list above for the full verification; no
new fabrication found beyond the one escalated "your family" echo.

**Contrast, computed, not assumed:**

| element | pairing | computed ratio | AA (4.5:1 / 3:1 large) |
|---|---|---|---|
| Hero eyebrow pill (before) | `T.indigo` on `T.indigoSub` | 3.86:1 | fail |
| Hero eyebrow pill (after) | `hsl(235,45%,44%)` on `T.indigoSub` | 6.37:1 | pass |
| Hero subcopy / scroll cue (before) | `T.muted` on `T.bg` | 4.38:1 | fail |
| Hero subcopy / scroll cue (after) | `hsl(230,10%,42%)` on `T.bg` | 5.42:1 | pass |
| Navbar light nav links / Log in (before) | `T.muted` on `T.bg` | 4.38:1 | fail |
| Navbar light nav links / Log in (after) | `hsl(230,10%,42%)` on `T.bg` | 5.42:1 | pass |
| Navbar dark nav links (before) | `rgba(255,255,255,0.4)` on `T.night` | 3.83:1 | fail |
| Navbar dark nav links (after) | `rgba(255,255,255,0.5)` on `T.night` | 5.34:1 | pass |
| Footer copyright (before) | `T.muted` @ opacity 0.35 on `T.surface` | ~1.56:1 | fail (hard) |
| Footer copyright (after) | `T.muted` (opacity removed) on `T.surface` | 4.56:1 | pass |
| Footer wordmark/links (unchanged) | `T.muted` on `T.surface` | 4.56:1 | pass (no fix needed) |
| MarqueeStrip text (unchanged) | `T.muted` / `T.indigo` on `T.surface` | 4.56:1 / 4.68:1 | pass (no fix needed) |

All computed via an independent sRGB-linearize → relative-luminance → WCAG
contrast calculation (HSL/RGBA source values converted fresh for this
card's specific pairings, not reused from a lookup table), matching every
other card's methodology in this pipeline.

**Verdict: APPROVED, scope as proposed in PASS 1 — 6 contrast fixes, 1
dead-import removal, 1 escalation (SEO fabrication echo), plus two
out-of-scope observations (ChapterLabel's ambient contrast, index.html's
duplicate/inconsistent meta description) recorded for visibility, not
fixed here.**

### PASS 3 — Build / verification record (state: running → review → merged)

- **RED** (pre-implementation): new
  `apps/web/src/pages/__tests__/LandingPage.wrapper.test.tsx` →
  **5 passed / 6 failed**. The 5 baseline-contract tests passed against the
  unmodified wrapper — confirming the page assembles all 8 chapter sections
  in document order, the Footer follows `#cta`, the Navbar brand links
  home, the SEO title/description are set via Helmet, and the
  `IntersectionObserver` is wired to all 8 section ids. The 6 redesign
  tests failed on exactly the predicted pre-fix values: the Hero eyebrow
  pill read `rgb(100, 107, 180)` (= `T.indigo`, expected `rgb(62, 70,
  163)`), the Hero subcopy/scroll-cue and both Navbar light-mode links read
  `rgb(110, 114, 135)` (= `T.muted`, expected `rgb(96, 100, 118)`), and the
  Footer copyright line read `opacity: '0.35'` (expected `''`).
- **GREEN** (post-implementation): **11/11 passed** — every fixed element
  reads its independently-computed target color/opacity, with every
  baseline assertion still holding.
- **Implementation:** 6 color/opacity value changes across `Hero`,
  `Navbar`, and `Footer` (each with an inline comment recording the
  measured before/after ratio, same convention as all 6 prior cards), 1
  dead-import removal (`useLenis`), and 1 in-source `FIXME` comment above
  the `SEO` usage flagging the "your family"/"Family Care" echo — not
  rewritten, per the established escalate-don't-rewrite rule. No
  structural change to the wrapper, no section content touched.
- **Full suite:** `cd apps/web && npx vitest run` (alone, not concurrent
  with the build) → **35/35 files, 373/373 tests passed**.
- **Build:** `npm run build` → built in 11.36s, no errors; `LandingPage`
  chunk **77.42 kB (gzip 21.81 kB)** — within rounding of `landing-cta`'s
  recorded 77.36 kB/21.81 kB gzip, consistent with a small, comment-heavy
  diff.
- **Visual / interaction check (full page, all 7 sections + Hero, since
  this is the first full-page check after all 7 section cards merged):**
  built `dist` served locally (`npx serve -l 4520 dist`), driven over CDP
  in headless Edge (`msedge.exe --headless=new`, native Node `WebSocket`
  against the DevTools Protocol — same approach as every prior card on
  this machine) at **1440×900** and **390×844**. Real synthetic
  `Input.dispatchMouseEvent` wheel ticks scrolled through all 8 chapter
  ids (Lenis's smooth-scroll inertia means a couple of sections — notably
  `riva-ai` — settled a little short of pixel-perfect top=0 within the
  polling budget, but all 8 were reached and visually confirmed in view).
  - Computed styles read off the live DOM at both widths matched every
    target exactly: `navFeaturesColor`/`navLoginColor`/`heroSubcopyColor`/
    `heroScrollCueColor` = `rgb(96, 100, 118)`; `heroEyebrowColor` =
    `rgb(62, 70, 163)`; `footerCopyrightColor` = `rgb(110, 114, 135)` with
    `opacity: "1"` (no longer dimmed).
  - Screenshots (both widths, viewed): the Hero's eyebrow pill, subcopy,
    and "SCROLL" cue are now plainly legible against the previous
    washed-out versions; the Navbar's "WHY / FEATURES / RIVA AI / FAMILY /
    PROMISE" links and "Log in" read clearly; the `ChapterLabel`'s vertical
    "PROLOGUE" (chapter 0) confirms the chapter-tracking wiring is live and
    correct at the top of the page; the Footer's "© 2026 Rivly" is now
    fully legible next to its sibling links, which were already fine.
  - `docScrollWidth === docClientWidth` at both widths (no horizontal
    overflow introduced).
  - Console-error check (`Log.enable` + `Runtime.enable`, listening for
    `Log.entryAdded` level `error` and `Runtime.exceptionThrown` across a
    full page load and 8-chapter scroll): **0 errors** at both widths.
  - Confirmed the pre-existing `index.html`/Helmet duplicate
    `meta[name="description"]` situation live (two tags present, static
    index.html version with an em dash first, Helmet's live-managed
    version matching `LandingPage.tsx`'s own copy second) — see PASS 1's
    "checked, not touched" list; out of this card's file scope, not fixed.
- **Primary interaction verified:** the chapter-nav `IntersectionObserver`,
  the Navbar's auth-branched CTA (`Open App` vs. `Log in` + `Join
  Waitlist`, unit-tested via the existing `useAuthContext` mock), and the
  Hero's auth-branched CTA all render and wire up correctly with zero
  console errors across two independent scroll runs at both widths.
- **Escalation, not a defect fixed by this card's diff:** the SEO
  description's "your family" clause and "Family Care" keyword repeat an
  unverified claim already escalated (not fixed) by `landing-features`.
  Flagged via an in-source `FIXME` at the `SEO` usage site and here; needs
  the same human product decision already pending for that card's finding
  (cut, soften, or confirm/build the feature).
- **Cross-section regression check:** none found. All 7 sections render,
  their own already-merged fixes remain intact (spot-checked via this
  card's full-suite run, which includes all 7 prior cards' own test
  files), and the wrapper's assembly/chapter-nav logic required no change.
- **state: merged.**
