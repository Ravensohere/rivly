import React, { useEffect, useState } from 'react';
import { kernel } from '@vivly/core';

interface ProtectedContainerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A UI container that only renders if the Vivly Kernel is properly initialized.
 * Giving this component to a developer is useless without @vivly/core.
 */
export const ProtectedContainer: React.FC<ProtectedContainerProps> = ({ 
  children, 
  fallback = <div className="p-4 text-red-500 font-mono">Module Error: Kernel Not Found</div> 
}) => {
  const [isReady, setIsReady] = useState(kernel.isReady);

  useEffect(() => {
    // Check kernel status
    const check = () => setIsReady(kernel.isReady);
    check();
    
    // In a real app, we might have an event listener for kernel state changes
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isReady) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
