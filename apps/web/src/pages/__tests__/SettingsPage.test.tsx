/**
 * SettingsPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: settings (redesign pipeline, Task 4).
 *
 * SettingsPage is the authenticated settings page (route `/settings`,
 * protected in AnimatedRoutes.tsx: `user ? <SettingsPage /> : <Navigate to="/login">`).
 *
 * Per the card's product-fit pass: of the many toggles/selects on this page,
 * 7 write a real preference to local storage but are NEVER read by any other
 * part of the app (grep-confirmed repo-wide) — Default Sound, Default Timer,
 * Auto-fade, Voice Persona, Daily Reminder (+time), Wind Down (+time), Gentle
 * Wake. This file still asserts their onChange/onClick wiring calls
 * `updatePreferences`/`updateAuthProfile` correctly (that IS the real,
 * verifiable behavior of this component), because the absence of a *consumer*
 * elsewhere in the app is a project-level gap, not something this page's own
 * unit test can represent differently — see the card handoff for the full
 * escalation. No account-deletion/data-export control exists on this page
 * (or anywhere in the app, grep-confirmed) — also escalated, not built here.
 *
 * Child sub-components (GoogleAccountSection/GoogleCalendarSection/
 * InboxRadarSection, WheelTimePicker/TimePickerTrigger) are shallow-stubbed
 * so this file tests SettingsPage's own wiring, per the day-planner/profile
 * precedent (card scope = the named page file).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-router-dom ─────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── sonner ────────────────────────────────────────────────────────────────────
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Hooks / contexts (module mocks; configured per-test) ────────────────────
const mockSignOut = vi.fn();
const mockUpdateAuthProfile = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: vi.fn() }));
vi.mock('@/hooks/useTheme', () => ({ useTheme: vi.fn() }));
vi.mock('@/hooks/useUserPreferences', () => ({ useUserPreferences: vi.fn() }));
vi.mock('@/hooks/useOnboarding', () => ({ useOnboarding: vi.fn() }));
vi.mock('@/hooks/useReflection', () => ({ useReflection: vi.fn() }));
vi.mock('@/hooks/useParkedThoughts', () => ({ useParkedThoughts: vi.fn() }));
vi.mock('@/contexts/FocusTimerContext', () => ({ useFocusTimer: vi.fn() }));

// ── Child components — shallow stubs so this file tests SettingsPage's own
//    wiring (these have no card of their own; out of this card's scope) ─────
vi.mock('@/components/settings/GoogleAccountSection', () => ({
  GoogleAccountSection: () => <div data-testid="google-account-section" />,
}));
vi.mock('@/components/settings/GoogleCalendarSection', () => ({
  GoogleCalendarSection: () => <div data-testid="google-calendar-section" />,
}));
vi.mock('@/components/settings/InboxRadarSection', () => ({
  InboxRadarSection: () => <div data-testid="inbox-radar-section" />,
}));
vi.mock('@/components/ui/WheelTimePicker', () => ({
  WheelTimePicker: ({ open }: any) => (open ? <div data-testid="wheel-time-picker-open" /> : null),
  TimePickerTrigger: ({ value, onClick }: any) => (
    <button type="button" data-testid="time-picker-trigger" onClick={onClick}>{value}</button>
  ),
}));

import SettingsPage from '@/pages/SettingsPage';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useReflection } from '@/hooks/useReflection';
import { useParkedThoughts } from '@/hooks/useParkedThoughts';
import { useFocusTimer } from '@/contexts/FocusTimerContext';
import { toast } from 'sonner';

const mockSetTheme = vi.fn();
const mockUpdatePreferences = vi.fn();
const mockSetLocalFirstName = vi.fn();
const mockLogoutLocal = vi.fn();
const mockResetUserPrefs = vi.fn();
const mockResetTutorialOnly = vi.fn();
const mockResetOnboarding = vi.fn();
const mockClearReflections = vi.fn();
const mockClearAllThoughts = vi.fn();
const mockResetTimerPosition = vi.fn();

function setupDefaultMocks(overrides: {
  isGuest?: boolean;
  user?: any;
  profile?: any;
  themeMode?: string;
  prefs?: Partial<Record<string, any>>;
  timerPosition?: { x: number; y: number };
} = {}) {
  (useAuthContext as any).mockReturnValue({
    signOut: mockSignOut,
    user: 'user' in overrides ? overrides.user : { id: 'u1', email: 'ravi@example.com' },
    profile: 'profile' in overrides ? overrides.profile : { name: 'Ravi' },
    isGuest: overrides.isGuest ?? false,
    updateProfile: mockUpdateAuthProfile,
  });
  (useTheme as any).mockReturnValue({
    themeMode: overrides.themeMode ?? 'light',
    setTheme: mockSetTheme,
  });
  (useUserPreferences as any).mockReturnValue({
    firstName: null,
    email: null,
    authProvider: null,
    calendarConnected: false,
    calendarLastSync: null,
    defaultSleepSound: null,
    defaultSleepTimer: 30,
    defaultAutoFade: false,
    dailyReminderEnabled: false,
    dailyReminderTime: '09:00',
    windDownReminderEnabled: true,
    windDownReminderTime: '21:30',
    gentleWakeEnabled: true,
    rivaLanguage: 'english',
    voiceId: 'arvind',
    updatePreferences: mockUpdatePreferences,
    setFirstName: mockSetLocalFirstName,
    connectCalendar: vi.fn(),
    disconnectCalendar: vi.fn(),
    logout: mockLogoutLocal,
    resetOnboarding: mockResetUserPrefs,
    ...overrides.prefs,
  });
  (useOnboarding as any).mockReturnValue({
    resetTutorialOnly: mockResetTutorialOnly,
    resetOnboarding: mockResetOnboarding,
  });
  (useReflection as any).mockReturnValue({ clearAllEntries: mockClearReflections });
  (useParkedThoughts as any).mockReturnValue({ clearAllThoughts: mockClearAllThoughts });
  (useFocusTimer as any).mockReturnValue({
    resetTimerPosition: mockResetTimerPosition,
    timerPosition: overrides.timerPosition ?? { x: 0, y: 0 },
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}

const originalLocation = window.location;
let mockReload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  setupDefaultMocks();
  mockReload = vi.fn();
  // @ts-expect-error -- jsdom location is reassignable for this narrow test need
  delete window.location;
  // @ts-expect-error -- minimal stand-in; only `.href`/`.reload` are used by this page
  window.location = { ...originalLocation, href: '', reload: mockReload };
});

afterEach(() => {
  window.location = originalLocation;
  vi.useRealTimers();
});

describe('SettingsPage — baseline rendering', () => {
  it('renders the Settings heading and subtitle', () => {
    renderPage();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Customize your experience')).toBeInTheDocument();
  });

  it('renders the real Google/Calendar/Inbox sub-sections (not placeholders)', () => {
    renderPage();
    expect(screen.getByTestId('google-account-section')).toBeInTheDocument();
    expect(screen.getByTestId('google-calendar-section')).toBeInTheDocument();
    expect(screen.getByTestId('inbox-radar-section')).toBeInTheDocument();
  });

  it('shows the authenticated name and email', () => {
    renderPage();
    expect(screen.getByText('Ravi')).toBeInTheDocument();
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument();
  });
});

describe('SettingsPage — Profile: name edit', () => {
  it('saves the new name via the real Supabase profile update when authenticated', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Ravi'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Ravi K' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(mockUpdateAuthProfile).toHaveBeenCalledWith({ name: 'Ravi K' });
    expect(mockSetLocalFirstName).toHaveBeenCalledWith('Ravi K');
    expect(toast.success).toHaveBeenCalledWith('Name updated');
  });

  it('does not call the Supabase profile update for a guest (local-only save)', () => {
    setupDefaultMocks({ isGuest: true, user: null, profile: null, prefs: { firstName: 'Guesty' } });
    renderPage();
    fireEvent.click(screen.getByText('Guesty'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Guest Name' } });
    fireEvent.click(screen.getByText('Save'));

    expect(mockUpdateAuthProfile).not.toHaveBeenCalled();
    expect(mockSetLocalFirstName).toHaveBeenCalledWith('New Guest Name');
  });
});

describe('SettingsPage — Profile: logout', () => {
  it('signs out and hard-navigates to "/" when the user confirms', async () => {
    mockSignOut.mockResolvedValue(undefined);
    vi.stubGlobal('confirm', vi.fn(() => true));
    renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockLogoutLocal).toHaveBeenCalled();
    expect(window.location.href).toBe('/');
  });

  it('does nothing when the user cancels the confirm dialog', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
    });
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(window.location.href).toBe('');
  });
});

describe('SettingsPage — Appearance', () => {
  it('calls setTheme with the clicked option and highlights the active theme', () => {
    renderPage();
    const lightBtn = screen.getByText('Light').closest('button')!;
    const darkBtn = screen.getByText('Dark').closest('button')!;
    expect(lightBtn.className).toContain('bg-primary');
    expect(darkBtn.className).toContain('bg-secondary');

    fireEvent.click(darkBtn);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('disables Reset when the focus timer is already at the default position', () => {
    renderPage();
    // Two "Reset" buttons exist on this page (Focus Timer Position, Reset
    // Onboarding) — this one is the Appearance section's, rendered first.
    expect(screen.getAllByRole('button', { name: 'Reset' })[0]).toBeDisabled();
  });

  it('resets the focus timer position when not already centered', () => {
    setupDefaultMocks({ timerPosition: { x: 40, y: 0 } });
    renderPage();
    const resetBtn = screen.getAllByRole('button', { name: 'Reset' })[0];
    expect(resetBtn).not.toBeDisabled();
    fireEvent.click(resetBtn);
    expect(mockResetTimerPosition).toHaveBeenCalled();
  });
});

describe('SettingsPage — Sound & Sleep preferences write real local state', () => {
  it('updates the default sound preference', () => {
    renderPage();
    fireEvent.change(document.getElementById('default-sleep-sound')!, { target: { value: 'ocean-waves' } });
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ defaultSleepSound: 'ocean-waves' });
  });

  it('updates the default timer preference', () => {
    renderPage();
    fireEvent.change(document.getElementById('default-sleep-timer')!, { target: { value: '45' } });
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ defaultSleepTimer: 45 });
  });

  it('toggles the auto-fade preference', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('switch')[0]);
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ defaultAutoFade: true });
  });
});

describe('SettingsPage — Voice & Assistant', () => {
  it('updates rivaLanguage when a language pill is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('हिंदी (Hindi)'));
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ rivaLanguage: 'hindi' });
  });

  it('reflects the real voiceId as the select value without a second hook call, and updates it on change', () => {
    renderPage();
    const select = document.getElementById('voice-persona') as HTMLSelectElement;
    expect(select.value).toBe('arvind');
    fireEvent.change(select, { target: { value: 'ishita' } });
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ voiceId: 'ishita' });
  });

  it('toggles the AI Companion preference in real localStorage', () => {
    renderPage();
    const aiSwitch = screen.getAllByRole('switch')[1];
    expect(aiSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(aiSwitch);
    expect(window.localStorage.getItem('rivly_online_ai_enabled')).toBe('true');
  });
});

describe('SettingsPage — Notifications toggles write real local state', () => {
  it('shows the time row only for the currently-enabled reminder, and toggles Daily Reminder on', () => {
    renderPage();
    // dailyReminderEnabled: false (no time row yet) + windDownReminderEnabled: true (time row shown) = 1
    expect(screen.queryAllByTestId('time-picker-trigger')).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('switch')[2]);
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ dailyReminderEnabled: true });
  });

  it('toggles Wind Down off', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('switch')[3]);
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ windDownReminderEnabled: false });
  });

  it('toggles Gentle Wake off', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('switch')[4]);
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ gentleWakeEnabled: false });
  });
});

describe('SettingsPage — Tutorial', () => {
  it('replays the tutorial and navigates to /app', () => {
    vi.useFakeTimers();
    renderPage();
    fireEvent.click(screen.getByText('Replay'));
    expect(mockResetTutorialOnly).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Tutorial will start now');
    vi.advanceTimersByTime(600);
    expect(window.location.href).toBe('/app');
  });

  it('resets onboarding and reloads when confirmed', () => {
    vi.useFakeTimers();
    vi.stubGlobal('confirm', vi.fn(() => true));
    renderPage();
    // Second "Reset"-labelled button on the page is Tutorial's Reset Onboarding.
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset' })[1]);
    expect(mockResetOnboarding).toHaveBeenCalled();
    expect(mockResetUserPrefs).toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(mockReload).toHaveBeenCalled();
  });
});

describe('SettingsPage — Privacy: real clear actions', () => {
  it('Clear Reflections calls the real useReflection hook clear function, not a raw localStorage write', () => {
    vi.useFakeTimers();
    vi.stubGlobal('confirm', vi.fn(() => true));
    renderPage();
    fireEvent.click(screen.getAllByText('Clear')[0]);
    expect(mockClearReflections).toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(mockReload).toHaveBeenCalled();
  });

  it('Clear Thoughts calls the real useParkedThoughts clear function', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    renderPage();
    await act(async () => {
      fireEvent.click(screen.getAllByText('Clear')[1]);
    });
    expect(mockClearAllThoughts).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('All thoughts cleared');
  });

  it('does nothing when the clear confirmations are cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    renderPage();
    fireEvent.click(screen.getAllByText('Clear')[0]);
    await act(async () => {
      fireEvent.click(screen.getAllByText('Clear')[1]);
    });
    expect(mockClearReflections).not.toHaveBeenCalled();
    expect(mockClearAllThoughts).not.toHaveBeenCalled();
  });
});

describe('SettingsPage — Legal navigation', () => {
  it('navigates to /privacy and /terms', () => {
    renderPage();
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/privacy');
    fireEvent.click(viewButtons[1]);
    expect(mockNavigate).toHaveBeenCalledWith('/terms');
  });
});

describe('SettingsPage — About', () => {
  it('renders the app name and version', () => {
    renderPage();
    expect(screen.getByText('Rivly')).toBeInTheDocument();
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
  });
});

describe('SettingsPage — redesign (AA contrast fixes)', () => {
  const FLAT_FIX = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';
  const SECONDARY_FIX = 'text-[hsl(230,10%,40%)] dark:text-[hsl(230,10%,60%)]';

  it('the page subtitle (flat page background) uses the AA-passing muted color', () => {
    renderPage();
    const node = screen.getByText('Customize your experience');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FLAT_FIX);
  });

  it('inactive theme pills (bg-secondary) use the bg-secondary-specific AA-passing color', () => {
    renderPage();
    const node = screen.getByText('Dark').closest('button')!;
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(SECONDARY_FIX);
  });

  it('inactive language pills (bg-secondary) use the bg-secondary-specific AA-passing color', () => {
    renderPage();
    const node = screen.getByText('हिंदी (Hindi)');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(SECONDARY_FIX);
  });

  it('"Voice uses credits" drops the opacity-stacked /60 modifier that failed AA on bg-card', () => {
    renderPage();
    const node = screen.getByText('Voice uses credits');
    expect(node.className).not.toContain('text-muted-foreground/60');
    expect(node.className).toContain('text-muted-foreground');
  });

  it('leaves already-passing bg-card sites (e.g. the email row) on bare text-muted-foreground', () => {
    renderPage();
    const node = screen.getByText('ravi@example.com').closest('div')!;
    expect(node.className).toContain('text-muted-foreground');
  });
});
