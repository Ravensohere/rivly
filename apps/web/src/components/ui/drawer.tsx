import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = ({ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

/**
 * DrawerContent - Bottom sheet with comprehensive safe-area and viewport handling.
 * 
 * CRITICAL FIX FOR iOS/Android CROPPING:
 * - Uses visualViewport API for dynamic sizing when keyboard opens
 * - Respects env(safe-area-inset-bottom) for iOS home indicator
 * - Uses flex column layout: Header (sticky) / Body (scrollable) / Footer (sticky)
 * - Keyboard awareness: adjusts max height when keyboard opens
 * - Never crops content - internal scrolling only
 * 
 * Max height: min(92% of viewport, 760px)
 * Width: min(100%, 560px) centered on larger screens
 */
const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & { overlayClassName?: string }
>(({ className, overlayClassName, children, ...props }, ref) => {
  const [dynamicMaxHeight, setDynamicMaxHeight] = React.useState<string | undefined>();
  const [keyboardInset, setKeyboardInset] = React.useState(0);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const vv = window.visualViewport;
    
    const updateSizing = () => {
      if (!vv) {
        // No visualViewport: use CSS fallbacks
        setDynamicMaxHeight(undefined);
        setKeyboardInset(0);
        return;
      }

      // Calculate keyboard height - the difference between window height and visual viewport
      const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const kbVisible = kbHeight > 100;
      setKeyboardInset(kbVisible ? kbHeight : 0);

      // Calculate max height: 92% of visual viewport, capped at 760px
      // When keyboard is open, we need to account for that
      const availableHeight = vv.height;
      const maxHeight = Math.min(Math.round(availableHeight * 0.92), 760);
      setDynamicMaxHeight(`${maxHeight}px`);
    };

    updateSizing();
    
    // Listen to visual viewport changes
    vv?.addEventListener("resize", updateSizing);
    vv?.addEventListener("scroll", updateSizing);
    window.addEventListener("resize", updateSizing);
    window.addEventListener("orientationchange", updateSizing);

    return () => {
      vv?.removeEventListener("resize", updateSizing);
      vv?.removeEventListener("scroll", updateSizing);
      window.removeEventListener("resize", updateSizing);
      window.removeEventListener("orientationchange", updateSizing);
    };
  }, []);

  // Auto-scroll focused inputs into view with improved logic
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let rafId: number;
    
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) {
        clearTimeout(timeoutId);
        cancelAnimationFrame(rafId);
        
        // Wait for keyboard to fully appear before scrolling (increased timing for smoother experience)
        timeoutId = setTimeout(() => {
          rafId = requestAnimationFrame(() => {
            // Find the scrollable drawer body
            const scrollContainer = contentRef.current?.querySelector('[data-drawer-body]');
            
            if (scrollContainer) {
              const targetRect = target.getBoundingClientRect();
              const containerRect = scrollContainer.getBoundingClientRect();
              
              // Increased padding to ensure input is well above keyboard
              const topPadding = 80;
              const bottomPadding = 100;
              
              // Check if target is below the visible area
              if (targetRect.bottom > containerRect.bottom - bottomPadding) {
                const scrollAmount = targetRect.bottom - containerRect.bottom + bottomPadding;
                scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
              }
              // Check if target is above the visible area
              else if (targetRect.top < containerRect.top + topPadding) {
                const scrollAmount = targetRect.top - containerRect.top - topPadding;
                scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
              }
            } else {
              // Fallback: scroll the entire drawer content
              try {
                // Scroll to bring input to top third of viewport
                target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
              } catch {
                // ignore
              }
            }
          });
        }, 400); // Increased from 350ms to 400ms for better keyboard animation sync
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          // Fixed to bottom, centered horizontally
          "fixed inset-x-0 bottom-0 z-50 mx-auto",
          // Flex column for header/body/footer layout
          "flex flex-col overflow-hidden",
          // Rounded top corners
          "rounded-t-[24px]",
          // Styling
          "border-t border-border/50 bg-card shadow-2xl",
          className,
        )}
        style={{
          // Dynamic max height with fallbacks
          maxHeight: dynamicMaxHeight || 'min(calc(92dvh - env(safe-area-inset-top, 0px)), 760px)',
          // Width constraint for larger screens
          width: 'min(100%, 560px)',
          // Pass keyboard inset as CSS variable for children
          '--drawer-keyboard-inset': `${keyboardInset}px`,
          // Lift drawer above keyboard
          bottom: `${keyboardInset}px`,
        } as React.CSSProperties}
        {...props}
      >
        {/* Drag handle */}
        <div className="mx-auto mt-4 mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/30 flex-shrink-0" />

        {/* Content wrapper - flex column for layout */}
        <div ref={contentRef} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

/**
 * DrawerHeader - Sticky at top of drawer
 */
const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex-shrink-0 px-6 pt-2 pb-4",
      "sticky top-0 z-10 bg-card",
      "grid gap-1.5 text-center sm:text-left",
      className
    )} 
    {...props} 
  />
);
DrawerHeader.displayName = "DrawerHeader";

/**
 * DrawerBody - Scrollable content area
 * 
 * This is the ONLY part that scrolls.
 * Contains proper touch scrolling for iOS.
 */
const DrawerBody = ({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-drawer-body
    className={cn(
      "flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-2",
      "touch-pan-y",
      className
    )}
    style={{ 
      WebkitOverflowScrolling: "touch",
      // Remove double buffering of keyboard height. 
      // Base padding handles footer overlap.
      paddingBottom: '120px', 
      ...style,
    }}
    {...props}
  />
);
DrawerBody.displayName = "DrawerBody";

/**
 * DrawerFooter - Sticky at bottom, above safe area
 * 
 * Contains CTA buttons. Never cropped.
 * Respects iOS home indicator.
 */
const DrawerFooter = ({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-shrink-0 flex flex-col gap-2 px-6 pt-4",
      "sticky bottom-0 z-50",
      "bg-card border-t border-border/30",
      className,
    )}
    style={{ 
      // Safe area padding for iOS home indicator + base padding
      paddingBottom: "max(16px, calc(12px + env(safe-area-inset-bottom, 0px)))",
      ...style,
    }}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
