---
id: study-together
title: Study Together Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/StudyTogetherPage.tsx (route /study, not /study-together as the original card brief named it — confirmed in AnimatedRoutes.tsx:98, linked from FocusSetup.tsx; auth-gated, 563 lines pre-edit). Social/realtime claim traced and found REAL: useFocusRooms.ts wires a real Supabase `focus_rooms` table, real `join_focus_room`/`leave_focus_room` RPCs (server-side atomic active_users increment/decrement), and a real `postgres_changes` Realtime subscription broadcasting every room's live count to all connected clients — not a client-side facade. Caveat: no committed .sql migration defines this schema (unlike e.g. deduct_credits, which is annotated with its migration file in the generated types.ts) — drift risk, not a bug, out of scope. No room-code/invite mechanism exists (fixed named rooms only); page copy ("No chat. No video. Just shared focus.") accurately describes the real capability. ESCALATED (not fixed): the 3 "ambient sound" tracks (Lo-fi Beats/Rain & Thunder/Brown Noise) all point to generic royalty-free SoundHelix demo songs that don't match their labels at all — audio genuinely plays (unlike the sleep card's missing files), but the content is mislabeled placeholder data presented as real sound categories. Contrast audit: 15 text-muted-foreground sites swept (plain, opacity-stacked via `opacity-70` on two sites, and bg-muted/bg-secondary variants) — all 15 fail AA in light mode against this page's warm-pastel tokens (~4.0-4.4:1), all pass in dark mode already; fixed with the established `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` token, dropping the `opacity-70` modifier on the live-count "now" badge since it still failed AA even with the darker token. Also fixed 1 real CSS bug (not contrast): the Pause/Resume button's `background: gradient(...)` used an invalid CSS function name (should be `linear-gradient`), silently falling back to a flat color — one-line fix to match the identical pattern used correctly elsewhere on the same page (CompletionView's "Another Round" button).
---

# Card: Study Together Page

This card represents the redesign/verification pass for the Study Together Page feature/page in the Rivly web app.

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

### PASS 1 — Audit (realtime/social claim + route wiring)

Route confirmed in `AnimatedRoutes.tsx:22` (lazy import) and `:98`
(`<Route path="/study" element={user ? <StudyTogetherPage /> : <Navigate to="/login" replace />} />`),
linked from `FocusSetup.tsx:238`. Note: the card brief named the route
`/study-together` — the actual wired path is `/study`; this is a naming
discrepancy in the brief, not a code defect (the route itself works).

**The "together" claim, traced to real backend code** (this pipeline's
recurring category of failure — checked skeptically per the card brief):
- `apps/web/src/hooks/useFocusRooms.ts` calls `supabase.from('focus_rooms').select('*')`
  on mount, `supabase.rpc('join_focus_room', { room_id })` /
  `supabase.rpc('leave_focus_room', { room_id })` on join/leave, and
  subscribes to a `postgres_changes` channel (`focus_rooms_live`) filtered
  on `UPDATE` events for the `focus_rooms` table, patching every connected
  client's local state when any row changes.
