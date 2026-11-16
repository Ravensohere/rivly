# Task 4 — Card: reset-password

## Audit findings

- `apps/web/src/pages/ResetPasswordPage.tsx` — 155 lines, route `/reset-password`, public/unguarded (correct: the recovery token in the URL is itself the credential, not a session to gate behind `user ?`).
- Route wiring confirmed: `AnimatedRoutes.tsx:27` (lazy import), `:64` (`<Route path="/reset-password" element={<ResetPasswordPage />} />`).
- Cross-file impact: `grep -rn ResetPasswordPage apps/web/src` → only `AnimatedRoutes.tsx` and the new test file reference it. `useAuth.ts:435` is the sole writer of the `/reset-password` string (via `resetPasswordForEmail`'s `redirectTo`), so no other call site could drift. Zero blast radius.
- This is the companion/step-2 page to the already-merged `forgot-password` card (step 1).

## Product-fit findings

**Password validation** — `MIN_PASSWORD = 6` matches Supabase Auth's own default minimum password length, so the client gate isn't stricter/looser than what `supabase.auth.updateUser({ password })` actually accepts. `canSubmit`, `tooShort`, `mismatch` derive correctly from `password`/`confirm` with no off-by-one. No bug.

**Token-expiry / link-validity state machine** — not a stub. Races `supabase.auth.getSession()` and `onAuthStateChange` (listening for `PASSWORD_RECOVERY`/`SIGNED_IN`/`INITIAL_SESSION` with a session) against a 5s timeout (`TOKEN_EXCHANGE_TIMEOUT_MS`), only committing to `'invalid'` if neither resolves in time. Verified live against the built app: static preview (no reachable backend) correctly shows "Checking your link…" then "This link has expired" after 5s, 0 console errors.

**Expiry-claim text** ("Reset links are single-use and last an hour") is consistent with the companion `forgot-password` page's "It expires in an hour" claim — no new cross-page inconsistency. The actual configured Supabase "Email OTP Expiry" value lives in the project dashboard, out of reach under the merge gate's no-`.env`/no-secrets constraint — this one fact is genuinely unverifiable in this environment. Not blocking: copy is internally consistent across both pages, and the state-machine *behavior* itself is fully verified by tests + live check. Flagged as an escalation for whoever has dashboard access.

**3-condition logic-bug test (from `reflect-and-journal`):** not applicable — no logic bug was found in either validation or the expiry state machine; both are correct as written.

**Contrast audit** — same HSL→sRGB→relative-luminance method/tokens as prior cards. Page body paints `var(--gradient-calm)` (no card wrapper) → treated as flat `--background`, per established convention.

| Site | Background | Verdict |
|---|---|---|
| "Checking your link…" | flat | Fails (4.385 light) — fixed |
| "Reset links are single-use…" (expired state) | flat | Fails — fixed |
| "Make it at least 6 characters." | flat | Fails — fixed |

No `bg-secondary` sites exist on this page (grep-confirmed) — the `bg-secondary`-specific formula from `reflect-and-journal` does not apply here.

## TDD Evidence

- New test file: `apps/web/src/pages/__tests__/ResetPasswordPage.test.tsx`. Mocks `@/contexts/AuthContext` (`updatePassword`), `react-router-dom`'s `useNavigate`, and `@/integrations/supabase/client` (`getSession`/`onAuthStateChange`) to drive checking/valid/invalid states deterministically (fake timers for the 5s expiry) without a real token.
- **RED** (baseline, unmodified component): 8/11 passed, 3 failed — exactly the 3 contrast-fix assertions. All 8 behavioral tests (checking state, valid via `getSession`, valid via `PASSWORD_RECOVERY` event, expired-after-timeout, too-short/mismatch guards, success→navigate, error→stay, loading state) passed against the original code, confirming the baseline is correct and nothing else needed fixing.
- **GREEN** (post-fix): 11/11 passed.

## What I implemented

Replaced `text-muted-foreground` with `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` at all 3 sites (checking-state text, expired-state body copy, valid-form intro copy) — the exact formula already merged on the companion `forgot-password` page. No behavior, validation, or copy changes.

## Build + visual check

- Full suite: `cd apps/web && npx vitest run` → 47/47 files, 545/545 tests passed (534 baseline + 11 net new).
- Build: `npm run build` → built in 13.50s, no errors. `ResetPasswordPage` chunk: 3.32 kB (gzip 1.52 kB).
- Visual check: served `dist` locally (`vite preview --port 4178`), driven via `claude-in-chrome`. `/reset-password` with no real token: "Checking your link…" renders first (fixed muted color visible), then "This link has expired" with a working "Send a new link" button (→ `/forgot-password`) after the 5s timeout. 0 console errors. The valid-link path (password form, validation, submit/navigate) is confirmed at the component level by the 11 passing tests, since a real authenticated/live-backend path isn't reachable from a static local build (no secrets access).

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\ResetPasswordPage.tsx` (3-site contrast fix)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\ResetPasswordPage.test.tsx` (new)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\reset-password.md` (state → merged, handoff recorded)

## Self-review

- Password validation checked: yes, matches Supabase's own default min length (6), logic correct, no bug.
- Error-message accuracy verified: expiry claim text matches the companion page's claim; the one unverifiable fact (actual configured Supabase OTP expiry) is explicitly flagged, not fabricated as confirmed.
- Logic bug found? No — 3-condition test from `reflect-and-journal` was not needed since nothing ambiguous or broken was found; escalated the one genuinely-unverifiable fact instead of guessing.
- Muted-text sweep: all 3 `text-muted-foreground` sites found and fixed; no `bg-secondary` sites present on this page (confirmed via grep), so that variant fix doesn't apply here.
- Card file: front-matter and body updated, `state: merged`, `owner: task-4-agent`, handoff filled in; no stray backlog/unassigned fields left.

## Concerns

- One non-blocking escalation: the real configured Supabase "Email OTP Expiry" value (does it truly equal 1 hour?) cannot be verified from this environment (no `.env`/dashboard access). Recommend a quick dashboard check by someone with access, covering both this page and `forgot-password` together since they share the claim.
