---
id: landing-features
title: Landing Page - Features Section
owner: task-4-agent (solo; design + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = design, PASS 2 = product-fit, PASS 3 = build record) — PASS 2 found one fabricated feature claim and one partially-false claim in FEATURES copy, deliberately NOT rewritten; flagged for product decision.
---

# Card: Landing Page - Features Section

This card represents the redesign/verification pass for the Landing Page - Features Section feature/page in the Rivly web app.

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

**What is there now** (`LandingPage.tsx:1020-1087`, fed by `const FEATURES`
at `:1008-1018`)

A 9-entry `FEATURES` array (`num`, `tag`, `title`, `body`, `Visual` — a
custom hand-drawn SVG per feature) feeds `FeaturesSection({ onChapter })`,
`id="features"`. It is a `9 * 80 = 720vh` scroll track with a
`position: sticky` full-viewport panel: a header row (small uppercase
"Features · Chapter 04" label + a 01–09 tab-index row that dims/brightens
with the active feature), a content row (left: pill tag badge + large title +
body copy; right: the active feature's custom SVG illustration inside a
rounded, bordered, shadowed card), and a thin progress bar at the bottom
whose width animates with the active index. `scrollYProgress` drives `active`
via `Math.floor((v / 0.9) * FEATURES.length)`.

