import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { DEFAULT_INBOX_CATEGORIES, type InboxCategory } from '@/lib/inboxCategories';

export interface TaskSuggestion {
  id: string;
  source: 'gmail' | 'calendar';
  /** Gmail message id / calendar event id — used to deep-link back to the source. */
  source_ref: string;
  title: string;
  category: InboxCategory;
  due_at: string | null;
  amount: number | null;
  snippet: string | null;
  sender: string | null;
  /** Present on meetings that carry a joinable conference link. */
  meeting_url?: string | null;
  /** Exact start time for timed meetings. */
  starts_at?: string | null;
}

export interface InboxStatus {
  connected: boolean;
  /** Gmail (restricted scope) granted on top of the base Calendar connection. */
  gmailConnected: boolean;
  /** Retained for older clients; the server now always reports false. */
  needsReconnect: boolean;
  enabled: boolean;
  categories: InboxCategory[];
  availableCategories: InboxCategory[];
  lastScannedAt: string | null;
}

const LAST_SCAN_KEY = 'vivly_inbox_last_scan';
const LAST_FAILURE_KEY = 'vivly_inbox_last_failed_scan';
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
/** Short cooldown after a scan that already spent Gmail quota or Groq tokens. */
export const FAILURE_BACKOFF_MS = 15 * 60 * 1000;

/**
 * Statuses reached only AFTER the scan already spent something: Gmail quota, a
 * token refresh, or — for `extract_failed` — a Groq call we were billed for.
 * Retrying these on every mount re-pays the whole cost, so they get a cooldown.
 * Config failures (`no_connection`, `needs_reconnect`, `disabled`) return before
 * any API call, cost nothing, and stay freely retryable.
 */
const PAID_FAILURE_STATUSES = new Set(['extract_failed', 'gmail_failed', 'token_failed']);

export function isPaidFailure(status: string | undefined): boolean {
  return PAID_FAILURE_STATUSES.has(status ?? '');
}

/** Client-side throttle so we don't call /scan more than once / 4h. */
export function shouldClientScan(
  lastScanIso: string | null,
  now: number,
  lastFailureIso: string | null = null,
): boolean {
  if (lastFailureIso) {
    const failed = new Date(lastFailureIso).getTime();
    if (!Number.isNaN(failed) && now - failed < FAILURE_BACKOFF_MS) return false;
  }
  if (!lastScanIso) return true;
  const last = new Date(lastScanIso).getTime();
  if (Number.isNaN(last)) return true;
  return now - last >= FOUR_HOURS_MS;
}

/**
 * Only a scan that actually reached Gmail should start the 4h clock. Anything
 * else (no connection, missing scope, disabled, expired token) must stay
 * retryable, otherwise fixing the connection leaves the user staring at an
 * empty tray for four hours.
 */
export function shouldRecordScan(status: string | undefined): boolean {
  return status === 'ok' || status === 'skipped_throttle';
}

export function useInboxRadar() {
  const { user, isGuest } = useAuthContext();
  const queryClient = useQueryClient();
  const enabledForUser = !!user && !isGuest;

  const { data: status } = useQuery({
    queryKey: ['inbox-status', user?.id],
    queryFn: () => api.inbox.status(),
    enabled: enabledForUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: suggestionsData, isLoading } = useQuery({
    queryKey: ['inbox-suggestions', user?.id],
    queryFn: () => api.inbox.suggestions(),
    enabled: enabledForUser && !!status?.enabled,
    staleTime: 60 * 1000,
  });

  const triggerScan = useCallback(async (force = false) => {
    const last = localStorage.getItem(LAST_SCAN_KEY);
    const lastFailure = localStorage.getItem(LAST_FAILURE_KEY);
    if (!force && !shouldClientScan(last, Date.now(), lastFailure)) return;
    try {
      const result = await api.inbox.scan();
      if (shouldRecordScan(result?.status)) {
        localStorage.setItem(LAST_SCAN_KEY, new Date().toISOString());
        localStorage.removeItem(LAST_FAILURE_KEY);
      } else if (isPaidFailure(result?.status)) {
        // Already paid for Gmail/Groq on this attempt — back off before retrying.
        localStorage.setItem(LAST_FAILURE_KEY, new Date().toISOString());
      }
      queryClient.invalidateQueries({ queryKey: ['inbox-suggestions', user?.id] });
      return result;
    } catch (e) {
      // A thrown request may still have spent the scan server-side; back off too.
      localStorage.setItem(LAST_FAILURE_KEY, new Date().toISOString());
      console.warn('[InboxRadar] scan failed:', e);
    }
  }, [queryClient, user?.id]);

  // Trigger a throttled scan on mount when enabled.
  useEffect(() => {
    if (enabledForUser && status?.enabled) triggerScan();
  }, [enabledForUser, status?.enabled, triggerScan]);

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.inbox.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-suggestions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.inbox.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox-suggestions', user?.id] }),
  });

  const setEnabled = useCallback(async (enabled: boolean) => {
    await api.inbox.setSettings({ enabled });
    // A fresh opt-in should scan immediately rather than wait out an old stamp.
    if (enabled) { localStorage.removeItem(LAST_SCAN_KEY); localStorage.removeItem(LAST_FAILURE_KEY); }
    await queryClient.invalidateQueries({ queryKey: ['inbox-status', user?.id] });
  }, [queryClient, user?.id]);

  const setCategories = useCallback(async (categories: InboxCategory[]) => {
    await api.inbox.setSettings({ categories });
    // Category changes alter what a scan would find, so allow an immediate rescan.
    localStorage.removeItem(LAST_SCAN_KEY);
    localStorage.removeItem(LAST_FAILURE_KEY);
    await queryClient.invalidateQueries({ queryKey: ['inbox-status', user?.id] });
  }, [queryClient, user?.id]);

  const typedStatus = status as InboxStatus | undefined;

  return {
    suggestions: (suggestionsData?.suggestions || []) as TaskSuggestion[],
    status: typedStatus,
    categories: typedStatus?.categories ?? DEFAULT_INBOX_CATEGORIES,
    isLoading,
    accept: (id: string) => acceptMutation.mutate(id),
    dismiss: (id: string) => dismissMutation.mutate(id),
    setEnabled,
    setCategories,
    triggerScan,
  };
}
