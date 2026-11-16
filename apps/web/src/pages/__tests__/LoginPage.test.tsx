/**
 * LoginPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: login (redesign pipeline, Task 4).
 *
 * Main sign-in/sign-up form (route `/login`, public — redirects real users to
 * `/app`). Product-fit review centered on the classic sign-in enumeration
 * risk: does the UI reveal whether a submitted email belongs to an existing
 * account? `signIn` (in `useAuth.ts`) calls Supabase's
 * `signInWithPassword`, which returns the identical generic "Invalid login
 * credentials" error for both a wrong password and a nonexistent account —
 * Supabase itself never differentiates the two. LoginPage renders no
 * custom error text of its own (error display is delegated entirely to the
 * shared toast system in `useAuth.ts`, untouched by this card); on any
 * `signIn`/`signUp` failure it simply stops loading and stays put. So
 * there is no component-level enumeration leak to fix here — the tests
 * below assert that both a "wrong password" failure and an "unknown
 * account" failure (same error shape, as Supabase actually returns) behave
 * identically: no navigation, no differentiating UI.
 *
 * Two blocks, same discipline as the other redesign-pipeline test files:
 *  - "baseline contract" — initial render, sign-in submit success/failure,
 *    sign-up mode toggle + submit, guest login, the empty-field guard, and
 *    the loading state. These pass against the pre-redesign code; they
 *    guard the regression this pipeline exists to prevent.
 *  - "redesign" — the measured AA contrast failures on this page's
 *    `text-muted-foreground`/`hsl(var(--muted-foreground))` sites (the
 *    shared token defect recurring across 9+ prior cards), including two
 *    opacity-stacked (`/0.6`) sites. RED before the fix, GREEN after.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignInAsGuest = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    signInAsGuest: mockSignInAsGuest,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import LoginPage from '../LoginPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  mockSignIn.mockReset();
  mockSignUp.mockReset();
  mockSignInAsGuest.mockReset();
  mockNavigate.mockReset();
});

describe('LoginPage — baseline contract', () => {
  it('renders the sign-in form by default with a link home and to forgot-password', () => {
    renderPage();

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument();

    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Forgot password?').closest('a')).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });

  it('does not call signIn when email or password is empty', () => {
    renderPage();

    const form = screen.getByPlaceholderText('Email').closest('form')!;
    fireEvent.submit(form);

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('signs in and navigates to /app on success', async () => {
    mockSignIn.mockResolvedValue({ data: { user: { id: '1' } } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'secret1'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
  });

  it('stays put with no custom error UI when the password is wrong', async () => {
    // Real Supabase signInWithPassword behavior: wrong password.
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'real@user.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);

    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByText(/does not exist|no account|not found/i)).not.toBeInTheDocument();
  });

  it('stays put with the identical no-custom-error UI when the account does not exist (no enumeration signal)', async () => {
    // Real Supabase signInWithPassword behavior: unknown email gets the SAME
    // generic error as a wrong password — never a distinguishing message.
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'nobody@nowhere.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'anything1' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);

    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByText(/does not exist|no account|not found/i)).not.toBeInTheDocument();
  });

  it('toggles to sign-up mode, shows the name field, and submits with signUp', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: '2' } } });
    renderPage();

    fireEvent.click(screen.getByText("Don't have an account? Sign up"));
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'ravi@x.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith('ravi@x.com', 'secret1', 'Ravi')
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
  });

  it('defaults the sign-up name to the email prefix when left blank', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: '3' } } });
    renderPage();

    fireEvent.click(screen.getByText("Don't have an account? Sign up"));
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'ravi@x.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith('ravi@x.com', 'secret1', 'ravi')
    );
  });

  it('signs in as guest and navigates to /app', async () => {
    mockSignInAsGuest.mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(screen.getByText('Continue as Guest'));

    await waitFor(() => expect(mockSignInAsGuest).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
  });

  it('shows a loading spinner and disables the submit button while signing in', async () => {
    let resolve!: (v: unknown) => void;
    mockSignIn.mockReturnValue(new Promise((res) => (resolve = res)));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);

    await waitFor(() => expect(screen.getByRole('button', { name: '' })).toBeDisabled());
    resolve({ data: {} });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
  });
});

describe('LoginPage — redesign (contrast)', () => {
  it('uses the AA-safe fixed muted color (not the raw --muted-foreground token) for the Home link', () => {
    renderPage();
    const homeLink = screen.getByText('Home').closest('a')!;
    expect(homeLink.className).toContain('hsl(230,10%,42%)');
  });

  it('uses the AA-safe fixed color at full opacity (not /0.6) for the "or" divider label', () => {
    renderPage();
    const orLabel = screen.getByText('or');
    expect(orLabel.className).toContain('hsl(230,10%,42%)');
    expect(orLabel.style.color).toBe('');
  });

  it('uses the AA-safe fixed color at full opacity (not /0.6) for the Terms/Privacy paragraph', () => {
    renderPage();
    const termsParagraph = screen.getByText('Terms').closest('p')!;
    expect(termsParagraph.className).toContain('hsl(230,10%,42%)');
    expect(termsParagraph.style.color).toBe('');
  });
});