**Card-vs-no-card judgment, made on this section's own merits (not copied
from the Promise-section pilot, which removed its cards because its content
wasn't actually feature cards).** This genuinely is the page's feature-cards
section — the one the user named when asking for "various feature cards."
But structurally it is **not** a generic 3/4-column icon+title+description
grid (the template the spec's anti-goal targets). It is a single-card,
scroll-cycled narrative carousel — one feature full-screen at a time, each
with a bespoke illustration, title, and body — much closer to Linear's or
Arc's feature-reveal sections than to a SaaS pricing-page feature grid.
**Verdict: keep the card treatment for the illustration panel exactly as
built.** It is a specific, intentional pattern already, not the generic
look the spec warns against. The design pass's job here is to find and fix
concrete defects in that pattern, not replace a sound structure.

**The defects found (named, so the change is checkable)**

1. **Two labels are 8.5px**, one size below the 9px this file's three
   already-redesigned sections (`ProblemSection`, `ManifestoSection`,
   `ContrastSection`) converged their own small-caps chapter/tag labels to:
   the "Features · Chapter 04" header label (`:1039`) and the active
   feature's tag pill (`:1062`). Leaving Features at 8.5 makes it the odd
   one out among every section this pipeline has touched so far.
2. **The tag pill badge fails AA.** `color: T.indigo` on
   `background: T.indigoSub` computes (independent sRGB-relative-luminance,
   not a lookup table) to **3.86:1** — under the 4.5:1 AA floor for normal
   text. This is a genuine, previously-unflagged failure specific to this
   badge's color pair (`T.indigo`/`T.indigoSub`), distinct from the
   page-wide `T.muted`/`T.bg` = 4.40:1 known issue this pipeline's brief
   already tracks separately.

**Proposed direction: fix the two font sizes and the one measured contrast
failure in place; touch nothing else.**

- **A.** Both labels' `fontSize` → `9`, matching `ProblemSection`,
  `ManifestoSection`, `ContrastSection`'s already-landed fix.
- **B.** Tag pill text color → `hsl(235, 45%, 44%)` — same hue (235) as
  `T.indigo` (which is `hsl(235, 35%, 55%)`), darkened and slightly
  saturated so it reads unmistakably as the same indigo family, not a new
  color. Computed on `T.indigoSub`: **6.37:1**, clears AA with margin.
- **Explicitly not changed:** the sticky 720vh scroll track, the
  `scrollYProgress` → `active` derivation, the 01–09 tab-index row (dimmed
  to opacity 0.2 when inactive — a decorative/supplementary stepper
  indicator, not body text conveying unique information; same category of
  pre-existing dimmed-indicator pattern left alone elsewhere in this
  pipeline), the illustration-card shape/shadow/border, the `AnimatePresence`
  transition, the progress bar, the `FEATURES` array's content/order/SVGs,
  `id="features"`, the `id="family"` deep-link anchor, and the function's
  signature/call site. None of these are defective.

**Reference sites (three, specific, each tied to a decision)**

1. **Linear (linear.app).** The canonical example of a single-feature,
   scroll-or-tab-cycled showcase — one feature full-bleed at a time with a
   bespoke visual, rather than a grid of equal-weight icon tiles. Cited to
   justify *keeping* this section's one-active-feature-at-a-time structure
   rather than flattening it into a grid: it is already the premium pattern,
   not the generic one.
2. **Arc browser (arc.net).** Reused for the same reason as Linear but for
   the specific combination this section already has — numbered tab index
   (01–09 here) alongside a large title + short body + custom illustration —
   confirming the existing layout, not a cliché to replace.
3. **Stripe Press (press.stripe.com).** Reused a fourth time in this
   pipeline (pilot, Problem, Manifesto, Contrast, now Features) for the one
   thing this card touches typographically: small-caps/uppercase labels at a
   consistent, legible size — justifying landing on the same 9px the other
   three redesigned sections already converged on.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Cross-file impact — grep, not assertion.**

```
$ grep -rn "FeaturesSection" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:1020:function FeaturesSection({ onChapter }: ...
./apps/web/src/pages/LandingPage.tsx:1474:        <FeaturesSection onChapter={onChapter} />

$ grep -rn "\bFEATURES\b" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:1008,1025,1028,1029,1032,1042,1063,1066,1069  (all inside/around FeaturesSection, same file)
```

`FeaturesSection` is not exported; its only consumer is the one call site in
the same file. `FEATURES` is a module-local const used only inside
`FeaturesSection`. **Confirmed: no cross-file impact.** `id="features"` is
load-bearing (`IntersectionObserver` chapter map key `'features': 4`, and
the `ids` array used for scroll-spy nav) and is untouched by this card's
diff; so is the `id="family"` anchor nested just inside it (a deep-link
target, apparently for marketing copy pointing at the Family Care feature —
not referenced by any in-file nav link, but left exactly as-is since it is
plainly intentional infrastructure, not something this card's scope covers).

**Fabrication / honesty check — every one of the 9 `FEATURES` entries'
`body` text checked against the actual shipped codebase, not assumed honest
because it "sounds fine."** This is the check that matters most for this
particular card per the brief, and it found two real issues:

- **`FEATURES[7]` ("Family Care") — FABRICATED FEATURE, not just risky
  copy. Flagged, not fixed.** The copy reads: *"Add your parents to Riva's
  world. She sends medicine reminders, answers their questions, and alerts
  you if something needs your attention."* This describes a concrete,
  specific caregiving feature: adding a third party, automated medicine
  reminders to them, a conversational Q&A channel for them, and an alerting
  system back to the user. Searched the entire monorepo (there is only one
  app — `apps/web`, wrapped by Capacitor for mobile; no separate
  mobile/native app) for any trace of this: `grep -rni "medicine|caregiv|elder"
  --include=*.ts --include=*.tsx .` returns exactly one unrelated hit (a
  grocery-list keyword helper in `useShoppingList.ts` that recognizes
  "medicine" as a shopping-list category word) plus the landing page's own
  copy and its matching mock illustration (`FamilyCareSVG`, a static drawing
  of a chat bubble). **No onboarding flow, no data model, no notification
  path, no Q&A feature for a second party exists anywhere in the shipped
  product.** This is a materially stronger finding than the prior cards'
  "invented stat" / "false streak claim" — it is an entire advertised
  feature with zero backing implementation, on a safety-adjacent subject
  (medicine reminders for someone's parents). Per the brief's explicit
  instruction, this is **disclosed, not silently rewritten**: the copy is
  left unchanged in this card's diff, and this is reported as a concern
  requiring a human product decision (cut the claim, soften it to an
  explicit roadmap item, or build the feature) — not something a single
  section's redesign card should resolve unilaterally.
- **`FEATURES[8]` ("Goals That Track Themselves") — partially false,
  flagged, not fixed.** The copy claims weekly targets for "focus minutes,
  tasks completed, focus sessions, wind-down nights" all "update on their
  own from what you actually do." Checked `useGoals.ts`: `focusMinutes`,
  `focusSessions`, and `tasksCompleted` are genuinely computed from real
  session/task data (`:50-67`). But `windDownNights` is hardcoded to `0`
  with the comment `// Would need sleep data integration` (`:74`) — this one
  of the four named metrics **never** auto-updates from real usage; its
  progress bar is permanently stuck at 0% regardless of what the user
  actually does at night. The slider UI itself is real (`GoalsSection.tsx`
  imports and renders `<Slider>`), so "dial them in with a slider" is true;
  "Progress updates on its own from what you actually do" is false for one
  of the four metrics named in the same sentence. Flagged, left unchanged —
  same reasoning as above: a copy fix here (e.g., dropping "wind-down
  nights" from the list, or shipping the sleep-data integration) is a
  product decision, not a redesign-card decision.
- **The other 7 `FEATURES` entries were spot-checked against specific,
  falsifiable details in their copy and held up:**
  - `FEATURES[0]` "Plant Focus Seeds" — real: `useLandscape.ts`,
    `types/landscape.ts` ("Individual focus seed..."),
    `OnboardingPage.tsx:424` ("Your focus plants seeds in your landscape.
    Every session grows it.").
  - `FEATURES[1]` "Set your purpose: Deep Work, Creative Flow, or just
    Present" — the underlying mechanism (naming a session's purpose) is
    real (`FocusSetup.tsx`'s `purposeOptions`), but the three named
    examples don't match the actual shipped option labels (`Study`, `Work`,
    `Creative`, `Custom`). Minor — the feature exists, the illustrative
    examples are imprecise paraphrases, not an invented feature. Noted, not
    treated as a blocking finding; left unchanged (copy content is out of
    this card's scope to edit either way).
  - `FEATURES[2]` "Park a Thought" — real: `ThoughtParkingSheet.tsx`,
    `ThoughtsTab.tsx`.
  - `FEATURES[3]` "Two-way Google Calendar sync" — verified genuinely
    bidirectional: `useGoogleCalendarSimple.ts` both reads
    (`getCalendarEvents`/`fetchGoogleEvents`) and writes
    (`createCalendarEvent`/`updateCalendarEvent`/`deleteCalendarEvent`).
  - `FEATURES[4]` "Overwhelm Mode" / panic-button-to-next-step — real:
    `OverwhelmedScreen.tsx` ("Skip to next step").
  - `FEATURES[5]` "Morning Bridge" mood/energy/sleep logging — real:
    `DailyCheckInModal.tsx`, `EnergyCheckIn.tsx`, consistent with
    `RIVA_FEATURES`'s own "mood, energy, sleep" description a few hundred
    lines below in this same file.
  - `FEATURES[6]` "Wind Down Ritual" (review/reflect/release) — real:
    `CloseYourDay.tsx` ("A moment to reflect and let go").

**Contrast, computed, not assumed.**

| element | pairing | computed ratio | AA (4.5:1) |
|---|---|---|---|
| chapter label | `T.indigo` on `T.bg` | 4.52:1 | pass (unchanged by this card) |
| tag pill (before) | `T.indigo` on `T.indigoSub` | 3.86:1 | fail |
| tag pill (after) | `hsl(235,45%,44%)` on `T.indigoSub` | 6.37:1 | pass |

Computed via independent sRGB-linearize → relative-luminance → WCAG contrast
formula (Node script, not a lookup table or reused prior-card number — this
badge's background, `T.indigoSub`, is a different token from any pairing
`landing-contrast` measured). The chapter label's own pairing (`T.indigo` on
`T.bg`) was checked too, since this card reuses it unchanged, and clears AA
at 4.52:1 — confirmed before relying on it, not assumed because a sibling
section uses a similar pairing.

**Against the spec's goals** — named reference inspiration tied to specific
decisions; scoped to one function (plus the module-local `FEATURES` const it
alone reads) in one file; ends in a working build; every feature claim
cross-referenced against the actual codebase rather than taken on faith.

**Against the binding anti-goal** (*"ending this pass with the UI looking
'different' rather than verifiably better"*) — the diff is two font-size
numbers and one color value. Nothing about the layout, illustrations, copy,
or scroll mechanism changes, so "looks different" is not a risk; "measurably
more legible, consistent with three already-merged sibling sections" is the
actual effect.

**Verdict: APPROVED, scope as proposed in PASS 1, no cuts — plus two
escalations for human product review.**

- **KEEP** — both font-size fixes, the one color fix; the 720vh sticky
  carousel, the scroll-to-`active` wiring, the illustration-card treatment,
  the tab-index row, the progress bar, the `FEATURES` content/order/SVGs,
  `id="features"`, `id="family"`, all untouched.
- **No redesign of the carousel structure** — PASS 1 already argued this is
  a specific, non-generic pattern (Linear/Arc precedent); PASS 2 found no
  reason to revisit that call.
- **ESCALATED, not fixed:** `FEATURES[7]` ("Family Care") describes a
  medicine-reminder / parent-Q&A feature that does not exist anywhere in the
  shipped product — needs a human product decision (cut, soften, or build),
  not a unilateral copy edit from this card.
- **ESCALATED, not fixed:** `FEATURES[8]` ("Goals That Track Themselves")
  claims all four named metrics auto-update from real usage; one
  (wind-down nights) is hardcoded to 0 and never does. Same reasoning —
  flagged for product decision, left unchanged.
- **Noted, not actionable:** `FEATURES[1]`'s three named session-purpose
  examples don't exactly match the shipped option labels — minor, the
  underlying feature is real, not escalated as a blocker.

### PASS 3 — Build / verification record (state: running -> review -> merged)

- **RED** (pre-implementation, unmodified `LandingPage.tsx`):
  `LandingPage.features.test.tsx` → **7 passed / 2 failed**. The 7 baseline
  contract tests passed against the old code — confirming the baseline was
  genuinely established, not assumed — including `#features`'s chapter-04
  marker, its document-order position between `#contrast` and `#riva-ai`,
  the `#family` anchor, the 720vh sticky-carousel structure, the first
  `FEATURES` entry's tag/title/body verbatim, all 9 tab-index numbers, and
  the progress-bar width formula. The 2 redesign tests failed on exactly the
  predicted old value: both labels read `8.5px` where `9px` was expected —
  matching the hand-identified defect exactly before any code changed.
- **GREEN** (post-implementation): **9/9 passed** — both labels now read
  `9px`, and the tag pill now reads `rgb(62, 70, 163)` (`hsl(235,45%,44%)`),
  matching the independently-computed target color, with every baseline
  assertion still holding.
- **Implementation:** changed exactly two `fontSize` values (8.5 → 9) and
  one `color` value (`T.indigo` → `'hsl(235, 45%, 44%)'`) inside
  `FeaturesSection`, each with an inline comment recording the measured
  before/after ratio or the matched-sibling-section rationale. No other line
  in the function changed.
- **Full suite:** `cd apps/web && npx vitest run` (run alone, not concurrent
  with the build) → **27 files, 274 tests, all passing.**
- **Build:** `npm run build` → `✓ built in 16.13s`, no errors;
  `LandingPage` chunk **77.33 kB (gzip 21.81 kB)** vs. `landing-contrast`'s
  recorded **77.33 kB (gzip 21.80 kB)** pre-this-change — effectively
  unchanged size, consistent with two one-character numeric edits and one
  literal color string replacing another, not a regression.
- **Visual / interaction check:** built `dist` served from a local static
  server (`npx serve -l 4513 dist`) and driven over CDP in **headless Edge**
  (`msedge.exe --headless=new --remote-debugging-port=<port>`, driven via
  Node's native `WebSocket` client against the DevTools Protocol —
  Playwright's bundled Chromium is blocked by OS Application Control on this
  machine, per the pilot and all four prior cards). Native
  `scrollIntoView`/`scrollTo` get silently overridden back by the page's
  real Lenis smooth-scroll instance in the production build (unlike the
  test environment, where Lenis is mocked out), so the section was reached
  by dispatching real synthetic `Input.dispatchMouseEvent` wheel ticks via
  CDP and polling `#features`'s `getBoundingClientRect()` until its sticky
  panel was active, then a few more ticks further into the 720vh track — at
  **1440×900** and **390×844**, captured screenshots, **looked at them**,
  and read computed styles off the live DOM:
  - `chapterLabelFontSize`/`tagFontSize: "9px"` at both widths — matches the
    target.
  - `tagColor: "rgb(62, 70, 163)"` at both widths — matches
    `hsl(235,45%,44%)` exactly, in the actual production build, not just
    jsdom.
  - `chapterLabelColor: "rgb(100, 107, 180)"` (unchanged `T.indigo`) at both
    widths — confirms this card's font-size-only edit to that label didn't
    accidentally touch its color.
  - The two scroll runs landed on different active features each time
    (Morning/Goals on an earlier overshoot; "Mind Clarity" on the tuned
    run) purely from how far the wheel ticks advanced — confirming the
    `scrollYProgress` → `active` derivation still drives which feature
    renders, in the real build.
  - `docScrollWidth === docClientWidth` at both widths (1425/1425 desktop,
    390/390 mobile) — no horizontal overflow introduced.
  - Separate console-error check (`Log.enable` + `Runtime.enable`,
    listening for `Log.entryAdded` level `error` and
    `Runtime.exceptionThrown` across a fresh page load and scroll): **0
    errors**, at both widths.
  - Screenshots (both widths): the "MIND CLARITY" tag pill is now plainly
    legible dark indigo on its pale lavender background — previously, at
    3.86:1, it would have read as a washed-out, low-contrast label; the
    "FEATURES · CHAPTER 04" header label and the 01–09 tab row render
    crisply at the new 9px; the active feature's custom illustration card
    (rounded, bordered, shadowed, containing `ThoughtParkSVG`'s floating
    task chips) renders with no clipping or layout shift at either width.
- **Primary interaction verified:** `#features` is the `'features': 4`
  chapter target and its `IntersectionObserver` wiring is untouched; the
  720vh sticky track still drives `active` (and therefore which `FEATURES`
  entry's tag/title/body/illustration renders) and the progress-bar width
  exactly as before — confirmed live by observing the active feature change
  correctly across two independent scroll runs at both widths.
- **Escalations, not defects in this card's own scope:** two product-fit
  findings above (`FEATURES[7]` Family Care fabrication, `FEATURES[8]`
  Goals wind-down-nights false auto-tracking claim) are real issues in the
  shipped marketing copy but are **not** fixed by this card's diff, per the
  brief's explicit instruction not to silently rewrite or invent cover for
  a false feature claim. These need a human product decision before (or
  independent of) any further redesign work on this section.
