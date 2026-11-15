---
id: landing-riva
title: Landing Page - Riva Section
owner: task-4-agent (solo; design + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = design, PASS 2 = product-fit, PASS 3 = build record) — PASS 2 found three fabricated/invented specifics (one duplicated once more in the header paragraph) across two RIVA_FEATURES entries; deliberately NOT rewritten; flagged for product decision, with matching in-source FIXME comments at all three sites.
---

# Card: Landing Page - Riva Section

This card represents the redesign/verification pass for the Landing Page - Riva Section feature/page in the Rivly web app.

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

**What is there now** (`LandingPage.tsx:1121-1221`, fed by `RIVA_FEATURES`
at `:1106-1113` and `ORB_MOODS`/`ORB_MOOD_HOLD_MS`/`ORB_MOOD_FADE_S` at
`:1117-1119`)

Chapter 5, `id="riva-ai"`, dark section (`background: T.night`). A twinkling
star field behind everything; a centered header (chapter label, a slow
mood-cycling orb, two lines of giant display type — "Meet Riva." / "Your AI
life companion." — then a muted sans paragraph); a 6-item feature grid
(`repeat(auto-fit, minmax(300px,1fr))`, 1px hairline gaps, hover-highlight
tiles, icon + title + desc each); and a closing pull-quote in a soft
indigo-tinted panel with a small-caps attribution line.

**Card-vs-no-card / structural judgment, made on this section's own
merits.** The 6-tile grid is visually close to a generic SaaS "feature
grid," which is the shape the spec's anti-goal is wariest of. But it is not
the cookie-cutter white-card-with-shadow version: equal-weight tiles share
hairline 1px dividers on a near-black field with a per-tile hover-highlight,
no card borders/shadows/rounding per tile — closer to Vercel's dark
feature-grid sections (vercel.com's platform-capability panels) than to a
bordered-card SaaS template. Combined with the orb hero and closing
pull-quote around it, the section reads as one distinctive "meet the AI"
chapter, not a generic grid dropped into a page. **Verdict: keep the grid
exactly as structured.** The real, fixable defects here are typographic/
contrast, not structural — same conclusion `landing-features` reached for
its own carousel, reached independently here by checking this section's
grid against the anti-goal, not by copying that verdict.

**The defects found (named, so the change is checkable)**

1. **Two small-caps labels are below the 9px this file's four
   already-redesigned sections** (`ProblemSection`, `ManifestoSection`,
   `ContrastSection`, `FeaturesSection`) **converged on:** the "Chapter 05 ·
   Your Rhythm Guide" header label (`:1154`, currently `8.5`) and the
   closing quote's "— Riva, your rhythm guide" attribution (`:1216`,
   currently `8`, one size below even the old 8.5 baseline).
2. **The feature-grid body copy fails AA.** `rgba(255,255,255,0.38)` on
   `T.nightSub` computes to **3.56:1** — under the 4.5:1 normal-text floor.
   This is the desc text under all 6 `RIVA_FEATURES` titles.
3. **The quote attribution fails AA more severely.** `T.indigoXL` at
   `opacity: 0.5` on the quote panel's background (`rgba(61,59,191,0.06)`
   over `T.night`) computes to **2.89:1** — a harder failure than the
   label-font-size issue, on the same line.

**Proposed direction: fix the two font sizes and the two measured contrast
failures in place; touch nothing else.**

- **A.** Header chapter label `fontSize` → `9`, matching the four sibling
  sections' established convention.
- **B.** Quote attribution `fontSize` → `9` as well (was `8`, one size
  further off than the header label).
- **C.** Feature-grid desc color → `rgba(255,255,255,0.5)` (was `0.38`).
  Computed on `T.nightSub`: **5.18:1**, clears AA with real margin — chosen
  over the bare-minimum 0.46 so it isn't a hairline pass.
- **D.** Quote attribution color → `T.indigoXL` at `opacity: 0.75` (was
  `0.5`). Computed on the quote panel background: **4.91:1**, clears AA —
  0.75 chosen over the bare-minimum 0.72 for the same margin-not-hairline
  reason, while staying visibly more muted than the full-strength quote
  text above it (kept as a caption, not promoted to body-text weight).
