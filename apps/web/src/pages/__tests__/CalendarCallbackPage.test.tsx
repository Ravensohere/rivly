/**
 * CalendarCallbackPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: calendar-callback (redesign pipeline, Task 4).
 *
 * This page is a transient OAuth-callback screen (route `/calendar/callback`,
 * route-guarded on `user` in AnimatedRoutes.tsx) — a brief loading state that
 * resolves to success (toast + redirect to `/settings`) or error (stay +
 * "Return to Settings"). Same precedent as `auth-callback`: the real risk is
 * error/edge-case handling, not visual surface area, so these tests weight
 * that — the `?error=` IdP-denial param, missing `code`, no session, the
 * edge-function failure (401 vs. other status), a `data.error` payload, and
 * an unexpected throw — alongside the happy path.
 *
 * Two blocks, same discipline as the other redesign-pipeline test files:
 *  - "baseline contract" — status transitions, error copy, and the
 *    "Return to Settings" escape hatch. These pass against the
 *    pre-redesign code; they guard the regression this pipeline exists to
 *    prevent.
 *  - "redesign" — the measured AA contrast failure shared by all three
 *    `text-muted-foreground` sites on this page's plain `bg-background`
 *    (no gradient). RED before the fix, GREEN after.
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
const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import CalendarCallbackPage from '../CalendarCallbackPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CalendarCallbackPage />
    </MemoryRouter>
  );
}

const fakeSession = { access_token: 'token-123', user: { id: 'user-1' } };

beforeEach(() => {
  vi.useFakeTimers();
  mockNavigate.mockClear();
  mockGetSession.mockReset();
  mockInvoke.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CalendarCallbackPage — baseline contract', () => {
  it('shows the loading state immediately on mount', () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
    renderAt('/calendar/callback?code=abc123');

    expect(screen.getByText('Connecting Calendar...')).toBeInTheDocument();
    expect(screen.getByText('Please wait a moment')).toBeInTheDocument();
  });

  it('shows the error state immediately when the URL carries ?error= without calling getSession', async () => {
    renderAt('/calendar/callback?error=access_denied&error_description=User%20denied%20access');

    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
    expect(screen.getByText('User denied access')).toBeInTheDocument();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('falls back to the bare error code when ?error= has no error_description', async () => {
    renderAt('/calendar/callback?error=server_error');

    await waitFor(() => {
      expect(screen.getByText('server_error')).toBeInTheDocument();
    });
  });

  it('shows "No authorization code received" when ?code= is missing (and no ?error=)', async () => {
    renderAt('/calendar/callback');

    await waitFor(() => {
      expect(screen.getByText('No authorization code received')).toBeInTheDocument();
    });
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('shows the logged-out error when no session is found', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderAt('/calendar/callback?code=abc123');

    await waitFor(() => {
      expect(screen.getByText('You must be logged in to connect your calendar')).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('shows a specific message for a 401 from the edge function', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Unauthorized', status: 401 },
    });
    renderAt('/calendar/callback?code=abc123');

    await waitFor(() => {
      expect(
        screen.getByText(
          'Authentication failed. Please try logging out and back in, then reconnect your calendar.'
        )
      ).toBeInTheDocument();
    });
  });

  it('shows the edge function error message for a non-401 failure', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Google OAuth not configured', status: 500 },
    });
    renderAt('/calendar/callback?code=abc123');

    await waitFor(() => {
      expect(screen.getByText('Google OAuth not configured')).toBeInTheDocument();
    });
  });

  it('shows the data.error payload when the function responds 200 with an error field', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockInvoke.mockResolvedValue({ data: { error: 'Failed to save connection' }, error: null });
    renderAt('/calendar/callback?code=abc123');

    await waitFor(() => {
      expect(screen.getByText('Failed to save connection')).toBeInTheDocument();
    });
  });

  it('shows success and redirects to /settings after a brief delay', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockInvoke.mockResolvedValue({ data: { success: true, email: 'a@b.com' }, error: null });
    renderAt('/calendar/callback?code=abc123');

    await waitFor(() => {
      expect(screen.getByText('Calendar Connected!')).toBeInTheDocument();
    });
    expect(screen.getByText('Your events will now appear in Rivly')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1500);
    expect(mockNavigate).toHaveBeenCalledWith('/settings', { replace: true });
  });

  it('catches an unexpected throw and shows a generic error', async () => {
    mockGetSession.mockRejectedValue(new Error('network down'));
    renderAt('/calendar/callback?code=abc123');

    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('navigates to /settings (replacing history) when "Return to Settings" is clicked on error', async () => {
    renderAt('/calendar/callback?error=access_denied');

    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Return to Settings'));

    expect(mockNavigate).toHaveBeenCalledWith('/settings', { replace: true });
  });
});

describe('CalendarCallbackPage — redesign (contrast fix)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('loading subtext uses the AA-passing muted color, not the failing shared token', () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
    renderAt('/calendar/callback?code=abc123');

    const node = screen.getByText('Please wait a moment');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('success subtext uses the AA-passing muted color', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
    renderAt('/calendar/callback?code=abc123');

    const node = await waitFor(() => screen.getByText('Your events will now appear in Rivly'));
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('error message text uses the AA-passing muted color', async () => {
    renderAt('/calendar/callback?error=access_denied&error_description=Denied');

    const node = await waitFor(() => screen.getByText('Denied'));
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });
});
