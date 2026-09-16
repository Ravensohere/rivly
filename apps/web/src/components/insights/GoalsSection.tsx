import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, Clock, Moon, ChevronRight, Pencil, X, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useGoals, WeeklyGoals } from '@/hooks/useGoals';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface GoalItemProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  unit: string;
  progress: number;
  color: string;
  onEdit?: () => void;
}

function GoalItem({ icon, label, current, target, unit, progress, color, onEdit }: GoalItemProps) {
  const isComplete = progress >= 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3"
    >
      <div 
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
          isComplete ? 'bg-emerald-500/15' : ''
        }`}
        style={{ backgroundColor: isComplete ? undefined : `${color}15` }}
      >
        {isComplete ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </motion.div>
        ) : (
          <div style={{ color }}>{icon}</div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">
            {current} / {target} {unit}
          </span>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-2" />
          {isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 8px 2px rgba(16, 185, 129, 0.3)' }}
            />
          )}
        </div>
      </div>
      
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}

interface GoalEditorProps {
  goals: WeeklyGoals;
  onSave: (goals: Partial<WeeklyGoals>) => void;
  onClose: () => void;
}

function GoalEditor({ goals, onSave, onClose }: GoalEditorProps) {
  const [tempGoals, setTempGoals] = useState(goals);

  const handleSave = () => {
    onSave(tempGoals);
    onClose();
  };

  const goalConfigs = [
    {
      key: 'focusMinutesTarget' as const,
      label: 'Weekly Focus Time',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
      min: 60,
      max: 1200,
      step: 30,
      format: (v: number) => `${Math.floor(v / 60)}h ${v % 60}m`,
      color: 'hsl(235, 35%, 55%)',
    },
    {
      key: 'tasksCompletedTarget' as const,
      label: 'Tasks to Complete',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      min: 5,
      max: 100,
      step: 5,
      format: (v: number) => `${v} tasks`,
      color: 'hsl(165, 40%, 50%)',
    },
    {
      key: 'focusSessionsTarget' as const,
      label: 'Focus Sessions',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      min: 3,
      max: 50,
      step: 1,
      format: (v: number) => `${v} sessions`,
      color: 'hsl(280, 40%, 55%)',
    },
  ];

  return (
    <div className="space-y-6 py-4">
      {goalConfigs.map((config) => (
        <div key={config.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${config.color}15`, color: config.color }}
              >
                {config.icon}
              </div>
              <span className="font-medium text-foreground">{config.label}</span>
            </div>
            <span className="text-sm font-semibold text-primary">
              {config.format(tempGoals[config.key])}
            </span>
          </div>
          <Slider
            value={[tempGoals[config.key]]}
            min={config.min}
            max={config.max}
            step={config.step}
            onValueChange={([value]) => setTempGoals(prev => ({ ...prev, [config.key]: value }))}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{config.format(config.min)}</span>
            <span>{config.format(config.max)}</span>
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save Goals
        </Button>
      </div>
    </div>
  );
}

export function GoalsSection() {
  const { goals, currentProgress, progressPercentages, overallProgress, updateGoals } = useGoals();
  const [showEditor, setShowEditor] = useState(false);

  const goalItems = [
    {
      key: 'focusMinutes',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
      label: 'Focus Time',
      current: currentProgress.focusMinutes,
      target: goals.focusMinutesTarget,
      unit: 'min',
      progress: progressPercentages.focusMinutes,
      color: 'hsl(235, 35%, 55%)',
    },
    {
      key: 'tasksCompleted',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      label: 'Tasks Completed',
      current: currentProgress.tasksCompleted,
      target: goals.tasksCompletedTarget,
      unit: 'tasks',
      progress: progressPercentages.tasksCompleted,
      color: 'hsl(165, 40%, 50%)',
    },
    {
      key: 'focusSessions',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      label: 'Focus Sessions',
      current: currentProgress.focusSessions,
      target: goals.focusSessionsTarget,
      unit: 'sessions',
      progress: progressPercentages.focusSessions,
      color: 'hsl(280, 40%, 55%)',
    },
  ];

  const completedGoals = goalItems.filter(g => g.progress >= 100).length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-card rounded-2xl border border-border/40 overflow-hidden"
        style={{ boxShadow: 'var(--shadow-soft)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Weekly Goals</h3>
              <p className="text-xs text-muted-foreground">
                {completedGoals}/{goalItems.length} goals achieved
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEditor(true)}
            className="text-primary hover:text-primary"
          >
            Edit
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Overall Progress Ring */}
        <div className="px-4 py-4 border-b border-border/30">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="hsl(var(--muted))"
                  strokeWidth="6"
                  fill="none"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="hsl(var(--primary))"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 176' }}
                  animate={{ strokeDasharray: `${(overallProgress / 100) * 176} 176` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{overallProgress}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Overall Progress</p>
              <p className="text-xs text-muted-foreground">
                {overallProgress >= 100 
                  ? '🎉 All goals achieved!' 
                  : overallProgress >= 75 
                    ? 'Almost there, keep going!'
                    : overallProgress >= 50
                      ? 'Halfway there!'
                      : 'You\'ve got this!'}
              </p>
            </div>
          </div>
        </div>

        {/* Individual Goals */}
        <div className="px-4 divide-y divide-border/30">
          {goalItems.map(({ key, ...item }) => (
            <GoalItem
              key={key}
              {...item}
            />
          ))}
        </div>

        {/* Motivational footer for completed goals */}
        <AnimatePresence>
          {completedGoals > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 bg-emerald-500/5 border-t border-emerald-500/10"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  {completedGoals === goalItems.length 
                    ? 'Amazing! You crushed all your goals this week!'
                    : `${completedGoals} goal${completedGoals > 1 ? 's' : ''} completed!`}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Goal Editor Sheet */}
      <Sheet open={showEditor} onOpenChange={setShowEditor}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Set Your Weekly Goals</SheetTitle>
            <SheetDescription>
              Adjust your targets to match your rhythm
            </SheetDescription>
          </SheetHeader>
          <GoalEditor
            goals={goals}
            onSave={updateGoals}
            onClose={() => setShowEditor(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
