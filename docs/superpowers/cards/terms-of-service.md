---
id: terms-of-service
title: Terms of Service Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/TermsOfServicePage.tsx (public route `/terms`, 90 lines pre-edit, NO text/structural changes made, only className fixes on 9 text-muted-foreground sites). LAST card in the Task 4 batch (31 of 31 now merged). Verified all checkable factual claims (service description, Google-Authentication account creation) against real code — all accurate; noted (not escalated as a defect) that account creation is also possible via email/password through LoginPage.tsx's embedded sign-up mode, which the Terms text doesn't explicitly mention but also doesn't contradict (phrased as "may need to... via Google Authentication", not "only via").
---

# Card: Terms of Service Page

This card represents the redesign/verification pass for the Terms of Service Page feature/page in the Rivly web app.

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

Route confirmed in `AnimatedRoutes.tsx:20` (lazy import) and `:54`
(`<Route path="/terms" element={<TermsOfServicePage />} />`) — public,
no auth guard, same pattern as `/privacy`.

**Cross-file impact.** `grep -rn TermsOfServicePage apps/web/src` →
only `AnimatedRoutes.tsx` (the one lazy-imported route) and this page's
own new test file reference it. No other file imports any symbol from
`TermsOfServicePage.tsx` — zero cross-file risk from this card's fixes.
(The `signup.md` card separately cross-referenced this page's *rendered
text*, not its module — re-confirmed below in PASS 2.)

**Legal text vs. styling, separated.** The file is seven `<section>`
blocks of static legal copy (no props, no conditional rendering, no
dynamic data) wrapped in layout/motion markup, plus a header block
("Terms of Service" / "Last updated"). Audited the full text verbatim
and treated every word as frozen; only `className` attributes were in
scope for this card.

**Contrast audit** (hand HSL->sRGB->relative-luminance, identical tokens
to the `privacy-policy`/`not-found`/`onboarding` cards:
`--background: 38 35% 96%` / dark `230 22% 8%`, `--muted-foreground: 230
10% 48%` / dark `230 10% 55%`). 9 `text-muted-foreground` sites total,
all on the same flat `bg-background` (no gradient/opacity stacking
anywhere in this file):

| Site | Background | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|
| "Back" button, "Last updated" line, and the single body paragraph of all 7 sections (9 sites) | flat `bg-background` | 4.385:1 | 5.109:1 | **Fails light** (identical composite to `privacy-policy`/`not-found`) |

