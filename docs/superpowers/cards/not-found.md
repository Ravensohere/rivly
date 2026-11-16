---
id: not-found
title: Not Found Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/NotFound.tsx (catch-all `*` route, public, no auth guard, 34 lines pre-edit). Link audit: "Back to your day" is a real <Link to="/app">, a registered route (not a dead/placeholder link) — logged-in users land on DayPlanner (or /onboarding if incomplete), logged-out users get redirected to /login by the /app route guard itself, so the link is always live. Contrast audit: 1 text-muted-foreground site on this page (the subtitle paragraph), flat bg-background, no opacity stacking. Hand-computed AA contrast (HSL->sRGB->relative-luminance via a Node script) against the real token values — failed in light mode (4.385:1, identical composite to the mobile-app card's flat-background case) and passed in dark mode (5.109:1); fixed with the pipeline's established `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`, re-verified at 5.422:1 light / 5.109:1 dark (dark unchanged).
---

# Card: Not Found Page

This card represents the redesign/verification pass for the Not Found Page feature/page in the Rivly web app.

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

### PASS 1 — Audit (link target + contrast + route wiring)

Route confirmed in `AnimatedRoutes.tsx:21` (lazy import) and `:104`
(`<Route path="*" element={<NotFound />} />`) — the catch-all, public, no
auth guard, matches the card brief exactly.

**Link check.** The only interactive element is the "Back to your day"
`<Link to="/app">`. `/app` is a real registered route
(`AnimatedRoutes.tsx:78-87`): logged-in users land on `DayPlanner` (or get
redirected to `/onboarding` first if they haven't completed it);
logged-out users are redirected to `/login` by the `/app` route's own
guard. Either way the destination is live and correct — not a dead link,
not a placeholder. No QR code or other link/claim on this page to verify
(it's a single CTA).

**Contrast audit** (hand HSL->sRGB->relative-luminance math, via a Node
script — not rounded by hand), against this page's actual token values
(`--background: 38 35% 96%` / dark `230 22% 8%`, `--muted-foreground: 230
10% 48%` / dark `230 10% 55%`):

| Site | Background composite | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|
| Subtitle "Nothing here..." | flat `hsl(var(--background))` (outer wrapper, opaque, no opacity stacking) | 4.385:1 | 5.109:1 | **Fails in light mode** |

Only 1 `text-muted-foreground` site exists on this page (matches
`grep -n muted-foreground NotFound.tsx` — line 22 pre-edit). No
icon-only or opacity-stacked `text-muted-foreground` sites exist here —
the decorative gradient orb uses inline `style`, not a muted-foreground
class, and is `aria-hidden`.

**Fix applied** to the one failing site, the pipeline's established
remediation (`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`).
Re-verified post-fix: 5.422:1 light (comfortably above 4.5:1), 5.109:1
dark (unchanged from the original dark token, since the fix's dark value
equals it).

### PASS 2 — Product-fit

**Copy check.** "This page wandered off" / "Nothing here — but your day
is still waiting for you." — no factual or feature claims to verify here;
it's tone-only copy, consistent with the app's voice elsewhere
(`LandingPage.tsx` manifesto copy uses similar warm, first-person framing).
No fabricated claims.

**Cross-file impact.**
```
grep -rln "NotFound" apps/web/src
  apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one catch-all route)
  apps/web/src/pages/NotFound.tsx
```
Default export only, one lazy-loaded route consumer (the catch-all). No
other file imports this page's JSX or any symbol from it — the single
className-only contrast fix carries zero cross-file risk.

### PASS 3 — Build / verification record

- **RED** (new `NotFound.test.tsx`, baseline against unmodified file): 4
  tests written; 3/4 passed, 1 failed exactly on the contrast assertion
  (subtitle). The 3 passing baseline tests (heading renders, subtitle copy
  renders, "Back to your day" link has a real `/app` href) all passed
  against the **original** component first, confirming the fixtures
  exercise real rendered output. (First run also surfaced a missing
  `HelmetProvider` wrapper needed because this page renders `<SEO>` —
  added it to the test harness; this is a test-setup fix, not a product
  change.)
- **GREEN** (post-implementation): **4/4 passed.**
- **Full suite:** `cd apps/web && npx vitest run` (alone, not concurrent
  with the build) → **43/43 files, 476/476 tests passed.**
- **ESLint:** `npx eslint src/pages/NotFound.tsx src/pages/__tests__/NotFound.test.tsx`
  → clean, no output.
- **Build:** `npm run build` → `✓ built in 15.20s`, no errors.
- **Primary interaction verified:** heading and subtitle render, the
  "Back to your day" link carries a real `/app` href — all covered by
  passing behavioral tests against real rendered DOM.
- **Visual check:** `npm run build` + `npx vite preview --port 4182`
  served the production build. Since this is the catch-all route, any
  unmatched path renders it — navigated to `/some-nonexistent-route` via
  Chrome (HTTP 200, SPA fallback) and took a real screenshot: the tab
  title read "Page not found | Rivly" (confirms `<SEO title="Page not
  found" noIndex />` fired correctly), the gradient orb, italic heading
  "This page wandered off", legible subtitle at the fixed contrast color,
  and the "Back to your day" button all rendered correctly against the
  light background.

**Escalations for a future dedicated card:** none. No functional or
behavioral gap found; the only finding was the 1 contrast fix above (1
muted-foreground site audited, 1 fixed), plus confirmation that the
"Back to your day" link is a real, live route in both auth states.
