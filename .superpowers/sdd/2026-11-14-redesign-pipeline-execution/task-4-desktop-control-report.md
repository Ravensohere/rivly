# Task 4 Report — Card: desktop-control

Route `/desktop`, `apps/web/src/pages/DesktopControlPage.tsx` (401 lines pre-edit).
Confirmed deliberately PUBLIC (`AnimatedRoutes.tsx:100-101`, no `user ? ... :
<Navigate to="/login">` guard, with an explicit comment: "it authenticates
with the relay device secret, not a Supabase session"). Sub-components named
by the card and reviewed: `RemoteConsole.tsx` (`usePolled`, `TerminalsPanel`,
`ApprovalsPanel`, `PaneView`, `DiffText`), `AssistantPanel.tsx`. `OfficePanel.tsx`
was also read for context (not named by the card) — see Concerns.

## Design/audit findings

Not a status-display page like `auth-callback`/`calendar-callback` — a real
interactive control panel (chat, terminal panes, git diff viewer, approvals)
with its own consistent, deliberate visual language already in place. No
structural redesign proposed or attempted.

Two concrete defect classes found, both mechanically verified (not guessed):

1. **Two messaging/behavior mismatches** (fabrication-class, directly
   relevant to this page's known disconnected-state history):
   - The offline banner said unconditionally *"commands will wait until it
     reconnects."* True for cloud mode (`cloudRelay.ts::sendCommand` POSTs a
     row that genuinely queues server-side on the Worker regardless of
     desktop presence) but FALSE for local mode (`localDesktop.ts::sendCommand`
     is a bare `fetch` straight to the desktop backend with **no queue** —
     it just throws when the backend is down).
   - `AssistantPanel.tsx` hardcoded `'Online on your PC'` with **no
     connectivity check at all** — it didn't even receive an online/offline
     prop — so switching to the Assistant tab while the page's own top
     banner said "Desktop offline" showed a directly contradicting claim.

2. **A repeated AA-contrast defect** — the same shared `text-muted-foreground`
   token already fixed on `calendar-callback`/`alarm-ringing`/`auth-callback`
   — found at 15 sites across `DesktopControlPage.tsx` (7) and
   `RemoteConsole.tsx` (8), each sitting on either plain `bg-background` or a
   `bg-card/40`–`/60` translucent card over it (both cleanly computable, not
   a gradient). Plus 3 more sites in `AssistantPanel.tsx` using literal
   `text-neutral-400` on a flat `bg-white` card (a different, Figma-styled
   sub-component, not the shared token) and 1 site in `RemoteConsole.tsx`'s
   `DiffText` using the shared token on a near-black diff `<pre>` background
   where it was especially wrong (its sibling colors are all dark-bg-tuned
   `-400` shades).

Dead code: none found in `DesktopControlPage.tsx` itself — every import
resolves to a real use; the file is comparatively dense/recent and didn't
carry pre-redesign leftovers the way `day-planner` did.

## Product-fit findings (incl. disconnected-state honesty verification)

Re-verified every stateful/numeric claim end to end against the real code,
not assumed:
- Unpaired + no local backend → `PairingForm` renders, no fake connected
  state, no crash (confirmed by test).
- Paired/configured but unreachable (the realistic common case, matching this
  page's documented history) → banner and AssistantPanel now both say the
  accurate, mode-specific thing instead of contradicting each other.
- `TerminalsPanel`'s "the terminal app isn't running on your PC" banner
  re-traced: it only renders once `GET /system/status` has actually
  succeeded (backend reachable, shell subsystem specifically down) —
  confirmed accurate as designed, left untouched, consistent with the task's
  prior investigation.
- The `online` default-to-true-before-first-presence-check is a deliberate,
  commented tradeoff, not fabrication — left as-is.
- Approvals badge count, command status dots/labels, command summary text —
  all trace to real polled data, never a hardcoded placeholder.

No fabrication found beyond the two mismatches in Finding 1 above, both fixed.

## TDD Evidence (RED/GREEN)

New file `apps/web/src/pages/__tests__/DesktopControlPage.test.tsx` (15 tests).
Every direct child component is stubbed; a controllable `usePolled` mock is
keyed by each call site's distinct literal `intervalMs` (2500 commands / 8000
presence / 15000 shellStatus / 3000-or-10000 approvals) since the real hook
is called 4 times per render with different roles.

- **RED (baseline, before any fix):** 9/15 passed, 6 failed — exactly the 6
  behaviors this card set out to fix (local-mode offline copy, both
  AssistantPanel `online`-prop assertions, 3 contrast-class assertions). The
  other 9 passed unmodified.
- **GREEN (after implementation):** 15/15 passed.

## What I implemented

`apps/web/src/pages/DesktopControlPage.tsx`:
- Mode-aware offline banner copy (cloud keeps the accurate "will wait" text;
  local now says "start the assistant on your PC to send commands").
- Threaded `online` into `<AssistantPanel ctx={ctx} online={online} .../>`.
- 7 contrast fixes: intro subtext, status-row text, inactive tab-label
  branch, "No commands sent yet", `PairingForm` hint text, `STATUS_STYLE.pending.text`,
  `CommandRow` summary text — all swapped `text-muted-foreground` →
  `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` (the exact,
  already-verified replacement from the 3 prior cards).

`apps/web/src/components/desktop/RemoteConsole.tsx`:
- 8 contrast fixes (same token swap): terminals loading/empty text, pane row
  path/status text, output/git view-toggle inactive label, git diff path
  text, git loading/branch-summary text, `ApprovalsPanel` loading/empty text,
  `RISK_STYLE.low` and its unknown-risk fallback.
- `DiffText`'s default/unchanged-line color and empty-diff placeholder:
  `text-muted-foreground` (≈2.74:1 on the near-black diff background) →
  `text-gray-400` (≈5.13:1, matching its `-400` siblings).

`apps/web/src/components/desktop/AssistantPanel.tsx`:
- New required `online: boolean` prop; status line now shows `'Offline —
  start the assistant on your PC'` when not reachable instead of always
  claiming online.
- 3 contrast fixes: turn-footer label, "is thinking…" text, message-input
  placeholder — `text-neutral-400` (≈2.52:1 on this card's flat white bg) →
  `text-neutral-500` (≈4.73:1, already proven passing elsewhere in this same
  file on the same background).

## Build + visual check

- `npx vitest run src/pages/__tests__/DesktopControlPage.test.tsx` → 15/15.
- `npx vitest run` (full suite) → **34/34 files, 362/362 tests passed.**
- `npm run build` → `✓ built in 11.78s`, no errors; `DesktopControlPage`
  chunk 57.69 kB (gzip 15.35 kB).
- Visual check against the real built app: `npx serve -s dist -l 4321` +
  headless Edge over CDP (Playwright's bundled Chromium is blocked by OS
  Application Control on this machine; `chrome-devtools` MCP failed to
  connect this session — same workaround as `day-planner`).
  - This machine's `.env`/`apps/web/.env` bakes in
    `VITE_LOCAL_DESKTOP_URL=http://127.0.0.1:8765` (the real config the
    original "black terminal" bug was filed against), and the headless
    browser has no route to that port — so this landed directly on the
    **real local-mode offline state**, not a contrived one. Observed: top
    banner rendered **"Desktop offline — start the assistant on your PC to
    send commands"** (the new, mode-aware copy), 0 console errors/exceptions,
    no horizontal overflow (`scrollWidth === clientWidth`, 485/485).
  - Clicked the real Assistant tab via a DOM click dispatched over CDP (not
    a test stub) — `AssistantPanel` rendered **"Offline — start the
    assistant on your PC"**, confirming the `online` prop fix live against
    the real build, not just the mocked test suite.
  - Screenshot of the Commands-tab default state captured and visually
    confirmed: no layout break, no overflow, fixed-contrast text visibly
    darker/more legible than the page background.
  - The unpaired/no-local-backend `PairingForm` state can't be reached from
    this one fixed build (env var baked in at build time) — confirmed
    instead by the first 2 tests, which render the real unmocked component.

## Files changed

- `apps/web/src/pages/DesktopControlPage.tsx`
- `apps/web/src/components/desktop/RemoteConsole.tsx`
- `apps/web/src/components/desktop/AssistantPanel.tsx`
- `apps/web/src/pages/__tests__/DesktopControlPage.test.tsx` (new)
- `docs/superpowers/cards/desktop-control.md`

## Self-review findings

- Disconnected-state messaging honesty: verified by reading the actual
  `localDesktop.ts`/`cloudRelay.ts` call chains (not assumed) — found a real
  mismatch, fixed it, and separately confirmed it live against the real
  build (not just mocked tests).
- Fabrication/mismatch check: performed across every stateful/numeric claim
  in `DesktopControlPage.tsx`; found and fixed the one real instance
  (AssistantPanel's hardcoded "Online on your PC").
- Contrast math: hand-computed (HSL→sRGB→linear→relative luminance) for
  every site touched, including two blended-opacity backgrounds
  (`bg-card/40`, `bg-card/60`) and one near-black `bg-black/80` background
  that needed a different fix than the shared light-bg token.
- Tested the common (disconnected) state specifically: the RED baseline and
  5 of the 15 tests target unpaired/offline/unreachable states directly, not
  just an idealized connected render; separately confirmed against the real
  build, which happened to land on the genuine local-mode-offline state by
  virtue of this machine's actual `.env`.
- Card file: updated to `merged` with the full PASS 1/2/3 handoff; no stray
  `backlog`/`unassigned` fields left.

## Concerns

- `OfficePanel.tsx` has ~25 of its own `text-muted-foreground` sites — same
  defect class fixed on its three sibling components here, but it wasn't one
  of the components this card named, and its size (870+ lines, unaudited
  card/list/dialog patterns) makes it a different-sized task. Escalated in
  the card for a future dedicated pass, not touched here.
- Raw network-error strings (e.g. a literal "Failed to fetch") surface
  verbatim in the UI when a backend call fails — confirmed honest (not
  fabricated) but unpolished. Flagged as a future error-message UX
  improvement, out of this card's messaging-accuracy/contrast scope.
- One pre-existing act()-wrapping console warning from React Testing Library
  in the "sends a typed command" test (an async state update settling after
  the assertion's `waitFor` resolves) — does not affect the test's pass/fail
  result, not a new regression, left as a minor test-cleanliness note.
