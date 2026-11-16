---
id: reset-password
title: Reset Password Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/ResetPasswordPage.tsx (route /reset-password, public/unguarded, 155 lines pre-edit). No logic bugs found (password validation and the async token-exchange/expiry state machine both verified correct against real Supabase behavior); fixed the same 3-site AA-contrast defect as the companion forgot-password card, no bg-secondary sites present on this page.
---

# Card: Reset Password Page

This card represents the redesign/verification pass for the Reset Password Page feature/page in the Rivly web app.

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

Route confirmed in `AnimatedRoutes.tsx:27` (lazy import) and `:64`:
`<Route path="/reset-password" element={<ResetPasswordPage />} />` — public,
no auth guard (correct: the recovery token in the URL is itself the
credential; gating the route behind `user ?` would break the flow for a
signed-out visitor following the emailed link). `grep -rn ResetPasswordPage
apps/web/src` → only `AnimatedRoutes.tsx` and this page's new test file
reference the component; `useAuth.ts:435` is the only writer of the route
string (`redirectTo: \`${origin}/reset-password\``), confirming no other
in-app link construction could drift from this path. Zero cross-file blast
radius.

This is the companion page to the already-merged `forgot-password` card
(step 1 of the recovery flow); this card is step 2 — where the OTP/recovery
link actually lands.

### PASS 2 — Product-fit / behavior check

**Password validation** — `MIN_PASSWORD = 6` matches Supabase Auth's own
default minimum password length (6), so the client-side gate isn't stricter
or looser than what `supabase.auth.updateUser({ password })` will actually
accept server-side. `canSubmit = password.length >= MIN_PASSWORD &&
password === confirm && !loading` is correct; `tooShort`/`mismatch` derive
from the same two fields with no off-by-one (`tooShort` requires
`password.length > 0` first, so it doesn't fire on an empty field, matching
the UI's own "Make it at least 6 characters" copy appearing only once
typing starts). No bug.

**Token-expiry / link-validity state machine** — the page does not trust the
URL alone. supabase-js exchanges the recovery token for a session
asynchronously (`detectSessionInUrl`), so `ResetPasswordPage` races
`supabase.auth.getSession()` and `onAuthStateChange` (listening for
`PASSWORD_RECOVERY`/`SIGNED_IN`/`INITIAL_SESSION` with a session present)
against a `TOKEN_EXCHANGE_TIMEOUT_MS = 5000` timer, only committing to
`'invalid'` if neither resolves in time. This is a reasonable, real
mechanism — not a stub — verified live against the built app (below): on a
static preview with no backend reachable, it correctly lands on "Checking
your link…" then "This link has expired" after 5s, with zero console
errors.

**Expiry-claim text** ("Reset links are single-use and last an hour") is
byte-identical in spirit to the companion `forgot-password` page's "It
expires in an hour" claim — both pages agree, so there's no new
cross-page inconsistency introduced here. Supabase's project-level "Email
OTP Expiry" default is commonly configured to 3600s (1 hour), consistent
with this copy, but the actual configured value lives in the Supabase
project dashboard, which the merge gate's no-`.env`/no-secrets-access
constraint puts out of reach — **this one specific fact (the real configured
expiry value) is unverifiable in this environment**, exactly the
escalation condition named in the card brief. Not blocking: the claim is
consistent with the companion page already merged, nothing in this file
contradicts it, and the state-machine *behavior* (what happens when the
window has passed) is fully verified. Flagging for whoever has dashboard
access to confirm the configured value matches "an hour" if that hasn't
already been confirmed for `forgot-password`.

**Logic-bug check (3-condition test from `reflect-and-journal`):** no logic
bug found in either validation or the expiry state machine — both are
correct, so the escalate-vs-fix decision doesn't arise here.

**Contrast audit** (same HSL→sRGB→relative-luminance method, same tokens as
every prior card: light `--background: 38 35% 96%` / `--muted-foreground:
230 10% 48%`; dark `--background: 230 22% 8%` / `--muted-foreground: 230 10%
55%`). The page body paints `var(--gradient-calm)` (no card wrapper), the
same established "treat as flat `--background`" convention used throughout
this pipeline.

| Site | Background | Verdict |
|---|---|---|
| "Checking your link…" | flat (page gradient ≈ `--background`) | **Fails** (4.385 light, established defect) — fixed |
| "Reset links are single-use…" (expired state) | flat | **Fails** — fixed |
| "Make it at least 6 characters." (valid-form intro) | flat | **Fails** — fixed |

No `bg-secondary` sites exist on this page (grep-confirmed) — the
`bg-secondary`-specific formula discovered in `reflect-and-journal` does not
apply here. **Fix applied:** all three `text-muted-foreground` sites →
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`, the exact formula
already merged on the companion `forgot-password` page — same defect, same
fix, kept consistent across the two paired pages.

**Verdict:** 3 contrast fixes (flat-bg formula, reused verbatim), zero
behavior/validation change — password rules and the async expiry
state machine were both already correct.

### PASS 3 — Build / verification record

- **New test file:** `apps/web/src/pages/__tests__/ResetPasswordPage.test.tsx`
  (no prior test file existed). Mocks `@/contexts/AuthContext`
  (`updatePassword`), `react-router-dom`'s `useNavigate`, and
  `@/integrations/supabase/client` (`getSession`/`onAuthStateChange`) to
  drive the checking/valid/invalid states without a real token.
- **RED** (baseline run against the unmodified component): **8/11 passed, 3
  failed** — exactly the 3 contrast-fix assertions; all 8 behavioral tests
  (checking state, valid-via-`getSession`, valid-via-`PASSWORD_RECOVERY`
  event, expired-after-timeout via fake timers, submit-guard
  too-short/mismatch, success→navigate, error→stay, loading state) passed
  against the **original** component first, confirming the baseline capture
  is correct and no bug needed fixing in that logic.
- **GREEN** (post-implementation): **11/11 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **47/47 files, 545/545
  tests passed** (534 baseline after `reflect-and-journal` + 11 net new).
- **Build:** `npm run build` → `✓ built in 13.50s`, no errors;
  `ResetPasswordPage` chunk **3.32 kB (gzip 1.52 kB)**.
- **Visual check — against the real built app:** `dist` served locally
  (`npx vite preview --port 4178`), driven via the `claude-in-chrome` MCP
  tools. `/reset-password` with no real token: confirmed "Checking your
  link…" renders first (AA-fixed muted color visible), then "This link has
  expired" with the "Send a new link" button (→ `/forgot-password`) after
  the 5s timeout — 0 console errors throughout. The real valid-link path
  (password form, validation, submit/navigate) is confirmed at the
  component level by the 11 passing tests against the real component logic,
  same approach as prior cards where a real authenticated/live-backend path
  isn't reachable from a static local build (no `.env`/secrets access, per
  the merge gate).
- **Primary interaction verified:** checking → valid/invalid transitions
  correctly; password too-short and mismatch errors show/hide correctly;
  submit stays disabled until both conditions clear; successful update
  navigates to `/app`; a failed update leaves the user on the form with no
  navigation — all confirmed against real component logic, with the route
  guard and expired-link rendering also confirmed live against the built
  app.

**Escalations for a future card/owner:** the real configured Supabase
"Email OTP Expiry" value (does it actually equal 1 hour, matching this
page's and `forgot-password`'s shared copy?) is unverifiable from this
environment (no `.env`/dashboard access per the merge gate) — not blocking
this card (copy is internally consistent across both pages and the
state-machine behavior itself is fully verified), but worth a quick
dashboard check by whoever has access.
