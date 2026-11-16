# Task 4 Report — `not-found` card (apps/web/src/pages/NotFound.tsx)

## Audit findings

- Route confirmed in `AnimatedRoutes.tsx:21` (lazy import) and `:104`
  (`<Route path="*" element={<NotFound />} />`) — the catch-all route,
  public, no auth guard. Matches the card brief.
- The page's only interactive element is `<Link to="/app">Back to your
  day</Link>`. `/app` is a real registered route
  (`AnimatedRoutes.tsx:78-87`): logged-in users render `DayPlanner`
  (or get bounced to `/onboarding` first if incomplete); logged-out users
  get redirected to `/login` by the `/app` route's own guard. Not a dead
  or placeholder link in either auth state.
- No QR code or other claim/link on this 34-line page to audit beyond the
  one CTA.
- Decorative gradient orb is `aria-hidden`, uses inline `style` (not a
  `text-muted-foreground` class) — correctly excluded from the contrast
  sweep.
- Exactly 1 `text-muted-foreground` site: the subtitle paragraph
  (`"Nothing here — but your day is still waiting for you."`), against a
  flat, opaque `bg-background` wrapper — no opacity stacking on this page.

## Product-fit findings (PASS 1 / PASS 2)

- **PASS 1 (links/contrast/route wiring):** see Audit findings above —
  link target verified real and live, contrast site identified and
  measured.
- **PASS 2 (copy/claims):** "This page wandered off" / "Nothing here —
  but your day is still waiting for you." is tone-only copy with no
  factual or feature claim to verify — consistent with the app's existing
  voice elsewhere (e.g. `LandingPage.tsx` manifesto copy). Nothing to fix.
- **Cross-file impact:** `grep -rln "NotFound" apps/web/src` → only
  `AnimatedRoutes.tsx` (the one lazy import + catch-all route) and
  `NotFound.tsx` itself. Default export only, zero other importers — the
  one className fix carries no cross-file risk.

## TDD Evidence (RED/GREEN)

New file: `apps/web/src/pages/__tests__/NotFound.test.tsx`, 4 tests.

**RED** (run against the unmodified `NotFound.tsx`):
- 3/4 passed: heading renders, subtitle copy renders, "Back to your day"
  link has a real `/app` href — all passed against the **original**,
  unedited component, confirming the fixtures exercise real rendered
  output rather than mocking the assertions.
- 1/4 failed, exactly the contrast assertion on the subtitle
  (`expected 'mb-8 max-w-sm text-muted-foreground' not to contain
  'text-muted-foreground'`).
- First run also threw `TypeError: Cannot read properties of undefined
  (reading 'add')` from `react-helmet-async` because this page renders
  `<SEO>` and the test wasn't wrapped in `HelmetProvider` (the mobile-app
  card's test didn't need this since that page has no `<SEO>` call).
  Fixed by wrapping `renderPage()` in `<HelmetProvider>`, matching the
  existing pattern in `ForgotPasswordPage.test.tsx`. This is a test-setup
  fix, not a product-code change.

**GREEN** (after the contrast fix): 4/4 passed.

Hand-computed contrast (HSL→sRGB→relative-luminance, Node script, not
hand-rounded) against the page's real tokens (`--background: 38 35% 96%`
/ dark `230 22% 8%`; `--muted-foreground: 230 10% 48%` / dark
`230 10% 55%`):

| Site | Background | Light | Dark | Verdict |
|---|---|---|---|---|
| Subtitle | flat `--background` | 4.385:1 | 5.109:1 | **Fails light** |

Post-fix (`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`):
5.422:1 light, 5.109:1 dark (dark unchanged — the fix's dark value equals
the original dark token).

## What I implemented

Single scoped change in `apps/web/src/pages/NotFound.tsx`:

```diff
-    <p className="mb-8 max-w-sm text-muted-foreground">
+    <p className="mb-8 max-w-sm text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]">
```

No other change to the file. No route, link, or copy changes — the link
target and copy were both found correct on audit.

## Build + visual check

- **ESLint:** `npx eslint src/pages/NotFound.tsx src/pages/__tests__/NotFound.test.tsx` → clean, no output.
- **Focused test:** `npx vitest run src/pages/__tests__/NotFound.test.tsx` → 4/4 passed.
- **Full suite:** `npx vitest run` (standalone, not concurrent with build) → **43/43 files, 476/476 tests passed.**
- **Build:** `npm run build` → `✓ built in 15.20s`, no errors.
- **Visual check:** served the production build with
  `npx vite preview --port 4182`, navigated Chrome to
  `/some-nonexistent-route` (HTTP 200, confirms SPA catch-all fallback).
  Screenshot confirmed: browser tab title "Page not found | Rivly" (the
  `<SEO title="Page not found" noIndex />` call firing correctly), the
  gradient orb, italic heading "This page wandered off", the subtitle at
  the fixed, legible contrast color, and the "Back to your day" button —
  all rendering correctly against the light background. Preview server
  and Chrome tab closed afterward.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\NotFound.tsx` (1-line contrast fix)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\NotFound.test.tsx` (new, 4 tests)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\not-found.md` (state: backlog → merged, owner, handoff filled in)

## Self-review findings

- **Muted-text sweep:** grepped `text-muted-foreground` in the file —
  exactly 1 match (the subtitle), confirmed by reading the full 34-line
  file. No opacity-stacked or icon-only muted-foreground sites exist on
  this page (the only other styled element, the gradient orb, is
  `aria-hidden` and uses inline `style`, not a text-muted-foreground
  class). Fixed and re-verified by hand computation, not approximation.
- **Home-link target:** traced `/app` through `AnimatedRoutes.tsx` for
  both auth states (logged-in → DayPlanner/onboarding; logged-out →
  `/login`) — confirmed live in both, not a dead or placeholder route.
- **Test assertions:** all 4 are positive/behavioral (heading text
  present, subtitle text present, real href value, real className
  value) — no assertions on absence-only or implementation internals
  beyond confirming the old class name was replaced.
- **Card file:** `state` set to `merged`, `owner` filled in, `handoff`
  summarized inline in the frontmatter and expanded in the body,
  matching the `mobile-app` card's format.

## Concerns

None. This was a genuinely small, low-risk page: one real contrast defect
found and fixed, link target confirmed correct, no copy or functional
issues, zero cross-file blast radius.
