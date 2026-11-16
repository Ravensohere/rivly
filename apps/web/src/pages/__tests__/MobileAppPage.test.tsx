/**
 * MobileAppPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: mobile-app (redesign pipeline, Task 4). Route `/mobile`, public
 * (confirmed: AnimatedRoutes.tsx:29 lazy import, :55
 * `<Route path="/mobile" element={<MobileAppPage />} />` — no auth guard).
 *
 * Link/claim audit: this page has no QR code. The App Store / Play Store
 * "buttons" are real `disabled` <button> elements (not <a> tags pointing to
 * a placeholder/fake store URL) and the copy says the native apps are "in
 * private beta" — an honest state, not a broken or fabricated link. The PWA
 * install instructions tell the user to open "rivly.in" — grepped against
 * `SEO.tsx` (`const siteUrl = 'https://rivly.in'`), confirming this is the
 * site's real production domain, not a placeholder.
 *
 * Product-fit: "Native Alarms" claim traced to `NativeAlarmBridge.ts`, which
 * implements a real Capacitor bridge (`window.NativeAlarm`) for OS-level
 * alarm scheduling — the claim matches real underlying plumbing, not a
 * fabricated feature. `grep -rln "MobileAppPage" apps/web/src` found only
 * this file and the one route in `AnimatedRoutes.tsx` — no cross-file
 * importers to worry about regressing.
 *
 * Contrast audit (hand HSL->sRGB->relative-luminance via a Node script, not
 * hand-rounded) against this page's actual token values (`--background: 38
 * 35% 96%` / dark `230 22% 8%`, `--card: 38 30% 98%` / dark `230 20% 11%`,
 * `--secondary: 260 30% 94%` / dark `260 22% 17%`, `--muted-foreground: 230
 * 10% 48%` / dark `230 10% 55%`) and each site's real composited background:
 *
 *   Site                                   | Background            | Light    | Dark     | Verdict
 *   subtitle ("in your pocket")            | flat --background      | 4.385:1  | 5.109:1  | FAILS light
 *   feature card description               | flat --card             | 4.557:1  | 4.798:1  | PASSES (hairline, untouched)
 *   "private beta" paragraph               | --secondary/30 over --background (alpha-composited, not flattened) | 4.276:1 | 4.857:1 | FAILS light
 *   PWA install steps (<ol>)               | flat --background (explicit bg-background box) | 4.385:1 | 5.109:1 | FAILS light
 *   "Return to Landing Page" ghost button  | flat --background      | 4.385:1  | 5.109:1  | FAILS light
 *
 * 5 total text-muted-foreground sites (matches `grep -n muted-foreground
 * MobileAppPage.tsx` exactly). 4 of 5 fail in light mode and get the
 * pipeline's established fix (`text-[hsl(230,10%,42%)]
 * dark:text-[hsl(230,10%,55%)]`, re-verified at 5.422:1 / 5.287:1 against
 * their real backgrounds); the feature-card description is a genuine
 * hairline pass against the flat --card token and is left untouched.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileAppPage from '@/pages/MobileAppPage';

const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

function renderPage() {
  return render(
    <MemoryRouter>
      <MobileAppPage />
    </MemoryRouter>
  );
}

describe('MobileAppPage — core content', () => {
  it('renders the heading and subtitle', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Rivly Mobile' })).toBeInTheDocument();
    expect(screen.getByText('The full rhythm experience, in your pocket.')).toBeInTheDocument();
  });

  it('renders all four feature cards with their real titles and descriptions', () => {
    renderPage();
    expect(screen.getByText('Native Alarms')).toBeInTheDocument();
    expect(screen.getByText('Reliable, system-level alarms that wake you up gently.')).toBeInTheDocument();
    expect(screen.getByText('Offline Access')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Haptic Feedback')).toBeInTheDocument();
  });

  it('links back to the landing page with a real href', () => {
    renderPage();
    const link = screen.getByText('Return to Landing Page').closest('a')!;
    expect(link).toHaveAttribute('href', '/');
  });
});

describe('MobileAppPage — app store links are honest, not broken/placeholder', () => {
  it('renders the App Store and Play Store CTAs as disabled buttons, not real/fake anchor links', () => {
    renderPage();
    const appStoreBtn = screen.getByText('App Store').closest('button')!;
    const playStoreBtn = screen.getByText('Play Store').closest('button')!;
    expect(appStoreBtn).toBeDisabled();
    expect(playStoreBtn).toBeDisabled();
    // Neither is an <a> tag, so there is no store URL to be fake/placeholder.
    expect(screen.getByText('App Store').closest('a')).toBeNull();
    expect(screen.getByText('Play Store').closest('a')).toBeNull();
  });

  it('states the real private-beta status rather than implying the apps are live', () => {
    renderPage();
    expect(
      screen.getByText('Native iOS and Android apps are currently in private beta.')
    ).toBeInTheDocument();
  });

  it('PWA install instructions point at the real production domain, not a placeholder', () => {
    renderPage();
    expect(screen.getByText('rivly.in')).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });
});

describe('MobileAppPage — contrast fix (recurring text-muted-foreground-on-background defect)', () => {
  it('the subtitle uses the AA-passing muted color against the flat background', () => {
    renderPage();
    const node = screen.getByText('The full rhythm experience, in your pocket.');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the "private beta" paragraph uses the AA-passing muted color against the secondary/30-over-background composite', () => {
    renderPage();
    const node = screen.getByText('Native iOS and Android apps are currently in private beta.');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the PWA install steps list uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText(/Add to Home Screen/).closest('ol')!;
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the "Return to Landing Page" button uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText('Return to Landing Page');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the feature-card description keeps the untouched hairline-pass muted color against the flat --card background', () => {
    renderPage();
    const node = screen.getByText('Reliable, system-level alarms that wake you up gently.');
    expect(node.className).toContain('text-muted-foreground');
    expect(node.className).not.toContain(FIXED_MUTED);
  });
});
