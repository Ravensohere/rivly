/**
 * TermsOfServicePage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: terms-of-service (redesign pipeline, Task 4 — LAST card in the batch).
 * Public route `/terms` (`AnimatedRoutes.tsx:54`, lazy-imported at :20) — no
 * auth guard.
 *
 * This card is visual/accessibility-only: the plan's Review Focus singles out
 * legal-text pages (same rule already applied on `privacy-policy.md`) as pages
 * where an unintended wording change matters more than visual polish. The
 * baseline test below captures the full rendered text content as one string so
 * any accidental change to the legal copy itself fails loudly, independent of
 * the contrast/className fixes below.
 *
 * Contrast audit (hand HSL->sRGB->relative-luminance, same tokens and same
 * defect as the `privacy-policy`/`not-found`/`onboarding` cards:
 * `--background: 38 35% 96%` / dark `230 22% 8%`, `--muted-foreground: 230
 * 10% 48%` / dark `230 10% 55%`). Every `text-muted-foreground` site on this
 * page sits on the same flat `bg-background` (no gradient/opacity stacking
 * anywhere in this file) — 9 sites total: the "Back" button, the "Last
 * updated" line, and the single body paragraph of all 7 sections. All 9 fail
 * the same way the `not-found`/`privacy-policy` cards' flat sites did
 * (4.385:1 light / 5.109:1 dark). Fixed with the pipeline's established
 * remediation (`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`),
 * re-verified at 5.422:1 light / 5.109:1 dark.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TermsOfServicePage from '@/pages/TermsOfServicePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

function renderPage() {
  return render(
    <MemoryRouter>
      <TermsOfServicePage />
    </MemoryRouter>
  );
}

// Captured verbatim from the unmodified component's rendered DOM — proves the
// legal text itself is byte-identical before and after this card's styling
// fixes. Any wording change to the terms will change this string and fail
// this test loudly, regardless of className changes elsewhere.
const BASELINE_TEXT_CONTENT =
  ' BackTerms of ServiceLast updated: January 26, 20261. Acceptance of TermsBy accessing or using Rivly, you agree to be bound by these Terms of Service and all applicable laws and regulations.2. Description of ServiceRivly is a productivity and wellness platform that helps users organize their daily schedules using calendar integration and focus tools.3. User AccountsYou may need to create an account via Google Authentication to access certain features. You are responsible for maintaining the confidentiality of your account information.4. Proper UseYou agree not to use the service for any illegal or unauthorized purpose. You must not violate any laws in your jurisdiction while using Rivly.5. Limitation of LiabilityRivly and its creators shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service.6. Changes to TermsWe reserve the right to modify these terms at any time. Your continued use of Rivly after changes are posted constitutes your acceptance of the new terms.7. ContactQuestions about the Terms of Service should be sent toravenso.here@gmail.com.';

describe('TermsOfServicePage — text content is unchanged (legal-copy guard)', () => {
  it('renders the exact baseline terms text, byte-identical', () => {
    const { container } = renderPage();
    expect(container.textContent).toBe(BASELINE_TEXT_CONTENT);
  });
});

describe('TermsOfServicePage — core content', () => {
  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
  });

  it('renders all seven section headings', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '1. Acceptance of Terms' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Description of Service' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3. User Accounts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '4. Proper Use' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '5. Limitation of Liability' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '6. Changes to Terms' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '7. Contact' })).toBeInTheDocument();
  });

  it('renders the contact email', () => {
    renderPage();
    expect(screen.getByText('ravenso.here@gmail.com')).toBeInTheDocument();
  });

  it('"Back" button navigates back in history, not to a hardcoded route', () => {
    renderPage();
    screen.getByText('Back').closest('button')!.click();
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

describe('TermsOfServicePage — contrast fix (recurring text-muted-foreground-on-background defect)', () => {
  it('the "Back" button uses the AA-passing muted color', () => {
    renderPage();
    const button = screen.getByText('Back').closest('button')!;
    expect(button.className).not.toContain('text-muted-foreground');
    expect(button.className).toContain(FIXED_MUTED);
  });

  it('the "Last updated" line uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText('Last updated: January 26, 2026');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('every remaining text-muted-foreground site is gone, replaced by the fixed color', () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('.text-muted-foreground').length).toBe(0);
    const fixedNodes = container.querySelectorAll(
      '[class*="text-\\[hsl\\(230\\,10\\%\\,42\\%\\)\\]"]'
    );
    // 9 sites: Back button, "Last updated" line, and the single body
    // paragraph of all 7 sections.
    expect(fixedNodes.length).toBe(9);
  });
});
