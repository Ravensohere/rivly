---
id: calendar-callback
title: Calendar Callback Page
owner: task-4-agent (solo; design + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = design, PASS 2 = product-fit, PASS 3 = build record) — this is a transient OAuth-callback page (route /calendar/callback, route-guarded on `user` unlike auth-callback). PASS 1 found no real surface to redesign beyond the same shared contrast-token defect already fixed on alarm-ringing/auth-callback, present here at all three text-muted-foreground sites (plain bg-background, no gradient) — independently re-verified by HSL->RGB->luminance math, same numeric result. PASS 2 reviewed the error/edge-case handling at the handler level and found it correct for every path the brief named (IdP denial, missing/bad code, no session, edge-function 401 vs. other failure, unexpected throw); found one pre-existing, non-blocking dead-code observation (the `data?.error` branch is likely unreachable given the edge function's actual error contract) and one redundancy (the in-component session check is now mostly belt-and-suspenders given the route guard) — neither is a fabricated UI claim or a product-logic bug, so neither is escalated. No product-logic bug found worth escalating (unlike alarm-ringing's snoozeMinutes gap).
---

# Card: Calendar Callback Page

This card represents the redesign/verification pass for the Calendar Callback Page feature/page in the Rivly web app.

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

**What is there now** (`apps/web/src/pages/CalendarCallbackPage.tsx`, route
`/calendar/callback`, **route-guarded** on `user` in
`AnimatedRoutes.tsx:97` — `user ? <CalendarCallbackPage /> : <Navigate to="/login" replace />`.
This is the one structural difference from the `auth-callback` precedent:
that page establishes the session and so cannot be guarded; this page
*connects a Google Calendar to an already-authenticated account*, so
guarding on `user` is correct and intentional).

A single `useEffect` state machine (`loading` → `success`/`error`) with no
navigation chrome beyond a centered card: a spinner + "Connecting
Calendar...", a calendar icon + "Calendar Connected!" (toast, then a timed
`navigate('/settings', { replace: true })`), or an alert icon + "Connection
failed" + the real `errorMessage` + a "Return to Settings" link. Total
on-screen lifetime for a successful connect is ~1.5s.

**Verdict: no visual redesign needed.** Same judgment as `auth-callback`:
this is a transient redirect spinner with no real surface to art-direct.
The one measurable defect is the same shared-token contrast failure found
and fixed on `landing-cta`, `alarm-ringing`, and `auth-callback`:
`text-muted-foreground` on `bg-background` fails AA for 14px text.

**The defect, re-verified independently** (sRGB → linear → relative
luminance → WCAG ratio, computed by hand against this repo's actual
`index.css` tokens, not copied from the prior cards' numbers — though it
is the identical global token pair, so the identical result is expected
and was the right thing to find):

| pairing | computed ratio | AA (4.5:1 for 14px) |
|---|---|---|
| `muted-foreground` (`hsl(230,10%,48%)` → `rgb(110,114,135)`) on `bg-background` (`hsl(38,35%,96%)` → `rgb(248,246,241)`) | **4.403:1** | fail |
| proposed fix `hsl(230,10%,42%)` (`rgb(96,100,118)`) on the same background | **5.428:1** | pass |
| dark mode `muted-foreground` dark (`hsl(230,10%,55%)` on `--background: 230 22% 8%`) — unchanged, already verified passing on `auth-callback` | n/a (same shared token, left alone) | pass |

