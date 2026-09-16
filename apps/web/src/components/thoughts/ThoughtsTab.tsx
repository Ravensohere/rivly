/**
 * ThoughtsTab - Tab content showing all parked thoughts with management actions
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Plus, Archive, Inbox, ArrowRight, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ThoughtCard } from './ThoughtCard';
import { ThoughtParkingSheet } from '@/components/mental/ThoughtParkingSheet';
import { AddTaskDialog } from '@/components/planner/AddTaskDialog';
import { useParkedThoughts } from '@/hooks/useParkedThoughts';
import { useTasks } from '@/hooks/useTasks';
import { useEventsLedgerContext } from '@/contexts/EventsLedgerContext';
import { getLocalDateKey } from '@/lib/dateUtils';
import { ParkedThought, ThoughtCategory } from '@/types/thoughts';
import { mapLegacyCategory } from '@/types/thoughts';

type ViewMode = 'active' | 'archived';

export function ThoughtsTab() {
  const {
    activeThoughts,
    archivedThoughts,
    isLoading,
    addThought,
    archiveThought,
    deleteThought,
    restoreThought,
    convertToTask,
  } = useParkedThoughts();

  const { addTask } = useTasks();
  const { recordTaskCreated } = useEventsLedgerContext();

  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [showParkSheet, setShowParkSheet] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [convertingThought, setConvertingThought] = useState<ParkedThought | null>(null);
  const [autoClearWeekly, setAutoClearWeekly] = useState(() => {
    try { return localStorage.getItem('rivly_thoughts_autoclear') === 'true'; } catch { return false; }
  });

  const thoughts = viewMode === 'active' ? activeThoughts : archivedThoughts;

  // Handle parking a new thought from sheet
  const handleParkThought = useCallback(async (
    text: string, 
    legacyCategory: string, // This comes from ThoughtParkingSheet using old category type
    convertToTaskFlag: boolean
  ) => {
    const category = mapLegacyCategory(legacyCategory);
    const thought = await addThought(text, category);
    
    if (thought && convertToTaskFlag) {
      // User wants to immediately convert to task
      setConvertingThought(thought);
      setShowAddTask(true);
    }
  }, [addThought]);

  // Handle converting a thought to task
  const handleConvertToTask = useCallback((thought: ParkedThought) => {
    setConvertingThought(thought);
    setShowAddTask(true);
  }, []);

  // Handle task creation (from conversion)
  // Handle "Schedule later" — converts thought to task with Tomorrow dateKey
  const handleScheduleLater = useCallback(async (thought: ParkedThought) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = getLocalDateKey(tomorrow);
    const newTask = await addTask({
      title: thought.text,
      dateKey: tomorrowKey,
      status: 'todo',
      tag: 'personal' as any,
    });
    if (newTask) {
      await convertToTask(thought.id, newTask.id);
      recordTaskCreated(newTask.id, tomorrowKey);
    }
  }, [addTask, convertToTask, recordTaskCreated]);

  // Toggle auto-clear weekly
  const handleAutoClearToggle = useCallback((enabled: boolean) => {
    setAutoClearWeekly(enabled);
    try { localStorage.setItem('rivly_thoughts_autoclear', String(enabled)); } catch {}
    if (enabled) {
      // Immediately archive thoughts older than 7 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      activeThoughts.forEach(t => {
        if (new Date(t.createdAt) < cutoff) archiveThought(t.id);
      });
    }
  }, [activeThoughts, archiveThought]);

  const handleTaskCreated = useCallback(async (taskData: { 
    title: string; 
    tag: string; 
    dateKey?: string; 
    time?: string; 
    priority?: 1|2|3; 
    isMultiLine?: boolean; 
    tasks?: any[] 
  }) => {
    const defaultDateKey = getLocalDateKey(new Date());
    
    // Multi-line support
    if (taskData.isMultiLine && taskData.tasks) {
      for (const t of taskData.tasks) {
        const newTask = await addTask({
           title: t.title,
           dateKey: t.dateKey || defaultDateKey,
           status: 'todo',
           tag: (t.tag as any) || taskData.tag,
           ...(t.time && { time: t.time }),
           ...(t.priority && { priority: t.priority })
        });
        if (newTask && convertingThought) {
          await convertToTask(convertingThought.id, newTask.id);
          recordTaskCreated(newTask.id, t.dateKey || defaultDateKey);
        }
      }
      setConvertingThought(null);
      setShowAddTask(false);
      return;
    }

    const newTask = await addTask({
      title: taskData.title,
      dateKey: taskData.dateKey || defaultDateKey,
      status: 'todo',
      tag: taskData.tag as any,
      ...(taskData.time && { time: taskData.time }),
      ...(taskData.priority && { priority: taskData.priority })
    });

    if (newTask && convertingThought) {
      // Mark thought as converted
      await convertToTask(convertingThought.id, newTask.id);
      // Record to ledger
      recordTaskCreated(newTask.id, taskData.dateKey || defaultDateKey);
    }

    setConvertingThought(null);
    setShowAddTask(false);
  }, [addTask, convertToTask, convertingThought, recordTaskCreated]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-24"
    >
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Thoughts
          </h1>
          <Button onClick={() => setShowParkSheet(true)} size="sm" className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" />
            Park Thought
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {activeThoughts.length} parked · {archivedThoughts.length} archived
          </p>
          {/* Auto-clear weekly toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto-clear weekly</span>
            <Switch
              checked={autoClearWeekly}
              onCheckedChange={handleAutoClearToggle}
              id="autoclear-switch"
            />
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl">
        <button
          onClick={() => setViewMode('active')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
            ${viewMode === 'active'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'}
          `}
        >
          <Inbox className="w-4 h-4" />
          Active ({activeThoughts.length})
        </button>
        <button
          onClick={() => setViewMode('archived')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
            ${viewMode === 'archived'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'}
          `}
        >
          <Archive className="w-4 h-4" />
          Archived ({archivedThoughts.length})
        </button>
      </div>

      {/* Thoughts list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading thoughts...</p>
          </div>
        ) : thoughts.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {viewMode === 'active' 
                ? "No parked thoughts yet" 
                : "No archived thoughts"}
            </p>
            {viewMode === 'active' && (
              <p className="text-sm text-muted-foreground/70 mb-4">
                Feeling overwhelmed? Park your thoughts here to revisit later.
              </p>
            )}
            {viewMode === 'active' && (
              <Button onClick={() => setShowParkSheet(true)} variant="outline" className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Park a Thought
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {thoughts.map((thought, index) => (
              <motion.div
                key={thought.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <ThoughtCard
                  thought={thought}
                  onConvertToTask={handleConvertToTask}
                  onScheduleLater={handleScheduleLater}
                  onArchive={archiveThought}
                  onDelete={deleteThought}
                  onRestore={viewMode === 'archived' ? restoreThought : undefined}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Park Thought Sheet */}
      <ThoughtParkingSheet
        open={showParkSheet}
        onOpenChange={setShowParkSheet}
        onSave={handleParkThought}
      />

      {/* Add Task Dialog (for conversion) */}
      <AddTaskDialog
        open={showAddTask}
        onOpenChange={(open) => {
          setShowAddTask(open);
          if (!open) setConvertingThought(null);
        }}
        onAdd={handleTaskCreated}
        initialTitle={convertingThought?.text || undefined}
      />
    </motion.div>
  );
}
