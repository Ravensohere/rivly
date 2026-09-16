// Debug panel for Insights - only visible in development mode
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    taskEvents,
    focusSessions,
    sleepEvents,
    totalFocusMinutes,
    totalCompletedTasks,
    totalCreatedTasks,
    focusStreak,
    sleepDistribution,
    timeRange,
    todayCompletedTasks,
    todayCreatedTasks,
    todayFocusMinutes,
    clearAllData,
  } = useEventsLedgerContext();

  const location = useLocation();
  const isPlanner = location.pathname === '/app';

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }
  const taskCreated = taskEvents.filter(e => e.type === 'created').length;
  const taskCompleted = taskEvents.filter(e => e.type === 'completed').length;
  const taskUncompleted = taskEvents.filter(e => e.type === 'uncompleted').length;
  const taskDeleted = taskEvents.filter(e => e.type === 'deleted').length;
  return (
    <div className={cn(
      "fixed right-11 z-50 transition-all duration-300",
      isPlanner ? "bottom-64" : "bottom-44"
    )}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg"
      >
        <Bug className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, originY: 1, originX: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-14 -right-5 sm:right-0 z-[60] w-[85vw] max-w-[300px] sm:w-80 sm:max-w-sm bg-card border border-border rounded-xl shadow-xl p-3 sm:p-4 text-[10px] sm:text-xs max-h-[50vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">🐛 Debug Panel</h3>
              <button onClick={() => setIsOpen(false)}>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-muted-foreground mb-1">Time Range: {timeRange}</p>
              </div>

              <div className="border-t border-border pt-2">
                <p className="font-semibold mb-1">Event Counts:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>• Focus sessions: <span className="text-foreground font-medium">{focusSessions.length}</span></li>
                  <li>• Task events total: <span className="text-foreground font-medium">{taskEvents.length}</span></li>
                  <li className="pl-3">- created: {taskCreated}</li>
                  <li className="pl-3">- completed: {taskCompleted}</li>
                  <li className="pl-3">- deleted: {taskDeleted}</li>
                  <li>• Sleep events: <span className="text-foreground font-medium">{sleepEvents.length}</span></li>
                </ul>
              </div>

              <div className="border-t border-border pt-2">
                <p className="font-semibold mb-1">Computed Stats:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>• Total focus min: <span className="text-foreground font-medium">{totalFocusMinutes}</span></li>
                  <li>• Total completed: <span className="text-foreground font-medium">{totalCompletedTasks}</span></li>
                  <li>• Focus streak: <span className="text-foreground font-medium">{focusStreak}</span></li>
                  <li>• Sleep dist: good={sleepDistribution.good}, okay={sleepDistribution.okay}, poor={sleepDistribution.poor}</li>
                </ul>
              </div>

              <div className="border-t border-border pt-2">
                <p className="font-semibold mb-1">Today Stats:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>• Focus min: <span className="text-foreground font-medium">{todayFocusMinutes}</span></li>
                  <li>• Completed: <span className="text-foreground font-medium">{todayCompletedTasks}</span></li>
                </ul>
              </div>

              <div className="border-t border-border pt-2">
                <p className="font-semibold mb-1">Recent Task Events:</p>
                <div className="max-h-24 overflow-y-auto space-y-0.5 text-muted-foreground">
                  {taskEvents.slice(-5).reverse().map(e => (
                    <div key={e.id} className="text-[10px]">
                      [{e.dateKey}] {e.type}: {e.taskId.substring(0, 8)}...
                    </div>
                  ))}
                  {taskEvents.length === 0 && <p>No task events yet</p>}
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-2"
                onClick={async () => {
                  if (confirm('Clear all analytics data?')) {
                    await clearAllData();
                  }
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Clear All Data
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
