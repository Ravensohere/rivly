/**
 * ForgotPasswordPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: forgot-password (redesign pipeline, Task 4).
 *
 * Small auth form (route `/forgot-password`, public/unguarded). Product-fit
 * review centered on the password-reset enumeration risk: does the UI reveal
 * whether a submitted email has an account? The real `resetPassword` (in
 * `useAuth.ts`) deliberately returns the same success shape whether or not
 * the address exists (Supabase's `resetPasswordForEmail` itself never errors
 * for an unknown address), and this page shows one confirmation copy for
 * both cases — no enumeration leak found, so these tests assert the single
 * success path rather than a non-existent "email not found" branch.
 *
 * Two blocks, same discipline as the other redesign-pipeline test files:
 *  - "baseline contract" — initial render, the submit-success and
 *    submit-error states, the loading state, and the guard against
 *    submitting with no email. These pass against the pre-redesign code;
 *    they guard the regression this pipeline exists to prevent.
 *  - "redesign" — the measured AA contrast failure shared by all three
 *    `text-muted-foreground` sites on this page's `gradient-calm` background
 *    (same shared token, same defect as 6+ prior cards). RED before the
 *    fix, GREEN after.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const mockResetPassword = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ resetPassword: mockResetPassword }),
  useAuth: () => ({ resetPassword: mockResetPassword }),
}));

import ForgotPasswordPage from '../ForgotPasswordPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPasswordPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  mockResetPassword.mockReset();
});

describe('ForgotPasswordPage — baseline contract', () => {
  it('renders the request form with a link back to sign in', () => {
    renderPage();

    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    expect(
      screen.getByText("Enter your email and we'll send you a link to set a new one.")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();

    const backLink = screen.getByText('Back to sign in');
    expect(backLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('does not call resetPassword when the email field is empty', () => {
    renderPage();

    const form = screen.getByPlaceholderText('Email').closest('form')!;
    fireEvent.submit(form);

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    mockResetPassword.mockReturnValue(new Promise((r) => (resolve = r)));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    });

    resolve({ data: true });
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('shows the same success confirmation on submit, echoing the entered address', async () => {
    mockResetPassword.mockResolvedValue({ data: true });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
    expect(mockResetPassword).toHaveBeenCalledWith('person@example.com');
    expect(screen.getByText('person@example.com')).toBeInTheDocument();
    expect(
      screen.getByText(/has an account, we've/)
    ).toBeInTheDocument();
    // Two "Back to sign in" links coexist in the success state: the
    // always-rendered top nav link and the success panel's own button.
    const backLinks = screen.getAllByRole('link', { name: 'Back to sign in' });
    expect(backLinks).toHaveLength(2);
    backLinks.forEach((link) => expect(link).toHaveAttribute('href', '/login'));
  });

  it('stays on the request form (no success state) when resetPassword returns an error', async () => {
    mockResetPassword.mockResolvedValue({ error: { message: 'Rate limited' } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send reset link' })).not.toBeDisabled();
    });
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });
});

describe('ForgotPasswordPage — redesign (contrast fix)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('back-to-sign-in link uses the AA-passing muted color, not the failing shared token', () => {
    renderPage();

    const node = screen.getByText('Back to sign in').closest('a')!;
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('request-form instruction text uses the AA-passing muted color', () => {
    renderPage();

    const node = screen.getByText(
      "Enter your email and we'll send you a link to set a new one."
    );
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('success confirmation text uses the AA-passing muted color', async () => {
    mockResetPassword.mockResolvedValue({ data: true });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    const node = await waitFor(() => screen.getByText(/has an account, we've/));
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });
});