- **Explicitly not changed:** the star field, the mood-cycling orb and its
  4-color `ORB_MOODS` cycle, the two giant display headline lines, the
  header's muted paragraph (`rgba(255,255,255,0.45)` on `T.night` —
  independently checked at **4.52:1**, clears AA, left alone), the 6-tile
  grid's structure/hover behavior/icons/order, the quote panel's
  border/background/border-radius, the quote's own body-text color
  (`rgba(255,255,255,0.75)` — checked at **10.35:1**, well clear),
  `RIVA_FEATURES`' content, `ORB_MOOD_HOLD_MS`/`ORB_MOOD_FADE_S` timings,
  `id="riva-ai"`, and the function's signature/call site. None of these are
  defective.

**Reference sites (three, specific, each tied to a decision)**

1. **Vercel (vercel.com).** Its dark platform-capability sections use
   equal-weight, hairline-divided tiles with icon + short title + short
   desc and a per-tile hover highlight — no per-card border/shadow/rounding.
   Cited to justify *keeping* this section's 6-tile grid exactly as
   structured rather than reshaping it into bordered cards or a carousel:
   it already matches a real, non-generic dark-feature-grid precedent, not
   the cookie-cutter SaaS template the anti-goal warns about.
2. **Linear (linear.app).** Its chapter-style sections pair a glowing/
   pulsing focal object with oversized display type and a short italic or
   muted accent line underneath — the same shape as this section's orb +
   "Meet Riva." + "Your AI life companion." + muted paragraph. Cited to
   justify leaving that hero block entirely alone.
3. **Stripe Press (press.stripe.com).** Reused a fifth time in this
   pipeline (pilot, Problem, Manifesto, Contrast, Features, now Riva) for
   the one thing this card touches typographically: small-caps/uppercase
   labels at a single consistent, legible size — justifying landing both
   of this section's undersized labels on the same 9px the other four
   sections already converged on.

### PASS 2 — Product-fit review (self-review of PASS 1 against the spec)

Reviewed against `docs/superpowers/specs/2026-11-14-full-app-redesign-pipeline-design.md`.

**Cross-file impact — grep, not assertion.**

```
$ grep -rn "RivaSection" --include=*.ts --include=*.tsx --include=*.js . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:1121:function RivaSection({ onChapter }: ...
./apps/web/src/pages/LandingPage.tsx:1487:        <RivaSection onChapter={onChapter} />

$ grep -rn "\bRIVA_FEATURES\b|ORB_MOODS|ORB_MOOD_HOLD_MS|ORB_MOOD_FADE_S" --include=*.ts --include=*.tsx . | grep -v node_modules
./apps/web/src/pages/LandingPage.tsx:1106,1117,1118,1119,1130,1133,1165,1168,1169,1195  (all inside/around RivaSection, same file)
```

`RivaSection` is not exported; its only consumer is the one call site in
the same file. `RIVA_FEATURES`, `ORB_MOODS`, `ORB_MOOD_HOLD_MS`,
`ORB_MOOD_FADE_S` are module-local consts used only inside `RivaSection`.
**Confirmed: no cross-file impact.** `id="riva-ai"` is load-bearing
(`IntersectionObserver` chapter map key `'riva-ai': 5`, the `ids` scroll-spy
array, and the nav link `{ l: 'Riva AI', h: '#riva-ai' }` at `:1414`) and is
untouched by this card's diff.

**Fabrication / honesty check — every one of the 6 `RIVA_FEATURES`
entries' `desc`, plus the header's own claim paragraph, checked against the
actual shipped codebase (web app, `worker/`, `supabase/`), not assumed
honest. This found three real issues, two of them duplicated across two
locations in this same function:**

- **`RIVA_FEATURES[4]` ("She Reaches Out") — FABRICATED, two distinct
  claims, one of them ALSO repeated in the header paragraph a few lines
  above. Flagged, not fixed.** The copy reads: *"Riva doesn't wait to be
  asked. She messages you first - morning check-ins, **Sunday nudges**, and
  a quiet **'everything okay?' when you've gone quiet**. She shows up."*
  Searched the entire monorepo (`apps/web`, `worker/`, `supabase/functions`,
  `supabase/migrations`) for any day-of-week-scheduled proactive messaging
  or any inactivity/quiet-detection messaging:
  `grep -rni "sunday" --include=*.ts .` outside `apps/web/src/pages/
  LandingPage.tsx` returns only date-parsing/weekday-label utilities
  (`nextSunday` for scheduling a *user's own* task to "this sunday",
  calendar weekday labels) — **no scheduled Sunday message to the user
  anywhere.** `grep -rni "everything okay|haven't heard|gone quiet|inactiv.*nudge" .`
  returns **zero hits** anywhere in the codebase. The only real proactive
  messaging that exists is `useRivaLogic.ts`'s time-of-day `CARE_MESSAGES`
  (hydration/stretch/lunch/dinner/sleep-wrap-up, gated on clock time and a
  3-hour cooldown — nothing day-of-week- or silence-triggered) and
  `useMorningBridgeNudge.ts` (once-daily check-in toast). **The exact same
  "Sunday nudges" claim is independently repeated in the header paragraph**
  (`:1189`, "...messages you first on Sunday evenings..."), so this single
  fabricated behavior is advertised twice in this one function. Per the
  brief's instruction, this is disclosed, not silently rewritten.
