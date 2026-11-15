# Task 4 — Card: `landing` (page-level wrapper)

Route `/`, file `apps/web/src/pages/LandingPage.tsx`. Scope: everything in
the file OUTSIDE the 7 already-merged `*Section` functions (landing-problem,
landing-manifesto, landing-contrast, landing-features, landing-riva,
landing-whynot-promise, landing-cta) — `SEO` usage, `ReactLenis` setup, the
root `LandingPage` component's assembly, chapter-nav (`IntersectionObserver`)
wiring, and the top-level `Hero`, `Navbar`, `Footer`, `MarqueeStrip`,
`Cursor`, `ScrollProgress`, `ChapterLabel`, `Mag`, `WordReveal`, the `T`
token table, and `GLOBAL_CSS`.

## Audit findings (page-level scope)

Read the full 1537-line current file end to end, outside the 7 `*Section`
functions. Structural verdict: the wrapper's architecture is sound (one
`IntersectionObserver`, an 8-entry chapter map, matching `CHAPTERS` labels
and section `id`s, assembled in the same order) — no redesign warranted.
Concrete defects found:

1. **Hero's eyebrow pill**: `color: T.indigo` on `background: T.indigoSub`
   — the exact pairing `landing-features` already fixed inside
   `FeaturesSection` (3.86:1, fails AA), just not inside `Hero`.
2. **Hero's subcopy paragraph and scroll-cue label**: `T.muted` on `T.bg` =
   4.38:1, fails (same inherited near-miss every other card found).
3. **Navbar's light-mode nav links and "Log in" link**: same `T.muted`-on-
   `T.bg` = 4.38:1, fails.
4. **Navbar's dark-mode nav links**: `rgba(255,255,255,0.4)` on `T.night` =
   3.83:1, fails (shown during the Riva AI chapter).
5. **Footer's copyright line**: `T.muted` dimmed to `opacity: 0.35` on
   `T.surface` composites to ~1.56:1 — the worst failure found, well under
   even the large-text 3:1 floor.
6. **Dead import**: `useLenis` imported, never used anywhere in the file.

Checked and deliberately left alone (judgment calls, documented so they
aren't mistaken for misses):
- `ChapterLabel`'s ambient vertical wayfinding label (~1.82:1 on a typical
  backdrop) — ultra-subtle ambient chrome by design, same category as the
  scroll-progress bar/grain texture, not primary content; real nav duty is
  covered by the fully-legible `Navbar`. Flagged, not fixed.
- `MarqueeStrip` text colors (4.56:1 and 4.68:1) — both pass, no fix.
- `Footer`'s "Rivly" wordmark and nav links (plain `T.muted` on
  `T.surface`, no opacity) — 4.56:1, passes narrowly, no fix.
- Navbar's `dark` theme toggle not accounting for `ContrastSection`'s own
  internal light/dark split — pre-existing design quirk predating all 7
  section cards, not a regression, out of scope to redesign here.

## Product-fit / SEO findings

Checked the page's `<SEO title/description/keywords>` usage for
fabrication, same discipline as section copy:
- Title, "No card required"-adjacent claims, "Riva knows your goals/your
  schedule" — all real, backed by shipped features.
- **"...and your family and checks in before you ask"** (description) and
  the **"Family Care"** keyword directly repeat the `FEATURES[7]` "Family
  Care" claim (parent accounts, medicine reminders, Q&A) that
  `landing-features`' PASS 2 already confirmed does not exist anywhere in
  the codebase. That card's fix only touched the in-component FIXME —
  this page-level SEO copy duplicates the same unverified claim outside
  its scope. **Flagged via an in-source FIXME comment, not rewritten**,
  per the established escalate-don't-rewrite rule; needs the same human
  product decision already pending for the `landing-features` finding.
- "Built in India" and the "WhatsApp" keyword: checked against the
  codebase (Cashfree India-only gateway, `indianCalendar.ts`, Indian-
  English voice preference; real WhatsApp share-button/support-line/
  form-field touchpoints) — both reasonably defensible, not contradicted
  by a "doesn't exist" grep like the Family Care claim was. Left
  unflagged.
- Found (but out of this card's file scope, since it's not in
  `LandingPage.tsx`): `apps/web/src/index.html` carries a static
  `<meta name="description">` (plus `og:`/`twitter:` duplicates) with an
  older wording (em dash) inconsistent with `LandingPage.tsx`'s own `SEO`
  prop (no em dash). Confirmed live: the built page has two
  `meta[name="description"]` tags simultaneously. Noted for whoever owns
  shared SEO/meta infra; not touched here.

## Full-page end-to-end check result

Mini holistic pass (first card to touch this file after all 7 sections
merged), done seriously:
- Confirmed by direct read: `IntersectionObserver`'s chapter map
  (`hero:0,why:1,manifesto:2,contrast:3,features:4,riva-ai:5,promise:6,
  cta:7`) and `ids` array both match all 8 actual section ids exactly;
  `CHAPTERS` has 8 aligned entries; `isDark = chapter === 5` correctly
  targets `RivaSection`. No drift from any of the 7 sections' redesigns.
