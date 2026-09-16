import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-card shadow-2xl transition-all ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-400 flex flex-col overflow-hidden",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b rounded-b-3xl data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t rounded-t-3xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm rounded-r-3xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm rounded-l-3xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

/**
 * SheetContent with comprehensive viewport and safe-area handling.
 * 
 * CRITICAL FIX FOR iOS/Android CROPPING:
 * - Uses visualViewport for dynamic sizing when keyboard opens
 * - Falls back to dvh/vh for browser compatibility
 * - Flex column layout: Header (sticky) / Body (scrollable) / Footer (sticky)
 * - Never crops content - internal scrolling only
 * 
 * Max height: min(92% of viewport, 760px) for bottom sheets
 */
const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, ...props }, ref) => {
    const isBottomSheet = side === "bottom";
    const [dynamicMaxHeight, setDynamicMaxHeight] = React.useState<string | undefined>();
    const [keyboardInset, setKeyboardInset] = React.useState(0);

    React.useEffect(() => {
      if (!isBottomSheet) return;

      const vv = window.visualViewport;
      
      const updateSizing = () => {
        if (!vv) {
          setDynamicMaxHeight(undefined);
          setKeyboardInset(0);
          return;
        }

        // Calculate keyboard height
        const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        const kbVisible = kbHeight > 100;
        setKeyboardInset(kbVisible ? kbHeight : 0);

        // Calculate max height: 92% of visual viewport, capped at 760px
        const maxHeight = Math.min(Math.round(vv.height * 0.92), 760);
        setDynamicMaxHeight(`${maxHeight}px`);
      };

      updateSizing();
      
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
    }, [isBottomSheet]);

    // Auto-scroll focused elements into view
    React.useEffect(() => {
      let timeoutId: NodeJS.Timeout;
      
      const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (!target) return;
        
        const isInput = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable ||
                       target.getAttribute('role') === 'option';
        
        if (isInput) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      };

      document.addEventListener('focusin', handleFocusIn);
      return () => {
        document.removeEventListener('focusin', handleFocusIn);
        clearTimeout(timeoutId);
      };
    }, []);

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content 
          ref={ref} 
          className={cn(
            sheetVariants({ side }), 
            className
          )} 
          style={isBottomSheet ? {
            maxHeight: dynamicMaxHeight || 'min(calc(92dvh - env(safe-area-inset-top, 0px)), 760px)',
            width: 'min(100%, 560px)',
            marginLeft: 'auto',
            marginRight: 'auto',
            '--sheet-keyboard-inset': `${keyboardInset}px`,
            // Lift sheet above keyboard
            bottom: `${keyboardInset}px`,
          } as React.CSSProperties : {
            maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
          }}
          {...props}
        >
          {/* Handle indicator for bottom sheets */}
          {isBottomSheet && (
            <div className="mx-auto mt-4 mb-2 w-12 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
          )}
          {/* Content wrapper with flex layout for Header/Body/Footer */}
          <div 
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {children}
          </div>
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 opacity-70 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-secondary hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

/**
 * SheetHeader - Sticky at top
 */
const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left flex-shrink-0 px-6 pt-4 pb-2",
      "sticky top-0 z-10 bg-card",
      className
    )} 
    {...props} 
  />
);
SheetHeader.displayName = "SheetHeader";

/**
 * SheetBody - Scrollable content area
 */
const SheetBody = ({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-3",
      className
    )} 
    style={{ 
      WebkitOverflowScrolling: 'touch',
      // Fixed padding since container moves up
      paddingBottom: '120px',
      ...style,
    }}
    {...props} 
  />
);
SheetBody.displayName = "SheetBody";

/**
 * SheetFooter - Sticky at bottom with safe area padding
 */
const SheetFooter = ({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "flex flex-col gap-2 sm:flex-row sm:justify-end flex-shrink-0 px-6 pt-4",
      "sticky bottom-0 z-10",
      "bg-card border-t border-border/30",
      className
    )} 
    style={{ 
      paddingBottom: 'max(16px, calc(12px + env(safe-area-inset-bottom, 0px)))',
      ...style,
    }}
    {...props} 
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
