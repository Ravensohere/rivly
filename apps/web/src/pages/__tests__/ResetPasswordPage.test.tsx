/**
 * ResetPasswordPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: reset-password (redesign pipeline, Task 4).
 *
 * Companion page to `forgot-password` — the OTP/recovery link lands here.
 * Route `/reset-password`, public/unguarded (the recovery token itself is
 * the credential; `AnimatedRoutes.tsx:64` confirms no auth guard wraps it).
 *
 * Product-fit review centered on two things:
 *  1. Link-validity detection. The real page doesn't trust the URL alone —
 *     supabase-js exchanges the recovery token for a session asynchronously
 *     (`detectSessionInUrl`), so the component races `getSession()` /
 *     `onAuthStateChange` against a 5s timeout and only then commits to
 *     "valid" or "invalid". These tests drive that via a mocked `supabase`
 *     client and fake timers rather than a real expired token (which the
 *     merge gate's no-secrets/no-live-backend constraint makes unobtainable
 *     in this environment) — this is the documented, escalation-worthy edge
 *     named in the card brief, but the underlying state machine (checking →
 *     valid/invalid, each rendering the right UI) is fully exercisable this
 *     way, so no escalation was needed.
 *  2. Password validation parity with the real `updateUser({ password })`
 *     call and the UI's own claims (min length, confirm-match, submit guard).
 *
 * Two blocks, same discipline as the other redesign-pipeline test files:
 *  - "baseline contract" — the checking/valid/invalid states, password
 *    validation (too-short, mismatch, submit guard), submit success
 *    (navigates to /app) and submit error (stays put). These pass against
 *    the pre-redesign code; they guard the regression this pipeline exists
 *    to prevent.
 *  - "redesign" — the measured AA contrast failure shared by all three
 *    `text-muted-foreground` sites on this page's `gradient-calm` background
 *    (same shared token/defect fixed on the companion `forgot-password`
 *    page). RED before the fix, GREEN after.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const mockUpdatePassword = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ updatePassword: mockUpdatePassword }),
  useAuth: () => ({ updatePassword: mockUpdatePassword }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

let authStateCallback: ((event: string, session: unknown) => void) | null = null;
const mockGetSession = vi.fn();
const mockUnsubscribe = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
    },
  },
}));

import ResetPasswordPage from '../ResetPasswordPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/reset-password']}>
        <ResetPasswordPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  mockUpdatePassword.mockReset();
  mockNavigate.mockReset();
  mockGetSession.mockReset();
  mockUnsubscribe.mockReset();
  authStateCallback = null;
  // Default: no session yet (mirrors the token-exchange-in-flight state).
  mockGetSession.mockResolvedValue({ data: { session: null } });
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderAndMarkValid() {
  renderPage();
  await act(async () => {
    authStateCallback?.('PASSWORD_RECOVERY', { user: { id: '1' } });
  });
  await waitFor(() => {
    expect(screen.getByText('Choose a new password')).toBeInTheDocument();
  });
}

describe('ResetPasswordPage — baseline contract', () => {
  it('shows a checking state on first render before the session resolves', () => {
    renderPage();

    expect(screen.getByText('Checking your link…')).toBeInTheDocument();
    expect(screen.queryByText('Choose a new password')).not.toBeInTheDocument();
    expect(screen.queryByText('This link has expired')).not.toBeInTheDocument();
  });

  it('shows the set-new-password form once a session is detected via getSession', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: '1' } } } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Choose a new password')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('New password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
  });

  it('shows the set-new-password form once PASSWORD_RECOVERY fires via onAuthStateChange', async () => {
    await renderAndMarkValid();

    expect(screen.getByRole('button', { name: 'Set new password' })).toBeInTheDocument();
  });

  it('shows the expired-link state once the token-exchange timeout elapses with no session', async () => {
    vi.useFakeTimers();
    renderPage();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('This link has expired')).toBeInTheDocument();
    const link = screen.getByText('Send a new link').closest('a')!;
    expect(link).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByText('Choose a new password')).not.toBeInTheDocument();
  });

  it('disables submit until the password is long enough and matches', async () => {
    await renderAndMarkValid();

    const submit = screen.getByRole('button', { name: 'Set new password' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'short' } });
    expect(submit).toBeDisabled();
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'longenough' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'different' } });
    expect(submit).toBeDisabled();
    expect(screen.getByText("Those don't match yet.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'longenough' } });
    expect(submit).not.toBeDisabled();
    expect(screen.queryByText("Those don't match yet.")).not.toBeInTheDocument();
  });

  it('calls updatePassword and navigates to /app on success', async () => {
    mockUpdatePassword.mockResolvedValue({ data: true });
    await renderAndMarkValid();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'longenough' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'longenough' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }));

    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith('longenough'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
  });

  it('stays on the form (no navigation) when updatePassword returns an error', async () => {
    mockUpdatePassword.mockResolvedValue({ error: { message: 'Token expired' } });
    await renderAndMarkValid();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'longenough' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'longenough' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }));

    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Choose a new password')).toBeInTheDocument();
  });

  it('shows a loading state while the update is in flight', async () => {
    let resolve!: (v: unknown) => void;
    mockUpdatePassword.mockReturnValue(new Promise((r) => (resolve = r)));
    await renderAndMarkValid();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'longenough' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'longenough' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    });
    resolve({ data: true });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
  });
});

describe('ResetPasswordPage — redesign (contrast fix)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('checking-state text uses the AA-passing muted color', () => {
    renderPage();

    const node = screen.getByText('Checking your link…');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('expired-link instruction text uses the AA-passing muted color', async () => {
    vi.useFakeTimers();
    renderPage();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    const node = screen.getByText(/Reset links are single-use/);
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('valid-form instruction text uses the AA-passing muted color', async () => {
    await renderAndMarkValid();

    const node = screen.getByText('Make it at least 6 characters.');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });
});
