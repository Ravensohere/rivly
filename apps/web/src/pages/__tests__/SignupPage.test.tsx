/**
 * SignupPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: signup (redesign pipeline, Task 4).
 *
 * Route `/signup` (public, redirects a real/non-guest user to `/app` per
 * AnimatedRoutes.tsx). Unlike LoginPage's embedded sign-up mode, this
 * dedicated page is Google-OAuth-only — there is no email/password form, no
 * password-strength messaging, and no email-verification copy on this page
 * at all, so there is nothing here to fabricate or mismatch on either axis
 * (verified by reading the file; `signInWithGoogle` from `useAuth.ts` is the
 * only auth call this component makes). The consent line ("By clicking
 * continue, you agree to our Terms of Service and Privacy Policy") links to
 * the real `/terms` and `/privacy` routes (confirmed wired in
 * AnimatedRoutes.tsx) and makes no claim beyond pointing at them.
 *
 * Two blocks, same discipline as the other redesign-pipeline test files:
 *  - "baseline contract" — initial render (logo/back/terms/privacy/login
 *    links), the real Google sign-up call, its loading state, and that an
 *    unexpected rejection is swallowed without crashing the page (the
 *    try/catch around `signInWithGoogle`, which itself never throws in
 *    production — it returns `{ error }` and toasts internally — so this
 *    exercises the defensive catch branch). These pass against the
 *    pre-redesign code; they guard the regression this pipeline exists to
 *    prevent.
 *  - "redesign" — the measured AA contrast failure on this page's one
 *    flat-`bg-background` `text-muted-foreground` site (the "Back to Home"
 *    link; the other two `text-muted-foreground` sites sit on flat
 *    `bg-card` and already pass, left untouched per established
 *    precedent). RED before the fix, GREEN after.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const mockSignInWithGoogle = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

import SignupPage from '../SignupPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/signup']}>
        <SignupPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  mockSignInWithGoogle.mockReset();
});

describe('SignupPage — baseline contract', () => {
  it('renders the create-account heading, logo, and all real links', () => {
    renderPage();

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByText('Start your journey to a calmer, more focused day')).toBeInTheDocument();

    expect(screen.getByText('Back to Home').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByAltText('Rivly Logo').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Terms of Service').closest('a')).toHaveAttribute('href', '/terms');
    expect(screen.getByText('Privacy Policy').closest('a')).toHaveAttribute('href', '/privacy');
    expect(screen.getByText('Log in').closest('a')).toHaveAttribute('href', '/login');
  });

  it('calls the real signInWithGoogle on click', async () => {
    mockSignInWithGoogle.mockResolvedValue({ data: {} });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /sign up with google/i }));

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('disables the button while the Google sign-up is pending, then re-enables it', async () => {
    let resolve!: (v: unknown) => void;
    mockSignInWithGoogle.mockReturnValue(new Promise((res) => (resolve = res)));
    renderPage();

    const button = screen.getByRole('button', { name: /sign up with google/i });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    resolve({ data: {} });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('does not crash and resets the loading state if signInWithGoogle unexpectedly rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSignInWithGoogle.mockRejectedValue(new Error('network down'));
    renderPage();

    const button = screen.getByRole('button', { name: /sign up with google/i });
    fireEvent.click(button);

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(screen.getByText('Create your account')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});

describe('SignupPage — redesign (contrast)', () => {
  it('uses the AA-safe fixed muted color (not the raw --muted-foreground token) for the Back to Home link', () => {
    renderPage();
    const homeLink = screen.getByText('Back to Home').closest('a')!;
    expect(homeLink.className).toContain('hsl(230,10%,42%)');
    expect(homeLink.className).toContain('hsl(230,10%,55%)');
  });
});
