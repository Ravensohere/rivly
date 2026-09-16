import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Motion wrapper for the overlay
const MotionDialogOverlay = motion.create(DialogOverlay);

// Motion wrapper for the content
const MotionDiv = motion.div;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
  overlayClassName?: string;
}

/**
 * DialogContent - Centered modal for desktop with comprehensive viewport handling.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, overlayClassName, children, hideCloseButton = false, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [dynamicMaxHeight, setDynamicMaxHeight] = React.useState<string>("min(92vh, 760px)");
  const [keyboardInset, setKeyboardInset] = React.useState(0);

  React.useEffect(() => {
    const vv = window.visualViewport;
    
    const updateHeight = () => {
      if (!vv) {
        setDynamicMaxHeight("min(92vh, 760px)");
        setKeyboardInset(0);
        return;
      }
      
      // Calculate keyboard height
      const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const kbVisible = kbHeight > 100;
      setKeyboardInset(kbVisible ? kbHeight : 0);
      
      if (kbVisible) {
        // When keyboard is open, limit to 92% of visual viewport
        const maxHeight = Math.min(Math.round(vv.height * 0.92), 760);
        setDynamicMaxHeight(`${maxHeight}px`);
      } else {
        // Normal mode: use min(92vh, 760px)
        setDynamicMaxHeight("min(92vh, 760px)");
      }
    };

    updateHeight();
    vv?.addEventListener("resize", updateHeight);
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);

    return () => {
      vv?.removeEventListener("resize", updateHeight);
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, []);

  // Auto-scroll focused elements into view with improved logic
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
        
        timeoutId = setTimeout(() => {
          rafId = requestAnimationFrame(() => {
            // Find the scrollable dialog body
            const scrollContainer = contentRef.current?.querySelector('[data-dialog-body]');
            
            if (scrollContainer) {
              const targetRect = target.getBoundingClientRect();
              const containerRect = scrollContainer.getBoundingClientRect();
              
              // Check if target is below the visible area
              if (targetRect.bottom > containerRect.bottom - 20) {
                const scrollAmount = targetRect.bottom - containerRect.bottom + 60;
                scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
              }
              // Check if target is above the visible area
              else if (targetRect.top < containerRect.top + 20) {
                const scrollAmount = targetRect.top - containerRect.top - 60;
                scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
              }
            } else {
              // Fallback: use native scrollIntoView
              try {
                target.scrollIntoView({ behavior: "smooth", block: "center" });
              } catch {
                // ignore
              }
            }
          });
        }, 200);
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
    <DialogPortal>
      <MotionDialogOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm",
          overlayClassName
        )}
      />
      <DialogPrimitive.Content
        ref={ref}
        asChild
        {...props}
      >
        <MotionDiv
          ref={contentRef}
          initial={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
          animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
          exit={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className={cn(
            // Fixed positioning for centering
            "fixed left-[50%] top-[50%] z-[10001]",
            // Width constraint
            "w-[min(560px,calc(100vw-32px))]",
            // Flex layout for header/body/footer
            "flex flex-col overflow-hidden",
            // Styling
            "border-0 bg-card shadow-2xl rounded-[24px]",
            className,
          )}
          style={{ 
            maxHeight: dynamicMaxHeight,
            '--dialog-keyboard-inset': `${keyboardInset}px`,
          } as React.CSSProperties}
        >
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 opacity-70 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-20">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </MotionDiv>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * DialogHeader - Fixed at top of dialog
 */
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex-shrink-0 flex flex-col space-y-1.5 text-center sm:text-left px-6 pt-6 pb-4",
      "sticky top-0 z-10 bg-card",
      className
    )} 
    {...props} 
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * DialogBody - Scrollable content area
 */
const DialogBody = ({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-dialog-body
    className={cn(
      "flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-2",
      "touch-pan-y",
      className
    )}
    style={{ 
      WebkitOverflowScrolling: "touch",
      paddingBottom: 'calc(16px + var(--dialog-keyboard-inset, 0px))',
      ...style,
    }}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

/**
 * DialogFooter - Fixed at bottom with safe area padding
 */
const DialogFooter = ({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-shrink-0 flex flex-col gap-2 sm:flex-row sm:justify-end px-6 pt-4",
      "sticky bottom-0 z-10",
      "border-t border-border/30 bg-card",
      className,
    )}
    style={{ 
      paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
      ...style,
    }}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
