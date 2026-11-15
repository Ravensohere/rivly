---
id: desktop-control
title: Desktop Control Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below (PASS 1 = audit, PASS 2 = product-fit/verification, PASS 3 = build record) — route /desktop, confirmed deliberately public (AnimatedRoutes.tsx:100-101, "authenticates with the relay device secret, not a Supabase session"). No structural redesign attempted (interactive control-panel page, not a status-display page, but already has a consistent visual system). Found and fixed two real messaging/behavior mismatches (not just copy wordsmithing) plus a shared AA-contrast defect repeated ~19 times across DesktopControlPage.tsx, RemoteConsole.tsx and AssistantPanel.tsx. OfficePanel.tsx's own ~25 text-muted-foreground sites were found but NOT touched — escalated for a future dedicated card, consistent with not expanding scope beyond the components the card named.
---

# Card: Desktop Control Page

This card represents the redesign/verification pass for the Desktop Control Page feature/page in the Rivly web app.

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

### PASS 1 — Audit

`apps/web/src/pages/DesktopControlPage.tsx` (401 lines pre-edit), route `/desktop`.
Confirmed PUBLIC by reading `AnimatedRoutes.tsx:100-101` directly: `{/* Public on
purpose: it authenticates with the relay device secret (see relay.ts), not a
Supabase session. */} <Route path="/desktop" element={<DesktopControlPage />} />`
— unlike every other route in that file, there is no `user ? ... : <Navigate
to="/login">` guard. This matches the card brief's claim and is sensible: the
page's own auth is the paired device secret (relaySettings.ts /
worker/src/routes/relay.ts), not Supabase.

**Scope decision:** this is a genuinely interactive control panel (chat,
terminal panes, git diff viewer, approvals), not a status-display page like
`auth-callback`/`calendar-callback` — but it already has a consistent,
deliberate visual language (rounded-full pills, `bg-card/NN` translucent
cards) carried across its own file and its three sub-components. No
structural redesign was proposed or attempted, per the brief.

**Sub-components read (the card named these explicitly):**
- `apps/web/src/components/desktop/RemoteConsole.tsx` — `usePolled`,
  `TerminalsPanel`, `ApprovalsPanel`, `PaneView`, `DiffText`.
- `apps/web/src/components/desktop/AssistantPanel.tsx` — chat UI styled
  after a separate "Flowzo" Figma reference (literal `neutral-*` grays on a
  `bg-white` card, not the shared `--muted-foreground` token).
- `apps/web/src/components/desktop/OfficePanel.tsx` — read for context
  (imports `usePolled` from RemoteConsole) but not named by the card brief;
  see "Explicitly NOT touched" below.

