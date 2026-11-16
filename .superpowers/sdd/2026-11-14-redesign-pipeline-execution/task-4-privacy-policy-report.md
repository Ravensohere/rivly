# Task 4 Card Report — privacy-policy

File: `apps/web/src/pages/PrivacyPolicyPage.tsx` (route `/privacy`, public, no auth guard)

## Audit findings

- Five `<section>` blocks of static legal copy, no props/dynamic data/conditional rendering — the entire text surface is frozen, static JSX strings.
- 10 `text-muted-foreground` sites, all on the same flat `bg-background` (no gradient/opacity stacking anywhere in this file, unlike the `onboarding` card's timer circle). Sites: the "Back" button, the "Last updated" line, and the intro paragraph + list/body copy of all 5 sections.
- Cross-file impact: `grep -rn PrivacyPolicyPage apps/web/src` → only `AnimatedRoutes.tsx` (the lazy-imported route) and the new test file. Zero cross-file regression risk.

## Product-fit / data-practice-accuracy findings (PASS 2)

Checked every factual data-practice claim against real code:

1. Profile name/email via Google Sign-In → stored in Supabase `profiles` table (`useAuth.ts:49,379`). Matches.
2. Google Calendar events/metadata accessed to display in-app → confirmed via `useGoogleCalendarSimple.ts`, `useEvents.ts`. Matches.
3. App preferences (theme/notifications) → consistent with the profile-based storage model. Matches.
4. "We do not store your calendar events on our servers... fetched directly from Google APIs" → read `supabase/functions/google-calendar-events/index.ts` in full. It stores only OAuth tokens (`google_calendar_connections`), fetches events live from `googleapis.com/calendar/v3` on every request, and never persists event data (title/start/end/location) anywhere. **Verified true against actual server code.**
5. "Profile and preferences stored securely using Supabase" → same `profiles` table. Matches.
6. "We never sell your personal data to third parties" → unverifiable negative business claim, out of scope for a code check (same treatment as `onboarding` card's static marketing copy).

**Escalation (not fixed, per instructions):** `apps/web/index.html` loads Google Analytics (`gtag.js`, `G-LCWBTL35M6`) on every page, including `/privacy`. The policy's "Information We Collect" section does not mention Google Analytics as a data recipient. This is a disclosure-completeness gap in the legal text, not a false statement in the existing wording — a legal/product decision, not a design fix. Flagged in the card's handoff for a future dedicated card; **not edited**.

## Explicit text-content diff verification (before/after)

- Captured `container.textContent` from the **unmodified** component (via a deliberately-failing test run against the literal placeholder `'REPLACE_ME'`), copied the exact actual string into the test as `BASELINE_TEXT_CONTENT`.
- Re-ran the test against the unmodified component: baseline test passed, 3 contrast tests failed (RED, expected).
- Implemented className-only fixes (10 sites).
- Re-ran: baseline test still passed with the **same exact string**, all 8 tests green.
- Additionally verified live: built the app, served via `vite preview`, navigated Chrome to `http://localhost:4175/privacy` (public route), used `get_page_text` to extract rendered text — identical wording to the original JSX source and to the test's baseline string (the extractor's own whitespace/line-break normalization aside; no textual differences).
- `git diff` on `PrivacyPolicyPage.tsx` confirmed every changed line only replaced `text-muted-foreground` with `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` — zero changes to any string literal or JSX text node.

## TDD Evidence (RED/GREEN)

- RED: new file `src/pages/__tests__/PrivacyPolicyPage.test.tsx`, run against unmodified `PrivacyPolicyPage.tsx` → 5/8 passed (baseline text snapshot + 4 positive/behavioral tests), 3/8 failed (the 3 contrast-fix assertions), as expected — original file still had `text-muted-foreground` everywhere.
- GREEN: after implementing the className fixes → 8/8 passed.
- Full suite: `npx vitest run` → 44/44 files, 489/489 tests passed (481 baseline after `onboarding` card + 8 net new).

## What I implemented

Styling-only fix: replaced `text-muted-foreground` with `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` on all 10 sites (Back button, "Last updated" line, and both paragraph/list elements in each of the 5 legal sections). No text, structure, or behavior changes.

## Build + visual check

- `npm run build` → built in 14.93s, no errors.
- `npx eslint src/pages/PrivacyPolicyPage.tsx src/pages/__tests__/PrivacyPolicyPage.test.tsx` → 0 findings.
- Live preview in Chrome at `/privacy` (public, no auth needed): screenshot confirms the fixed text renders visibly darker/more legible, no layout shift, the Google API policy link opens correctly (`target="_blank" rel="noopener noreferrer"` to the real Google docs URL), "Back" button calls `navigate(-1)` (asserted via mocked `useNavigate`).

## Files changed

- `apps/web/src/pages/PrivacyPolicyPage.tsx` (10 className-only edits)
- `apps/web/src/pages/__tests__/PrivacyPolicyPage.test.tsx` (new)
- `docs/superpowers/cards/privacy-policy.md` (state → merged, handoff filled in)

## Self-review findings

- Verified byte-identical text content before/after via an actual captured-and-replayed baseline string (not assumed) — confirmed both in jsdom tests and in a live browser render.
- Checked all 4 checkable data-practice claims against real server/client code; none are fabricated. Found and escalated (did not fix) one disclosure-completeness gap re: Google Analytics.
- Swept all `text-muted-foreground` sites in the file (10 total, confirmed via `grep` returning zero remaining matches after the fix, and via a DOM query asserting zero `.text-muted-foreground` elements remain).
- Card file's `state`/`owner`/`handoff` fields all updated; no leftover `backlog`/`unassigned`/`null` placeholders.

## Concerns

- The Google Analytics disclosure gap (policy doesn't mention it as a data recipient) is a real finding that should go to product/legal — flagged in the card handoff, not resolved here, per this card's explicit scope restriction against editing legal text.
