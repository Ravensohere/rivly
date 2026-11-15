# Task 4 report — card `landing-contrast`

Full design/product-fit/build record lives in the card file:
`docs/superpowers/cards/landing-contrast.md` (state: `merged`). This report
summarizes it.

## Design direction + reference sites + why

Target: `ContrastSection` (`apps/web/src/pages/LandingPage.tsx:699-762`), the
`const STORY` array (7 bad/good copy pairs) plus the sticky two-panel
scroll-driven split that renders them, `id="contrast"`, chapter 3.

Unlike the prior two cards (`landing-problem`, `landing-manifesto`), the
existing layout here did **not** need a rebuild: it's a sticky split where a
"bad" (struck-through, red) panel and a "good" (italic, off-white-on-indigo)
panel sit side by side, and the "good" panel visibly grows (30%→60% width) as
you scroll — a specific editorial device, not a generic-SaaS card grid.

Reference sites cited (each tied to a decision):
1. **Basecamp's HEY.com marketing site** — the canonical real-world example of
   exactly this struck-through-old / clean-new device. Justifies *keeping*
   the split mechanism rather than replacing it.
2. **The Pudding (pudding.cool)** — justifies the scroll-driven sticky
   side-by-side mechanism itself (reused from `landing-problem`'s PASS 1,
   here for mechanism rather than disclosure convention).
3. **Stripe Press (press.stripe.com)** — reused a third time, justifying the
   one typographic change made: landing both chapter labels on the 9px size
   `landing-problem`/`landing-manifesto` already converged on.

Net: design pass concluded "fix two measured defects, touch nothing else,"
not a visual rebuild.

## Product-fit findings

**PASS 1 (design)** and **PASS 2 (product-fit)** both recorded in the card,
labelled explicitly.

- **Grep result:** `ContrastSection` has exactly one call site
  (`LandingPage.tsx:1471`), not exported, no other consumer. `STORY` (the
  module-local const it reads) is used only inside `ContrastSection` and this
  card's own test file. **Confirmed: no cross-file impact.**