- `apps/web/src/integrations/supabase/types.ts` (generated from the live
  Supabase project's actual schema) confirms a real `focus_rooms` table
  (`active_users`, `timer_end_at`, etc.) and real `join_focus_room(room_id)`
  / `leave_focus_room(room_id)` RPC functions exist server-side.
- Conclusion: joining/leaving genuinely round-trips through the DB via
  RPC, the RPCs almost certainly do the atomic active_users increment/
  decrement server-side (that's the whole reason to use an RPC instead of
  a client-side UPDATE), and the Realtime subscription genuinely
  broadcasts each change to every subscribed client. The "N people
  focusing with you right now" count is live, shared, DB-backed state —
  a REAL presence feature, not social-sounding UI over a solo timer.
- Caveat, flagged not fixed: no `.sql` migration in this repo's
  `supabase/migrations/` or `worker/supabase_migrations/` defines
  `focus_rooms` or the two RPCs — contrast with `deduct_credits` in the
  same generated types file, which carries an explicit
  `// Defined in supabase/migrations/20260201000000_fix_profiles_and_credits.sql`
  comment. The schema exists only on the live Supabase project, not in
  this worktree's migration history — a reproducibility/drift risk if the
  DB were ever rebuilt from these migrations, not a bug in the page and
  not fixable here (the original RPC body isn't available to re-author).
- Room-code/invite mechanism: does not exist. Rooms are a fixed named set
  (`Deep Work`, `Study Hall`, `Morning Focus`, `Evening Wind-Down`,
  `Flow State`) seeded server-side — no user-created rooms, no share
  codes, no invite flow anywhere in this component or its hook. The page's
  own copy ("No chat. No video. Just shared focus.") sets the right
  expectation (ambient headcount only) and doesn't overclaim.

**Other files importing from this page:** none — `StudyTogetherPage` is
only referenced by its lazy route registration in `AnimatedRoutes.tsx`.

**ESCALATED, not fixed (content-honesty, not a logic bug):**
`AMBIENT_TRACKS` labels 3 tracks "Lo-fi Beats", "Rain & Thunder", and
"Brown Noise", but all 3 URLs point to `soundhelix.com/examples/mp3/
SoundHelix-Song-{1,2,3}.mp3` — generic royalty-free demo songs used
everywhere as `<audio>` test fixtures, none of which resemble lo-fi beats,
rain/thunder, or brown noise. Unlike the `sleep` card's finding (10/12
sound files literally 404 and fail silently), this audio genuinely loads
and plays — the defect here is mislabeled placeholder content presented
as real sound categories, not a missing asset. Fixing this needs sourcing
or generating 3 real matching ambient-audio assets, which is outside a
contrast/redesign card's scope; flagging for a follow-up card or asset
pass.

**Secondary, not fixed (same reasoning, scope):** the "Join →" hint on an
unjoined room card (`text-primary opacity-70`, not `text-muted-foreground`)
computes to ~2.66:1 at its resting opacity against the card background —
fails AA — and only reaches ~4.51:1 (a hairline pass) on hover when
framer-motion animates its opacity to 1. This is a different token
(`text-primary`, not the shared `muted-foreground` defect this card's
sweep targeted) and is flagged here rather than fixed, to avoid scope
creep beyond the named defect family; a future contrast pass should
address it (e.g. raise the resting opacity, or stop relying on opacity
for a contrast-critical hint).

**Logic/rendering bug found and fixed (trivial, same file, reflect-and-journal 3-condition test applied):**
`ActiveRoomView`'s Pause/Resume button set
`background: \`gradient(${palette.from}, ${palette.to})\`` — `gradient()`
is not a valid CSS function (should be `linear-gradient`), so the browser
silently drops that declaration and falls back to the adjacent
`backgroundColor: palette.from` (a flat color, not the intended gradient).
Meets all 3 conditions for fixing in place rather than escalating:
(1) unambiguous — `CompletionView`'s "Another Round" button on the same
page uses the correct `linear-gradient(135deg, ...)` syntax for the
identical visual effect, so the intended fix is self-evident from the
page's own code, no judgment call needed; (2) additive/corrective only —
no behavior path removed, the button still renders and functions
identically, just with its intended gradient restored; (3) zero blast
radius — one inline style string in one component, no other file
references it. Fixed by matching the working pattern.

### PASS 2 — Product-fit

Verified the realtime/presence claim above against actual backend code
rather than assuming it worked because the UI reads as social (this
pipeline's standing skepticism directive). No other fabricated-feature or
dead-setting patterns found on this page — the Pomodoro timer, audio
player, and join/leave flow are all genuinely wired to real state and the
real hook, with no orphaned props or unused destructured values.

### Contrast sweep

15 `text-muted-foreground` / `hsl(var(--muted-foreground))` sites found
(`grep -n` on the pre-edit file), covering plain text, two opacity-stacked
sites (`opacity-70` on the room-card "now" badge text, compounding an
already-borderline color), and `bg-muted`/`bg-secondary`-backed sites
(the "Tap to join" pill, the mute button, the leave (X) button, the
"Leave Room" button). All 15 computed to ~4.0-4.4:1 in light mode against
this page's warm-pastel `--background`/`--card`/`--muted`/`--secondary`
tokens (all near-white, ~0.92-0.95 relative luminance) — failing AA's
4.5:1 threshold for normal text — and ~5.0-5.4:1 in dark mode, already
passing (same light-mode-only pattern established on `alarm-ringing` and
others). Fixed with the established
`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` token at every
site. The "now" badge's `opacity-70` was dropped entirely (not just
recolored) after confirming the darker token still fails at that alpha
(~2.95:1) — the same "drop the alpha" lesson from `login`/`learn`. Two
sites used dynamic inline `style` color driven by a JS ternary
(`isActive ? palette.pulse : 'hsl(var(--muted-foreground))'`) rather than
a static className — inline `style` always wins over a class for the same
CSS property, so the fix moves the non-active branch's color into a
conditional className instead of trying to express a `dark:` variant
inline (which inline styles can't do).

New `StudyTogetherPage.test.tsx`: baseline contract (lobby render with
real per-room counts, loading/empty/error states, join → session →
pomodoro-completion → rejoin/leave, back-button routing, and real `Audio`
construction/mute wiring for the ambient-track player) + contrast-fix
block. RED 11/21 baseline before the fix (10 behavioral baseline tests all
passed pre-fix as expected; 11 contrast assertions failed as expected),
GREEN 20/20 after (one pair of fake-timer tests merged into a single test
during the RED phase for test-infra stability, net 20 tests). **Review fix
round:** reviewer found the contrast-fix count undercounted (13 reported,
15 actually fixed in source — no missing *fix*, only a missing *count* and
2 missing *test assertions*): the leave (X) button test only actually
checked the mute button despite its title claiming both, and the lobby
hero subtext ("No chat. No video. Just shared focus.") had no test at
all. Fixed: extended the mute/leave test to assert the leave button's
fixed color too, added a dedicated hero-subtext test. 21/21 green.
Full suite 51/51 files, 614/614 tests. Build clean, StudyTogetherPage
chunk 14.85 kB gzip 4.81 kB.

**Live visual check:** blocked by the same pre-existing environment
limitation `landscape` and `day-planner` hit — the guest-mode waitlist
check (`App.tsx`) requires a live Supabase network call this sandbox can't
reach, and it gates the entire authenticated app (not just this page), so
no authenticated route is live-browser-reachable here. Build + the full
automated DOM-assertion suite (exact Tailwind class / computed inline
`style.color` checks at all 15 fixed sites, plus real interaction flows)
stand in for visual verification, consistent with precedent on those two
prior cards.
