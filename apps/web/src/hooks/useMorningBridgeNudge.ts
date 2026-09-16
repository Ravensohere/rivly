// Morning Bridge Wake Window Nudge - Shows in-app toast once per day
// when user opens app during their configured wake window

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useMorningBridge } from '@/hooks/useMorningBridge';
import { getLocalDateKey } from '@/lib/dateUtils';

const NUDGE_SHOWN_KEY_PREFIX = 'mb_nudge_shown:';

export function useMorningBridgeNudge() {
  const { settings, isInWakeWindow, shouldShow, nextPendingAction, markShown } = useMorningBridge();
  const hasShownRef = useRef(false);

  useEffect(() => {
    // Skip if not loaded, not enabled, or already shown this session
    if (!settings.enabled || hasShownRef.current) return;

    // Check if we should show the nudge
    if (!shouldShow || !nextPendingAction) return;

    const today = getLocalDateKey(new Date());
    const nudgeKey = NUDGE_SHOWN_KEY_PREFIX + today;

    // Check if already shown today
    try {
      const alreadyShown = localStorage.getItem(nudgeKey);
      if (alreadyShown) {
        hasShownRef.current = true;
        return;
      }
    } catch {}

    // Show the nudge after a short delay
    const timer = setTimeout(() => {
      // Double-check conditions
      if (!isInWakeWindow || !nextPendingAction) return;

      // Mark as shown
      hasShownRef.current = true;
      try {
        localStorage.setItem(nudgeKey, new Date().toISOString());
      } catch {}

      // Also mark in morning bridge state
      markShown();

      // Show toast notification
      toast('Good morning 🌞', {
        description: `Your Morning Bridge is ready: ${nextPendingAction.title}`,
        duration: 8000,
        action: {
          label: 'Start',
          onClick: () => {
            // Navigate to sleep page (where Morning Bridge settings live)
            window.location.hash = '#/sleep';
          },
        },
      });

      // Log ledger event for analytics
      // We use a unique task ID pattern for morning bridge nudges
    }, 1500); // Delay to let app fully load

    return () => clearTimeout(timer);
  }, [settings.enabled, shouldShow, isInWakeWindow, nextPendingAction, markShown]);
}