- **Fabrication/falsity check** (same discipline as `landing-problem`'s
  invented "0" stat and `landing-manifesto`'s false "0 streaks to break"):
  every line of the 7-pair `STORY` array was checked, not just the two with
  numbers (there are no numbers in this array at all). Two lines make
  checkable product claims and were verified against the shipped code:
  - `'Break the streak, lose it all'` / `'Both kinds of days count'` —
    checked directly against the exact defect class `landing-manifesto`
    found, and found **not false**: `activityDerivation.ts` separates
    `currentStreak` (resets) from `longestStreak` (never decreases);
    `useAchievements.ts` keys every streak achievement's unlock off
    `longestStreak`, so a broken streak doesn't revoke an earned badge; and
    `rivaLanguage.ts`'s `streakEnded` message is explicitly non-punitive.
    "Both kinds of days count" holds up.
  - `'Your parents are in another city'` / `'Riva takes care of them too'` —
    checked against a shipped feature, not left as an assumption: this same
    file's `RIVA_FEATURES` array ships the exact worked example `"Create a
    task to call mom."` as a Voice Commands example, so the couplet is
    compressed language for an existing reminder/task feature, not an
    invented caregiving capability. Grepped `apps/web/src` for
    caregiver/elder-monitoring code — none exists, and the couplet doesn't
    claim it exists.
  - **Result: no fabricated or false claim found** in this section — reported
    explicitly, per instruction to report this even on a clean result.
    One soft item flagged but not acted on: `'Riva. Always.'` read as
    aspirational companion-AI marketing copy (consistent with this file's
    other "She Reaches Out" language), not a literal uptime claim — noted as
    a page-wide policy question for whoever eventually standardizes how
    literally to read this register, out of scope for one section's card.
- **Contrast, computed not assumed** (the two real defects this card fixes):
  - Left chapter label: `T.muted` on `T.cream` = **4.05:1** (fails AA 4.5:1,
    worse than the page-wide known `T.muted`/`T.bg` issue at 4.40:1).
  - Right chapter label: `T.indigoXL` on `T.indigo` = **2.12:1** (fails AA
    hard — less than half the floor).
  - Both computed via an independent sRGB-linearize → relative-luminance →
    WCAG-ratio Node script, not reused from either prior card (different
    background tokens).

## TDD Evidence

New file: `apps/web/src/pages/__tests__/LandingPage.contrast.test.tsx`, two
describe blocks (`baseline contract` / `redesign`), positive assertions
primary (exact label text, exact `STORY[0]` pair content/order, document
position) paired with the negative color-value assertions.

- **RED** (pre-implementation): 5 passed / 2 failed. The 2 redesign tests
  failed on the exact predicted old computed colors — `rgb(110, 114, 135)`
  (old `T.muted`) and `rgb(163, 167, 220)` (old `T.indigoXL`) — matching the
  hand-computed 4.05:1/2.12:1 ratios exactly, confirming the math was right
  before touching code.
- **GREEN** (post-implementation): 7/7 passed.

## What was implemented

Inside `ContrastSection` only, two label `<div>`s changed (each with an
inline comment recording the measured ratio):
- Left label: `color: T.muted` → `color: 'hsl(230, 10%, 40%)'` (5.38:1),
  `fontSize: 8.5` → `9`.
- Right label: `color: T.indigoXL` → `color: '#FAFAF7'` (4.67:1, reusing the
  off-white already used for this panel's headline text below it),
  `fontSize: 8.5` → `9`.

Nothing else in the function changed: 300vh track, scroll-to-`active` wiring,
`rightW` width animation, strikethrough/italic copy treatment, `STORY`
content/order, `id="contrast"`, and the call site are all untouched.

## Build + visual check

- `npx vitest run src/pages/__tests__/LandingPage.contrast.test.tsx` → 7/7.
- Full suite `npx vitest run` (run alone, not concurrent with build) → 26
  files, 265 tests, all passing.
- `npm run build` → built in 13.19s, no errors. `LandingPage` chunk 77.33 kB
  (gzip 21.80 kB), ~20 bytes over the manifesto-card baseline (two longer
  literal color strings vs. token references) — not a regression.
- Visual check: served `dist` locally (`npx serve -l 4512`), drove headless
  Edge over CDP via Node's native `WebSocket` client (Playwright's bundled
  Chromium is blocked by OS Application Control on this machine, consistent
  with all three prior cards), at 1440×900 and 390×844. Scrolled `#contrast`
  into view and further into its track (landed on the 2nd `STORY` pair,
  confirming scroll-driven `active` advancement still works), captured
  screenshots, and looked at them: left label now plainly legible
  dark gray-indigo where it was previously pale and hard to read; right
  label now crisp white where it was previously a washed-out lavender nearly
  lost against the indigo background — a visible, not just numeric,
  improvement. Read computed styles off the live DOM: both colors and font
  sizes match the targets exactly at both widths; `docScrollWidth ===
  docClientWidth` at both widths (no overflow); separate CDP `Log`/`Runtime`
  listener across a fresh load recorded 0 console errors.

## Files changed

- `apps/web/src/pages/LandingPage.tsx` — two color values + two font-size
  values inside `ContrastSection` (lines ~724, ~743 pre-edit).
- `apps/web/src/pages/__tests__/LandingPage.contrast.test.tsx` — new test
  file.
- `docs/superpowers/cards/landing-contrast.md` — state updated to `merged`,
  full PASS 1/2/3 handoff recorded.

## Self-review

- Positive assertions, not negative-only: yes — every redesign test asserts
  the correct new color/size (positive) alongside confirming label text is
  unchanged (positive), and baseline tests assert exact content/order/ids.
- Contrast values verified with real math: yes — independent Node script
  (sRGB → linear → relative luminance → WCAG ratio), both before and after
  values for both labels, plus a check on alpha-blended white rejected for
  dropping under 4.5:1.
- Card file clean at the end: yes, confirmed by reading the tail of the file
  (ends on the last bullet of PASS 3, no stray tool output).
- Fabrication/falsity check done even though none found: yes, documented in
  PASS 2 with specific code citations for the two checkable claims.
- Actually looked at rendered output: yes, both screenshots reviewed
  directly (desktop and mobile), not just computed-style assertions.

## Concerns

- None blocking. One soft, deliberately-unresolved item carried forward (not
  a defect of this card): `'Riva. Always.'` is aspirational copy consistent
  with this file's existing companion-AI register, not a literal uptime
  claim — flagged for whoever eventually sets a page-wide policy on how
  literally to read that kind of line, since no single section's card should
  adjudicate it alone.