- **`RIVA_FEATURES[5]` ("Grows With You") — partially false, flagged, not
  fixed.** The copy claims precise numeric thresholds: *"After 30
  conversations, she knows you. After 60, she feels like a friend who has
  known you for years."* The underlying mechanism is real — `worker/src/
  services/ai/groq.ts` maintains a genuine growing-memory object
  (`userFacts` capped at 20, `recentInteractions`, `preferredTags`,
  `lastMode`) fed into every prompt as `USER FACTS (remembered from past
  conversations)` — but **no conversation-count field, counter, or
  threshold of any kind (30, 60, or otherwise) exists anywhere in the
  memory code.** The qualitative claim ("gets smarter about your patterns
  over time") is true; the specific numbers are invented. "Never sold,
  never shared" is adequately backed by `PrivacyPolicyPage.tsx:78` ("We
  never sell your personal data to third parties") and is not flagged.
- **The other 4 `RIVA_FEATURES` entries, plus the un-flagged portions of
  the two above, were checked against specific, falsifiable details and
  held up:**
  - `RIVA_FEATURES[0]` "Morning Briefing" — real end-to-end:
    `DailyCheckInModal.tsx` → `useRivaLogic.ts`'s `playMorningBriefing` →
    `api.riva.morningBriefing` → `worker/src/routes/riva.ts`. "Speaks in a
    natural voice" is specifically backed, not generic puffery: `worker/
    supabase_migrations/20240311_tts_audio_cache.sql` documents a cache for
    "Azure Neural TTS" responses — a real neural (not robotic-browser)
    voice backend, distinct from the plain `window.speechSynthesis`
    fallback used elsewhere for text-response playback.
  - `RIVA_FEATURES[1]` "Rhythm Orb" ("Four real expressions — focused,
    overwhelmed, settled, neutral") — real and exact:
    `useRhythmOrb.ts`'s `RhythmOrbState` type is literally `'neutral' |
    'focused' | 'overwhelmed' | 'settled'`, driven by `useRhythmScore.ts`'s
    data-driven score from real mood/sleep/energy/task/focus inputs.
  - `RIVA_FEATURES[2]` "Voice Commands" — all three quoted example commands
    verified to actually work, including offline: `riva-offline.ts`'s
    `processOfflineCommand` handles "add task [x]" (add-task branch),
    "start a focus session" (FOCUS branch), and "take me to insights" (its
    NAVIGATION branch's keyword map includes `'insight': 'insights'` under
    a `go to|open|show|navigate` match) — all three resolved without a
    network call. "Even offline" is accurate for exactly the three examples
    quoted.
  - `RIVA_FEATURES[3]` "Focus Intelligence" ("Suggests when to work, when
    to rest, and when to take a breath") — real: `patternInsights.ts`
    derives "You tend to focus best on {weekday}s" from actual aggregated
    focus-session data (`bestDay`/`bestAvg` over real per-day history, not
    averages); `RhythmOrbContext.tsx:175` literally renders "Take a
    breath..." for the overwhelmed state; `CARE_MESSAGES.sleepNudge` covers
    the "when to rest" framing.
  - `RIVA_FEATURES[4]`'s "morning check-ins" clause (as opposed to the
    flagged "Sunday nudges"/"gone quiet" clauses in the same entry) — real,
    via `useMorningBridgeNudge.ts`.
  - `RIVA_FEATURES[5]`'s "Never sold, never shared" clause (as opposed to
    the flagged 30/60-conversation numbers in the same entry) — adequately
    backed, see above.

**Contrast, computed, not assumed.**

| element | pairing | computed ratio | AA (4.5:1) |
|---|---|---|---|
| chapter label | `T.indigoXL` on `T.night` | 8.00:1 | pass (unchanged by this card) |
| header paragraph | `rgba(255,255,255,.45)` on `T.night` | 4.52:1 | pass (unchanged, independently checked before relying on it) |
| quote body text | `rgba(255,255,255,.75)` on quote panel bg | 10.35:1 | pass (unchanged) |
| feature desc (before) | `rgba(255,255,255,.38)` on `T.nightSub` | 3.56:1 | fail |
| feature desc (after) | `rgba(255,255,255,.5)` on `T.nightSub` | 5.18:1 | pass |
| quote attribution (before) | `T.indigoXL` @ 0.5 on quote panel bg | 2.89:1 | fail |
| quote attribution (after) | `T.indigoXL` @ 0.75 on quote panel bg | 4.91:1 | pass |

Computed via independent sRGB-linearize → relative-luminance → WCAG
contrast formula (Node script, not a lookup table, not a reused prior-card
number — the quote panel's background is a translucent indigo-over-night
composite unique to this section, so it was composited and measured, not
assumed from a token name).

**Against the spec's goals/anti-goals** — named reference inspiration tied
to specific decisions; scoped to one function (plus the module-local
consts it alone reads) in one file; ends in a working build; every feature
claim cross-referenced against the actual codebase rather than taken on
faith; the diff is four numeric/color value changes, so "looks different"
is not a realistic risk.

**Verdict: APPROVED, scope as proposed in PASS 1, no cuts — plus
escalations for human product review.**

- **KEEP** — both font-size fixes, both color fixes; the star field, orb
  and its mood cycle, display headline, 6-tile grid structure/content,
  quote panel, `id="riva-ai"`, all untouched.
- **No redesign of the grid structure** — PASS 1 already argued this
  section's grid matches a real dark-feature-grid precedent (Vercel), not
  the generic SaaS template; PASS 2 found no reason to revisit that call.
- **ESCALATED, not fixed:** `RIVA_FEATURES[4]` ("She Reaches Out") and the
  header paragraph both claim "Sunday nudges"/"messages you first on Sunday
  evenings" — no day-of-week-scheduled proactive messaging exists anywhere
  in the shipped product. The same entry also claims a quiet
  "'everything okay?' when you've gone quiet" inactivity message — no
  inactivity/silence-detection messaging exists anywhere either. Needs a
  human product decision (cut, soften to a roadmap item, or build), not a
  unilateral copy edit from this card.
- **ESCALATED, not fixed:** `RIVA_FEATURES[5]` ("Grows With You") claims
  specific "After 30 conversations... After 60..." thresholds; no
  conversation-count mechanism of any kind exists in the memory code. Same
  reasoning — flagged for product decision, left unchanged.

### PASS 3 — Build / verification record (state: running -> review -> merged)

- **RED** (pre-implementation, unmodified `RivaSection`): new
  `LandingPage.riva.test.tsx` → **6 passed / 3 failed**. The 6 baseline
  contract tests passed against the old code — confirming the baseline was
  genuinely established, not assumed — including `#riva-ai`'s chapter-05
  marker, its document-order position between `#features` and `#why-not`,
  the hero headline/paragraph, all 6 `RIVA_FEATURES` titles verbatim, the
  first entry's body verbatim, and the closing pull-quote + attribution. The
  3 redesign tests failed on exactly the predicted old values: the chapter
  label read `8.5px` (expected `9px`), the feature desc color read
  `rgba(255, 255, 255, 0.38)` (expected `0.5`), and the quote attribution
  read `8px`/opacity unset-for-9px-check (expected `9px`) — matching the
  hand-identified, independently-measured defects exactly before any code
  changed.
