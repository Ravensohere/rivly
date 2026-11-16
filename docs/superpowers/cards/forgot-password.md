---
id: forgot-password
title: Forgot Password Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = audit, PASS 2 = product-fit/verification, PASS 3 = build record) — small public/unguarded auth form (route /forgot-password, 100 lines pre-edit). PASS 1/2 found the enumeration-safety and error-copy work already correct in the existing code (same confirmation shown whether or not the email has an account, matching Supabase's real resetPasswordForEmail behavior; "expires in an hour" matches the Supabase default 1-hour mailer OTP expiry, no config override found) — nothing to fix there. Fixed the recurring text-muted-foreground/gradient-calm-background AA-contrast defect (same shared token as 6+ prior cards) across this page's 3 sites. No structural redesign.
---

# Card: Forgot Password Page

This card represents the redesign/verification pass for the Forgot Password Page feature/page in the Rivly web app.

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

`apps/web/src/pages/ForgotPasswordPage.tsx` (100 lines pre-edit), route
`/forgot-password`. Confirmed UNGUARDED/public by reading
`AnimatedRoutes.tsx:60` directly: `<Route path="/forgot-password"
element={<ForgotPasswordPage />} />` — no auth check, as expected for a
pre-login recovery flow.

**Scope:** a standard two-state auth form — email input → submit, success
("Check your email") or stay on the form on error. Logic lives in
`useAuth.ts`'s `resetPassword` (called via `useAuthContext()`), which wraps
`supabase.auth.resetPasswordForEmail`.

**Finding — contrast, the recurring shared defect:** 3
`text-muted-foreground` sites, all on this page's `background:
var(--gradient-calm)` (an inline style on the outer div, not the
`bg-background` Tailwind class used by prior cards, but the same practical
pixel color — hand-verified below):
- Line 41 (top "Back to sign in" nav link)
- Line 58 (success-state confirmation paragraph)
- Line 69 (request-form instruction paragraph)

**Independently recomputed, not assumed uniform with prior cards' token
match:** `--gradient-calm` (light mode, `index.css`) is
`linear-gradient(160deg, hsl(38 35% 96%) 0%, hsl(38 25% 95%) 50%, hsl(260
20% 96%) 100%)`. Converted each of the 3 stops HSL→RGB by hand:
- 0%: hsl(38,35%,96%) → rgb(248,246,241) — this is literally the
  `--background` token value, matching prior cards' already-computed
  ≈4.40:1 (FAILS AA) against the default `--muted-foreground`
  hsl(230,10%,48%).
- 50%: hsl(38,25%,95%) → rgb(245,243,239) — slightly darker, contrast
  with the same text color is marginally higher, still well under 4.5:1.
- 100%: hsl(260,20%,96%) → rgb(244,243,247) — same story, still FAILS.

All three stops sit within ~1-2% luminance of each other and of the plain
`--background` value prior cards already measured as failing — the
gradient doesn't meaningfully change the verdict anywhere on the page.
Applied the established fix token (`hsl(230,10%,42%)` light /
`hsl(230,10%,55%)` dark, per the FocusPage/AuthCallbackPage precedent) to
all 3 sites.

**Other claims verified true against real behavior, not fabricated:**
- "If `{email}` has an account, we've sent a link..." — read
  `useAuth.ts`'s `resetPassword` (lines 428-446): it calls
  `supabase.auth.resetPasswordForEmail` and reports success
  (`setSent(true)`) whenever the call doesn't error — and Supabase's real
  `resetPasswordForEmail` does not error for an unknown address (that's
  the platform's own anti-enumeration behavior), so this copy is accurate:
  the UI genuinely shows the same thing whether or not the account exists.
  The hook's own comment makes this intentional: "Deliberately reports
  success even when the address is unknown."
- "It expires in an hour." — no `[auth]` OTP-expiry override found in
  `supabase/config.toml`, so this relies on the Supabase platform default
  of 3600s (1 hour) for mailer-sent recovery links. True under the
  default, and consistent with `ResetPasswordPage.tsx`'s matching "Reset
  links are single-use and last an hour" copy on the sibling page.
- Error path: `resetPassword` surfaces failures (network error, rate
  limit) via a toast (`useAuth.ts` line 438) and returns `{ error }`; the
  page only flips to the success state when no `error` key is present
  (line 26), so a real failure correctly leaves the user on the form
  rather than silently claiming success. Confirmed against the live app
  in PASS 3 below (a real network failure in the sandboxed environment
  produced the toast error and stayed on the form, matching this claim).

**Cross-file impact:** `ForgotPasswordPage.tsx` has exactly one consumer
(`AnimatedRoutes.tsx`'s lazy route). No shared component was touched.

### PASS 2 — Product-fit / verification

**Enumeration-risk check (the core ask for this card):** verified end to
end — `resetPassword` never reveals existence via its return shape (same
`{ data: true }` for a real or unknown address, since
`resetPasswordForEmail` itself doesn't error on an unknown email), and
`ForgotPasswordPage.tsx` renders exactly one confirmation message off that
shared shape. No enumeration leak found; nothing to change here, this was
already correct in the pre-redesign code.

**Error-message accuracy check:** the component shows no bespoke error
copy of its own (errors surface via the shared toast from `useAuth.ts`);
verified that toast fires with the real Supabase error message on failure
and that the component does not fabricate a success state in that case
(PASS 1 above + PASS 3 live verification).

**Verdict: APPROVED, scope as proposed in PASS 1** — 3 AA-contrast fixes,
zero behavioral/copy changes (everything checked was already accurate).

### PASS 3 — Build / verification record

- **Test file:** new `apps/web/src/pages/__tests__/ForgotPasswordPage.test.tsx`
  (8 tests). `useAuthContext` is module-mocked with a controllable
  `resetPassword`; two blocks, same discipline as
  `AuthCallbackPage.test.tsx`: "baseline contract" (initial render with the
  back-to-sign-in link, the empty-email submit guard, the loading state,
  the submit-success state with the email echoed back and both
  "Back to sign in" exits, and the submit-error state that correctly stays
  on the form) and "redesign" (the 3 contrast sites).
- **Baseline run against the unmodified file: 5/5 baseline-contract tests
  passed, 3/3 contrast tests failed (RED)** — exactly the planned fix, no
  test-authoring surprises on the behavioral side.
- **Implementation:** 3 one-line className edits (PASS 1 above), no logic
  changes.
- **GREEN after implementation: 8/8 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **37/37 files, 396/396
  tests passed** (run alone, not concurrently with the build).
- **Build:** `npm run build` → `✓ built in 13.29s`, no errors;
  `ForgotPasswordPage` chunk **2.69 kB (gzip 1.25 kB)**.
- **Visual/behavioral check — against the real built app:** built `dist`
  served locally (`npx serve -s dist -l 4323`), driven over CDP in headless
  Edge (`msedge.exe --headless=new`, Node's native `ws` client against the
  DevTools Protocol — same approach as `focus`/`day-planner`, since the
  `chrome-devtools` MCP server failed to connect this session and
  Playwright's bundled Chromium is blocked by OS Application Control).
  `/forgot-password` is public (unlike most prior cards' protected
  routes), so this card could drive the real, un-mocked component all the
  way through a real submit. Confirmed: correct title/heading/copy
  rendered, `getComputedStyle` on the back-link and paragraph returned
  `rgb(96, 100, 118)` (the fix token, not the old failing color), no
  horizontal overflow (`scrollWidth === clientWidth`, 485/485), **0
  console errors, 0 exceptions**. Submitting a real email against this
  sandboxed environment's unreachable Supabase endpoint produced a real
  "Could not send reset link — Failed to fetch" toast and correctly left
  the form in its unsent state (did not fabricate success) — a live
  confirmation of the error-path claim in PASS 1, beyond what the mocked
  unit tests alone can show.
- **Primary interaction verified:** both the mocked-success and
  mocked-error submit paths (unit tests) and a real, unmocked submit
  against an unreachable backend (live browser check) — covering the
  behavior this card's acceptance criteria call for without needing real
  Supabase credentials (merge gate: no `.env`/secrets access).

**Escalations for a future dedicated card (not actioned here):** none.
This page's logic and copy were already correct; only the shared
contrast-token defect needed fixing.