**Cross-file impact — grep, not assertion.**
```
$ grep -rln "AssistantPanel|TerminalsPanel|ApprovalsPanel|usePolled|OfficePanel" apps/web/src
apps/web/src/pages/DesktopControlPage.tsx
apps/web/src/components/desktop/RemoteConsole.tsx
apps/web/src/components/desktop/OfficePanel.tsx
apps/web/src/components/desktop/AssistantPanel.tsx
```
All four sub-components are imported ONLY by `DesktopControlPage.tsx` (or, for
`usePolled`, by `OfficePanel.tsx` internally) — no other page shares them, so
every edit below is contained to this one page's feature surface. Confirmed
separately that `DesktopControlPage` itself has exactly one consumer
(`AnimatedRoutes.tsx`'s lazy route) plus an unrelated standalone Vite preview
entry point (`apps/web/src/desktop-control-preview-main.tsx`, a dev-only
`createRoot(...).render(<DesktopControlPage />)` with no router — not a
production consumer, not touched).

**Finding 1 — two confirmed messaging/behavior mismatches (fabrication-class, not wordsmithing), found by reading the actual call chains, not guessed:**

1. The offline banner (`DesktopControlPage.tsx`) said unconditionally:
   *"Desktop offline — commands will wait until it reconnects."* Reading
   `cloudRelay.ts::sendCommand` confirms this is TRUE for cloud mode — it
   POSTs to the Worker's `/commands` route, which creates a `pending` row
   server-side regardless of whether the desktop is currently polling; the
   desktop genuinely picks it up whenever it reconnects. But reading
   `localDesktop.ts::sendCommand` confirms this is FALSE for local mode — it
   is a bare `fetch(`${LOCAL_DESKTOP_URL}/voice/command`, ...)` straight to
   the desktop backend with no queue of any kind; if the backend is down the
   fetch just throws and `send()`'s catch block shows an error, nothing
   "waits." This is exactly the kind of disconnected-state fabrication the
   card flagged as a risk given this page's history. Fixed: the banner copy
   is now mode-aware (see PASS 3's GREEN test for the exact strings).
2. `AssistantPanel.tsx`'s header status line hardcoded `'Online on your PC'`
   as its default branch whenever not listening/busy/talking — with **no
   connectivity check of any kind** (the component didn't even receive an
   online/offline prop). Since `DesktopControlPage` renders `AssistantPanel`
   whenever `ctx` is truthy (paired/configured), not when `online` is true,
   a user could see the page's own top-level "Desktop offline" banner and
   then switch to the Assistant tab and see a contradicting "Online on your
   PC" claim. Fixed: threaded the page's already-computed `online` boolean
   into `AssistantPanel` as a new required prop; the status line now reads
   `'Offline — start the assistant on your PC'` when not actually reachable.
   Confirmed by grep this prop has exactly one caller (`DesktopControlPage`),
   so this is not a breaking change for any other consumer.

**Finding 2 — a repeated AA-contrast defect (same shared token, same class as 3 prior cards), 19 sites across 3 files, each hand-verified before touching:**

`text-muted-foreground` (light mode `hsl(230,10%,48%)`) sitting on this
page's flat `bg-background` (`hsl(38,35%,96%)`, `#F5F3EE`) measures ≈4.3–4.4:1
— below the 4.5:1 AA floor for normal-size text — the identical defect
already fixed on `calendar-callback`/`alarm-ringing`/`auth-callback`. Unlike
`day-planner` (which found the *opposite*: its two sites sat on full-opacity
`bg-card`, which passes), this page's sites sit on either plain
`bg-background` or a `bg-card/40`–`bg-card/60` translucent card over that
same flat background — both cleanly computable (solid colors + a known alpha
blend, not a gradient), and both measured as FAILS:

- `bg-card/60` over `bg-background`: alpha-composite `rgb(251,250,248)*0.6 +
  rgb(245,243,238)*0.4 ≈ rgb(249,247,244)`, luminance ≈0.932; contrast vs
  `text-muted-foreground` (luminance ≈0.171) ≈ **4.45:1** — fails, barely.
- `bg-card/40` over `bg-background` ≈ `rgb(247,246,242)`, luminance ≈0.90;
  contrast ≈ **4.3:1** — fails.
- Plain `bg-background` ≈ **4.3–4.4:1** — fails (same number as the 3 prior
  cards' finding, small variance from rounding the token's hex vs computed
  HSL→RGB).

Fixed all of these — 15 sites across `DesktopControlPage.tsx` (7) and
`RemoteConsole.tsx` (8) — with the exact already-verified replacement from
the 3 prior cards: `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`
(luminance ≈0.129; recomputed contrast against this page's specific
backgrounds ≈5.3–5.5:1, comfortably passing AA; the dark-mode value is
literally unchanged from `--muted-foreground`'s own dark value, confirming
dark mode was never failing). Decorative/icon-only `text-muted-foreground`
uses (status dots, the `TerminalSquare` icon) were left alone — icons need
only 3:1 and already clear it easily, and changing them would be scope creep
for zero accessibility benefit.

**One site needed a different fix, not the shared token:** `DiffText`'s
default/unchanged-line color in `RemoteConsole.tsx` renders on a near-black
`bg-black/80` `<pre>` (a code/diff pane, not the page background) — its
sibling colors in the same ternary (`text-green-400`/`text-red-400`/
`text-sky-400`) are already chosen for this dark backdrop. Using the
light-background fix token there would make it WORSE (even darker on a near-
black bg). Computed: `text-muted-foreground` here ≈**2.74:1** (badly fails);
`text-gray-400` (matching its "-400" siblings) ≈**5.13:1** on the same
`rgb(49,49,48)`-ish effective background. Fixed to `text-gray-400`.

**`AssistantPanel.tsx`'s own 3 sites use literal Tailwind grays, not the
shared token, on a flat `bg-white` card — also hand-verified:** `text-
neutral-400` (`rgb(163,163,163)`) on white ≈**2.52:1** (fails badly);
`text-neutral-500` (`rgb(115,115,115)`, already used elsewhere in this same
file on the same white bg) ≈**4.73:1** (passes). Bumped the 3 failing sites
(a turn-footer label, the "is thinking…" indicator, and the message input's
placeholder) from `-400` to `-500` — the smallest fix, reusing a shade this
file already proved passes rather than introducing a new color.

**Explicitly NOT touched — escalated, not fixed, per the brief's scope
discipline:**
- `OfficePanel.tsx` has ~25 of its own `text-muted-foreground` sites. It
  wasn't one of the components the card brief named (TerminalsPanel/
  RemoteConsole/AssistantPanel were), it's a large (870+ line) file with its
  own card/list/dialog patterns not audited here, and fixing 25 sites in an
  unaudited file is a different-sized task than this card's scope. Flagging
  for a **future dedicated card**: audit and fix `OfficePanel.tsx`'s own
  muted-text contrast the same way this card did for its three siblings.
- The brief's own prior-investigation note about `TerminalsPanel`'s "the
  terminal app isn't running on your PC" banner was re-verified against the
  actual code path (`shellConnected === false` only renders once `GET
  /system/status` has actually succeeded — i.e., the backend process IS
  reachable but its shell/pty subsystem specifically isn't) — confirmed
  accurate as designed, not touched.
- The brief's `online` default-to-true-before-first-presence-check behavior
  (`presence.error ? false : (presence.data ?? true)`) is a deliberate,
  commented tradeoff ("assume reachable so the UI isn't greyed out on
  load"), not a fabrication — left as-is.
- Raw network-error strings (e.g. `commandsPoll.error` rendering a literal
  `"Failed to fetch"` when the local backend is unreachable — confirmed live
  in the PASS 3 build check below) are honest (not fabricated) but
  unpolished UX. Not fixed here — it's a different, larger "error message UX"
  concern than this card's messaging-accuracy and contrast scope, flagged
  as a future improvement, not a defect this card was asked to fix.
- No dead code found in `DesktopControlPage.tsx` itself — every import
  resolves to at least one real use; this file is comparatively recent/dense
  (401 lines) and didn't carry the kind of pre-redesign leftovers `day-
  planner` found.

### PASS 2 — Product-fit / verification

**Disconnected-state honesty — the core ask for this card — re-verified
end-to-end against the real code paths, not assumed:**
- Unpaired + no local backend configured → `PairingForm` renders, no fake
  connected state, no crash. Confirmed by test and by the component's own
  `active = ctx !== null` gate.
- Paired/configured but unreachable (the common real-world case given the
  backend's history of not running) → top banner now says the accurate,
  mode-specific thing (see Finding 1); `AssistantPanel` now says the
  accurate thing too, instead of contradicting the banner.
- `TerminalsPanel`'s `ShellBanner` ("the terminal app isn't running on your
  PC...") re-confirmed accurate for the one state it actually renders in
  (see PASS 1 "Explicitly NOT touched").
- Re-read every other stateful/numeric claim in `DesktopControlPage.tsx`:
  the approvals-count tab badge, the command-row status dot/label, the
  command summary text — all trace to real polled data (`usePolled` results
  or the real `commands`/`approvals` arrays), never a hardcoded placeholder
  presented as live data. No other fabrication found.

**Verdict: APPROVED, scope as proposed in PASS 1** — 2 messaging/behavior
fixes (both confirmed via reading the actual network/queue code, not
guessed), 19 AA-contrast fixes (all hand-computed, see PASS 1 math) across 3
files, zero structural/layout changes, zero new dead code. `OfficePanel.tsx`
contrast audit escalated for a future card rather than expanded into here.

### PASS 3 — Build / verification record

- **Test file:** new `apps/web/src/pages/__tests__/DesktopControlPage.test.tsx`
  (15 tests) — the page had no test file before this card. Every direct
  child component is stubbed (including a controllable `usePolled` mock
  keyed by each call site's distinct, literal `intervalMs` — 2500/8000/
  15000/3000-or-10000 — since the real hook is called 4 times per render
  with different roles), and every lib hook/module `DesktopControlPage`
  calls directly is module-mocked, per the same discipline as
  `DayPlanner.test.tsx`.
- **Baseline run against the unmodified file: 9/15 passed, 6 failed (RED),
  exactly as expected** — the 6 failures were precisely the behaviors this
  card set out to fix: the local-mode offline-copy mismatch, both
  AssistantPanel `online` prop assertions (prop didn't exist yet), and the 3
  contrast-class assertions. The other 9 (pairing form, pairing submit, cloud
  offline banner's existing-correct copy, command rows/empty state, send via
  Enter, tab switching, approvals badge count) passed unmodified — confirming
  the baseline the fixes build on top of.
- **Implementation:** see PASS 1 Findings 1 and 2 for the full fix list.
- **GREEN after implementation: 15/15 passed.**
- **Full suite:** `cd apps/web && npx vitest run` → **34/34 files, 362/362
  tests passed** (run alone, not concurrently with the build).
- **Build:** `npm run build` → `✓ built in 11.78s`, no errors;
  `DesktopControlPage` chunk **57.69 kB (gzip 15.35 kB)**.
- **Visual/behavioral check — both states, against the real built app:**
  built `dist` served locally (`npx serve -s dist -l 4321`), driven over CDP
  in headless Edge (`msedge.exe --headless=new`, Node's native `ws` client
  against the DevTools Protocol — Playwright's bundled Chromium is blocked by
  OS Application Control on this machine, and the `chrome-devtools` MCP
  server failed to connect this session; same approach as `day-planner`).
  - This machine's `.env`/`apps/web/.env` has `VITE_LOCAL_DESKTOP_URL=
    http://127.0.0.1:8765` baked into every build (same real config the
    original "black terminal" bug report was filed against) and the headless
    browser has no route to that port, so this build-level check landed
    directly on the **real local-mode offline state** — not a contrived one:
    `/desktop` rendered **"Desktop offline — start the assistant on your PC
    to send commands"** (the new, accurate, mode-aware copy from Finding 1),
    confirmed 0 console errors/exceptions and no horizontal overflow
    (`scrollWidth === clientWidth`, 485/485). Clicking the Assistant tab (via
    a real DOM click dispatched over CDP, not a stub) rendered the real
    `AssistantPanel` component showing **"Offline — start the assistant on
    your PC"** — confirming Finding 2's fix live, not just in the mocked
    test. A screenshot of the Commands-tab default state was captured and
    visually confirmed clean (no overflow, no layout break, the fixed-
    contrast text legibly darker than the page background).
  - The unpaired/no-local-backend `PairingForm` state cannot be reached from
    this one fixed build (the env var is baked in at build time) — that
    state is instead confirmed by the first 2 tests in the suite, which
    render the real, unmocked `DesktopControlPage` component logic.
- **Primary interaction verified:** the Commands tab's real command-send
  path (`cloudRelay.sendCommand` called with the typed text via Enter),
  tab switching (Office/Terminals/Assistant, each rendering its real child
  with the correct props — `shellConnected`, `online`), and the approvals
  pending-count badge are all confirmed against real component logic via the
  test suite; the offline-messaging fixes are additionally confirmed live
  against the real built app above.

**Escalations for a future dedicated card (not actioned here):**
1. `OfficePanel.tsx`'s own ~25 `text-muted-foreground` sites — same class of
   AA-contrast defect fixed on its three sibling components in this card,
   but out of this card's named scope and this file's size/complexity
   warrants its own audit pass.
2. Raw network-error strings surfacing verbatim in the UI (e.g. "Failed to
   fetch") when a backend call fails — honest, not fabricated, but
   unpolished; worth a dedicated error-message UX pass across this page's
   several `usePolled`/`desktopCall` call sites.
