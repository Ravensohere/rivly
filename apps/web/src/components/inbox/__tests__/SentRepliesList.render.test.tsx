import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SentRepliesList } from '../SentRepliesList';
import { useSentReplies } from '@/hooks/useSentReplies';

vi.mock('@/hooks/useSentReplies');
const mockUseSentReplies = useSentReplies as unknown as ReturnType<typeof vi.fn>;

describe('SentRepliesList', () => {
  it('tells a disconnected user to connect, not that they have no sent mail', () => {
    mockUseSentReplies.mockReturnValue({ sent: [], isLoading: false, connected: false, gmailConnected: null, error: undefined });
    render(<SentRepliesList />);
    expect(screen.getByText(/Connect Google in Settings/)).toBeInTheDocument();
  });

  it('tells a Calendar-only user (no Gmail scope) to connect Gmail specifically', () => {
    mockUseSentReplies.mockReturnValue({ sent: [], isLoading: false, connected: true, gmailConnected: false, error: undefined });
    render(<SentRepliesList />);
    expect(screen.getByText(/Connect Gmail/)).toBeInTheDocument();
  });

  it('surfaces the server-provided error instead of claiming there is no sent mail', () => {
    mockUseSentReplies.mockReturnValue({ sent: [], isLoading: false, connected: true, gmailConnected: true, error: 'Google access expired. Reconnect your account.' });
    render(<SentRepliesList />);
    expect(screen.getByText('Google access expired. Reconnect your account.')).toBeInTheDocument();
  });

  it('shows the genuine empty state when fully connected with no error and no sent mail', () => {
    mockUseSentReplies.mockReturnValue({ sent: [], isLoading: false, connected: true, gmailConnected: true, error: undefined });
    render(<SentRepliesList />);
    expect(screen.getByText('No sent mail yet.')).toBeInTheDocument();
  });
});
