import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRivaLogic } from '@/hooks/useRivaLogic';

// Define the shape of the context logic (return type of the hook)
type RivaContextType = ReturnType<typeof useRivaLogic>;

export const RivaContext = createContext<RivaContextType | undefined>(undefined);

export function RivaProvider({ children }: { children: ReactNode }) {
  // We use the original hook logic here to maintain state
  const riva = useRivaLogic();

  // Check and prompt for daily plan when app loads
  useEffect(() => {
    riva.checkAndPromptDailyPlan();
  }, []);

  return (
    <RivaContext.Provider value={riva}>
      {children}
    </RivaContext.Provider>
  );
}

export function useRivaContext() {
  const context = useContext(RivaContext);
  if (context === undefined) {
    throw new Error('useRivaContext must be used within a RivaProvider');
  }
  return context;
}
