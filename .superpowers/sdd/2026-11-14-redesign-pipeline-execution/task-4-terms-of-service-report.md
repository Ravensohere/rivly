# Task 4 Report — terms-of-service

Card: `docs/superpowers/cards/terms-of-service.md`
File: `apps/web/src/pages/TermsOfServicePage.tsx` (public route `/terms`, 90 lines pre-edit)
**LAST card in the Task 4 batch — 31 of 31 now merged.**

## Audit findings

- Route confirmed: lazy-imported `AnimatedRoutes.tsx:20`, mounted at
  `AnimatedRoutes.tsx:54` (`<Route path="/terms" element={<TermsOfServicePage />} />`).
  Public, no auth guard.
- Cross-file impact: `grep -rn TermsOfServicePage apps/web/src` → only
  `AnimatedRoutes.tsx` and this page's own new test file. Zero
  cross-file risk from the className-only fix.
- File shape: seven static `<section>` blocks of legal copy (no props,
  no conditional rendering, no dynamic data) + a header block. Legal
  text and styling cleanly separated — only `className` attributes were
  in scope.
- Contrast audit: 9 `text-muted-foreground` sites (Back button, "Last
  updated" line, 1 body paragraph per section × 7), all on flat
  `bg-background`, no opacity/gradient stacking. Same failing ratio as
  `privacy-policy`/`not-found` (4.385:1 light / 5.109:1 dark — fails
  AA in light mode).

## Product-fit / factual-accuracy findings

No pricing/refund claims exist on this page at all (grep confirms zero
matches for price/fee/refund/subscription/$). Checked the two
checkable claims:

1. "Description of Service" (calendar integration + focus tools) →
   matches real `FocusPage.tsx` and calendar hooks (`useEvents.ts`,
   `useGoogleCalendarSimple.ts`). **Accurate.**
2. "User Accounts" — "You may need to create an account via Google
   Authentication to access certain features." → re-verified the
   `signup.md` card's existing cross-reference (Google OAuth via
   `useAuth.ts`'s `signInWithGoogle`, `SignupPage.tsx` is Google-only).
   **New finding beyond what prior cards checked:** `useAuth.ts` also
   exposes `signUp` (email/password), consumed by `LoginPage.tsx`'s
   embedded sign-up mode (per `login.md`). The Terms sentence is phrased
   as "may need to... via Google Authentication" (not "only via"), so
   it is not contradicted by the existence of an email/password path —
   **verdict: accurate as worded, not a defect, not escalated.** Noted
   in the card's `handoff` for visibility only.

No liability/other boilerplate claims are code-checkable (same
treatment given by `privacy-policy.md` to its unverifiable
business-practice claim).

## Explicit text-content diff verification (before/after)

Hand-reconstructed the baseline `container.textContent` string from the
JSX source (applying JSX whitespace-collapse rules, cross-checked
against the analogous "us at" + email concatenation pattern already
proven in `PrivacyPolicyPage.tsx`'s own contact section). The RED-phase
test run passed this baseline assertion on the very first try against
the **unmodified** component, confirming the string was byte-identical
to the real DOM output before any edit. The same exact string was
re-asserted in the GREEN run against the **fixed** component and
passed again — proving the legal text is byte-identical before and
after. A live production-build screenshot (`vite preview` on
`http://localhost:4176/terms`) additionally confirms every section's
wording visually matches the JSX source with no changes.

## TDD Evidence (RED/GREEN)

- **RED** (new `TermsOfServicePage.test.tsx`, run against unmodified
  component): 8 tests; 5/8 passed (baseline text snapshot, heading, all
  7 section headings, contact email, Back-button `navigate(-1)`
  behavior) — 3 failed exactly on the then-unfixed contrast assertions
  (Back button color, "Last updated" color, "all sites replaced"
  count).
- **GREEN** (post-implementation): 8/8 passed, baseline text test
  included and unchanged.

## What I implemented

Single mechanical find-replace of the literal string
`text-muted-foreground` → `text-[hsl(230,10%,42%)]
dark:text-[hsl(230,10%,55%)]`, 9 occurrences, nothing else touched.
Zero text/structural changes.

## Build + visual check

- Full suite: `cd apps/web && npx vitest run` → 52/52 files, 622/622
  tests passed.
- ESLint: `npx eslint src/pages/TermsOfServicePage.tsx
  src/pages/__tests__/TermsOfServicePage.test.tsx` → 0 findings.
- Build: `npm run build` → built in 14.54s, no errors.
- Visual: served production build via `vite preview --port 4176`,
  navigated to `http://localhost:4176/terms` in Chrome, took a
  full-page screenshot — all 7 sections render with the darker,
  AA-passing muted text, no layout shift, no missing content, contact
  email still renders in the untouched `text-primary` accent color.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\TermsOfServicePage.tsx` (className-only edits, 9 sites)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\TermsOfServicePage.test.tsx` (new)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\terms-of-service.md` (state → merged, handoff recorded)

## Self-review findings

- Byte-identical rendered text verified both via the test's baseline
  string (RED and GREEN both hit the exact same string) and via a live
  Chrome screenshot of the production build. Confirmed.
- Pricing/data-practice/liability claims checked against real code
  where checkable (service description, account-creation method); none
  are inaccurate. Confirmed.
- All 9 muted-text sites swept (no opacity-stacked or `bg-secondary`
  variants exist on this page — confirmed by grep, this file has only
  flat `bg-background`). Confirmed.
- Card file updated cleanly (state: merged, handoff populated,
  owner/title preserved). Confirmed.
- Final whole-file sanity grep (TODO/FIXME/console.log/debugger/secret
  patterns) → no matches.

## Concerns

None blocking. One non-blocking observation recorded in the card's
`handoff` (not a defect): the Terms' "User Accounts" section mentions
only Google Authentication as the account-creation method, while an
email/password path also exists via `LoginPage.tsx`. The sentence's
wording ("may need to... via Google Authentication") is not exclusive
language, so this is not a contradiction — flagged for visibility only,
consistent with how `privacy-policy.md` handled its own non-blocking
completeness finding.
