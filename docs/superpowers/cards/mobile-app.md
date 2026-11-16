---
id: mobile-app
title: Mobile App Page
owner: task-4-agent (solo; audit + product-fit passes run in-agent, labelled separately below)
state: merged
branch: riva/integrated-main
acceptance:
  - vite build passes
  - npm test passes
  - primary interaction verified
  - no shared-component regression in holistic smoke pass
merge_gate: work stays inside F:\Personal Assistant\rivly-assistant-worktrees\integrated-main or fresh worktrees branched from it (never rivly-assistant's own checkout, F:\skipwise, or F:\Personal Assistant\app); <=2 concurrent builds; riva/integrated-main stays local (no push); no .env/secrets access
handoff: see "## Handoff" below — apps/web/src/pages/MobileAppPage.tsx (route /mobile, public, no auth guard, 86 lines pre-edit). Link/QR audit: no QR code on this page; App Store/Play Store CTAs are real disabled <button>s (not <a> tags to a fake/placeholder store URL) paired with honest "currently in private beta" copy; PWA instructions point at "rivly.in", confirmed the real production domain via SEO.tsx's `siteUrl`. Contrast audit: 5 total text-muted-foreground sites found (grep-confirmed), one opacity-stacked via a container background (`bg-secondary/30` composited over `--background`, not a text-side alpha this time — computed as a real alpha composite, not approximated flat). Hand-computed AA contrast (HSL->sRGB->relative-luminance via a Node script) against each site's real background — 4 of 5 sites failed in light mode (4.276-4.385:1) and were fixed with the pipeline's established `text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`; 1 of 5 (feature-card description against flat `--card`) was computed to genuinely pass (4.557:1, hairline but exact, not approximated) and was left untouched.
---

# Card: Mobile App Page

This card represents the redesign/verification pass for the Mobile App Page feature/page in the Rivly web app.

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

### PASS 1 — Audit (links/QR + contrast + route wiring)

Route confirmed in `AnimatedRoutes.tsx:29` (lazy import) and `:55`
(`<Route path="/mobile" element={<MobileAppPage />} />`) — public, no auth
guard, matches the card brief.

**Link/QR check.** No QR code exists on this page (the task brief's guess
was wrong — there is no QR image to verify). The "App Store"/"Play Store"
CTAs are real `disabled` `<button>` elements, not `<a>` tags pointing to a
fake or placeholder store listing — paired with honest copy ("Native iOS
and Android apps are currently in private beta."). This is the correct,
non-deceptive state; nothing to fix. The PWA install box tells the user to
open `rivly.in` — cross-checked against `apps/web/src/components/SEO.tsx:20`
(`const siteUrl = 'https://rivly.in';`), confirming this is the site's real
production domain, not a placeholder/stale domain.

**Contrast audit** (hand HSL->sRGB->relative-luminance math, via a Node
script — not rounded by hand), against this page's actual token values
(`--background: 38 35% 96%` / dark `230 22% 8%`, `--card: 38 30% 98%` /
dark `230 20% 11%`, `--secondary: 260 30% 94%` / dark `260 22% 17%`,
`--muted-foreground: 230 10% 48%` / dark `230 10% 55%`) and each site's
*actual* composited background:

| Site | Background composite | Light ratio | Dark ratio | Verdict |
|---|---|---|---|---|
| Subtitle "...in your pocket." | flat `hsl(var(--background))` | 4.385:1 | 5.109:1 | **Fails in light mode** |
| Feature-card description | flat `hsl(var(--card))` | 4.557:1 | 4.798:1 | **Passes** (exact flat-bg computation) — left untouched |
| "...currently in private beta." | `hsl(var(--secondary))` at 30% alpha, composited over `hsl(var(--background))` (real alpha blend, not flattened) | 4.276:1 | 4.857:1 | **Fails in light mode** |
| PWA install steps `<ol>` | flat `hsl(var(--background))` (explicit opaque box) | 4.385:1 | 5.109:1 | **Fails in light mode** |
| "Return to Landing Page" ghost button | flat `hsl(var(--background))` | 4.385:1 | 5.109:1 | **Fails in light mode** |

5 sites total (matches `grep -n muted-foreground MobileAppPage.tsx` exactly
— lines 17, 39, 48, 67, 78). No icon-only `text-muted-foreground` sites
exist on this page.

**Fix applied to the 4 failing sites**, the pipeline's established
remediation (`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`): the
subtitle, the "private beta" paragraph, the PWA `<ol>`, and the "Return to
Landing Page" button. Re-verified post-fix against each site's real
background: 5.422:1 (flat `--background`) and 5.287:1 (the
secondary/30-over-background composite) in light mode — both comfortably
above 4.5:1; dark mode was already passing and the fix's dark value equals
the unchanged original dark token, so dark ratios are unaffected.

**Hairline-pass honesty:** the one untouched site (feature-card
description) computes to 4.557:1 in light mode — a real pass, 0.057 above
the 4.5 threshold, against an exact flat `--card` color (no
gradient-flattening approximation), so this is not treated as an
inconsistent or uncertain call.

### PASS 2 — Product-fit

**Claim check:** "Native Alarms — Reliable, system-level alarms that wake
you up gently." Traced to `apps/web/src/services/NativeAlarmBridge.ts`,
which implements a real Capacitor bridge (`window.NativeAlarm`,
`isNativeAlarmAvailable()` gated on `window.Capacitor.isNativePlatform()`)
for OS-level alarm scheduling. This is marketing framing over genuinely
implemented native-alarm infrastructure, not a fabricated feature claim —
no further action needed.

**Cross-file impact.**
```
grep -rln "MobileAppPage" apps/web/src
  apps/web/src/pages/MobileAppPage.tsx
  apps/web/src/components/layout/AnimatedRoutes.tsx   (lazy import + the one route)
```
Default export only, one lazy-loaded route consumer. No other file imports
this page's JSX or any symbol from it — the 4 className-only contrast
fixes carry zero cross-file risk.

### PASS 3 — Build / verification record

- **RED** (new `MobileAppPage.test.tsx`, baseline against unmodified
  file): 11 tests written; 7/11 passed, 4 failed exactly on the 4
  then-unfixed contrast assertions (subtitle, private-beta paragraph, PWA
  `<ol>`, return-link). The 7 passing baseline tests (heading + subtitle
  render, all four feature cards render, real `/` href on the return link,
  App Store/Play Store render as disabled buttons with no `<a>` tag,
  honest private-beta copy renders, PWA install copy names the real
  `rivly.in` domain, and the untouched feature-card description keeps
  `text-muted-foreground`) all passed against the **original** component
  first, confirming the fixtures exercise real rendered output, not mocks
  of the assertions themselves.
- **GREEN** (post-implementation): **11/11 passed.**
- **Full suite:** `cd apps/web && npx vitest run` (alone, not concurrent
  with the build) → **42/42 files, 472/472 tests passed.**
- **ESLint:** `npx eslint src/pages/MobileAppPage.tsx src/pages/__tests__/MobileAppPage.test.tsx`
  → clean, no output.
- **Build:** `npm run build` → `✓ built in 15.34s`, no errors.
- **Primary interaction verified:** heading/subtitle render, all 4 feature
  cards render with real copy, disabled App Store/Play Store buttons
  (no fake link), honest private-beta messaging, PWA install steps naming
  the real domain, and the "Return to Landing Page" link's real `/` href —
  all covered by passing behavioral tests against real rendered DOM (not
  snapshot-only assertions).
- **Visual check:** `npm run build` + `npx vite preview --port 4181` served
  the production build (HTTP 200 on `/mobile`). `/mobile` is a **public**
  route, so it was reachable directly: navigated via Chrome and took a real
  screenshot — heading, subtitle, all 4 feature cards, the "Get the App"
  CTA block (disabled App Store/Play Store buttons, private-beta copy), the
  PWA install box (`rivly.in`, 3 numbered steps), and "Return to Landing
  Page" all render legibly against the light background. No protected-route
  auth limitation applied here.

**Escalations for a future dedicated card:** none. No functional or
behavioral gap found; the only findings were the 4 contrast fixes above
(5 muted-foreground sites audited total, 4 fixed, 1 confirmed genuine
pass), plus confirmation that the app-store CTAs and PWA domain are
already honest/accurate.
