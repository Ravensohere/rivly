import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "./drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";

/**
 * ResponsiveModal - Bottom sheet on mobile (<768px), centered Dialog on desktop.
 * 
 * Features:
 * - Automatic mobile/desktop detection via shared context
 * - Keyboard-aware sizing on mobile
 * - Safe area inset handling
 * - Proper header/body/footer layout with sticky positioning
 * - Never crops content - uses 100dvh and internal scrolling
 * 
 * Modal sizing requirements:
 * - max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
 * - width: min(92vw, 560px)
 * - padding-bottom: max(16px, env(safe-area-inset-bottom))
 */

// Shared context to ensure consistent mobile detection across all sub-components
const ResponsiveModalContext = React.createContext<{ isMobile: boolean }>({ isMobile: false });

function useResponsiveModal() {
  return React.useContext(ResponsiveModalContext);
}

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveModal({ open, onOpenChange, children }: ResponsiveModalProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <ResponsiveModalContext.Provider value={{ isMobile: true }}>
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      </ResponsiveModalContext.Provider>
    );
  }

  return (
    <ResponsiveModalContext.Provider value={{ isMobile: false }}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </ResponsiveModalContext.Provider>
  );
}

interface ResponsiveModalContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  className?: string;
  overlayClassName?: string;
  children: React.ReactNode;
  hideCloseButton?: boolean;
}

export function ResponsiveModalContent({ className, overlayClassName, children, hideCloseButton, ...props }: ResponsiveModalContentProps) {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return (
      <DrawerContent className={cn(className)} overlayClassName={overlayClassName} {...props}>
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={cn(className)} overlayClassName={overlayClassName} hideCloseButton={hideCloseButton} {...props}>
      {children}
    </DialogContent>
  );
}

export function ResponsiveModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerHeader className={className} {...props} />;
  }

  return <DialogHeader className={className} {...props} />;
}

export function ResponsiveModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerBody className={className} {...props} />;
  }

  return <DialogBody className={className} {...props} />;
}

export function ResponsiveModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerFooter className={className} {...props} />;
  }

  return <DialogFooter className={className} {...props} />;
}

export function ResponsiveModalTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerTitle className={className} {...props}>{children}</DrawerTitle>;
  }

  return <DialogTitle className={className} {...props}>{children}</DialogTitle>;
}

export function ResponsiveModalDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerDescription className={className} {...props} />;
  }

  return <DialogDescription className={className} {...props} />;
}

export function ResponsiveModalClose({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { isMobile } = useResponsiveModal();

  if (isMobile) {
    return <DrawerClose className={className} {...props}>{children}</DrawerClose>;
  }

  return <DialogClose className={className} {...props}>{children}</DialogClose>;
}