- **GREEN** (post-implementation): **9/9 passed** — chapter label and quote
  attribution both read `9px`, the feature desc reads
  `rgba(255, 255, 255, 0.5)`, and the quote attribution reads `opacity:
  0.75`, matching the independently-computed targets, with every baseline
  assertion still holding.
- **Implementation:** changed exactly two `fontSize` values (8.5 → 9, 8 → 9)
  and two color/opacity values (feature-desc alpha 0.38 → 0.5; quote
  attribution opacity 0.5 → 0.75) inside `RivaSection`, each with an inline
  comment recording the measured before/after ratio. Added three in-source
  `FIXME` comments (two inside the `RIVA_FEATURES` array literal, one above
  the header paragraph) documenting the escalated fabrication findings at
  their exact sites, per the `landing-features` precedent. No other line in
  the function changed.
- **Full suite:** `cd apps/web && npx vitest run` (run alone, not concurrent
  with the build). First run: 9 files / 28 tests failed across the whole
  suite (265 total), all in files unrelated to `LandingPage.tsx` —
  `AddTaskDialog.test.tsx`, `DayPlannerAvatar.test.tsx` (both `Error: Test
  timed out in 5000ms`), and a worker-pool start timeout for
  `useCashfree.test.ts` — consistent with this machine's documented
  concurrent-build/OOM pressure, not a regression from this card's two-line
  diff. Re-ran immediately after: **27/28 files passed, 1 pre-existing
  flaky failure** (`AddTaskDialog.test.tsx` only; `DayPlannerAvatar` and
  `useCashfree` passed clean on the re-run) — confirming the first run's
  extra failures were transient, and that every `LandingPage`/riva test
  passed in both runs.
