# Task 4 — Signup Page (`apps/web/src/pages/SignupPage.tsx`, route `/signup`)

## Audit findings (incl. terms/privacy consent check)

- **Route wiring:** confirmed correct in `AnimatedRoutes.tsx:28` (lazy
  import) and `:59` (`<Route path="/signup" element={!user || isGuest ?
  <SignupPage /> : <Navigate to="/app" replace />} />`) — public,
  redirects an already-authenticated non-guest user, mirrors `/login`'s
  guard exactly (a guest is still allowed through, so guest→real-account
  conversion works).
- **Page shape:** read the full 117-line file. It is **Google-OAuth-only**
  — a logo, heading, one "Sign up with Google" button (`handleSignup` →
  `signInWithGoogle` from `useAuthContext`), a consent line, and a "Log in"
  link. No email field, no password field, no explicit consent checkbox.
- **Terms/Privacy consent links — functional and accurate.** Both are real
  registered routes (`/terms` → `AnimatedRoutes.tsx:54`, `/privacy` →
  `:53`). Clicked both against the real built app — both resolve, 0
  console errors (see Build + visual check below). The consent line makes
  no claim beyond "you agree to our Terms of Service and Privacy Policy" —
  nothing to be wrong about on its own. Read the rendered Terms of Service
  page: section 3 ("User Accounts") already says "You may need to create
  an account via Google Authentication" — this **matches** the page's
  actual Google-only flow, not a stale email/password claim.
- No consent checkbox exists — not a defect, matches the sibling pattern on
  `LoginPage.tsx`'s embedded signup mode (checked via the `login` card).
- **Cross-reference, not re-fixed:** the `privacy-policy` card's escalated
  Google-Analytics-disclosure gap (`apps/web/index.html` loads `gtag.js`
  site-wide) applies to `/signup` too since GA loads globally. Not a new
  finding, not re-escalated as a duplicate; fixing it means editing legal
  text/`index.html`, outside this page's scope.

## Product-fit findings

- **Password-strength / email-verification claims: N/A for this file,
  verified not assumed.** `grep -n "password\|verif"
  apps/web/src/pages/SignupPage.tsx` returns nothing — neither word
  appears anywhere in the component. The only auth call is
  `signInWithGoogle()`, traced into `useAuth.ts:248-294` — a real
  `supabase.auth.signInWithOAuth({ provider: 'google', ... })` call (its
  calendar scopes were already verified real against server code by the
  `privacy-policy` card). Since the page makes zero claims about password
  rules or email verification, there's nothing to fabricate or mismatch.
  The actual email/password signup path lives in `LoginPage.tsx`'s
  embedded sign-up mode instead, already audited by the `login` card (no
  strength/verification claim found there either — just a native
  `minLength={6}` with no accompanying message). **Not escalated as
  unverifiable-without-a-real-signup** — this is absence of claim, not an
  unverifiable one.
- **Error-handling check:** `handleSignup`'s try/catch around
  `signInWithGoogle()` is a defensive no-op — the hook itself never throws
  in practice; it returns `{ error }` and already toasts internally on
  known failures. Doesn't duplicate or contradict the hook's toast, and
  `finally` always resets `loading`. Not a bug; verified with a dedicated
  test that a rejection is swallowed without crashing or leaving the page
  stuck loading.
- **Cross-file impact:** `grep -rln "SignupPage" apps/web/src` → only
  `SignupPage.tsx`, `AnimatedRoutes.tsx` (the one route), and the new test
  file — zero other consumers, fully local blast radius.

## Contrast audit

Same HSL→sRGB→relative-luminance tokens as every prior card (light
`--background: 38 35% 96%`, `--card: 38 30% 98%`, `--muted-foreground: 230
10% 48%`; dark `--background: 230 22% 8%`, `--card: 230 20% 11%`,
`--muted-foreground: 230 10% 55%`). 3 `text-muted-foreground` sites total
(lines 34, 53, 96 — matches `grep -n muted-foreground SignupPage.tsx`
exactly):

| Site | Background | Light | Dark | Verdict |
|---|---|---|---|---|
| "Back to Home" link | flat `bg-background` | 4.385 | 5.109 | **Fails light** — fixed |
| Subtitle | flat `bg-card` | 4.557 | 4.798 | Passes — untouched |
| Terms/Privacy paragraph | flat `bg-card` | 4.557 | 4.798 | Passes — untouched |

