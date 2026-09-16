import { useEffect } from "react";
import { scrollActiveElementIntoView } from "@/hooks/useKeyboardAware";

/**
 * Global visualViewport-powered keyboard inset.
 *
 * Sets CSS var:
 *  - --keyboard-inset: px the on-screen keyboard overlaps the layout viewport.
 *
 * Also scrolls focused inputs into view on mobile to prevent keyboard overlap.
 */
export function useVisualViewportKeyboardInset() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;

    const setInset = (insetPx: number) => {
      root.style.setProperty("--keyboard-inset", `${Math.max(0, Math.round(insetPx))}px`);
    };

    const visualViewport = window.visualViewport;

    const compute = () => {
      if (!visualViewport) {
        setInset(0);
        return;
      }

      // On iOS PWA, the keyboard often overlays the layout viewport.
      // This formula approximates the overlapped area.
      const inset = Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop);
      setInset(inset);

      // If keyboard is likely open, keep the active input visible.
      if (inset > 150) {
        scrollActiveElementIntoView();
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const tag = target.tagName;
      const isTextField = tag === "INPUT" || tag === "TEXTAREA" || (target as any).isContentEditable;
      if (!isTextField) return;

      // Wait a tick for keyboard + layout to settle.
      setTimeout(() => {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {
          // ignore
        }
      }, 50);
    };

    compute();

    visualViewport?.addEventListener("resize", compute);
    visualViewport?.addEventListener("scroll", compute);
    document.addEventListener("focusin", handleFocusIn);

    // Recompute after blur, to reset inset quickly.
    const handleFocusOut = () => setTimeout(compute, 50);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      visualViewport?.removeEventListener("resize", compute);
      visualViewport?.removeEventListener("scroll", compute);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      setInset(0);
    };
  }, []);
}
