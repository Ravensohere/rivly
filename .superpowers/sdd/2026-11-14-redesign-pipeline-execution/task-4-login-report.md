# Task 4 Report — Card: login

File: `apps/web/src/pages/LoginPage.tsx` (route `/login`, public, 271 lines pre-edit).

## Audit findings — every `text-muted-foreground` site

`grep -n muted-foreground LoginPage.tsx` found exactly 7 sites (lines 67,
139, 213, 222, 235, 251, 260). All contrast math below is computed with a
small Node script (HSL→sRGB→relative-luminance, WCAG contrast formula),
not hand-rounded, and against each site's *actual* composited background —
the 3-stop `--gradient-calm` gradient sampled at all 3 stops where that's
the real background, not a flattened average.

Tokens used:
- light: `--background: 38 35% 96%`, `--card: 38 30% 98%`,
  `--muted-foreground: 230 10% 48%`
- dark: `--background: 230 22% 8%`, `--card: 230 20% 11%`,
  `--muted-foreground: 230 10% 55%`
- `--gradient-calm` light: 3 stops `hsl(38 35% 96%)` / `hsl(38 25% 95%)` /
  `hsl(260 20% 96%)`; dark: `hsl(230 22% 8%)` / `hsl(230 20% 9%)` /
  `hsl(260 16% 10%)`

| # | Site (line) | Color expression | Background | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|---|---|
| 1 | "Home" link (67) | `hsl(var(--muted-foreground))`, no alpha | `--gradient-calm`, 3 stops | 4.283–4.385:1 | 4.893–5.109:1 | **FAIL (light)** |
| 2 | Subtitle "Sign in to continue your daily" (139) | `hsl(var(--muted-foreground))`, no alpha | flat `hsl(var(--card))` | 4.557:1 | 4.798:1 | Pass |
| 3 | "Forgot password?" link (213) | Tailwind `text-muted-foreground` | flat `hsl(var(--card))` | 4.557:1 | 4.798:1 | Pass |
| 4 | "Don't have an account? Sign up" toggle (222) | Tailwind `text-muted-foreground` | flat `hsl(var(--card))` | 4.557:1 | 4.798:1 | Pass |
| 5 | "or" divider label (235) | `hsl(var(--muted-foreground) / 0.6)` — **opacity-stacked via alpha** | flat `hsl(var(--card))` | 2.257:1 | 2.551:1 | **FAIL BADLY** |
| 6 | "Continue as Guest" button (251) | `hsl(var(--muted-foreground))`, no alpha | flat `hsl(var(--card))` (transparent btn bg) | 4.557:1 | 4.798:1 | Pass |
| 7 | Terms/Privacy paragraph (260) | `hsl(var(--muted-foreground) / 0.6)` — **opacity-stacked via alpha** | flat `hsl(var(--card))` | 2.257:1 | 2.551:1 | **FAIL BADLY** |

No icon-only `text-muted-foreground` sites exist on this page (there's
nothing to exclude on that basis, unlike `learn.md`'s `ChevronUp`/
`ChevronDown`/`Trash2` icons).

**Sites 2, 3, 4, 6 — genuine passes, not hairline-by-approximation.**
4.557:1 is only 0.057 above the 4.5 threshold, but unlike the `learn.md`
TodayCard case, this is computed against an exact flat `hsl(var(--card))`
color — no gradient-flattening approximation is involved, so there is no
reason to doubt this pass. Left untouched.

**Sites 1, 5, 7 — fixed**, using the pipeline's established remediation
(`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`, the same fix
already merged on the `forgot-password` card):
- Site 1 ("Home" link): added the className; removed the inline `color`
  property (inline styles can't express a `dark:` variant, so this had to
  move from `style` to `className`, matching `learn.md`'s precedent for
  its one inline-style site).
- Sites 5 and 7 ("or" label, Terms/Privacy paragraph): added the
  className, and **dropped the `/0.6` alpha entirely**, not just swapped
  the color. Checked first whether keeping the alpha with the new fix
  color would be enough: `composite(fixColor, card, 0.6)` still computes
  to 2.499:1 (light) / 2.551:1 (dark) — still failing — so the opacity had
  to go, the same lesson the `learn.md` coordinator review flagged for its
  missed `opacity-60` site.

Post-fix re-verification: site 1 now computes to 5.296–5.422:1 (light,
all 3 gradient stops) / 4.893–5.109:1 (dark — unchanged, since the fix's
dark value equals the existing dark token value, no regression). Sites 5
and 7 now compute to 5.634:1 (light) / 4.798:1 (dark) at full opacity.

## Product-fit / security findings — enumeration check

Traced `signIn` in `apps/web/src/hooks/useAuth.ts` (lines 194–217): calls
`supabase.auth.signInWithPassword({ email, password })` — Supabase's own
API, which returns the identical generic `"Invalid login credentials"`
error for a wrong password on a real account and for a password attempt
against an email with no account at all. Supabase never differentiates
the two; this is backend-level anti-enumeration behavior, not something
this page could leak around even if it tried.

