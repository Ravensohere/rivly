/**
 * PrivacyPolicyPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: privacy-policy (redesign pipeline, Task 4). Public route `/privacy`
 * (`AnimatedRoutes.tsx:53`, lazy-imported at :19) — no auth guard.
 *
 * This card is visual/accessibility-only: the plan's Review Focus singles out
 * `PrivacyPolicyPage.tsx` by name as a page where an unintended wording change
 * matters more than visual polish. The baseline test below captures the full
 * rendered text content as one string so any accidental change to the legal
 * copy itself fails loudly, independent of the contrast/className fixes below.
 *
 * Contrast audit (hand HSL->sRGB->relative-luminance, same tokens as the
 * `not-found`/`onboarding` cards: `--background: 38 35% 96%` / dark `230 22%
 * 8%`, `--muted-foreground: 230 10% 48%` / dark `230 10% 55%`). Every
 * `text-muted-foreground` site on this page sits on the same flat
 * `bg-background` (no gradient/opacity stacking anywhere in this file) — 10
 * sites total: the "Back" button, the "Last updated" line, and the intro
 * paragraph + list/body text of all 5 sections (2 sites per section). All 10
 * fail the same way the `not-found` card's single flat site did (4.385:1
 * light / 5.109:1 dark). Fixed with the pipeline's established remediation
 * (`text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]`), re-verified at
 * 5.422:1 light / 5.109:1 dark.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';

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
      <PrivacyPolicyPage />
    </MemoryRouter>
  );
}

// Captured verbatim from the unmodified component's rendered DOM — proves the
// legal text itself is byte-identical before and after this card's styling
// fixes. Any wording change to the policy will change this string and fail
// this test loudly, regardless of className changes elsewhere.
const BASELINE_TEXT_CONTENT =
  ' BackPrivacy PolicyLast updated: January 26, 20261. Information We CollectRivly collects information to provide a better experience to all our users. This includes:Profile Information: Name and email address provided during Google Sign-In.Google Calendar Data: If you connect your calendar, we access your calendar events and metadata to display them within the app.App Preferences: Your customized settings, such as theme and notification preferences.2. How We Use InformationWe use the collected information to:Provide and maintain the Rivly services.Display your Google Calendar events to help you plan your day.Personalize your experience with greetings and reminders.Improve app performance and functionality.3. Google API DisclosureRivly\'s use and transfer to any other app of information received from Google APIs will adhere toGoogle API Service User Data Policy, including the Limited Use requirements.We do not store your calendar events on our servers. The data is fetched directly from Google APIs and displayed locally in your browser/app.4. Data SecurityWe use industry-standard security measures to protect your data. Your profile and preferences are stored securely using Supabase. We never sell your personal data to third parties.5. Contact UsIf you have any questions about this Privacy Policy, please contact us atravenso.here@gmail.com.';

describe('PrivacyPolicyPage — text content is unchanged (legal-copy guard)', () => {
  it('renders the exact baseline policy text, byte-identical', () => {
    const { container } = renderPage();
    expect(container.textContent).toBe(BASELINE_TEXT_CONTENT);
  });
});

describe('PrivacyPolicyPage — core content', () => {
  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
  });

  it('renders all five section headings', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '1. Information We Collect' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. How We Use Information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3. Google API Disclosure' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '4. Data Security' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '5. Contact Us' })).toBeInTheDocument();
  });

  it('links to the real Google API Service User Data Policy', () => {
    renderPage();
    const link = screen.getByText('Google API Service User Data Policy');
    expect(link).toHaveAttribute(
      'href',
      'https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('"Back" button navigates back in history, not to a hardcoded route', () => {
    renderPage();
    screen.getByText('Back').closest('button')!.click();
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

describe('PrivacyPolicyPage — contrast fix (recurring text-muted-foreground-on-background defect)', () => {
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
    // 10 sites: Back button, "Last updated" line, and the body/list copy of
    // all 5 sections (2 per section: intro paragraph + list/second paragraph).
    expect(fixedNodes.length).toBe(10);
  });
});
