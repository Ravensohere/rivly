import { useState, useEffect, useCallback } from 'react';

interface KeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  viewportHeight: number;
}

/**
 * Hook to detect keyboard visibility and adjust UI accordingly.
 * Uses visualViewport API for accurate keyboard detection on iOS/Android PWAs.
 */
export function useKeyboardAware(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isKeyboardOpen: false,
    keyboardHeight: 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const handleViewportChange = useCallback(() => {
    if (typeof window === 'undefined') return;

    const visualViewport = window.visualViewport;
    
    if (visualViewport) {
      const currentHeight = visualViewport.height;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - currentHeight;
      
      // Keyboard is considered open if the viewport shrinks by more than 150px
      const isOpen = heightDiff > 150;
      
      setState({
        isKeyboardOpen: isOpen,
        keyboardHeight: isOpen ? heightDiff : 0,
        viewportHeight: currentHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const visualViewport = window.visualViewport;
    
    if (visualViewport) {
      // Use visualViewport API for accurate keyboard detection
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);
      
      // Initial check
      handleViewportChange();
      
      return () => {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
      };
    } else {
      // Fallback for browsers without visualViewport
      const handleFocus = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          setState(prev => ({ ...prev, isKeyboardOpen: true }));
        }
      };
      
      const handleBlur = () => {
        setState(prev => ({ ...prev, isKeyboardOpen: false, keyboardHeight: 0 }));
      };
      
      document.addEventListener('focusin', handleFocus);
      document.addEventListener('focusout', handleBlur);
      
      return () => {
        document.removeEventListener('focusin', handleFocus);
        document.removeEventListener('focusout', handleBlur);
      };
    }
  }, [handleViewportChange]);

  return state;
}

/**
 * Scrolls the active element into view when keyboard opens.
 * Call this in components with form inputs.
 */
export function scrollActiveElementIntoView() {
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    setTimeout(() => {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}
