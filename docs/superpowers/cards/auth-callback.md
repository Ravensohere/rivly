---
id: auth-callback
title: Auth Callback Page
owner: task-4-agent (solo; design + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = design, PASS 2 = product-fit, PASS 3 = build record) — this is a transient OAuth-callback page (route /auth/callback, no persistent UI); PASS 1 found no real surface to redesign beyond the shared contrast-token defect already fixed on landing-cta/alarm-ringing, present here at all three text-muted-foreground sites (plain bg-background, no gradient). PASS 2 reviewed the error/retry/edge-case handling at the handler level (not just JSX) and found it correct: ?error= handled immediately, getSession() failure surfaced with its real message, a never-arriving session retried once then shown a generic error, unexpected throws caught — no fabricated UI claims found. No product-logic bug found worth escalating (unlike alarm-ringing's snoozeMinutes gap). One minor non-blocking observation noted, not fixed (see PASS 2).
---

# Card: Auth Callback Page

This card represents the redesign/verification pass for the Auth Callback Page feature/page in the Rivly web app.

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

### PASS 1 — Design pass (honest "minimal surface" finding)

**What is there now** (`apps/web/src/pages/AuthCallbackPage.tsx`, route
`/auth/callback`, **not** route-guarded — it is the page that establishes
the session, so it can't require one).

A single `useEffect` state machine (`loading` → `success`/`error`) with no
navigation chrome, no layout decisions beyond a centered card, and three
possible renders: a spinner + "Signing you in...", a checkmark +
"Welcome to Rivly!" (then a timed hard-redirect to `/app`), or an alert
icon + "Sign in failed" + the real error message + a "Return to Rivly"
link. Total on-screen lifetime for a successful sign-in is ~2 seconds.

**Verdict: no visual redesign needed.** This is genuinely a transient
redirect spinner, not a page with a real surface to art-direct — forcing
a "design direction" onto it (new layout, new reference sites, new
visual language) would be manufactured busywork on a screen almost no
user looks at for more than a second. The one real, measurable defect is
not structural — it's the same shared-token contrast failure already
found and fixed on two prior cards (`landing-cta`, `alarm-ringing`):
`text-muted-foreground` on `bg-background` fails AA for 14px text.

**The defect, verified independently (sRGB → linear → relative luminance
→ WCAG ratio, Node script, not copied from the prior cards' numbers):**

| pairing | computed ratio | AA (4.5:1 for 14px) |
|---|---|---|
| `muted-foreground` (`rgb(110,114,135)`) on this page's `bg-background` (`rgb(248,246,241)`) | **4.399:1** | fail |
| proposed fix `hsl(230,10%,42%)` (`rgb(96,100,118)`) on the same `bg-background` | **5.428:1** | pass |
| dark mode `muted-foreground` dark (`rgb(129,133,152)`) on dark `bg` (`rgb(16,17,25)`) — unchanged | **5.144:1** | pass (left alone) |

Three sites carry this exact token, all plain text on the page's flat
`bg-background` (no gradient to recompute against, unlike
`alarm-ringing`'s case): the loading subtext ("Please wait a moment"),
the success subtext ("Redirecting you now..."), and the error message
paragraph (the real `errorMessage` text). All three get the same fix
already vetted twice in this pipeline: `text-muted-foreground` →
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` — dark mode's
already-passing value preserved via the `dark:` variant, not touched.

**Explicitly not changed:** layout, icon choice/colors
(`text-primary`/`text-green-500`/`text-destructive` on their own `/10`
tinted circles — graphical elements, not text, out of this card's text-
contrast scope), the spinner animation, the motion entrance, the button
styling, and all handler/redirect logic (verified correct in PASS 2).

**Reference sites:** none proposed — there is no structural or visual
direction decision being made here to justify citing one; the only
change is a numeric contrast value already validated against real
inspiration-backed precedent on two earlier cards in this same pipeline.

### PASS 2 — Product-fit review (error/edge-case handling, the higher-value check for this page)

**Cross-file impact — grep, not assertion.**

```
$ grep -rln "AuthCallbackPage" --include=*.ts --include=*.tsx apps/web/src
apps/web/src/components/layout/AnimatedRoutes.tsx
apps/web/src/pages/AuthCallbackPage.tsx
```

Default export, one lazy import, one route
(`AnimatedRoutes.tsx:65`, `<Route path="/auth/callback" element={<AuthCallbackPage />} />`,
**no auth guard** — correct, since this route exists to establish the
session, not to be gated by one). No cross-file reuse to worry about.

**Error path, read at the handler level, not the JSX labels, per the
established lesson.**

- **`?error=`/`?error_description=` from the IdP (e.g. user denies
  consent) — handled first, synchronously, before any Supabase call.**
  Sets `status: 'error'` and `errorMessage` to the real
  `error_description` (falling back to the bare `error` code when no
  description is present) and returns immediately — never calls
  `getSession()` for this branch. **Verified live** (see PASS 3): real
  built app, `?error=access_denied&error_description=User+denied+access`
  renders "Sign in failed" / "User denied access" with zero console
  errors.
- **`getSession()` returns a `sessionError` on the first check** — surfaces
  `sessionError.message` verbatim (real message, not fabricated/generic
  text) and stops. Matches what the UI implies: the error shown is the
  error that actually happened.
- **No session yet, no error either (the normal async-processing-delay
  case)** — waits 1.5s, retries `getSession()` once; if the retry also
  comes back empty or errors, shows a generic
  "Unable to complete sign in. Please try again." This is a deliberate,
  bounded retry for the real race condition (Supabase's `detectSessionInUrl`
  still processing the redirect fragment/code when the first check runs),
  not a silent failure — **verified live against the real, unmocked
  Supabase client** with no params at all and with a garbage `?code=`
  param: both resolve cleanly to the same generic error after the full
  2s wait, no crash, no infinite loader, no console errors.
- **Unexpected throw anywhere in the handler** — caught by the outer
  `try/catch`, shown as "An unexpected error occurred." No unhandled
  rejection, no blank screen.
- **No code/flow-type validation on the URL itself** — the page never
  inspects `code`/hash tokens directly; it relies on the Supabase client's
  default `detectSessionInUrl: true` (confirmed in
  `apps/web/src/integrations/supabase/client.ts`) to parse and exchange
  the redirect URL during client initialization, then polls `getSession()`.
  This is the standard, documented Supabase pattern for a callback page
  (not a bug) — the client, not this component, owns PKCE/implicit
  exchange.

**Fabrication/behavior-truthfulness check.** "Welcome to Rivly!" only
renders once `data.session` is truthy (a real session object, not
assumed); the error paragraph always shows the real captured message
(IdP error, Supabase error, or the component's own accurate fallback
text) — never a hardcoded success/failure claim unrelated to what
actually happened. **No fabricated or mismatched UI text found.**

**One minor observation, noted but not fixed (does not rise to a
product-decision-worthy gap like `alarm-ringing`'s `snoozeMinutes`):**
the two `setTimeout`-scheduled redirects (`window.location.href = '/app'`,
1500ms/1000ms after success) have no cleanup on unmount — if a user
manually navigated away from `/auth/callback` within that window the
redirect would still fire. This is a pre-existing minor robustness gap,
not a visible defect under normal use (nobody navigates away from their
own "Welcome to Rivly!" screen mid-redirect), and fixing it would add
`useRef`/`clearTimeout` plumbing unrelated to this card's contrast scope
— flagged here for visibility, not escalated as a FIXME, since it is not
a behavior the UI claims incorrectly and not a product decision gap.

**Verdict: APPROVED, scope as proposed in PASS 1 — three className
changes, no structural/behavioral changes, no escalation needed.**

### PASS 3 — Build / verification record

- **RED** (pre-implementation, unmodified `AuthCallbackPage`): new
  `AuthCallbackPage.test.tsx` → **9 passed / 3 failed**. The 9 baseline-
  contract tests passed against the old code (loading state; `?error=`
  handling with and without a description; success + redirect on the
  first check; retry-recovers-late; retry-exhausted generic error;
  `sessionError` message surfaced; unexpected-throw caught; "Return to
  Rivly" navigation) — confirming the baseline, including every error/
  edge-case path called out in the brief, was genuinely established
  before any code changed. The 3 redesign tests failed on exactly the
  predicted old value: all three `text-muted-foreground` sites.
- **GREEN** (post-implementation): **12/12 passed** — all three sites
  carry the darkened light-mode color plus the unchanged dark-mode
  variant; every baseline-contract assertion still holds.
- **Implementation:** changed three `className` values
  (`text-muted-foreground` → `text-[hsl(230,10%,42%)]
  dark:text-[hsl(230,10%,55%)]`) on the loading subtext, the success
  subtext, and the error-message paragraph, with one inline comment
  recording the measured before/after ratios (placed once, above the
  first site, to avoid repeating the same comment three times). No other
  line changed — the handler logic, retry timing, redirect targets, and
  route export are byte-for-byte unchanged.
- **Full suite:** `cd apps/web && npx vitest run` (run alone) →
  **31/31 files, 320/320 tests passed**, no flaky failures.
- **Build:** `npm run build` → `✓ built in 11.48s`, no errors;
  `AuthCallbackPage` chunk **2.71 kB (gzip 1.05 kB)** — small, isolated,
  lazy-loaded chunk, consistent with a three-className/one-comment diff.
- **Visual/behavioral check, including error/invalid-code paths as
  required by the brief:** built `dist` served locally
  (`npx serve -s dist`) and driven over CDP in headless Edge
  (`msedge.exe --headless=new --remote-debugging-port`, driven via
  Node's native `WebSocket` client against the DevTools Protocol —
  same approach as `alarm-ringing`, Playwright's bundled Chromium being
  blocked by OS Application Control on this machine). Three live
  navigations against the real, unmocked app + real Supabase client:
  - `/auth/callback?error=access_denied&error_description=User+denied+access`
    → rendered "Sign in failed" / "User denied access", fixed contrast
    class present, **0 console errors**.
  - `/auth/callback` (no params at all — the real retry-exhausted path,
    not mocked) → after the real ~2s wait, rendered "Sign in failed" /
    "Unable to complete sign in. Please try again.", fixed contrast class
    present, **0 console errors**, no crash, no infinite loader.
  - `/auth/callback?code=not-a-real-code` (garbage/invalid code, the
    brief's explicit "bad/missing code" case) → same clean generic-error
    outcome, **0 console errors**.
  - `docScrollWidth === docClientWidth` on all three (741/741,
    741/741, 741/741) — no horizontal overflow.
  - The success path (session found, "Welcome to Rivly!", hard redirect
    to `/app`) was **not** re-driven live: it requires a real
    authenticated Supabase session to reach, which is disproportionate
    for a three-className diff already verified at the handler level by
    passing unit tests that assert the exact redirect target and timing
    (`window.location.href === '/app'` after advancing the real 1500ms/
    1000ms delays with fake timers) — same judgment call `alarm-ringing`
    made for its equivalent authenticated-only path.
- **Primary interaction verified:** the success/error/retry state machine
  is confirmed working exactly as its UI implies at the handler level
  (12 unit tests reading `handleCallback`'s actual branches, not just
  JSX labels), and the two edge-case paths the brief specifically called
  out (IdP error, bad/missing code) are confirmed live against the real
  built app with zero console errors.
- **No escalation required this card** — unlike `alarm-ringing`'s
  `snoozeMinutes` gap, review found no product-logic bug or fabricated
  UI claim here; see PASS 2's one minor non-blocking observation
  (unmount redirect cleanup), noted but explicitly not fixed as out of
  scope.
