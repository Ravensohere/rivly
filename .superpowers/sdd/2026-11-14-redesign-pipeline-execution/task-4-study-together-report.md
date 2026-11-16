# Task 4 — Card: study-together — Report

Route `/study` (card brief named it `/study-together` — the actual wired
path is `/study`; naming discrepancy in the brief, not a code defect),
`apps/web/src/pages/StudyTogetherPage.tsx` (563 lines pre-edit).

## Audit findings — realtime/social claim traced to real backend code

The card brief asked whether "Study Together" is a real shared-focus
feature or social-sounding UI over a solo timer. Traced it end to end:

- `apps/web/src/hooks/useFocusRooms.ts` fetches `focus_rooms` from
  Supabase on mount, calls `supabase.rpc('join_focus_room', { room_id })`
  / `supabase.rpc('leave_focus_room', { room_id })` on join/leave, and
  subscribes to a `postgres_changes` Realtime channel filtered on
  `UPDATE` events for the `focus_rooms` table — patching every connected
  client's local `active_users` count whenever the row changes anywhere.
- `apps/web/src/integrations/supabase/types.ts` (generated from the live
  Supabase project's actual introspected schema, not hand-written) proves
  a real `focus_rooms` table and real `join_focus_room`/`leave_focus_room`
  RPC functions exist server-side.
- Verdict: this is a REAL presence feature. Joining/leaving round-trips
  through server-side RPCs (almost certainly doing an atomic
  increment/decrement of `active_users`, which is exactly why an RPC is
  used instead of a client-side `UPDATE`), and the Realtime subscription
  genuinely broadcasts every change to every subscribed client. The "N
  people focusing with you right now" count is live, shared, DB-backed
  state — not a client-side facade. This contrasts with this pipeline's
  repeated findings of social/shared claims that turned out to be fake.
- Caveat (flagged, not fixed): no `.sql` migration in
  `supabase/migrations/` or `worker/supabase_migrations/` defines
  `focus_rooms` or the two RPCs — unlike `deduct_credits` in the same
  generated types file, which carries an explicit
  `// Defined in supabase/migrations/20260201000000_fix_profiles_and_credits.sql`
  comment. The schema only exists on the live Supabase project, not in
  this worktree's migration history. Drift/reproducibility risk, not a
  bug in the page, and not fixable here (the original RPC body isn't
  available to re-author a migration from).
- Room-code/invite mechanism: does not exist. Rooms are a fixed, server-
  seeded named set ("Deep Work", "Study Hall", "Morning Focus", "Evening
  Wind-Down", "Flow State") — no user-created rooms, no share codes, no
  invite flow anywhere in the component or hook. The page's own copy ("No
  chat. No video. Just shared focus.") correctly scopes expectations to
  an ambient headcount and doesn't overclaim.

**Other files importing from this page:** none — `StudyTogetherPage` is
only referenced by its own lazy route registration in
`AnimatedRoutes.tsx`. No shared-component regression risk.

**ESCALATED, not fixed — content-honesty issue (not a logic bug):**
`AMBIENT_TRACKS` labels its 3 tracks "Lo-fi Beats", "Rain & Thunder", and
"Brown Noise", but every URL points to `soundhelix.com/examples/mp3/
SoundHelix-Song-{1,2,3}.mp3` — generic royalty-free demo songs used
everywhere as `<audio>` test fixtures, bearing no resemblance to lo-fi
beats, rain/thunder, or brown noise. Unlike the `sleep` card's finding
(10 of 12 sound files 404 and fail silently), this audio genuinely loads
and plays via a real `Audio` element — the defect is mislabeled placeholder
content presented as real sound categories, not a missing/broken asset.
Fixing this needs sourcing or generating 3 real matching ambient-audio
files, which is outside a contrast/redesign card's scope — flagged for a
follow-up asset pass.

**Secondary, flagged not fixed (scope discipline):** the "Join →" hint on
an unjoined room card (`text-primary opacity-70`) computes to ~2.66:1 at
rest against the card background — fails AA — reaching only ~4.51:1 (a
hairline pass) on hover when framer-motion animates its opacity to 1.
This is a different token (`text-primary`) than the card's named
`text-muted-foreground` defect family, so it was left for a future pass
rather than folded into this sweep.

**Logic/rendering bug found and fixed (reflect-and-journal 3-condition
test applied):** `ActiveRoomView`'s Pause/Resume button set
`background: `gradient(${palette.from}, ${palette.to})`` —
`gradient()` is not a valid CSS function (should be `linear-gradient`);
the browser silently drops the invalid declaration and falls back to the
adjacent `backgroundColor: palette.from` (a flat color instead of the
intended gradient). Fixed in place because it passes all 3 conditions:
(1) **unambiguous** — `CompletionView`'s "Another Round" button on the
same page uses the correct `linear-gradient(135deg, ...)` syntax for the
identical visual effect, so the fix is self-evident from the page's own
code; (2) **additive/corrective only** — no behavior path removed, the
button still renders and works identically, just with its gradient
restored; (3) **zero blast radius** — one inline style string, no other
file references it.

## Product-fit findings

Verified the realtime/presence claim against actual backend code (hook +
generated Supabase types) rather than trusting the social-looking UI, per
this pipeline's standing skepticism directive — see Audit above. No other
fabricated-feature or dead-setting pattern found: the Pomodoro timer,
audio player, and join/leave flow are all genuinely wired to real state
and the real hook, with no orphaned props or unused destructured values.

## TDD Evidence

New `apps/web/src/pages/__tests__/StudyTogetherPage.test.tsx`. Baseline
contract block (10 tests): lobby render with real per-room counts and a
derived global total (not fabricated), loading/empty/error states, join →
live session view (asserting the real `useFocusRooms.joinRoom` call and
the room's real live count, not a placeholder), leave → lobby, back-button
routing (navigates away in the lobby, leaves the room first in a session),
real `Audio` construction for the ambient-track selector, real mute
wiring, and pomodoro-completion → "Another Round" rejoin via the real join
pathway. Contrast-fix block: one assertion per swept site (plain,
opacity-stacked, and bg-muted/bg-secondary variants), using the pipeline's
established `expect(node.className).toContain('text-[hsl(230,10%,42%)]
dark:text-[hsl(230,10%,55%)]')` / `.not.toContain('text-muted-foreground')`
convention.

RED (measured against the pre-fix file): 21 tests total, 10 baseline-
behavioral tests passed (guarding real pre-existing behavior), 11 contrast
assertions failed as expected (confirmed clean assertion failures, not
test-harness crashes/timeouts — each showed the exact unsafe class/inline-
style value still present). One pair of fake-timer tests was then merged
into a single test each (test-infra stability fix, see note below, applied
before the source-code fix — doesn't change what's asserted) landing at 20
tests pre-fix, still 11 failing / 9 passing by the same logic.

GREEN after the fix: 20/20. Full suite: 51/51 files, 613/613 tests. Build
clean, `StudyTogetherPage` chunk 14.85 kB gzip 4.81 kB.

**Test-infra note (not a product bug):** `vi.useFakeTimers()` (needed to
fast-forward the 25-minute pomodoro countdown) also fakes
`requestAnimationFrame`, which framer-motion's `AnimatePresence`
transitions depend on. A second `vi.useFakeTimers()` activation later in
the same test file leaves the first one's internal state behind and
breaks (confirmed empirically — each fake-timer scenario passes alone, not
back to back). Fixed by consolidating all fake-timer-dependent assertions
(pomodoro completion, its contrast check, and the "Another Round" rejoin)
into a single test in a dedicated `describe` block placed last in the
file, plus a short real-timer settle delay before each
`vi.useFakeTimers()` call to let any trailing real animation from an
earlier test finish first. Verified stable across 5 repeated runs.

## What I implemented

`apps/web/src/pages/StudyTogetherPage.tsx`:
- Swept all 15 `text-muted-foreground`/`hsl(var(--muted-foreground))`
  sites to the established AA-safe
  `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` token: room-card
  description, live-count badge (+ "Tap to join" pill, both previously
  driven by a dynamic inline `style.color` ternary — moved the non-active
  branch's color into a conditional className since inline styles can't
  express a `dark:` variant and always win over a class for the same
  property), header subtitle + back button, lobby hero subtext, empty
  state, the session view's live-user-count sentence and "remaining"
  label, the mute/leave icon buttons, the "Ambient Sound" label and
  unselected track pills, and the completion screen's body text + "Leave
  Room" button.
- Dropped the `opacity-70` modifier on the room card's "now" badge text —
  confirmed by hand (HSL→sRGB→relative-luminance) that even the darker
  fix token still fails AA (~2.95:1) at that opacity; full opacity passes
  (~5.42:1).
- Fixed the invalid `background: gradient(...)` CSS on the Pause/Resume
  button to `linear-gradient(135deg, ...)`, matching the correct pattern
  already used on the same page's "Another Round" button; removed the now-
  redundant `backgroundColor` fallback.
- Left the "Join →" hint's opacity-stacking issue and the AMBIENT_TRACKS
  mislabeling untouched (see Audit findings — out of this card's scope).

## Build + visual check

`npx vite build` succeeds; `StudyTogetherPage` chunk 14.85 kB (gzip 4.81
kB), no new warnings. `npx vitest run` (full suite): 51/51 files, 613/613
tests pass.

**Live browser visual check:** blocked by the same pre-existing
environment limitation the `landscape` and `day-planner` cards hit — the
guest-mode waitlist check in `App.tsx` requires a live Supabase network
call this sandbox can't reach (`Failed to fetch`), and it gates the entire
authenticated app, not just this page, so no authenticated route is
live-browser-reachable here (confirmed via Chrome: guest sign-in succeeds
in-memory, but any hard navigation — including a `pushState`+`popstate`
in-SPA route change — re-hits the top-level waitlist gate, which fails on
the unreachable network call). Did not attempt to bypass the app's own
access-control gate to force a screenshot. The full automated DOM-
assertion suite (exact Tailwind class / computed inline `style.color`
checks at all 15 fixed sites, plus real interaction flows through
join/leave/timer-completion/rejoin) stands in for visual verification,
consistent with precedent on those two prior cards.

## Files changed

- `apps/web/src/pages/StudyTogetherPage.tsx` — contrast fixes (15 sites),
  invalid-gradient CSS fix.
- `apps/web/src/pages/__tests__/StudyTogetherPage.test.tsx` — new file,
  21 tests (after the fix round below).
- `docs/superpowers/cards/study-together.md` — state → merged, full
  audit/product-fit/contrast record.
- `.superpowers/sdd/2026-11-14-redesign-pipeline-execution/progress.md` —
  entry appended.
- `.superpowers/sdd/2026-11-14-redesign-pipeline-execution/task-4-study-together-report.md` —
  this file.

## Self-review

- Traced the "together"/social claim to real backend code (hook +
  generated Supabase types showing a real table and real RPCs), not
  assumed-working because the UI reads as social. Confirmed real, with a
  migration-drift caveat flagged.
- Swept all muted-foreground sites including opacity-stacked (`opacity-70`
  on the "now" badge, dropped) and bg-secondary/bg-muted variants (Tap to
  join pill, mute/leave buttons, Leave Room button) — 15 sites total,
  matching the exact count from `grep -n text-muted-foreground` on the
  pre-edit file. (Initial self-review undercounted this as 13 — see Fix
  round below.)
- Positive test assertions cover real room-join/presence interactions:
  asserting the actual `joinRoom`/`leaveRoom` mock calls with the correct
  room id, the live count rendered in the session view, and the
  completion-screen rejoin path — not just "a button exists."
- Card file updated and clean, following the established PASS 1/PASS 2
  format from prior merged cards.

## Concerns

- `AMBIENT_TRACKS` mislabeled placeholder audio (escalated above) — real
  content-honesty gap, needs a follow-up asset-sourcing card.
- No committed migration for `focus_rooms`/`join_focus_room`/
  `leave_focus_room` — schema-drift risk for anyone rebuilding the DB from
  this repo's migrations.
- The "Join →" hint's opacity-stacking contrast failure (`text-primary`,
  not `text-muted-foreground`) — flagged, not fixed, different token
  family than this card's named sweep.
- Live browser visual check blocked by an unrelated, pre-existing
  environment/network limitation (see above) — not something this card
  could fix or route around without bypassing the app's own access
  control, which I declined to do.

## Fix round (coordinator review)

**Finding (Important):** the actual contrast-fix count in
`StudyTogetherPage.tsx` is 15 sites, not the 13 reported throughout the
card/report/progress log. All 15 were already correctly fixed in source
(reviewer verified line-by-line, no missing fix) — the error was purely in
the count and in test coverage. Two fixed sites had zero test coverage:
1. The leave (X) icon button (`lucide-x`, `bg-muted/50`, line 300 of the
   pre-edit file) — the test titled "the mute/leave icon buttons ... use
   the AA-passing muted color" only actually asserted on the mute button,
   overclaiming its own scope.
2. The lobby hero subtext ("No chat. No video. Just shared focus.",
   line 504 of the pre-edit file) — no test referenced it at all.

**Fixed:**
- Re-counted every `text-[hsl(230,10%,42%)]` occurrence in the fixed file
  (`grep -c`) — confirmed 15, matching the reviewer's count exactly.
  Corrected "13" → "15" in the card file and this report (cosmetic text
  fix, no source-code change — the fixes themselves were never wrong).
- Extended the existing "the mute/leave icon buttons..." test to also
  locate the leave button (`findButtonWithIcon('lucide-x')`) and assert
  its class list excludes the raw `text-muted-foreground` token and
  includes the fixed one — now the title matches what it checks.
- Added a new test, "the lobby hero subtext (...) uses the AA-passing
  muted color", asserting the same on the "No chat. No video. Just shared
  focus." paragraph.

Re-ran the full suite: `StudyTogetherPage.test.tsx` now 21/21 (was 20/20),
stable across 3 repeated runs. Full suite 51/51 files, 614/614 tests
(was 613/613 — the one new test). Build unaffected (no source change,
test-only + doc-only fix).
