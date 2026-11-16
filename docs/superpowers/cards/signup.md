---
id: signup
title: Signup Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/SignupPage.tsx (route /signup, public, redirects a real/non-guest user to /app, 117 lines pre-edit). This dedicated page is Google-OAuth-only (no email/password form) — there is no password-strength messaging or email-verification copy anywhere on the page to fabricate or mismatch; LoginPage.tsx's separate embedded email/password signup mode was already audited by the login card. Terms/Privacy consent links verified functional (real routes) and accurate (Terms of Service's own "User Accounts" section already documents Google-Authentication-only accounts, matching this page's actual flow). Fixed 1 AA-contrast site (flat-bg "Back to Home" link, established fix); 2 other text-muted-foreground sites on this page (flat bg-card) were computed to genuinely pass and left untouched.
---

# Card: Signup Page

This card represents the redesign/verification pass for the Signup Page feature/page in the Rivly web app.

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

### PASS 1 — Audit (route wiring + terms/privacy consent)

Route confirmed in `AnimatedRoutes.tsx:28` (lazy import) and `:59`
(`<Route path="/signup" element={!user || isGuest ? <SignupPage /> : <Navigate to="/app" replace />} />`)
— public, redirects an already-authenticated non-guest user away, matches
the card brief and mirrors `/login`'s guard pattern exactly (including
allowing a guest through, so a guest can convert to a real account).

**Shape of the page.** Read the full file: it renders a logo, "Create your
account" heading, a single "Sign up with Google" button (`handleSignup` →
`signInWithGoogle` from `useAuthContext`), a consent line, and a "Log in"
link — there is no email field, no password field, and no explicit consent
checkbox. This matters for the card brief's specific instructions below.

**Terms/Privacy consent check (the card brief's specific ask, given the
pipeline's prior undisclosed-tracking and no-account-deletion findings).**
- Both links are real, registered routes: `to="/terms"` → `AnimatedRoutes.tsx:54`
  (`<Route path="/terms" element={<TermsOfServicePage />} />`), `to="/privacy"`
  → `AnimatedRoutes.tsx:53`. Clicked both against the real built app (PASS 3) —
  both resolve, zero console errors.
- Accuracy: the consent line itself makes no claim beyond "by clicking
  continue, you agree to our Terms of Service and Privacy Policy" — it does
  not restate any privacy practice that could itself be wrong. Read
  `TermsOfServicePage.tsx`'s rendered content (via the real built app):
  section 3 ("User Accounts") already says "You may need to create an
  account via Google Authentication" — this **matches** the actual
  Google-only flow on this page, not a stale "email and password" claim
  left over from an earlier design.
- No consent **checkbox** exists (just link text, same as `login.md`'s
  embedded signup mode) — not a defect, matches the established pattern on
  this page's sibling.
- Cross-reference (not re-fixed here, not new): the `privacy-policy` card's
  escalated Google-Analytics-disclosure gap (`apps/web/index.html` loads
  `gtag.js` site-wide) applies to `/signup` too, since GA loads globally —
  same root cause, same existing escalation, no new finding; fixing it
  means editing legal text/index.html, outside this page's scope.

### PASS 2 — Product-fit (password-strength + email-verification claims)

**The card brief's specific ask:** do password-strength messages and
email-verification claims match real Supabase signup behavior?

**Finding: N/A for this file, verified not just assumed.** `grep -n
"password\|verif" apps/web/src/pages/SignupPage.tsx` returns nothing — the
word "password" does not appear anywhere in this component, and there is no
email-verification copy ("check your email", etc.) either. The only auth
call is `signInWithGoogle()` from `useAuth.ts` (traced: a real
`supabase.auth.signInWithOAuth({ provider: 'google', ... })` call with the
calendar scopes already verified real against server code by the
`privacy-policy` card). Since the page makes zero claims about password
rules or email verification, there is nothing here to fabricate or
mismatch against Supabase's actual behavior — the email/password signup
path (with its own `signUp` call in `useAuth.ts:162`, no verification-email
copy either) lives entirely in `LoginPage.tsx`'s embedded sign-up mode,
already audited by the `login` card (no password-strength claim or
email-verification claim found there either — just a native `minLength={6}`
HTML attribute with no accompanying message). **Not escalated as
"genuinely unverifiable without a real signup"** — this isn't an
unverifiable claim, it's the absence of any claim, confirmed by reading
the full file and grepping it.

**Error-handling behavior check.** `handleSignup` wraps `signInWithGoogle()`
in try/catch, logging to `console.error` on catch. Traced `signInWithGoogle`
in `useAuth.ts:248-294`: it never throws in practice — on a known failure it
returns `{ error }` and already shows a toast itself (`'Sign-in method not
available'` / `'Sign in failed'`). The local catch is a defensive no-op
fallback for a genuinely unexpected exception (e.g. a thrown error before
reaching Supabase); it doesn't contradict or duplicate the hook's own
toast, and doesn't leave the user stuck (loading always resets via
`finally`). Not a bug — informational only, no fix needed. Verified with a
dedicated test (PASS 3) that a rejection is swallowed without crashing and
without leaving `loading` stuck.

