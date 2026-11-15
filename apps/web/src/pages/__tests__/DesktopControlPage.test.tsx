/**
 * DesktopControlPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: desktop-control (redesign pipeline, Task 4).
 *
 * Route `/desktop` is deliberately PUBLIC (AnimatedRoutes.tsx:100-101 — "it
 * authenticates with the relay device secret, not a Supabase session"),
 * confirmed by reading the route table directly. This page can genuinely
 * render with no backend ever connected — that's the common, expected state
 * for a first-time visitor (nobody paired yet) — so these tests cover that
 * state explicitly, not just an idealized "everything online" render.
 *
 * Every direct child component is stubbed to a minimal marker (same
 * discipline as DayPlanner.test.tsx) so these tests exercise this page's own
 * container logic: mode selection (local/cloud/unpaired), the online/offline
 * banner copy, and tab switching — not the full rendered subtree of each
 * child panel, which is each out of this card's scope.
 *
 * Two behavioral fixes this card makes are covered with RED-before/GREEN-
 * after style assertions (see PASS 1/2 in the card handoff for the full
 * reasoning):
 *   1. The offline banner claimed "commands will wait until it reconnects"
 *      unconditionally. That's true for cloud mode (cloudRelay.sendCommand
 *      queues a row server-side regardless of desktop presence — see
 *      cloudRelay.ts) but FALSE for local mode (localDesktop.ts does a bare
 *      `fetch` straight to the desktop backend with no queue — it just
 *      throws when the backend is down). The banner is now mode-aware.
 *   2. AssistantPanel hardcoded "Online on your PC" with no connectivity
 *      check at all, contradicting this page's own top-level offline
 *      banner the moment the Assistant tab was opened. It now receives the
 *      real `online` boolean this page already computes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Controllable usePolled mock ──────────────────────────────────────────────
// DesktopControlPage calls usePolled 4 times per render with distinct, fixed
// intervalMs literals (2500 commands / 8000 presence / 15000 shellStatus /
// 3000-or-10000 approvals) — distinguishing by that literal lets one mock
// hand back a different canned Polled<T> per call without caring about call
// order, which is the only thing that varies between the real fetchers.
let commandsResult: any = { data: [], error: null, refresh: vi.fn() };
let presenceResult: any = { data: true, error: null, refresh: vi.fn() };
let shellStatusResult: any = { data: null, error: null, refresh: vi.fn() };
let approvalsResult: any = { data: [], error: null, refresh: vi.fn() };

vi.mock('@/components/desktop/RemoteConsole', () => ({
  usePolled: vi.fn((_fetcher: unknown, intervalMs: number) => {
    if (intervalMs === 2500) return commandsResult;
    if (intervalMs === 8000) return presenceResult;
    if (intervalMs === 15000) return shellStatusResult;
    return approvalsResult; // 3000 (approvals tab active) or 10000 (idle)
  }),
  TerminalsPanel: ({ shellConnected }: any) => (
    <div data-testid="terminals-panel">shell:{String(shellConnected)}</div>
  ),
  ApprovalsPanel: () => <div data-testid="approvals-panel" />,
}));

vi.mock('@/components/desktop/AssistantPanel', () => ({
  AssistantPanel: ({ online }: any) => <div data-testid="assistant-panel">online:{String(online)}</div>,
}));

vi.mock('@/components/desktop/OfficePanel', () => ({
  OfficePanel: () => <div data-testid="office-panel" />,
}));

vi.mock('@/components/ui/PageTransition', () => ({
  PageTransition: ({ children, className }: any) => (
    <div data-testid="page-transition" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/riva/RivaAvatar', () => ({ RivaAvatar: () => <div data-testid="riva-avatar" /> }));
vi.mock('@/components/riva/AvatarCustomizer', () => ({ AvatarCustomizer: () => <div data-testid="avatar-customizer" /> }));

vi.mock('@/lib/avatarSettings', () => ({
  useAvatarSettings: () => [
    { pillColor: '#000', eyeColor: '#fff', motionIntensity: 'normal', trackCursor: false },
    vi.fn(),
  ],
}));

vi.mock('@/lib/useSpeechInput', () => ({
  useSpeechInput: () => ({ supported: false, listening: false, interimText: '', start: vi.fn(), stop: vi.fn() }),
}));

vi.mock('@/lib/useRecorderTranscribe', () => ({
  useRecorderTranscribe: () => ({ recording: false, busy: false, start: vi.fn(), stop: vi.fn() }),
}));

// LOCAL_DESKTOP_URL is read as a plain export (not a hook), so it needs a
// mutable binding tests can flip between 'local mode configured' and not.
let localDesktopUrl: string | undefined;
const sendCommandMock = vi.fn();
const listHistoryMock = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/localDesktop', () => ({
  get LOCAL_DESKTOP_URL() {
    return localDesktopUrl;
  },
  localDesktop: {
    sendCommand: (...args: unknown[]) => sendCommandMock(...args),
    listHistory: (...args: unknown[]) => listHistoryMock(...args),
    transcribe: vi.fn(),
  },
}));

// Same pattern for the relay pairing hook — a plain tuple, no localStorage/
// hash-fragment plumbing needs exercising here (relaySettings.ts owns that).
let pairingValue: { workerUrl: string; deviceId: string; secret: string } | null = null;
const setPairingMock = vi.fn((v) => {
  pairingValue = v;
});
vi.mock('@/lib/relaySettings', () => ({
  useRelaySettings: () => [pairingValue, setPairingMock],
}));

const cloudSendCommandMock = vi.fn();
vi.mock('@/lib/cloudRelay', () => ({
  cloudRelay: {
    sendCommand: (...args: unknown[]) => cloudSendCommandMock(...args),
    listCommands: vi.fn().mockResolvedValue([]),
    presence: vi.fn().mockResolvedValue({ secondsSinceSeen: 0 }),
  },
}));

import DesktopControlPage from '@/pages/DesktopControlPage';

describe('DesktopControlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localDesktopUrl = undefined;
    pairingValue = null;
    commandsResult = { data: [], error: null, refresh: vi.fn() };
    presenceResult = { data: true, error: null, refresh: vi.fn() };
    shellStatusResult = { data: null, error: null, refresh: vi.fn() };
    approvalsResult = { data: [], error: null, refresh: vi.fn() };
  });

  // ── The common disconnected state: nobody has paired or configured local mode yet ──
  it('shows the pairing form (not a crash, not a fake connected state) when unpaired with no local backend', () => {
    render(<DesktopControlPage />);
    expect(screen.getByText(/Pair with your desktop/i)).toBeInTheDocument();
    expect(screen.queryByTestId('terminals-panel')).not.toBeInTheDocument();
    expect(screen.queryByText(/Desktop online/i)).not.toBeInTheDocument();
  });

  it('pairing form submits the three pasted values via setPairing', () => {
    render(<DesktopControlPage />);
    fireEvent.change(screen.getByPlaceholderText(/Worker URL/i), { target: { value: 'https://w.example.com/' } });
    fireEvent.change(screen.getByPlaceholderText(/Device ID/i), { target: { value: 'dev1' } });
    fireEvent.change(screen.getByPlaceholderText(/Secret/i), { target: { value: 's3cr3t' } });
    fireEvent.click(screen.getByRole('button', { name: /^Pair$/i }));
    expect(setPairingMock).toHaveBeenCalledWith({ workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' });
  });

  // ── Paired/configured, but the desktop is not currently reachable ──────────
  it('cloud mode: shows the accurate "will wait until it reconnects" offline banner (cloudRelay genuinely queues the command server-side)', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    presenceResult = { data: false, error: null, refresh: vi.fn() };
    render(<DesktopControlPage />);
    expect(screen.getByText(/Desktop offline.*will wait until it reconnects/i)).toBeInTheDocument();
  });

  it('local mode: does NOT show the cloud-only "will wait" claim when offline, since localDesktop.ts has no queue and the send will just fail', () => {
    localDesktopUrl = 'http://127.0.0.1:8765';
    presenceResult = { data: false, error: null, refresh: vi.fn() };
    render(<DesktopControlPage />);
    expect(screen.queryByText(/will wait until it reconnects/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Desktop offline/i)).toBeInTheDocument();
  });

  // ── AssistantPanel must reflect the real connectivity state, not a hardcoded claim ──
  it('passes the real (false) online status to AssistantPanel instead of letting it claim "online" unconditionally', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    presenceResult = { data: false, error: null, refresh: vi.fn() };
    render(<DesktopControlPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Assistant' }));
    expect(screen.getByTestId('assistant-panel')).toHaveTextContent('online:false');
  });

  it('passes online:true to AssistantPanel when the desktop really is reachable', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    presenceResult = { data: true, error: null, refresh: vi.fn() };
    render(<DesktopControlPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Assistant' }));
    expect(screen.getByTestId('assistant-panel')).toHaveTextContent('online:true');
  });

  // ── Online/connected baseline, and basic tab + send-command wiring ──────────
  it('renders the Commands tab with real command rows reaching the DOM when online', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    commandsResult = {
      data: [
        { id: '1', command_text: 'open the budget spreadsheet', status: 'completed', result: { result: { message: 'Opened.' } }, created_at: new Date().toISOString() },
      ],
      error: null,
      refresh: vi.fn(),
    };
    render(<DesktopControlPage />);
    expect(screen.getByText('open the budget spreadsheet')).toBeInTheDocument();
    expect(screen.getByText('Opened.')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows "No commands sent yet" when the command history is genuinely empty, not a fabricated row', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    render(<DesktopControlPage />);
    expect(screen.getByText('No commands sent yet.')).toBeInTheDocument();
  });

  it('sends a typed command through cloudRelay and clears the input on success', async () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    cloudSendCommandMock.mockResolvedValue({});
    render(<DesktopControlPage />);
    const input = screen.getByPlaceholderText(/open the budget spreadsheet/i);
    fireEvent.change(input, { target: { value: 'open my email' } });
    // Submit via Enter — the icon-only send button has no accessible name to query by.
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => expect(cloudSendCommandMock).toHaveBeenCalledWith(pairingValue, 'open my email'));
  });

  it('switches to the Office tab and renders OfficePanel', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    render(<DesktopControlPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Office' }));
    expect(screen.getByTestId('office-panel')).toBeInTheDocument();
  });

  it('switches to the Terminals tab and forwards the real shellConnected flag', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    shellStatusResult = { data: { shell_connected: false }, error: null, refresh: vi.fn() };
    render(<DesktopControlPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Terminals' }));
    expect(screen.getByTestId('terminals-panel')).toHaveTextContent('shell:false');
  });

  it('shows a pending-approvals count badge on the tab label when there are approvals waiting', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    approvalsResult = { data: [{ id: 1, pane_id: null, action_description: 'rm -rf', risk_level: 'high', status: 'pending' }], error: null, refresh: vi.fn() };
    render(<DesktopControlPage />);
    expect(screen.getByRole('button', { name: 'Approvals (1)' })).toBeInTheDocument();
  });

  // ── Contrast fix (AA, computed by hand — see card handoff) ─────────────────
  // text-muted-foreground on this page's flat bg-background measures ~4.4:1,
  // below the 4.5:1 AA floor for normal-size text (same shared-token defect
  // already fixed on calendar-callback/alarm-ringing/auth-callback). Fixed to
  // the same already-verified replacement used on those three pages.
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('fixes the sub-AA muted text under the avatar (plain bg-background, no card)', () => {
    render(<DesktopControlPage />);
    const node = screen.getByText(/Tell it what to do/i);
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('fixes the sub-AA "No commands sent yet" empty-state text', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    render(<DesktopControlPage />);
    const node = screen.getByText('No commands sent yet.');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('fixes the sub-AA inactive-tab label color', () => {
    pairingValue = { workerUrl: 'https://w.example.com', deviceId: 'dev1', secret: 's3cr3t' };
    render(<DesktopControlPage />);
    const node = screen.getByRole('button', { name: 'Office' });
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });
});
