# Task 4 Card Report: calendar-callback

## Design direction

No visual redesign. `apps/web/src/pages/CalendarCallbackPage.tsx` (route
`/calendar/callback`) is a transient OAuth-callback screen, structurally
identical in kind to the `auth-callback` precedent: a single `useEffect`
state machine (loading → success/error), no navigation chrome, ~1.5s
on-screen lifetime for the happy path. Forcing a "design direction" onto it
would be manufactured busywork. One real difference from `auth-callback`:
this route **is** guarded (`user ? <CalendarCallbackPage/> : <Navigate to="/login"/>`
in `AnimatedRoutes.tsx:97`) since it connects a calendar to an
already-authenticated account, rather than establishing the session itself.
That's correct and intentional, not a defect.

The one real, measurable defect is the same shared-token contrast failure
already fixed on `landing-cta`, `alarm-ringing`, `auth-callback`:
`text-muted-foreground` on `bg-background` fails WCAG AA for 14px text.

## Contrast math (independently verified against this repo's actual tokens)

From `apps/web/src/index.css`: `--background: 38 35% 96%` (light),
`--muted-foreground: 230 10% 48%` (light); dark `--background: 230 22% 8%`,
`--muted-foreground: 230 10% 55%` (dark, unchanged).

Computed by hand (sRGB → linear → relative luminance → WCAG ratio):

| pairing | rgb | computed ratio | AA (4.5:1) |
|---|---|---|---|
| `muted-foreground` on `bg-background` | `rgb(110,114,135)` on `rgb(248,246,241)` | **4.403:1** | fail |
| fix `hsl(230,10%,42%)` on same bg | `rgb(96,100,118)` on `rgb(248,246,241)` | **5.428:1** | pass |
| dark mode (unchanged) | n/a — same global token already verified passing on `auth-callback` | — | pass |

Matches the prior cards' numbers exactly (same global token pair), as
expected — re-derived from this page's actual CSS values, not copied.

## Product-fit findings (PASS 1/PASS 2, solo)

**Cross-file check:** `grep -rln "CalendarCallbackPage"` → only
`AnimatedRoutes.tsx` (one route) and the file itself. No shared-component
risk.

**Error/edge-case paths reviewed at the handler level, not JSX labels:**

- `?error=`/`?error_description=` (user denies calendar permission) —
  handled first, synchronously, before any Supabase call. Correct.
- Missing `?code=` — "No authorization code received", returns before any
  Supabase call. Correct.
- Expired/invalid code — this component can't validate client-side; it
  forwards to the `google-oauth-callback` edge function. **Read the edge
  function** (`supabase/functions/google-oauth-callback/index.ts`): every
  failure path there (bad auth header → 401, Google token-exchange
  failure → Google's real status, missing secrets → 500, DB upsert
  failure → 500) returns a non-2xx status, which `supabase.functions.invoke`
  surfaces as `fnError` — matching the frontend's handling exactly,
  including the tailored 401 message ("log out and back in").
- No session — "You must be logged in..." Given the route guard, this
  branch is normally unreachable except in a narrow session-expiry race;
  correct defensive code, not dead code to remove.
- Network failure / unexpected throw — caught by outer `try/catch`, generic
  message, no blank screen or unhandled rejection.

