// Collectibles Context - Global state for collectibles and celebrations

import React, { createContext, useContext, ReactNode } from 'react';
import { useCollectibles } from '@/hooks/useCollectibles';

type CollectiblesContextType = ReturnType<typeof useCollectibles>;

const CollectiblesContext = createContext<CollectiblesContextType | null>(null);

export function CollectiblesProvider({ children }: { children: ReactNode }) {
  const collectibles = useCollectibles();
  
  return (
    <CollectiblesContext.Provider value={collectibles}>
      {children}
    </CollectiblesContext.Provider>
  );
}

export function useCollectiblesContext(): CollectiblesContextType {
  const context = useContext(CollectiblesContext);
  if (!context) {
    throw new Error('useCollectiblesContext must be used within CollectiblesProvider');
  }
  return context;
}