- **Build:** `npm run build` → `✓ built in 20.85s`, no errors; `LandingPage`
  chunk **77.33 kB (gzip 21.81 kB)** — identical to `landing-features`'s
  recorded **77.33 kB (gzip 21.81 kB)**, consistent with a four-value,
  two-comment-block diff, not a regression.
- **Visual / interaction check:** built `dist` served from a local static
  server (`npx serve -l 4518 dist`) and driven over CDP in **headless Edge**
  (`msedge.exe --headless=new`, driven via Node's native `WebSocket` client
  against the DevTools Protocol — Playwright's bundled Chromium is blocked
  by OS Application Control on this machine, per the pilot and all prior
  cards). The real Lenis smooth-scroll instance in the production build
  doesn't map wheel ticks to `vh` linearly, so the section was reached by
  dispatching real synthetic `Input.dispatchMouseEvent` wheel ticks via CDP
  while polling `#riva-ai`'s `getBoundingClientRect().top` until the section
  was in view — at **1440×900** and **390×844**, captured screenshots,
  **looked at them**, and read computed styles off the live DOM:
  - `chapterLabelFontSize`/`attributionFontSize: "9px"` at both widths —
    matches the target.
  - `descColor: "rgba(255, 255, 255, 0.5)"` at both widths — matches the
    target exactly, in the actual production build, not just jsdom.
  - `attributionOpacity: "0.75"` at both widths — matches the target.
  - `chapterLabelColor`/`attributionColor: "rgb(163, 167, 220)"` (unchanged
    `T.indigoXL`) at both widths — confirms this card's font-size/opacity-
    only edits didn't accidentally touch either element's hue.
  - `docScrollWidth === docClientWidth` at both widths (1425/1425 desktop,
    390/390 mobile) — no horizontal overflow introduced.
  - Separate console-error check (`Log.enable` + `Runtime.enable`,
    listening for `Log.entryAdded` level `error` and
    `Runtime.exceptionThrown` across a fresh page load and scroll): **0
    errors**, at both widths.
  - Screenshots (both widths): the 6-tile feature grid's desc copy is now
    plainly legible light-gray-on-near-black — previously, at 3.56:1, it
    would have read as a washed-out, low-contrast paragraph; the "CHAPTER
    05 · YOUR RHYTHM GUIDE" header label renders crisply at the new 9px; the
    mood-cycling orb, giant display headline, and star field render with no
    clipping or layout shift at either width.
- **Primary interaction verified:** `#riva-ai` is the `'riva-ai': 5` chapter
  target and its `IntersectionObserver` wiring, the orb's mood-cycling
  interval, and the feature grid's hover-highlight are all untouched by this
  card's diff — confirmed live by observing the section render correctly
  with no console errors across two independent scroll runs at both widths.
- **Escalations, not defects in this card's own scope:** the three
  product-fit findings above (`RIVA_FEATURES[4]` "Sunday nudges" + "gone
  quiet" fabrication, duplicated in the header paragraph; `RIVA_FEATURES[5]`
  30/60-conversation false-threshold claim) are real issues in the shipped
  marketing copy but are **not** fixed by this card's diff, per the brief's
  explicit instruction not to silently rewrite or invent cover for a false
  feature claim. In-source `FIXME` comments mark all three exact sites.
  These need a human product decision before (or independent of) any
  further redesign work on this section.