**Fix applied:** all 9 sites → established fix
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`, re-verified
5.422:1 light / 5.109:1 dark. Zero text changes — every edit touched
only the `className` string (confirmed mechanically: a single
find-replace of the literal string `text-muted-foreground` → the fixed
classes, 9 occurrences, nothing else in the file touched).

### PASS 2 — Product-fit / factual-accuracy

This page carries no pricing/refund claims at all (`grep -i
"price\|fee\|refund\|subscription\|dollar\|\$" TermsOfServicePage.tsx`
→ no matches), so there is nothing to cross-check against worker
payment routes.

Checked each checkable claim in the legal text against the real
codebase:

1. **Section 2, "Description of Service"** — "Rivly is a productivity
   and wellness platform that helps users organize their daily
   schedules using calendar integration and focus tools." →
   `apps/web/src/pages/FocusPage.tsx` exists (focus tools), and
   `useGoogleCalendarSimple.ts` / `useEvents.ts` provide real calendar
   integration (same hooks verified against the live Google Calendar
   API by the `privacy-policy` card). **Matches.**
2. **Section 3, "User Accounts"** — "You may need to create an account
   via Google Authentication to access certain features." → re-verified
   the `signup.md` card's existing cross-reference: `useAuth.ts` exposes
   `signInWithGoogle` (a real `supabase.auth.signInWithOAuth({ provider:
   'google' })` call, line 262) and `SignupPage.tsx` is Google-OAuth-only.
   **Still holds.**

   **Additional check beyond what `signup.md` covered:** `useAuth.ts`
   *also* exposes `signUp` (line 162, `supabase.auth.signUp({ email,
   password })`), consumed by `LoginPage.tsx`'s embedded sign-up mode
   (confirmed by the `login.md` card). So accounts can also be created
   via plain email/password, not only Google. This is **not a
   contradiction** of the Terms text: the sentence reads "You **may
   need** to create an account via Google Authentication" — it asserts
   Google Authentication is *a* way to create an account, not the
   *only* way, and it never uses exclusive language ("only", "solely").
   A legal terms page is not obligated to enumerate every auth
   mechanism. **Verdict: accurate as worded, not escalated** — noted
   above in the card's `handoff` summary for visibility, same treatment
   `privacy-policy.md` gave its own non-blocking disclosure-completeness
   finding.
3. **Section 5, "Limitation of Liability"** and the other sections
   (Acceptance, Proper Use, Changes to Terms, Contact) are standard
   boilerplate / unverifiable business-practice language (no code can
   prove or disprove a liability disclaimer or a "right to modify"
   clause) — out of scope for a code-behavior check, same treatment the
   `privacy-policy` card gave its "we never sell your data" claim.
4. **Contact email** (`ravenso.here@gmail.com`) — plain static text,
   nothing to verify against code.

**No escalation needed.** No factual-accuracy problem found in the
legal text itself.

### PASS 3 — Build / verification record

- **RED** (new test file `TermsOfServicePage.test.tsx`, written first
  and run against the unmodified component): 8 tests written; 5/8
  passed immediately (baseline text-content snapshot + heading + all 7
  section headings + contact email + "Back" button `navigate(-1)`
  behavior), confirming the hand-reconstructed baseline string was
  byte-identical to the real unmodified DOM output on the first try. The
  3 contrast-fix assertions (Back button color, "Last updated" color,
  "all `text-muted-foreground` sites replaced" count) failed as
  expected, because the original file still used `text-muted-foreground`
  everywhere.
- **GREEN** (post-implementation): **8/8 passed**, including the
  text-content baseline test — unchanged before and after, proving the
  legal copy is byte-identical.
- **Full suite:** `cd apps/web && npx vitest run` → **52/52 files,
  622/622 tests passed**.
- **ESLint:** `npx eslint src/pages/TermsOfServicePage.tsx
  src/pages/__tests__/TermsOfServicePage.test.tsx` → 0 findings.
- **Build:** `npm run build` → `✓ built in 14.54s`, no errors.
- **Explicit text-content diff (before/after), not just the test:**
  the baseline string was captured by hand-reconstructing the JSX's
  rendered text (including JSX whitespace-collapse rules, verified
  against the file's own unmodified RED-phase test run, which passed
  the baseline assertion immediately), then the identical string was
  re-asserted against the fixed component in the GREEN run — same
  string, both times. Additionally verified live: served the production
  build via `vite preview --port 4176`, navigated to
  `http://localhost:4176/terms` (public route, no auth needed), and
  took a full-page screenshot — every section's heading and body text
  is present, word-for-word identical to the JSX source and to the
  test's baseline string, with no layout shift or missing content.
- **Visual check:** screenshot of the live preview confirms the fixed
  muted-gray text renders visibly darker/more legible than the pre-fix
  color in both the "Back" button, the "Last updated" line, and all 7
  section bodies, with no layout shift, broken links, or missing
  content. The contact email renders in the `text-primary` accent color
  as before (untouched, since it was never a `text-muted-foreground`
  site).
- **Primary interaction verified:** "Back" button calls `navigate(-1)`
  (asserted via a mocked `useNavigate`); route is public and directly
  reachable, confirmed via live preview.

**Final whole-file sanity sweep** (last card in the Task 4 batch): grep
for `TODO|FIXME|XXX|console\.(log|warn|error)|debugger|sk-|api[_-]?key|
password|secret` (case-insensitive) in `TermsOfServicePage.tsx` →
**no matches**. Nothing suspicious found.

**Escalations:** none. The "also email/password, not only Google"
observation in PASS 2 is recorded for visibility (and in this card's
`handoff` summary) but is not a defect — the Terms text is accurate as
worded and was not edited.
