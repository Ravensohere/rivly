import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimeBlock, Task } from '@/types';
import { TimeBlockCard } from './TimeBlockCard';
import { TaskItem } from './TaskItem';
import { CompletedTasksSection } from './CompletedTasksSection';
import { Inbox, Sparkles, Clock } from 'lucide-react';
import { parseTime } from '@/hooks/useLocalStorage';

interface TimelineViewProps {
  blocks: TimeBlock[];
  unlinkedTasks: Task[];
  events?: any[];
  completedTasks?: Task[];
  onBlockClick: (block: TimeBlock) => void;
  onBlockComplete?: (blockId: string) => void;
  onTaskToggle: (taskId: string) => void;
  onTaskTap?: (task: Task) => void;
  onEventClick?: (event: any) => void;
  onScheduleTask?: (task: Task) => void;
}

const isCurrentBlock = (startTime: string, endTime: string) => {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = parseTime(startTime);
  const e = parseTime(endTime);
  return cur >= s.hours * 60 + s.minutes && cur < e.hours * 60 + e.minutes;
};

const E = [0.22, 1, 0.36, 1] as const;

export function TimelineView({
  blocks,
  unlinkedTasks,
  events = [],
  completedTasks = [],
  onBlockClick,
  onBlockComplete,
  onTaskToggle,
  onTaskTap,
  onEventClick,
  onScheduleTask,
}: TimelineViewProps) {
  const activeTasks = useMemo(() => unlinkedTasks.filter(t => t.status !== 'done'), [unlinkedTasks]);

  const hasContent = blocks.length > 0 || activeTasks.length > 0 || completedTasks.length > 0 || events.length > 0;

  const timelineItems = useMemo(() => {
    const items = [
      ...blocks.map(b => ({ ...b, type: 'block' as const })),
      ...events.map(e => ({ ...e, type: 'event' as const, startTime: e.time || '00:00', endTime: e.time || '23:59' })),
    ];
    return items.sort((a, b) => {
      const aT = parseTime(a.startTime);
      const bT = parseTime(b.startTime);
      return (aT.hours * 60 + aT.minutes) - (bT.hours * 60 + bT.minutes);
    });
  }, [blocks, events]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{    opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: E }}
      className="flex-1 overflow-y-auto scrollbar-hide"
      style={{ paddingBottom: '7rem', paddingTop: '0.75rem' }}
    >
      {!hasContent ? (
        <EmptyState />
      ) : (
        <div style={{ padding: '0 1rem' }}>
          {/* ── Time blocks + Events ── */}
          <AnimatePresence mode="popLayout">
            {timelineItems.map((item: any, index: number) => {
              if (item.type === 'block') {
                const block = item as TimeBlock;
                const isCurrent   = isCurrentBlock(block.startTime, block.endTime);
                const isCompleted = block.status === 'completed';

                return (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: isCompleted ? 0.55 : 1, y: 0, scale: 1 }}
                    exit={{    opacity: 0, y: -16, scale: 0.96  }}
                    transition={{ delay: index * 0.055, duration: 0.45, ease: E }}
                    className="relative"
                    style={{ marginBottom: '0.65rem' }}
                  >
                    {/* Current block breathing glow */}
                    {isCurrent && !isCompleted && (
                      <motion.div
                        className="absolute -inset-0.5 rounded-3xl pointer-events-none"
                        animate={{
                          boxShadow: [
                            '0 0 0 0 hsl(235 35% 55% / 0)',
                            '0 0 0 6px hsl(235 35% 55% / 0.12)',
                            '0 0 0 0 hsl(235 35% 55% / 0)',
                          ],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    <TimeBlockCard
                      block={block}
                      onClick={() => onBlockClick(block)}
                      onComplete={onBlockComplete}
                      variant="timeline"
                      isCurrentBlock={isCurrent && !isCompleted}
                    />
                  </motion.div>
                );
              }

              // ── Event card ──
              const event = item;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1    }}
                  exit={{    opacity: 0, scale: 0.96        }}
                  transition={{ delay: index * 0.055, duration: 0.4, ease: E }}
                  style={{ marginBottom: '0.65rem' }}
                  onClick={() => onEventClick?.(event)}
                >
                  <div
                    className="flex items-center gap-3 rounded-2xl group cursor-pointer transition-all duration-300"
                    style={{
                      padding:   '0.9rem 1rem',
                      background: 'hsl(var(--card))',
                      border:     '1px solid hsl(var(--border) / 0.35)',
                      boxShadow:  'var(--shadow-soft)',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-medium)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-soft)'}
                  >
                    {/* Left accent bar */}
                    <div
                      className="flex-shrink-0 rounded-full"
                      style={{
                        width:      '3px',
                        height:     '2.2rem',
                        background: event.is_google_event
                          ? 'linear-gradient(180deg, #4285F4, #34A853)'
                          : 'hsl(var(--primary) / 0.5)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          style={{
                            fontFamily:    "'DM Mono', monospace",
                            fontSize:      '0.6rem',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color:         'hsl(var(--muted-foreground))',
                          }}
                        >
                          {event.time ? event.time.slice(0, 5) : 'All Day'}
                        </span>
                        {event.is_google_event && (
                          <span
                            style={{
                              fontFamily:    "'DM Mono', monospace",
                              fontSize:      '0.5rem',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              padding:       '0.15rem 0.4rem',
                              borderRadius:  '999px',
                              background:    '#4285F4' + '18',
                              color:         '#4285F4',
                            }}
                          >
                            Gcal
                          </span>
                        )}
                      </div>
                      <h4
                        className="truncate"
                        style={{
                          fontFamily: "Roboto, sans-serif",
                          fontSize:   '0.875rem',
                          fontWeight: 500,
                          color:      'hsl(var(--foreground))',
                        }}
                      >
                        {event.title}
                      </h4>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ── Unlinked tasks (Inbox) ── */}
          {activeTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: timelineItems.length * 0.055 + 0.1, duration: 0.45, ease: E }}
              style={{ marginTop: '1.5rem' }}
            >
              {/* Section label */}
              <div
                className="flex items-center gap-2.5"
                style={{ marginBottom: '0.75rem', paddingLeft: '0.25rem' }}
              >
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Inbox style={{ width: '0.85rem', height: '0.85rem', color: 'hsl(var(--primary) / 0.7)' }} />
                </motion.div>
                <span
                  style={{
                    fontFamily:    "'DM Mono', monospace",
                    fontSize:      '0.6rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color:         'hsl(var(--muted-foreground))',
                  }}
                >
                  Unscheduled
                </span>
                <div
                  className="flex-1"
                  style={{
                    height:     '1px',
                    background: 'linear-gradient(to right, hsl(var(--border) / 0.6), transparent)',
                  }}
                />
              </div>

              {/* Task list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <AnimatePresence mode="popLayout">
                  {activeTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0   }}
                      exit={{    opacity: 0, x: 16, scale: 0.92 }}
                      transition={{ delay: index * 0.04, duration: 0.35, ease: E }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <div style={{ flex: 1 }}>
                        <TaskItem
                          task={task}
                          onToggle={() => onTaskToggle(task.id)}
                          onTap={onTaskTap ? () => onTaskTap(task) : undefined}
                        />
                      </div>
                      {onScheduleTask && (
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => onScheduleTask(task)}
                          className="flex-shrink-0 flex items-center justify-center rounded-xl transition-colors duration-200"
                          style={{
                            width:      '2rem',
                            height:     '2rem',
                            background: 'hsl(var(--muted) / 0.5)',
                            color:      'hsl(var(--muted-foreground))',
                          }}
                          title="Schedule"
                        >
                          <Clock style={{ width: '0.85rem', height: '0.85rem' }} />
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── Completed tasks ── */}
          <CompletedTasksSection
            tasks={completedTasks}
            onTaskClick={onTaskTap || (() => {})}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Empty state ──
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1    }}
      transition={{ duration: 0.6, ease: E }}
      className="flex flex-col items-center justify-center text-center"
      style={{ height: '40vh', padding: '2rem' }}
    >
      {/* Floating orb */}
      <motion.div
        animate={{ y: [-6, 6, -6], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ marginBottom: '1.5rem' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width:      '3.5rem',
            height:     '3.5rem',
            background: 'hsl(var(--primary) / 0.08)',
          }}
        >
          <Sparkles style={{ width: '1.2rem', height: '1.2rem', color: 'hsl(var(--primary) / 0.5)' }} />
        </div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.25, duration: 0.5 }}
        style={{
          fontFamily:    "'Playfair Display', Georgia, serif",
          fontStyle:     'italic',
          fontSize:      '1.4rem',
          fontWeight:    400,
          letterSpacing: '-0.02em',
          color:         'hsl(var(--foreground))',
          marginBottom:  '0.4rem',
        }}
      >
        Your day awaits
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.35, duration: 0.5 }}
        style={{
          fontFamily:   "Roboto, sans-serif",
          fontSize:     '0.85rem',
          fontWeight:   400,
          color:        'hsl(var(--muted-foreground))',
          maxWidth:     '17rem',
          lineHeight:   1.7,
        }}
      >
        Gently create your first time block to begin shaping your rhythm.
      </motion.p>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 8, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ marginTop: '2rem' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: '2.2rem', height: '2.2rem', background: 'hsl(var(--primary) / 0.08)' }}
        >
          <div style={{ width: '0.4rem', height: '0.4rem', borderRadius: '50%', background: 'hsl(var(--primary) / 0.3)' }} />
        </div>
      </motion.div>
    </motion.div>
  );
}
