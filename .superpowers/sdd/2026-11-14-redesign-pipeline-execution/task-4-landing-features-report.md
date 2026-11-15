# Task 4 — Card: landing-features

Full detail is recorded in `docs/superpowers/cards/landing-features.md`
(PASS 1 design, PASS 2 product-fit, PASS 3 build record). This report
summarizes it.

## Design direction + reference sites + card-vs-no-card reasoning

`FeaturesSection` (`apps/web/src/pages/LandingPage.tsx:1020-1087`, fed by the
9-entry `FEATURES` array at `:1008-1018`) is a 720vh sticky scroll-driven
carousel: one feature full-screen at a time (tag pill, title, body, and a
custom hand-drawn SVG illustration inside a rounded/bordered/shadowed card),
cycled by `scrollYProgress`, with a 01–09 tab-index row and a bottom progress
bar.

**Card-vs-no-card judgment (made on this section's own merits, not copied
from the Promise-section pilot's choice to remove cards):** this genuinely
is the page's "feature cards" section the user named originally. But
structurally it is a single-card, scroll-cycled narrative reveal — not a
generic 3/4-column icon-grid, the template the spec's anti-goal actually
targets. **Kept the card/illustration treatment as-is** — it's closer to
Linear's or Arc's feature-reveal sections (both cited) than to a SaaS
pricing-page grid, and Stripe Press (reused a 4th time in this pipeline) for
the small-caps label-size convention. Fixed two concrete defects instead of
restructuring a sound pattern: two 8.5px labels brought to 9px (matching
three already-merged sibling sections), and one real AA contrast failure in
the tag pill (`T.indigo` on `T.indigoSub` = 3.86:1 → `hsl(235,45%,44%)` on
the same background = 6.37:1, same hue family, computed independently).

## Product-fit findings

- **Grep:** `FeaturesSection` and `FEATURES` have exactly one consumer each
  (the call site at `:1474` and the function itself) — no cross-file impact.
- **Feature-verification (the main point of this card):** checked all 9
  `FEATURES` entries against the actual codebase.
  - **7 verified true**, cross-referenced against real hooks/components:
    Focus Seeds/Landscape (`useLandscape.ts`, `OnboardingPage.tsx`), Park a
    Thought (`ThoughtParkingSheet.tsx`), two-way Google Calendar sync
    (`useGoogleCalendarSimple.ts` has both read and write methods),
    Overwhelm Mode (`OverwhelmedScreen.tsx`), Morning Bridge
    (`DailyCheckInModal.tsx`, `EnergyCheckIn.tsx`), Wind Down Ritual
    (`CloseYourDay.tsx`). One of these (session-purpose examples "Deep Work
    / Creative Flow / Present") is a minor mismatch against the actual
    shipped option labels (`Study`/`Work`/`Creative`/`Custom`) — noted, not
    escalated, feature itself is real.
  - **1 FABRICATED, escalated, not fixed:** "Family Care" claims Riva sends
    medicine reminders to a user's parents and answers their questions.
    Searched the whole monorepo (one app, `apps/web`) — zero trace of any
    such caregiving/elder feature anywhere outside this one marketing
    paragraph and its matching mock SVG.
  - **1 partially false, escalated, not fixed:** "Goals That Track
    Themselves" claims four weekly metrics "update on their own" — but
    `useGoals.ts:74` hardcodes `windDownNights: 0 // Would need sleep data
    integration`, so one of the four never actually auto-tracks.
  - Per the brief's explicit instruction, neither fabrication was silently
    rewritten — both are flagged in the card file as needing a human
    product decision.

## TDD Evidence

- RED (new file `apps/web/src/pages/__tests__/LandingPage.features.test.tsx`,
  two describe blocks, run against unmodified code): **7 passed / 2
  failed**, failures exactly on the predicted old value (`8.5px` vs.
  expected `9px`).
- GREEN (after implementation): **9/9 passed**, including the tag pill's
  computed color `rgb(62, 70, 163)` matching `hsl(235,45%,44%)` exactly.

## What I implemented

Three one-line edits inside `FeaturesSection`, each with an inline
before/after-ratio comment: `fontSize: 8.5 → 9` on the chapter label,
`fontSize: 8.5 → 9` and `color: T.indigo → 'hsl(235, 45%, 44%)'` on the
active feature's tag pill. Nothing else in the function changed — carousel
mechanism, illustrations, copy, tab row, progress bar, and ids untouched.

## Build + visual check

- `npx vitest run` (full suite, alone): **27 files, 274 tests, all
  passing.**
- `npm run build`: `✓ built in 16.13s`; `LandingPage` chunk 77.33 kB (gzip
  21.81 kB), effectively unchanged from the `landing-contrast` card's
  recorded baseline.
- Visual/interaction: served `dist` locally, drove headless Edge over CDP
  (Playwright's Chromium is blocked by OS Application Control on this
  machine, as in all prior cards). Native `scrollTo`/`scrollIntoView` are
  overridden back by the page's real Lenis smooth-scroll in production
  (unlike jsdom, where it's mocked), so I reached `#features` with real
  synthetic wheel ticks via `Input.dispatchMouseEvent`, polling
  `getBoundingClientRect()` until the sticky panel was active. At 1440×900
  and 390×844: labels read 9px, tag pill color reads `rgb(62,70,163)`
  exactly, no horizontal overflow, zero console errors, and two independent
  scroll runs landed on different active features (confirming the
  scroll→active wiring still works in the real build). Screenshots show the
  tag pill now plainly legible where it would have been washed-out before.

## Files changed

- `apps/web/src/pages/LandingPage.tsx` (3 one-line edits inside
  `FeaturesSection`, plus inline comments)
- `apps/web/src/pages/__tests__/LandingPage.features.test.tsx` (new)
- `docs/superpowers/cards/landing-features.md` (state → merged, full PASS
  1/2/3 writeup)

## Self-review

- Card-vs-no-card judged on this section's own structure (single-card
  scroll-cycled reveal, not a grid) rather than reflexively following the
  pilot's card-removal choice — concluded keep, with named reasons.
- Every one of the 9 feature claims was checked against real code, not
  assumed; two real issues found and escalated rather than silently
  patched or left unmentioned.
- All redesign-test assertions are positive (exact font-size/color values,
  not "is not the old value").
- Contrast math independently computed (Node script) for the one new
  pairing introduced; the one pre-existing pairing this card relies on
  unchanged (`T.indigo`/`T.bg` = 4.52:1) was also verified, not assumed.
- Card file ends cleanly, no stray content.

## Concerns

Two product-level issues in `FEATURES` copy, left unfixed per instructions
(disclose, don't silently rewrite) — need a human decision:
1. **"Family Care" (`FEATURES[7]`) is a fully fabricated feature** —
   medicine reminders / parent Q&A — with zero implementation anywhere in
   the codebase. This is on a safety-adjacent topic and is the strongest
   finding of this pipeline's fabrication checks so far.
2. **"Goals That Track Themselves" (`FEATURES[8]`) overstates automation** —
   one of its four named auto-tracked metrics (wind-down nights) is
   hardcoded to 0 and never actually updates from usage.