No `bg-secondary` or opacity-stacked sites on this page. Fixed 1 of 3,
reusing the established flat-bg remediation verbatim:
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`.

**Logic-bug check (3-condition test):** no logic bug found on this page —
nothing was routed through the fix-vs-escalate test.

## TDD Evidence (RED/GREEN)

New test file: `apps/web/src/pages/__tests__/SignupPage.test.tsx` (no prior
test file existed). Mocks `@/contexts/AuthContext` (`signInWithGoogle`
only, matching the component's actual destructure).

- **RED** (baseline, unmodified component): **4/5 passed, 1 failed** —
  exactly the contrast-fix assertion on the "Back to Home" link. The 4
  passing tests (heading/logo/links render with correct hrefs, real
  `signInWithGoogle` call on click, button disables while pending then
  re-enables, unexpected rejection swallowed without crashing/stuck
  loading) all passed against the **original** code first, confirming the
  fixtures exercise real logic before any fix was applied.
- **GREEN** (post-fix): **5/5 passed.**

## What I implemented

One scoped change to `apps/web/src/pages/SignupPage.tsx`: the "Back to
Home" `<Link>`'s className changed from bare `text-muted-foreground` to
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` — the pipeline's
established flat-`bg-background` AA-contrast fix, reused verbatim (same
fix already applied on `login`, `settings`, `forgot-password`,
`not-found`, `mobile-app`, `onboarding`, `reflect-and-journal`). No other
code changes — no logic bugs were found that needed fixing.

## Build + visual check

- Full suite: `cd apps/web && npx vitest run` → **49/49 files, 581/581
  tests passed** (576 baseline + 5 net new).
- ESLint: `npx eslint src/pages/SignupPage.tsx
  src/pages/__tests__/SignupPage.test.tsx` → **0 findings.**
- Build: `npm run build` → `✓ built in 14.67s`, no errors; `SignupPage`
  chunk **3.63 kB (gzip 1.75 kB)**.
- Visual check against the real built app (`npx vite preview --port 4181`,
  driven via `claude-in-chrome`): `/signup` renders correctly (logo,
  heading, subtitle, Google button, consent links, "Log in" link all
  visible and legible), 0 console errors. Clicked "Terms of Service" →
  resolves to `/terms`, content confirms the Google-Authentication-only
  account claim matches this page's real flow, 0 console errors. Clicked
  "Privacy Policy" → resolves to `/privacy`, 0 console errors.

## Files changed

- `apps/web/src/pages/SignupPage.tsx` — 1-line className fix (contrast).
- `apps/web/src/pages/__tests__/SignupPage.test.tsx` — new, 5 tests.
- `docs/superpowers/cards/signup.md` — state `backlog` → `merged`, full
  handoff recorded.

## Self-review findings

- Terms/privacy links checked for function + accuracy: **yes** — both
  routes real, both clicked live against the built app, Terms of Service's
  own text matches the page's actual Google-only flow.
- Password/verification claims verified: **yes, confirmed absent** rather
  than assumed — grepped the file for "password"/"verif", traced the only
  auth call (`signInWithGoogle`) into `useAuth.ts`, and cross-checked that
  the actual email/password path lives in `LoginPage.tsx` (already
  audited by the `login` card).
- Swept all muted-text sites incl. variants: **yes** — all 3
  `text-muted-foreground` sites found via grep and individually verified
  against their real (flat, non-stacked) background; no `bg-secondary` or
  opacity-stacked variant exists on this page.
- Positive test assertions: **yes** — tests assert real link hrefs, a
  real `signInWithGoogle()` call, real loading-state disable/re-enable,
  and a real error-path (rejection swallowed, no crash, no stuck loading),
  not just "doesn't throw."
- Card file clean: **yes** — state `merged`, owner, handoff all updated.

## Concerns

None. This page's scope turned out much smaller than the card brief
anticipated (no password/email-verification surface exists on it at all),
so this was a short, low-risk pass: 1 contrast fix, 0 logic bugs, 0 new
escalations specific to this page (the GA-disclosure gap is a pre-existing
cross-page item, not new here).