Traced `LoginPage.tsx`'s `handleSubmit` (lines 28–40): on failure it only
calls `setLoading(false)` — the component renders **no custom error text
of its own**. Error display is delegated entirely to the shared toast
system inside `useAuth.ts` (`toast({ title: 'Sign in failed', description:
error.message, variant: 'destructive' })`), which this card's diff does
not touch and which just echoes Supabase's own message verbatim.

**Verdict: APPROVED, no enumeration leak.** No rate-limiting messaging
exists on this page to cross-check against real backend behavior (there's
nothing claiming a rate-limit on this page that could mismatch).

Also confirmed: "Forgot password?" links to `/forgot-password` — route
exists (`AnimatedRoutes.tsx:60`) and that card already addressed the
mirror-image enumeration question (does the reset-request flow reveal
whether an email has an account) — consistent discipline across both
pages, no contradiction found.

## Cross-file impact

```
grep -rln "LoginPage" apps/web/src
  apps/web/src/pages/LoginPage.tsx
  apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one route)
```
Default export only, one lazy-loaded route consumer. `useAuth.ts` /
`AuthContext.tsx` are shared hooks this card did not modify — only
`LoginPage.tsx`'s own JSX changed (3 className/style edits, text-color
only, no behavior change).

## TDD Evidence

**RED** — new `apps/web/src/pages/__tests__/LoginPage.test.tsx`, 12 tests,
run against the unmodified file:
```
Test Files  1 failed (1)
     Tests  3 failed | 9 passed (12)
```
The 3 failures were exactly the 3 then-unfixed contrast assertions (Home
link, "or" label, Terms/Privacy paragraph). The other 9 — default sign-in
render + Home/forgot-password hrefs, empty-field guard, real `signIn` call
+ `/app` navigation on success, no-navigation/no-custom-error-UI on a
wrong-password failure, the identical no-navigation/no-custom-error-UI on
a nonexistent-account failure (the enumeration-safety assertion), sign-up
toggle + real `signUp` call, email-prefix default name, guest login +
navigation, and the loading-spinner/disabled-button state — all passed
against the **original** component, confirming the fixtures exercise real
logic and not mocks of the assertions themselves.

**GREEN** — after the 3 fixes:
```
Test Files  1 passed (1)
     Tests  12 passed (12)
```

## What I implemented

Three text-color-only edits in `apps/web/src/pages/LoginPage.tsx`:
1. "Home" link (top-left, line ~64): moved the muted color from an inline
   `style.color` to `className="... text-[hsl(230,10%,42%)]
   dark:text-[hsl(230,10%,55%)]"`.
2. "or" divider label (line ~229): same className added; removed the
   `color: 'hsl(var(--muted-foreground) / 0.6)'` inline style entirely
   (alpha dropped, not just recolored).
3. Terms/Privacy paragraph (line ~258): same treatment — className added,
   `/0.6` alpha-bearing inline `color` removed.

No other lines changed. No behavior, routing, or auth logic touched.

## Build + visual check

- `npx eslint src/pages/LoginPage.tsx src/pages/__tests__/LoginPage.test.tsx`
  → clean, no output.
- `npx vitest run` (full suite) → **41/41 files, 461/461 tests passed.**
- `npm run build` → `✓ built in 14.99s`, no errors; `LoginPage` chunk
  **6.05 kB (gzip 2.25 kB)**.
- Visual check: `npx vite preview --port 4179`, confirmed HTTP 200 on
  `/login`. Since `/login` is a **public** route (no auth/session
  required, unlike several prior protected-route cards), it was directly
  reachable — navigated there with the Chrome browser tool and took a
  real screenshot: the sign-in form, "HOME" link, "OR" divider, and
  "Terms"/"Privacy Policy" paragraph all render clearly legible against
  the light gradient background. Zoomed into the "HOME" label region
  specifically to double-check the fixed color reads cleanly against the
  gradient backdrop (not just passing on paper).

## Files changed

- `apps/web/src/pages/LoginPage.tsx` — 3 contrast fixes (text-color only).
- `apps/web/src/pages/__tests__/LoginPage.test.tsx` — new, 12 tests
  (baseline contract + redesign/contrast).
- `docs/superpowers/cards/login.md` — state `backlog` → `merged`,
  owner/handoff updated with full audit + product-fit record.

## Self-review

- Checked every `text-muted-foreground`-class site **and** every inline
  `hsl(var(--muted-foreground) ...)` site, including the 2 opacity-stacked
  (`/0.6` alpha) ones — found via `grep -n muted-foreground`, cross-checked
  count (7) matches the enumerated table exactly.
- Computed the real 3-stop `--gradient-calm` gradient (sampled at each
  stop) rather than averaging/flattening it, for the one site whose
  background is the gradient rather than the flat card.
- Enumeration-safety traced through to the real Supabase
  `signInWithPassword` call and confirmed the backend itself is
  non-differentiating; confirmed the component adds no error text of its
  own that could leak a signal.
- Contrast fix verified both *before* applying (would keeping the alpha
  with a darker color be enough? No — still fails) and *after* (recomputed
  all 3 fixed sites in both light and dark to confirm no regression and a
  genuine pass).
- Card file's `state`/`owner`/`handoff` fields all updated; no stale
  "unassigned"/"backlog"/"null" left over.

## Concerns

None. No functional/behavioral gap found on this page; the only findings
were the 3 contrast fixes, already applied and verified.
