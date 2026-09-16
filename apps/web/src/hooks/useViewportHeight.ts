import { useEffect } from 'react';

/**
 * Global viewport height CSS variable setter.
 * 
 * Sets --app-height to the current visual viewport height, updating in real-time
 * as keyboard opens/closes or viewport changes.
 * 
 * This solves the iOS Safari 100vh issue where viewport units don't account for
 * the address bar or keyboard.
 * 
 * Usage in CSS:
 *   max-height: calc(var(--app-height, 100vh) * 0.92);
 */
export function useViewportHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const vv = window.visualViewport;

    const setHeight = () => {
      // Prefer visualViewport for accurate height when keyboard is open
      const height = vv ? vv.height : window.innerHeight;
      root.style.setProperty('--app-height', `${height}px`);
      
      // Also set keyboard inset for sheets
      if (vv) {
        const keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        root.style.setProperty('--keyboard-inset', `${Math.round(keyboardInset)}px`);
      } else {
        root.style.setProperty('--keyboard-inset', '0px');
      }
    };

    // Initial set
    setHeight();

    // Listen to viewport changes
    if (vv) {
      vv.addEventListener('resize', setHeight);
      vv.addEventListener('scroll', setHeight);
    }
    
    // Fallback for resize events
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', setHeight);
        vv.removeEventListener('scroll', setHeight);
      }
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('orientationchange', setHeight);
    };
  }, []);
}