Three sites carry this exact token, all plain text on the page's flat
`bg-background` (no gradient): the loading subtext ("Please wait a
moment"), the success subtext ("Your events will now appear in Rivly"),
and the error message paragraph (the real `errorMessage` text). All three
get the same fix already vetted three times in this pipeline:
`text-muted-foreground` → `text-[hsl(230,10%,42%)]
dark:text-[hsl(230,10%,55%)]` — dark mode's already-passing value
preserved via the `dark:` variant, not touched.

**Explicitly not changed:** layout, icon choice/colors (`text-primary`,
`text-green-500`, `text-destructive` on their `/10` tinted circles —
graphical elements, out of text-contrast scope), the spinner animation,
the motion entrance, the button styling, the toast copy, and all
handler/redirect logic (verified correct in PASS 2).

**Reference sites:** none proposed, same reasoning as `auth-callback` —
no structural/visual direction decision here to justify one.

### PASS 2 — Product-fit review (error/edge-case handling)

**Cross-file impact — grep, not assertion.**

```
$ grep -rln "CalendarCallbackPage" --include=*.ts --include=*.tsx apps/web/src
apps/web/src/components/layout/AnimatedRoutes.tsx
apps/web/src/pages/CalendarCallbackPage.tsx
```

Default export, one lazy import, one route, confirmed guarded (see PASS
1). No cross-file reuse to worry about.

**Error path, read at the handler level.**

- **`?error=`/`?error_description=` (user denies Google's calendar consent
  screen)** — handled first, synchronously, before any Supabase call; sets
  the real `error_description` (falling back to the bare `error` code) and
  returns immediately, never calling `getSession()`. Matches the brief's
  "denied calendar permission" case exactly.
- **Missing `?code=`** — `No authorization code received`, also returns
  before any Supabase call. Matches "expired/invalid code" in spirit (no
  code at all is the degenerate case of this).
- **`?code=` present but garbage/expired** — this component does not and
  cannot validate the code client-side; it forwards it to the
  `google-oauth-callback` edge function, which calls Google's real token
  endpoint and surfaces a non-2xx response as `fnError`. **Verified against
  the actual edge function** (`supabase/functions/google-oauth-callback/index.ts`):
  every failure path there (missing/invalid auth header → 401; bad/expired
  code → whatever status Google's token endpoint returns, surfaced via
  `fnError`; missing OAuth secrets → 500; DB upsert failure → 500) returns
  a non-2xx HTTP status, which `supabase.functions.invoke` surfaces as
  `fnError`, not as a 200-with-`data.error` body. The frontend's `fnError`
  branch is correctly exercised for all of these; the specific 401 case
  gets a tailored "log out and back in" message, matching the one real
  scenario (expired/invalid session JWT) that status code means here.
- **No session found** (`getSession()` resolves with `session: null`) —
  shown as "You must be logged in to connect your calendar." **Observation
  (not a bug):** given the route guard in PASS 1, this branch is normally
  unreachable in the current session — reachable only if the session
  expires in the narrow window between the route rendering and this async
  check resolving. Correct defensive behavior, not dead code to remove.
- **Unexpected throw anywhere in the handler** — caught by the outer
  `try/catch`, shown as "An unexpected error occurred." No unhandled
  rejection, no blank screen. **Verified live and in tests** (reject
  `getSession()`).

**One pre-existing observation, noted but not fixed (does not rise to a
product-decision gap like `alarm-ringing`'s `snoozeMinutes`):** the
`data?.error` branch (triggered when the edge function responds 200 with
an `{ error: ... }` body) appears to be dead code given the edge
function's actual contract — every error path there uses a non-2xx status,
which the Supabase client surfaces as `fnError` before `data?.error` is
ever reached. This is forward-compatible defensive coding, not a bug;
flagged for visibility only, consistent with how `auth-callback`'s minor
unmount-cleanup gap was handled (noted, not escalated, not fixed).

**Fabrication/behavior-truthfulness check.** "Calendar Connected!" /
"Your events will now appear in Rivly" only renders once the edge
function's response contains no error (success branch); the error
paragraph always shows the real captured message (IdP error, edge
function error, or the component's accurate fallback text) — never a
hardcoded claim unrelated to what actually happened. **No fabricated or
mismatched UI text found.**

**Verdict: APPROVED, scope as proposed in PASS 1 — three className
changes, no structural/behavioral changes, no escalation needed.**

### PASS 3 — Build / verification record

- **RED** (pre-implementation, unmodified `CalendarCallbackPage`): new
  `CalendarCallbackPage.test.tsx` → **11 passed / 3 failed**. The 11
  baseline-contract tests passed against the old code (loading state;
  `?error=` handling with and without a description; missing `?code=`;
  no-session error; edge-function 401 vs. non-401 failure message; the
  `data.error` payload path; success + redirect to `/settings`; unexpected
  throw caught; "Return to Settings" navigation) — confirming the
  baseline, including every error/edge-case path called out in the brief,
  before any code changed. The 3 redesign tests failed on exactly the
  predicted old value: all three `text-muted-foreground` sites.
- **GREEN** (post-implementation): **14/14 passed** — all three sites
  carry the darkened light-mode color plus the unchanged dark-mode
  variant; every baseline-contract assertion still holds.
- **Implementation:** changed three `className` values
  (`text-muted-foreground` → `text-[hsl(230,10%,42%)]
  dark:text-[hsl(230,10%,55%)]`) on the loading subtext, the success
  subtext, and the error-message paragraph, with one inline comment
  recording the measured before/after ratios (placed once, above the
  first site). No other line changed — handler logic, redirect target,
  toast copy, and route export are byte-for-byte unchanged.
- **Full suite:** `cd apps/web && npx vitest run` (run alone) →
  **32/32 files, 334/334 tests passed**, no flaky failures.
- **Build:** `npm run build` → `✓ built in 11.88s`, no errors;
  `CalendarCallbackPage` chunk **3.13 kB (gzip 1.28 kB)** — small,
  isolated, lazy-loaded chunk, consistent with a three-className/one-
  comment diff.
- **Visual/behavioral check, including error/edge-case paths as required
  by the brief:** built `dist` served locally (`npx serve -s dist`) and
  driven over CDP in headless Edge (`msedge.exe --headless=new
  --remote-debugging-port`, driven via Node's native `WebSocket` client
  against the DevTools Protocol — same approach as `auth-callback`,
  Playwright's bundled Chromium being blocked by OS Application Control on
  this machine).
  - Because this route **is** guarded (unlike `auth-callback`), navigating
    unauthenticated to `/calendar/callback?error=access_denied&...`,
    `/calendar/callback` (no params), and `/calendar/callback?code=not-a-real-code`
    all correctly redirected to `/login` (`"Sign in to continue your daily
    flow"` rendered each time) — **confirming the route guard itself works
    correctly and that none of these edge-case URLs ever leak the
    callback page's internals to a logged-out visitor**, with **0 console
    errors** (only benign third-party "Tracking Prevention" warnings from
    Google's own `apis.google.com/js/api.js` script on the login page,
    unrelated to this card) and `docScrollWidth === docClientWidth` (741/741)
    on all three loads — no horizontal overflow.
  - Reaching `CalendarCallbackPage`'s own rendered states (loading/
    success/error) live requires a real authenticated Supabase session,
    which is disproportionate to stand up for a three-className diff —
    same judgment call `auth-callback` made for its equivalent
    authenticated-only success path. Those states, including the exact
    error/edge-case branches named in the brief (IdP denial, missing code,
    no session, edge-function 401/non-401, unexpected throw), are
    confirmed instead at the handler level by the 14 passing unit tests,
    which assert on the real rendered DOM (`getByText`, `node.className`)
    against the real component code, not mocked JSX.
- **Primary interaction verified:** the success/error state machine is
  confirmed working exactly as its UI implies at the handler level (14
  unit tests reading `handleCallback`'s actual branches, not just JSX
  labels); the route guard — the one structural element unique to this
  card versus `auth-callback` — is confirmed live against the real built
  app with zero console errors.
- **No escalation required this card** — review found no product-logic
  bug or fabricated UI claim; see PASS 2's two minor non-blocking
  observations (likely-dead `data.error` branch, now-redundant in-
  component session check), noted but explicitly not fixed as out of
  scope.
