# Task 4 — `auth-callback` card report

Page: `apps/web/src/pages/AuthCallbackPage.tsx`, route `/auth/callback` (no auth guard — it's the page that establishes the session).

## Design direction — honest "minimal surface, no redesign needed" finding

Read the actual component first, per the brief. It is genuinely a transient OAuth-callback state machine (`loading` → `success`/`error`), total on-screen lifetime for a successful sign-in ~2s, no navigation chrome beyond a centered card. **No visual/structural redesign was warranted** — forcing a "design direction" (new layout, reference sites) onto a screen almost nobody looks at for more than a second would be manufactured busywork. The one real, measurable defect found is not structural: it's the same shared-token contrast failure already found and fixed twice in this pipeline (`landing-cta`, `alarm-ringing`) — `text-muted-foreground` on `bg-background`, present at three sites on this page's plain (non-gradient) background.

Verified independently with a Node script (sRGB → linear → relative luminance → WCAG ratio), not copied from the prior cards' numbers:

| pairing | ratio | AA (4.5:1 @ 14px) |
|---|---|---|
| `muted-foreground` on this page's `bg-background` | 4.399:1 | fail |
| fix `hsl(230,10%,42%)` on same bg | 5.428:1 | pass |
| dark-mode pairing (unchanged) | 5.144:1 | pass (left alone) |

No reference sites proposed — there's no visual-direction decision here to justify one.

## Product-fit / error-handling findings (PASS 2 — the higher-value check for this page)

Reviewed the handler logic (`handleCallback`), not just JSX:
- `?error=`/`?error_description=` from the IdP → handled first, synchronously, shown accurately, no `getSession()` call made. Verified live.
- `getSession()` returning a `sessionError` → surfaces the real message, not a fabricated one.
- No session yet (normal async race) → one bounded 1.5s retry, then a generic "Unable to complete sign in" error — not a silent failure. Verified live with the real, unmocked Supabase client against both "no params at all" and a garbage `?code=` value: both resolve cleanly, no crash, no console errors.
- Any unexpected throw → caught, generic message shown, no blank screen/unhandled rejection.
- The page never inspects `code`/hash tokens itself — relies on Supabase client's default `detectSessionInUrl: true` to do PKCE/implicit exchange, confirmed in `apps/web/src/integrations/supabase/client.ts`. Standard documented pattern, not a bug.

**No fabricated/mismatched UI text found.** "Welcome to Rivly!" only renders when a real session exists; the error paragraph always shows the real captured message.

**No product-logic bug found worth escalating** this time (unlike `alarm-ringing`'s `snoozeMinutes` gap). One minor non-blocking observation, noted but not fixed: the two post-success `setTimeout` redirects have no cleanup on unmount (if the user manually navigated away within 1-1.5s, the redirect would still fire). Pre-existing, not visible under normal use, fixing it is unrelated plumbing outside this card's contrast scope.

## TDD Evidence

New file: `apps/web/src/pages/__tests__/AuthCallbackPage.test.tsx` (12 tests — baseline-contract covers the happy path, `?error=`, `sessionError`, retry-recovers, retry-exhausted, unexpected throw, and the "Return to Rivly" nav; redesign covers the 3 contrast sites).

- **RED** (unmodified code): 9 passed / 3 failed. All 9 baseline tests passed (confirming the baseline, including every error/edge-case path, was real before any change). The 3 redesign tests failed on exactly the predicted old `text-muted-foreground` classes.
- **GREEN** (post-fix): 12/12 passed.

## What I implemented

Three `className` changes only: `text-muted-foreground` → `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` on the loading subtext, the success subtext, and the error-message paragraph, plus one inline comment recording the measured ratios. No other line touched — handler logic, retry timing, redirect targets, route export all byte-for-byte unchanged.

## Build + behavioral check

- Full suite: `cd apps/web && npx vitest run` → **31/31 files, 320/320 tests passed**.
- Build: `npm run build` → `✓ built in 11.48s`, no errors; `AuthCallbackPage` chunk 2.71 kB (gzip 1.05 kB).
- Live check: served `dist` via `npx serve -s dist`, drove headless Edge (`msedge.exe --headless=new --remote-debugging-port`) over CDP via Node's native `WebSocket` (Playwright's bundled Chromium is blocked by OS Application Control on this machine — same workaround `alarm-ringing` used).
  - `?error=access_denied&error_description=User+denied+access` → "Sign in failed" / "User denied access", fixed contrast class present, 0 console errors.
  - No params at all (real retry-exhausted path, unmocked Supabase client) → after the real ~2s wait, "Sign in failed" / "Unable to complete sign in. Please try again.", fixed class present, 0 console errors, no crash.
  - `?code=not-a-real-code` (garbage/invalid code — the brief's explicit edge case) → same clean generic error, 0 console errors.
  - No horizontal overflow on any of the three (`scrollWidth === clientWidth`).
  - Success path (real session, "Welcome to Rivly!", hard redirect to `/app`) not re-driven live — requires a real authenticated session, disproportionate for this diff; already verified at the handler level with fake-timer-accurate unit tests asserting `window.location.href === '/app'` after the real 1500ms/1000ms delays.

## Files changed

- `apps/web/src/pages/AuthCallbackPage.tsx` (3 className fixes + 1 comment)
- `apps/web/src/pages/__tests__/AuthCallbackPage.test.tsx` (new)
- `docs/superpowers/cards/auth-callback.md` (state: backlog → merged, handoff recorded)

## Self-review

- Checked error/edge-case paths at the handler level (not just happy path) and verified two of them live against the real unmocked app/Supabase client, per the brief's explicit instruction. Confirmed honestly that this page needs no visual redesign beyond the known shared-token contrast fix — did not manufacture a design direction. Fabrication/mismatch check performed: no false UI claims found. Card file updated and clean (state: merged, handoff filled in with all three passes).

## Concerns

None blocking. The one minor unmount-cleanup observation (PASS 2) is noted in the card for visibility but is not a defect under normal use and is out of this card's scope to fix.
