# Task 4 — Card: forgot-password

Route `/forgot-password`, `apps/web/src/pages/ForgotPasswordPage.tsx` (100 lines pre-edit).

## Audit findings

- Public/unguarded route, confirmed via `AnimatedRoutes.tsx:60`: `<Route path="/forgot-password" element={<ForgotPasswordPage />} />` — no auth check, as expected for a pre-login recovery flow.
- Standard two-state form: email input → submit → success ("Check your email") or stay-on-form on error. Logic delegates to `useAuth.ts`'s `resetPassword` (exposed via `useAuthContext()`), which wraps `supabase.auth.resetPasswordForEmail`.
- Only defect found: the recurring shared `text-muted-foreground`-on-light-background AA contrast failure, at 3 sites:
  - Line 41 — top "Back to sign in" nav link
  - Line 58 — success-state confirmation paragraph
  - Line 69 — request-form instruction paragraph
- All 3 sit on `background: var(--gradient-calm)` (an inline style, not the `bg-background` Tailwind class used by prior cards). Independently recomputed the actual rendered color rather than assuming it behaves like plain `--background`:
  - `--gradient-calm` (light) = `linear-gradient(160deg, hsl(38 35% 96%) 0%, hsl(38 25% 95%) 50%, hsl(260 20% 96%) 100%)`.
  - Converted each stop HSL→RGB by hand: 0% → rgb(248,246,241) (literally equal to the `--background` token value used in prior cards' math), 50% → rgb(245,243,239), 100% → rgb(244,243,247).
  - All three are within ~1-2% luminance of the already-measured-failing `--background` baseline (≈4.40:1 against the default `--muted-foreground` hsl(230,10%,48%), which fails the 4.5:1 AA threshold for normal text). The gradient doesn't change the verdict anywhere on the page.
  - Applied the established fix token: `hsl(230,10%,42%)` light / `hsl(230,10%,55%)` dark (same token used on `focus`, `auth-callback`, and 4+ other prior cards).

## Product-fit findings

**Enumeration/security check (the core ask for this card):** Verified end to end, not assumed.
- `resetPassword` (`apps/web/src/hooks/useAuth.ts:433-446`) calls `supabase.auth.resetPasswordForEmail` and returns `{ data: true }` whenever that call doesn't error. Supabase's real `resetPasswordForEmail` does **not** error for an unknown/non-existent email address — that's the platform's own anti-enumeration behavior — so the function returns the identical success shape whether or not the account exists. The hook's own comment states this is intentional: "Deliberately reports success even when the address is unknown."
- `ForgotPasswordPage.tsx` renders exactly one confirmation message off that shared return shape (`if (result && !('error' in result)) setSent(true)`), so the UI itself cannot diverge by account existence either.
- **Verdict: no enumeration leak.** This was already correct in the pre-redesign code; nothing was changed here.

**Error-message accuracy check:**
- "If `{email}` has an account, we've sent a link to choose a new password. It expires in an hour." — the "expires in an hour" claim checked against `supabase/config.toml`: no `[auth]` OTP-expiry override found, so it relies on Supabase's platform default of 3600s (1 hour) for mailer-sent recovery links. True under the default. Also consistent with the sibling `ResetPasswordPage.tsx`'s matching "Reset links are single-use and last an hour" copy — the two pages agree with each other and with the platform default.
- Error path: on failure, `resetPassword` surfaces the real Supabase error via a toast (`useAuth.ts:438`) and returns `{ error }`; the page only flips to the success state when no `error` key is present, so a genuine failure correctly leaves the user on the form rather than silently claiming success. Confirmed live in the visual check below (not just by a mocked unit test) — a real network failure against this sandbox's unreachable Supabase endpoint produced the real toast and left the form unchanged.

No fabricated or misleading copy found anywhere in this page.

## TDD Evidence (RED/GREEN)

New file: `apps/web/src/pages/__tests__/ForgotPasswordPage.test.tsx` (8 tests, `useAuthContext` module-mocked with a controllable `resetPassword`).

- **Baseline run (against the unmodified page, before any fix):**
  - 5/5 "baseline contract" tests passed: initial render (heading, instruction copy, email input, submit button, back-to-sign-in link href), empty-email submit guard (no call to `resetPassword`), loading state (`Sending…`, disabled button) resolving to success, submit-success echoing the entered email with both exit links, submit-error staying on the form.
  - 3/3 "redesign (contrast fix)" tests failed as expected (RED): back-link, request-form paragraph, success paragraph all still carried `text-muted-foreground`.
- One test-authoring fix needed during RED: the success-state assertion for "Back to sign in" initially used `getByRole` and errored with "multiple elements" — the top nav link and the success panel's own button both render that text simultaneously in the sent state. Fixed by asserting `getAllByRole(...)).toHaveLength(2)` and checking both hrefs. This was a test-authoring issue, not a product bug.
- **GREEN after implementation:** 8/8 passed.

## What I implemented

3 one-line className edits in `apps/web/src/pages/ForgotPasswordPage.tsx`, no logic/copy changes:
1. Line 41 (back-to-sign-in link): `text-muted-foreground` → `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`
2. Line 58 (success confirmation paragraph): same swap
3. Line 69 (request-form instruction paragraph): same swap

## Build + visual check

- Full suite: `cd apps/web && npx vitest run` → **37/37 files, 396/396 tests passed** (run alone).
- Build: `npm run build` → `✓ built in 13.29s`, no errors. `ForgotPasswordPage` chunk: **2.69 kB (gzip 1.25 kB)**.
- Visual/behavioral check against the real built app: served `dist` locally (`npx serve -s dist -l 4323`), drove it over CDP in headless Edge (`msedge.exe --headless=new --remote-debugging-port=9333`, via a small Node script using the `ws` package against the DevTools Protocol) — same approach as prior cards, since the `chrome-devtools` MCP server failed to connect this session and Playwright's bundled Chromium is blocked by OS Application Control on this machine.
  - `/forgot-password` is public (unlike most prior cards' protected routes), so this check could drive the real, unmocked component through an actual submit without needing credentials.
  - Confirmed: correct `document.title` ("Reset your password — Rivly"), correct heading/copy, `getComputedStyle(...).color` on both the back-link and the instruction paragraph returned `rgb(96, 100, 118)` — the fix token, not the old failing color.
  - No horizontal overflow: `scrollWidth === clientWidth` (485 === 485).
  - **0 console messages, 0 runtime exceptions** captured via `Console.enable`/`Runtime.enable`.
  - Submitted a real email against this sandbox's unreachable Supabase endpoint: produced a real "Could not send reset link — Failed to fetch" toast and the form correctly stayed in its unsent state (did not fabricate the success screen) — a live confirmation of the error-path claim found in the product-fit pass, beyond what the mocked unit tests alone can show.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\ForgotPasswordPage.tsx` — 3 contrast-token fixes.
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\ForgotPasswordPage.test.tsx` — new, 8 tests.
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\forgot-password.md` — state → merged, full PASS 1/2/3 handoff.
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\.superpowers\sdd\2026-11-14-redesign-pipeline-execution\task-4-forgot-password-report.md` — this report.

## Self-review

- **Enumeration leak checked?** Yes — traced `resetPassword` in `useAuth.ts` down to the real `supabase.auth.resetPasswordForEmail` call and confirmed the UI only ever has one success branch fed by one return shape that doesn't vary by account existence. No leak, nothing to change.
- **Error-message accuracy verified?** Yes — the "expires in an hour" claim checked against `supabase/config.toml` (no override, relies on and matches the real Supabase default) and against the sibling `ResetPasswordPage.tsx`'s matching copy; the error path verified both by mocked unit test and by a real, unmocked network failure in the live visual check.
- **Contrast fix applied if recurring pattern present?** Yes — 3 sites, independently recomputed against the actual `gradient-calm` background (not assumed identical to prior cards' plain `--background` cases) before applying the established fix token.
- **Card file clean?** Yes — `state: merged`, `owner` set, full `handoff` summary plus PASS 1/2/3 body sections, matching the `focus`/`day-planner` precedent format.

## Concerns

None. This page's logic and copy were already correct (enumeration-safe, accurate expiry claim); only the shared contrast-token defect needed fixing. No cross-file regression risk — `ForgotPasswordPage.tsx` has exactly one consumer (`AnimatedRoutes.tsx`'s lazy route) and no shared component was touched.
