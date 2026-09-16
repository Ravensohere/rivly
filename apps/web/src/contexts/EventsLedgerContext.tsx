import React, { createContext, useContext, ReactNode } from 'react';
import { useEventsLedger } from '@/hooks/useEventsLedger';

type EventsLedgerContextType = ReturnType<typeof useEventsLedger>;

const EventsLedgerContext = createContext<EventsLedgerContextType | null>(null);

export function EventsLedgerProvider({ children }: { children: ReactNode }) {
  const eventsLedger = useEventsLedger();
  
  return (
    <EventsLedgerContext.Provider value={eventsLedger}>
      {children}
    </EventsLedgerContext.Provider>
  );
}

export function useEventsLedgerContext(): EventsLedgerContextType {
  const context = useContext(EventsLedgerContext);
  if (!context) {
    throw new Error('useEventsLedgerContext must be used within EventsLedgerProvider');
  }
  return context;
}
