/**
 * NotFound.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: not-found (redesign pipeline, Task 4). Catch-all route `*` in
 * `AnimatedRoutes.tsx:104` (`<Route path="*" element={<NotFound />} />`,
 * lazy-imported at :21) — public, no auth guard, matches every unmatched URL.
 *
 * Link audit: the "Back to your day" CTA points to `/app`
 * (`AnimatedRoutes.tsx:79`), a real route — logged-in users land on
 * `DayPlanner` (or get bounced to `/onboarding` if onboarding isn't done),
 * logged-out users get redirected to `/login`. Either way this is a real,
 * live destination, not a dead or placeholder link.
 *
 * Contrast audit (hand HSL->sRGB->relative-luminance via a Node script, not
 * hand-rounded) against this page's actual token values (`--background: 38
 * 35% 96%` / dark `230 22% 8%`, `--muted-foreground: 230 10% 48%` / dark
 * `230 10% 55%`). Only one `text-muted-foreground` site on this page (the
 * subtitle paragraph), against a flat `bg-background` (no opacity
 * stacking involved — the outer wrapper's background is opaque):
 *
 *   Site                         | Background          | Light   | Dark    | Verdict
 *   subtitle paragraph           | flat --background    | 4.385:1 | 5.109:1 | FAILS light
 *
 * This matches the identical flat-background case already found on the
 * mobile-app card exactly (same tokens, same composite). Fixed with the
 * pipeline's established remediation (`text-[hsl(230,10%,42%)]
 * dark:text-[hsl(230,10%,55%)]`), re-verified at 5.422:1 light / 5.109:1
 * dark (dark value is unchanged from the original token, so dark mode is
 * unaffected).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NotFound from '@/pages/NotFound';

const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('NotFound — core content', () => {
  it('renders the "page wandered off" heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'This page wandered off' })).toBeInTheDocument();
  });

  it('renders the reassuring subtitle copy', () => {
    renderPage();
    expect(screen.getByText('Nothing here — but your day is still waiting for you.')).toBeInTheDocument();
  });
});

describe('NotFound — "Back to your day" link targets a real route', () => {
  it('links to /app, a real registered route (not a dead or placeholder link)', () => {
    renderPage();
    const link = screen.getByText('Back to your day').closest('a')!;
    expect(link).toHaveAttribute('href', '/app');
  });
});

describe('NotFound — contrast fix (recurring text-muted-foreground-on-background defect)', () => {
  it('the subtitle uses the AA-passing muted color against the flat background', () => {
    renderPage();
    const node = screen.getByText('Nothing here — but your day is still waiting for you.');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });
});
