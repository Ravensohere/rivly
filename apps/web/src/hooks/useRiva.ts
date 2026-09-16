import { useContext } from 'react';
import { RivaContext } from '@/contexts/RivaContext';

export function useRiva() {
  const context = useContext(RivaContext);
  if (context === undefined) {
    throw new Error('useRiva must be used within a RivaProvider');
  }
  return context;
}
