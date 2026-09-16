// Focus Debug Panel - Visible with ?debug=1 in URL
// Shows ledger events and derivation values for troubleshooting

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { useFocusTotals } from '@/hooks/useFocusTotals';
import { getLocalDateKey, getLastNDaysKeys, formatFocusTime, safeNumber } from '@/lib/focusTotals';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function FocusDebugPanel() {
  const [isOpen, setIsOpen] = useState(true);
  
  const {
    focusSessions,
    taskEvents,
    sleepEvents,
    activeSession,
    focusStreak,
    clearAllData,
  } = useEventsLedgerContext();
  
  const { today, week, month, all, isLoaded } = useFocusTotals();
  const location = useLocation();
  const isPlanner = location.pathname === '/app';

  // Only show if ?debug=1 is in URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') !== '1') {
    return null;
  }

  const todayKey = getLocalDateKey();
  const weekKeys = getLastNDaysKeys(7);
  
  // Get recent focus sessions
  const recentSessions = [...focusSessions]
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
    .slice(0, 5);
  
  // Calculate totals for verification
  const todaySessions = focusSessions.filter(s => s.dateKey === todayKey);
  const weekSessions = focusSessions.filter(s => weekKeys.includes(s.dateKey));

  return (
    <div className={cn(
      "fixed right-11 z-[100] w-[85vw] max-w-[300px] sm:w-80 sm:max-w-xs transition-all duration-300",
      isPlanner ? "bottom-64" : "bottom-44"
    )}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-amber-500/50 rounded-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            <span className="font-bold text-sm">Focus Debug</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 text-[10px] sm:text-xs space-y-3 max-h-[50vh] overflow-y-auto">
                {/* Loaded State */}
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isLoaded ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-muted-foreground">
                    Ledger: {isLoaded ? 'Loaded' : 'Loading...'}
                  </span>
                </div>

                {/* Date Keys */}
                <div className="border-t border-border pt-2">
                  <p className="font-semibold text-muted-foreground mb-1">Date Keys</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>Today: <span className="text-foreground font-mono">{todayKey}</span></li>
                    <li>Week: <span className="text-foreground font-mono">{weekKeys[0]} → {weekKeys[6]}</span></li>
                  </ul>
                </div>

                {/* Event Counts */}
                <div className="border-t border-border pt-2">
                  <p className="font-semibold text-muted-foreground mb-1">Event Counts</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>Total focus sessions: <span className="text-foreground font-bold">{focusSessions.length}</span></li>
                    <li>Today sessions: <span className="text-foreground font-bold">{todaySessions.length}</span></li>
                    <li>Week sessions: <span className="text-foreground font-bold">{weekSessions.length}</span></li>
                    <li>Task events: <span className="text-foreground">{taskEvents.length}</span></li>
                    <li>Sleep events: <span className="text-foreground">{sleepEvents.length}</span></li>
                  </ul>
                </div>

                {/* Derived Totals */}
                <div className="border-t border-border pt-2">
                  <p className="font-semibold text-muted-foreground mb-1">Derived Totals (from hook)</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>Today: <span className="text-green-500 font-bold">{today.formatted}</span> ({today.sessions} sessions, {today.minutes} min)</li>
                    <li>Week: <span className="text-blue-500 font-bold">{week.formatted}</span> ({week.sessions} sessions, {week.minutes} min)</li>
                    <li>Month: <span className="text-purple-500 font-bold">{month.formatted}</span> ({month.sessions} sessions)</li>
                    <li>All Time: <span className="text-foreground font-bold">{all.formatted}</span> ({all.sessions} sessions)</li>
                    <li>Streak: <span className="text-amber-500 font-bold">{safeNumber(focusStreak)} days</span></li>
                  </ul>
                </div>

                {/* Active Session */}
                <div className="border-t border-border pt-2">
                  <p className="font-semibold text-muted-foreground mb-1">Active Session</p>
                  {activeSession ? (
                    <div className="text-foreground bg-primary/10 p-2 rounded">
                      <p>ID: {activeSession.sessionId.substring(0, 8)}...</p>
                      <p>Started: {new Date(activeSession.startAt).toLocaleTimeString()}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">None</p>
                  )}
                </div>

                {/* Recent Sessions */}
                <div className="border-t border-border pt-2">
                  <p className="font-semibold text-muted-foreground mb-1">Recent Sessions (last 5)</p>
                  {recentSessions.length === 0 ? (
                    <p className="text-muted-foreground">No sessions yet</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {recentSessions.map((s) => (
                        <div key={s.id} className="text-[10px] bg-secondary/50 p-1.5 rounded">
                          <div className="flex justify-between">
                            <span className="font-mono">{s.dateKey}</span>
                            <span className={`font-bold ${s.completed ? 'text-green-500' : 'text-yellow-500'}`}>
                              {safeNumber(s.durationMin)}m
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(s.startAt).toLocaleTimeString()} → {new Date(s.endAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear Data Button */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-2"
                  onClick={async () => {
                    if (confirm('Clear all analytics data? This cannot be undone.')) {
                      await clearAllData();
                      window.location.reload();
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Clear All Data
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