**Cross-file impact.** `grep -rln "SignupPage" apps/web/src` → only
`SignupPage.tsx` itself, `AnimatedRoutes.tsx` (the one route), and this
card's new test file — zero other consumers, fully local blast radius.

**Contrast audit** (same HSL→sRGB→relative-luminance tokens as every prior
card; light `--background: 38 35% 96%`, `--card: 38 30% 98%`,
`--muted-foreground: 230 10% 48%`; dark `--background: 230 22% 8%`,
`--card: 230 20% 11%`, `--muted-foreground: 230 10% 55%`). 3
`text-muted-foreground` sites total (`grep -n muted-foreground
SignupPage.tsx` → lines 34, 53, 96 — matches exactly):

| Site | Background | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|
| "Back to Home" link | flat `bg-background` | 4.385 | 5.109 | **Fails light** — established flat-bg fix applied (`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`) |
| Subtitle ("Start your journey...") | flat `bg-card` | 4.557 | 4.798 | **Passes** — left untouched, same precedent as `profile`/`login`/`settings` |
| Terms/Privacy consent paragraph | flat `bg-card` | 4.557 | 4.798 | **Passes** — left untouched |

No `bg-secondary` or opacity-stacked sites on this page (the two `bg-card`
sites are flat, no alpha modifier). Only 1 of 3 sites needed a fix.

**Logic-bug check (3-condition test):** no logic bug was found on this
page — the only candidate (the defensive try/catch above) isn't a bug, so
nothing was routed through the 3-condition fix-vs-escalate test.

**Verdict:** 1 contrast fix (flat-bg, reused verbatim), zero structural
redesign, zero escalations specific to this page (the GA-disclosure gap is
a pre-existing cross-page escalation, not new).

### PASS 3 — Build / verification record

- **New test file:** `apps/web/src/pages/__tests__/SignupPage.test.tsx`
  (no prior test file existed). Module-mocks `@/contexts/AuthContext`
  (`signInWithGoogle` only, matching what this component actually
  destructures).
- **RED** (baseline run against the unmodified component): **4/5 passed, 1
  failed** — exactly the contrast-fix assertion on the "Back to Home" link,
  because the original component still used bare `text-muted-foreground`.
  The 4 passing baseline tests (heading/logo/links render, real
  `signInWithGoogle` call on click, button disables while pending then
  re-enables, and an unexpected rejection is swallowed without crashing or
  leaving the page stuck loading) all passed against the **original**,
  unmodified component first, confirming the fixtures exercise real logic.
- **GREEN** (post-implementation): **5/5 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **49/49 files, 581/581
  tests passed** (576 baseline + 5 net new).
- **ESLint:** `npx eslint src/pages/SignupPage.tsx
  src/pages/__tests__/SignupPage.test.tsx` → **0 findings.**
- **Build:** `npm run build` → `✓ built in 14.67s`, no errors; `SignupPage`
  chunk **3.63 kB (gzip 1.75 kB)**.
- **Visual check — against the real built app:** `dist` served locally
  (`npx vite preview --port 4181`), driven via the `claude-in-chrome` MCP
  tools. `/signup` renders correctly (logo, heading, subtitle, Google
  button, consent links, "Log in" link all visible and legible), **0
  console errors**. Clicked "Terms of Service" → resolves to `/terms`,
  rendered content confirms the Google-Authentication-only account claim
  matches this page's real flow, 0 console errors. Clicked "Privacy
  Policy" → resolves to `/privacy`, 0 console errors. Both navigations
  confirmed live against the real built app, not just asserted in tests.
- **Primary interaction verified:** "Sign up with Google" click → real
  `signInWithGoogle()` call (component-level, via the 5 passing tests,
  which render the real `SignupPage` component code); route guard and both
  consent links confirmed live against the real built app with zero
  console errors.

No escalations specific to this page. The pre-existing GA-disclosure gap
(from the `privacy-policy` card) applies here too since it's loaded
site-wide, but is not a new finding and was not re-escalated as a duplicate.