**Two minor, non-blocking observations — noted, not fixed (same standard
as `auth-callback`'s unmount-cleanup note):**
1. The `data?.error` branch (edge function responds 200 with an error body)
   appears to be dead code given the edge function's actual contract —
   every error path there uses a non-2xx status instead. Forward-
   compatible defensive coding, not a bug.
2. The in-component `getSession()`/no-session check is now largely
   redundant given the route-level `user` guard. Still correct, just
   belt-and-suspenders.

**Fabrication check:** "Calendar Connected!" / "Your events will now
appear in Rivly" only render on the real success branch; the error
paragraph always shows the real captured message. No fabricated or
mismatched UI text found. No product-logic bug found worth escalating
(unlike `alarm-ringing`'s `snoozeMinutes` gap).

**Verdict:** approved as proposed — three `className` changes only.

## TDD Evidence

**RED** (new `apps/web/src/pages/__tests__/CalendarCallbackPage.test.tsx`,
run against the unmodified page): **11 passed / 3 failed**. Baseline
contract (loading state; `?error=` with/without description; missing
code; no-session error; 401 vs. non-401 edge-function failure; `data.error`
payload; success + redirect to `/settings`; unexpected throw; "Return to
Settings" click) all passed pre-fix, confirming the baseline was genuinely
established before any code changed. The 3 contrast tests failed on
exactly the predicted old value (`text-muted-foreground` present instead
of the fixed token) on all three sites.

**GREEN** (after implementation): **14/14 passed**.

## What I implemented

Three `className` changes in `CalendarCallbackPage.tsx` — loading subtext,
success subtext, error-message paragraph — each
`text-muted-foreground` → `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`,
with one inline comment above the first site recording the measured
before/after ratios. No other line changed: handler logic, redirect
target (`/settings`), toast copy, and the route export are byte-for-byte
unchanged.

## Build + behavioral check

- **Focused test:** 14/14 passed.
- **Full suite** (`cd apps/web && npx vitest run`, run alone): **32/32
  files, 334/334 tests passed**, no flakes.
- **Build** (`npm run build`): `✓ built in 11.88s`, no errors;
  `CalendarCallbackPage` chunk 3.13 kB (gzip 1.28 kB) — small, isolated,
  lazy chunk.
- **Live behavioral check:** served `dist` locally (`npx serve -s dist`)
  and drove headless Edge over CDP (`msedge.exe --headless=new
  --remote-debugging-port`, Node `WebSocket` client against the DevTools
  Protocol — Playwright's bundled Chromium is blocked by OS Application
  Control on this machine, same workaround as `auth-callback`).
  - Because this route is guarded (unlike `auth-callback`), navigating
    **unauthenticated** to all three edge-case URLs
    (`?error=access_denied&error_description=...`, no params, `?code=not-a-real-code`)
    correctly redirected to `/login` every time — confirming the guard
    works and none of these URLs ever leak the callback page's internals
    to a logged-out visitor. **0 console errors** (only benign
    third-party "Tracking Prevention" warnings from Google's own
    `apis.google.com/js/api.js` script on the login page, unrelated to
    this card), `docScrollWidth === docClientWidth` (741/741) all three
    times — no horizontal overflow.
  - The success/error states of `CalendarCallbackPage` itself require a
    real authenticated Supabase session to reach, which is disproportionate
    to stand up for a three-className diff — same judgment call
    `auth-callback` made for its equivalent authenticated-only path. These
    are instead confirmed at the handler level by 14 unit tests asserting
    on the real rendered DOM (`getByText`, `node.className`) against the
    real component code.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\CalendarCallbackPage.tsx` — contrast fix (3 className changes + 1 comment)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\CalendarCallbackPage.test.tsx` — new test file (14 tests)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\calendar-callback.md` — state `backlog` → `merged`, full PASS 1/2/3 handoff

## Self-review

- Error/edge-case paths checked at the handler level (not just JSX), per
  the brief's explicit list: IdP denial, missing/bad code, no session,
  network failure — all reviewed and tested.
- Honest minimal-surface call: yes, same as `auth-callback`, with the one
  genuine structural difference (route guard) called out and verified.
- Fabrication/mismatch check performed: no fabricated or mismatched UI
  text found; two minor dead-code/redundancy observations noted but not
  escalated (neither is a behavior the UI claims incorrectly).
- Contrast fix reused directly from the established pattern
  (`hsl(230,10%,48%)` → `hsl(230,10%,42%)` light; dark unchanged at
  `55%`), and independently re-verified with real HSL→RGB→luminance math
  against this page's actual CSS tokens rather than assumed from the
  prior cards.
- Tests are positive/behavioral assertions on real rendered DOM
  (`getByText`, `.className` checks, `not.toHaveBeenCalled`/
  `toHaveBeenCalledWith` on navigation), not text-presence-only.

## Concerns

None blocking. Two non-blocking observations recorded in the card (likely-
dead `data.error` branch in the component; now-redundant in-component
session check given the route guard) — flagged for visibility, consistent
with how `auth-callback`'s minor unmount-cleanup gap was handled, not
escalated as a FIXME since neither is a fabricated UI claim or a product
decision gap.