- Confirmed live in the built `dist`, driven over CDP in headless Edge at
  1440×900 and 390×844 (native Node `WebSocket` against the DevTools
  Protocol, same method every prior card used — Playwright's Chromium is
  blocked by OS Application Control on this machine): real synthetic wheel
  ticks scrolled through all 8 chapter ids successfully (a couple settled
  a little short of pixel-perfect top=0 due to Lenis's inertia easing, but
  all 8 were reached and visually confirmed in view); Footer reachable
  right after `#cta`; `docScrollWidth === docClientWidth` at both widths
  (no horizontal overflow); **0 console errors** across a full load +
  8-chapter scroll at both widths; the chapter label showed "PROLOGUE" at
  the top of the page, confirming the chapter tracker is live and correct.

## TDD Evidence (RED/GREEN)

New file: `apps/web/src/pages/__tests__/LandingPage.wrapper.test.tsx`
(name deliberately distinct from the 7 section test files).

- **RED** (pre-implementation): 5 baseline-contract tests passed against
  the unmodified wrapper (8-section document order, Footer-after-cta,
  Navbar brand link, SEO title/description via Helmet, 8-id
  `IntersectionObserver` wiring). 6 redesign tests failed on exactly the
  predicted pre-fix values (Hero eyebrow `rgb(100,107,180)` expected
  `rgb(62,70,163)`; Hero subcopy/scroll-cue + both Navbar light-mode links
  `rgb(110,114,135)` expected `rgb(96,100,118)`; Footer copyright
  `opacity: '0.35'` expected `''`).
- **GREEN** (post-implementation): **11/11 passed**.

## What I implemented

In `apps/web/src/pages/LandingPage.tsx`, scoped strictly to page-level
chrome (no section-function content touched):
- Removed the unused `useLenis` import.
- Hero eyebrow pill: `color: T.indigo` → `hsl(235, 45%, 44%)` (6.37:1,
  same fix `landing-features` used for the identical pairing).
- Hero subcopy paragraph + scroll-cue label: `color: T.muted` →
  `hsl(230, 10%, 42%)` (5.42:1, same fix `landing-cta`/others used).
- Navbar light-mode nav links + "Log in" link: `color: T.muted` →
  `hsl(230, 10%, 42%)` (5.42:1).
- Navbar dark-mode nav links: `rgba(255,255,255,0.4)` →
  `rgba(255,255,255,0.5)` (5.34:1, same opacity bump already used for
  `RivaSection`'s feature-desc text on a near-identical dark background).
- Footer copyright line: removed `opacity: 0.35` (un-dimmed `T.muted` on
  `T.surface` already measures 4.56:1 and passes; the dimming itself was
  the defect, matching sibling footer links which set no opacity).
- Added one in-source `FIXME` above the `SEO` usage flagging the "your
  family"/"Family Care" echo (escalated, not rewritten).

Every color/opacity change carries an inline comment recording the
measured before/after ratio, matching the convention every prior card in
this pipeline used.

## Build + visual check

- Full suite: `cd apps/web && npx vitest run` (alone) → **35/35 files,
  373/373 tests passed**.
- Build: `npm run build` → built in 11.36s, no errors; `LandingPage` chunk
  **77.42 kB (gzip 21.81 kB)**, within rounding of `landing-cta`'s recorded
  77.36 kB/21.81 kB gzip.
- Visual check: screenshots at both widths viewed directly — Hero's
  eyebrow pill/subcopy/scroll-cue, Navbar's nav links and "Log in", and
  the Footer's copyright line all read clearly legible post-fix, with no
  layout shift, clipping, or horizontal overflow at either width.

## Files changed

- `apps/web/src/pages/LandingPage.tsx` (page-level wrapper fixes, above)
- `apps/web/src/pages/__tests__/LandingPage.wrapper.test.tsx` (new)
- `docs/superpowers/cards/landing.md` (state → merged, full handoff)

## Self-review findings

- Scope held to page-level-only concerns: zero edits inside any of the 7
  `*Section` functions; confirmed via re-reading each touched block before
  and after (`Hero`, `Navbar`, `Footer`, module-scope import) and via the
  full-suite run, which re-exercises all 7 prior cards' own test files
  unchanged.
- Full page verified end-to-end post-change: all 8 chapters reachable,
  chapter label correct, 0 console errors, no overflow, at two widths, in
  the actual production build (not just jsdom).
- SEO/meta fabrication check done (see above); one genuine finding,
  escalated per the established rule rather than unilaterally rewritten.
- Contrast math verified independently for every fix (sRGB-linearize →
  relative-luminance → WCAG ratio), not reused on faith — though several
  fixed values (hsl(235,45%,44%), hsl(230,10%,42%)) are literally the same
  colors already validated and tested by `landing-features`/`landing-cta`
  for the identical token pairings, reused intentionally for consistency.

## Concerns

- `ChapterLabel`'s ambient contrast and the `index.html`/Helmet duplicate
  meta-description are both real, named observations left un-fixed by
  design (ambient-chrome judgment call; file-scope boundary respectively)
  — not regressions, just worth a human glance.
- The "your family"/"Family Care" SEO-copy echo is a genuine escalation,
  not a defect fixed by this diff; it needs the same product decision
  already pending from `landing-features`.
- No cross-section regression found bigger than this card's scope — no
  BLOCKED/NEEDS_CONTEXT escalation needed.
