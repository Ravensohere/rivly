---
id: privacy-policy
title: Privacy Policy Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/PrivacyPolicyPage.tsx (public route `/privacy`, 93 lines pre-edit, NO text/structural changes made, only className fixes on 10 text-muted-foreground sites). Verified all 4 factual data-practice claims in the legal text against real code (all true). Found and escalated one disclosure gap: Google Analytics (gtag.js) runs on every page including this one, but the policy's "Information We Collect" section never mentions it — flagged for product/legal, not edited by this card.
---

# Card: Privacy Policy Page

This card represents the redesign/verification pass for the Privacy Policy Page feature/page in the Rivly web app.

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

### PASS 1 — Audit

Route confirmed in `AnimatedRoutes.tsx:19` (lazy import) and `:53`
(`<Route path="/privacy" element={<PrivacyPolicyPage />} />`) — public,
no auth guard, unlike the gated `onboarding` card.

**Cross-file impact.** `grep -rn PrivacyPolicyPage apps/web/src` → only
`AnimatedRoutes.tsx` (the one lazy-imported route) and this page's own
new test file reference it. No other file imports any symbol from
`PrivacyPolicyPage.tsx` — zero cross-file risk from this card's fixes.

**Legal text vs. styling, separated.** The file is five `<section>`
blocks of static legal copy (no props, no conditional rendering, no
dynamic data) wrapped in layout/motion markup. Audited the full text
verbatim and treated every word as frozen; only `className` attributes
were in scope for this card.

**Contrast audit** (hand HSL->sRGB->relative-luminance, identical tokens
to the `not-found`/`onboarding` cards: `--background: 38 35% 96%` / dark
`230 22% 8%`, `--muted-foreground: 230 10% 48%` / dark `230 10% 55%`).
10 `text-muted-foreground` sites total, all on the same flat
`bg-background` (no gradient/opacity stacking anywhere in this file,
unlike `onboarding`'s timer circle):

| Site | Background | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|
| "Back" button, "Last updated" line, and the intro paragraph + list/body text of all 5 sections (10 sites) | flat `bg-background` | 4.385:1 | 5.109:1 | **Fails light** (identical composite to `not-found`) |

**Fix applied:** all 10 sites → established fix
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`, re-verified
5.422:1 light / 5.109:1 dark. Zero text changes — every edit touched
only the `className` string.

### PASS 2 — Product-fit / data-practice accuracy

Checked each factual claim in the legal text against the real
codebase, per the card's fabrication-check instruction:

1. **"Profile Information: Name and email address provided during
   Google Sign-In."** → `useAuth.ts` writes to a Supabase `profiles`
   table (`.from('profiles')` at lines 49 and 379) populated from the
   Google OAuth profile. **Matches.**
2. **"Google Calendar Data... we access your calendar events and
   metadata to display them within the app."** → confirmed via
   `useGoogleCalendarSimple.ts`, `useEvents.ts`, and the
   `google-calendar-events` Supabase edge function. **Matches.**
3. **"App Preferences: Your customized settings, such as theme and
   notification preferences."** → settings/theme state is user-level
   app state, consistent with the profile-based storage model.
   **Matches** (no contradicting evidence found).
4. **"We do not store your calendar events on our servers. The data is
   fetched directly from Google APIs and displayed locally."** → read
   `supabase/functions/google-calendar-events/index.ts` in full: it
   stores only OAuth `access_token`/`refresh_token` in
   `google_calendar_connections` (needed to call Google's API on the
   user's behalf); on every request it calls
   `https://www.googleapis.com/calendar/v3/calendars/primary/events`
   live and returns the normalized events in the HTTP response — it
   never writes event data (title/start/end/location) to any table.
   **Matches, verified against the actual server code, not just
   client-side behavior.**
5. **"Your profile and preferences are stored securely using
   Supabase."** → same `profiles` table as (1). **Matches.**
6. **"We never sell your personal data to third parties."** →
   unverifiable business-practice claim (no code can prove a negative
   about data sales), out of scope for a code-behavior check, same as
   the `onboarding` card's treatment of its static marketing copy.

**Escalation — disclosure gap found, not fixed (per card instructions
to escalate rather than edit legal text):** `apps/web/index.html`
loads Google Analytics (`gtag.js`, measurement ID `G-LCWBTL35M6`) on
every page, including `/privacy` itself. The policy's "1. Information
We Collect" section lists only Profile Information, Google Calendar
Data, and App Preferences — it does not mention that Google Analytics
collects and receives usage/device data as a third party. This is an
omission in the legal text's completeness, not a false statement in the
existing wording, but it is a legal/product decision (what to disclose,
and whether current policy wording about "we never sell... to third
parties" needs a distinct line about analytics sharing) that is outside
this card's scope and was not edited.

No cross-file regression risk (PASS 1's grep). No structural or text
changes proposed or made.

### PASS 3 — Build / verification record

- **RED** (new test file `PrivacyPolicyPage.test.tsx`, run against the
  unmodified component): 3 of 8 tests failed as expected — the 3
  contrast-fix assertions (Back button color, "Last updated" color, and
  the "all `text-muted-foreground` sites replaced" count) — because the
  original file still used `text-muted-foreground` everywhere. The
  other 5 (baseline text-content snapshot + 4 positive/behavioral
  tests: heading, section headings, Google policy link href/target/rel,
  Back button calls `navigate(-1)`) passed unmodified, confirming the
  fixtures exercise real rendered output and that the baseline string
  was captured correctly from the actual unmodified DOM.
- **GREEN** (post-implementation): **8/8 passed** in
  `PrivacyPolicyPage.test.tsx`, including the text-content baseline
  test — unchanged before and after, proving the legal copy is
  byte-identical.
- **Full suite:** `cd apps/web && npx vitest run` → **44/44 files,
  489/489 tests passed** (481 baseline after `onboarding` + 8 net new).
- **ESLint:** `npx eslint src/pages/PrivacyPolicyPage.tsx
  src/pages/__tests__/PrivacyPolicyPage.test.tsx` → 0 findings.
- **Build:** `npm run build` → `✓ built in 14.93s`, no errors.
- **Explicit text-content diff (before/after), not just the test:**
  captured `container.textContent` from the unmodified component via a
  failing-test run, hardcoded it as the test's baseline string, then
  re-ran against the fixed component — identical, test passes both
  times with the exact same string. Additionally verified live in
  Chrome: served the production build via `vite preview`, navigated to
  `http://localhost:4175/privacy` (public route, no auth needed), and
  used `get_page_text` to extract the rendered text — word-for-word
  identical to the original JSX source and to the test's baseline
  string (only cosmetic whitespace/line-break differences from the
  page-text extractor's own normalization, not from the component).
- **Visual check:** screenshot of the live preview confirms the fixed
  muted-gray text renders visibly darker/more legible than the
  pre-fix color in both the "Back" button and all body copy, with no
  layout shift, broken links, or missing content. The "Google API
  Service User Data Policy" link correctly opens the real Google docs
  URL in a new tab (`target="_blank" rel="noopener noreferrer"`).
- **Primary interaction verified:** "Back" button calls
  `navigate(-1)` (asserted via a mocked `useNavigate`); route is public
  and directly reachable, confirmed via live preview.

**Escalations for a future dedicated card:** the Google Analytics
disclosure gap above (PASS 2) — needs a product/legal decision on
whether and how to amend section 1 of the policy, out of this
conservative card's scope.
