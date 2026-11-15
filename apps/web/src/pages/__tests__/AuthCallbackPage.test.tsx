/**
 * AuthCallbackPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: auth-callback (redesign pipeline, Task 4).
 *
 * This page is a transient OAuth-callback screen (route `/auth/callback`) —
 * a brief loading state that resolves to success (redirect to `/app`) or
 * error (stay + "Return to Rivly"). Product-fit review found the real risk
 * here is error/edge-case handling, not visual surface area, so these tests
 * weight that: the `?error=` callback param, a session that never lands
 * after both the initial check and the one retry, a `getSession()` failure,
 * and an unexpected throw — alongside the happy path and the retry-recovers
 * path.
 *
 * Two blocks, same discipline as the other redesign-pipeline test files:
 *  - "baseline contract" — status transitions, redirect targets, and the
 *    "Return to Rivly" escape hatch. These pass against the pre-redesign
 *    code; they guard the regression this pipeline exists to prevent.
 *  - "redesign" — the measured AA contrast failure shared by all three
 *    `text-muted-foreground` sites on this page's plain `bg-background`
 *    (no gradient, unlike the alarm-ringing card). RED before the fix,
 *    GREEN after.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockGetSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

import AuthCallbackPage from '../AuthCallbackPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthCallbackPage />
    </MemoryRouter>
  );
}

const fakeSession = { user: { id: 'user-1' } };
const originalLocation = window.location;

beforeEach(() => {
  vi.useFakeTimers();
  mockNavigate.mockClear();
  mockGetSession.mockReset();
  // @ts-expect-error -- jsdom location is reassignable for this narrow test need
  delete window.location;
  // @ts-expect-error -- minimal stand-in; only `.href` is read/written by this page
  window.location = { ...originalLocation, href: '' };
});

afterEach(() => {
  vi.useRealTimers();
  window.location = originalLocation;
});

describe('AuthCallbackPage — baseline contract', () => {
  it('shows the loading state immediately on mount', () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    renderAt('/auth/callback');

    expect(screen.getByText('Signing you in...')).toBeInTheDocument();
    expect(screen.getByText('Please wait a moment')).toBeInTheDocument();
  });

  it('shows the error state immediately when the URL carries ?error= without calling getSession', async () => {
    renderAt('/auth/callback?error=access_denied&error_description=User%20denied%20access');

    await waitFor(() => {
      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
    });
    expect(screen.getByText('User denied access')).toBeInTheDocument();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('falls back to the bare error code when ?error= has no error_description', async () => {
    renderAt('/auth/callback?error=server_error');

    await waitFor(() => {
      expect(screen.getByText('server_error')).toBeInTheDocument();
    });
  });

  it('shows success and redirects to /app after a session is found on the first check', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession }, error: null });
    renderAt('/auth/callback');

    await vi.advanceTimersByTimeAsync(500); // initial grace wait
    await waitFor(() => {
      expect(screen.getByText('Welcome to Rivly!')).toBeInTheDocument();
    });
    expect(window.location.href).toBe('');

    await vi.advanceTimersByTimeAsync(1500); // success -> redirect delay
    expect(window.location.href).toBe('/app');
  });

  it('retries once and succeeds when the session lands late', async () => {
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({ data: { session: fakeSession }, error: null });
    renderAt('/auth/callback');

    await vi.advanceTimersByTimeAsync(500); // initial grace wait (first getSession)
    await vi.advanceTimersByTimeAsync(1500); // retry wait (second getSession)
    await waitFor(() => {
      expect(screen.getByText('Welcome to Rivly!')).toBeInTheDocument();
    });

    await vi.advanceTimersByTimeAsync(1000); // retry-success redirect delay
    expect(window.location.href).toBe('/app');
  });

  it('shows a generic error when no session ever lands, even after the retry', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    renderAt('/auth/callback');

    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1500);
    await waitFor(() => {
      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
    });
    expect(screen.getByText('Unable to complete sign in. Please try again.')).toBeInTheDocument();
    expect(window.location.href).toBe('');
  });

  it('shows the session error message when getSession fails on the first check', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid grant' },
    });
    renderAt('/auth/callback');

    await vi.advanceTimersByTimeAsync(500);
    await waitFor(() => {
      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
    });
    expect(screen.getByText('Invalid grant')).toBeInTheDocument();
  });

  it('catches an unexpected throw from getSession and shows a generic error', async () => {
    mockGetSession.mockRejectedValue(new Error('network down'));
    renderAt('/auth/callback');

    await vi.advanceTimersByTimeAsync(500);
    await waitFor(() => {
      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
    });
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('navigates home (replacing history) when "Return to Rivly" is clicked on error', async () => {
    renderAt('/auth/callback?error=access_denied');

    await waitFor(() => {
      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Return to Rivly'));

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});

describe('AuthCallbackPage — redesign (contrast fix)', () => {
  const FIXED_MUTED =
    'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('loading subtext uses the AA-passing muted color, not the failing shared token', () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    renderAt('/auth/callback');

    const node = screen.getByText('Please wait a moment');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('success subtext uses the AA-passing muted color', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession }, error: null });
    renderAt('/auth/callback');

    await vi.advanceTimersByTimeAsync(500);
    const node = await waitFor(() => screen.getByText('Redirecting you now...'));
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('error message text uses the AA-passing muted color', async () => {
    renderAt('/auth/callback?error=access_denied&error_description=Denied');

    const node = await waitFor(() => screen.getByText('Denied'));
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });
});
