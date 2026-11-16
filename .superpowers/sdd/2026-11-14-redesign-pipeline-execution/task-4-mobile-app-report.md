# Task 4 Report — mobile-app card

Card: `docs/superpowers/cards/mobile-app.md` — `state: merged`.
File: `apps/web/src/pages/MobileAppPage.tsx`, route `/mobile` (public, no auth guard).

## Audit findings (incl. link/QR verification)

- **No QR code exists on this page** (the task brief's guess was wrong — nothing to verify there).
- App Store / Play Store CTAs are real `disabled` `<button>` elements, **not** `<a>` tags pointing to a fake/placeholder store URL. Paired with honest copy: "Native iOS and Android apps are currently in private beta." This is the correct, non-deceptive state — nothing to fix.
- PWA install instructions tell the user to open `rivly.in`. Cross-checked against `apps/web/src/components/SEO.tsx:20` (`const siteUrl = 'https://rivly.in';`) — confirmed this is the real production domain, not a placeholder.
- Route confirmed: `AnimatedRoutes.tsx:29` (lazy import), `:55` (`<Route path="/mobile" element={<MobileAppPage />} />`). Public, matches card brief.

## Contrast sweep (all text-muted-foreground sites, including opacity-stacked)

Computed via hand-written Node script (HSL→sRGB→relative luminance, real alpha compositing where backgrounds aren't flat — not hand-rounded or approximated).

Tokens used: `--background: 38 35% 96%` / dark `230 22% 8%`; `--card: 38 30% 98%` / dark `230 20% 11%`; `--secondary: 260 30% 94%` / dark `260 22% 17%`; `--muted-foreground: 230 10% 48%` / dark `230 10% 55%`.

| Site (line) | Background | Light | Dark | Verdict |
|---|---|---|---|---|
| Subtitle (17) | flat `--background` | 4.385:1 | 5.109:1 | FAIL light → fixed |
| Feature-card desc (39) | flat `--card` | 4.557:1 | 4.798:1 | PASS (hairline, exact) → left alone |
| "private beta" paragraph (48) | `--secondary` @ 30% alpha composited over `--background` | 4.276:1 | 4.857:1 | FAIL light → fixed |
| PWA steps `<ol>` (67) | flat `--background` (explicit opaque box) | 4.385:1 | 5.109:1 | FAIL light → fixed |
| "Return to Landing Page" (78) | flat `--background` | 4.385:1 | 5.109:1 | FAIL light → fixed |

5 sites total, matches `grep -n muted-foreground MobileAppPage.tsx` exactly. No icon-only sites to exclude.

Fix applied (pipeline's established remediation): `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]` on the 4 failing sites. Re-verified post-fix: 5.422:1 (flat background) and 5.287:1 (secondary/30-over-background composite) in light mode; dark unaffected (fix's dark value equals the already-passing original dark token).

Feature-card description left untouched — a genuine 4.557:1 pass against the exact flat `--card` token, 0.057 above threshold, not an approximation.

## Product-fit findings

"Native Alarms" claim traced to `apps/web/src/services/NativeAlarmBridge.ts` — a real Capacitor bridge (`window.NativeAlarm`, gated on `window.Capacitor.isNativePlatform()`) for OS-level alarm scheduling. Marketing framing over genuinely implemented infrastructure, not fabricated — no action needed.

Cross-file impact: `grep -rln "MobileAppPage" apps/web/src` → only `MobileAppPage.tsx` itself and the one route in `AnimatedRoutes.tsx`. Zero cross-file risk from the className-only fixes.

## TDD Evidence

- **RED**: new `apps/web/src/pages/__tests__/MobileAppPage.test.tsx`, 11 tests against unmodified file → 7 passed / 4 failed, failures exactly on the 4 sites later fixed (subtitle, private-beta paragraph, PWA `<ol>`, return-link).
- **GREEN**: post-fix → 11/11 passed.
- **Full suite**: `cd apps/web && npx vitest run` → 42/42 files, 472/472 tests passed.

## What I implemented

4 className-only edits in `apps/web/src/pages/MobileAppPage.tsx` (no behavior/markup/structure change):
1. Line 17 subtitle: `text-muted-foreground` → `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`
2. Line 48 "private beta" paragraph: same swap
3. Line 67 PWA `<ol>`: same swap (kept `text-sm`, `space-y-2`, `list-decimal list-inside`)
4. Line 78 "Return to Landing Page" button: same swap (kept `hover:text-foreground`)

Feature-card description (line 39) deliberately left on `text-muted-foreground` — confirmed genuine pass.

## Build + visual check

- `npx eslint src/pages/MobileAppPage.tsx src/pages/__tests__/MobileAppPage.test.tsx` → clean.
- `npm run build` → `✓ built in 15.34s`, no errors.
- `npx vite preview --port 4181` → HTTP 200 on `/mobile` (public route, reachable directly). Took a real Chrome screenshot: heading, subtitle, all 4 feature cards, "Get the App" CTA block (disabled App Store/Play Store, private-beta copy), PWA install box (`rivly.in`, 3 steps), and "Return to Landing Page" all render legibly in light mode. Preview server torn down after the check.

## Files changed

- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\MobileAppPage.tsx` (4 className edits)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\apps\web\src\pages\__tests__\MobileAppPage.test.tsx` (new, 11 tests)
- `F:\Personal Assistant\rivly-assistant-worktrees\integrated-main\docs\superpowers\cards\mobile-app.md` (state → merged, handoff filled in)

## Self-review

- Every link/QR destination checked: no QR exists; store buttons are honest disabled buttons, not fake anchors; PWA domain cross-checked against `SEO.tsx` and confirmed real.
- All 5 muted-foreground sites swept, including the one opacity-stacked site (container `bg-secondary/30` over `background`, computed as a real alpha composite, not approximated flat).
- Tests are positive/behavioral assertions (render checks, real href checks, disabled-state checks, className checks against the actual fix string) — no snapshot-only tests.
- Card file front-matter and body both updated (`state: merged`, owner, full 3-pass handoff).

## Concerns

None. No escalation needed — app-store links were cleanly verifiable as honest placeholders-in-private-beta (not ambiguous fake IDs), so the BLOCKED/NEEDS_CONTEXT escalation path in the task brief did not apply.
