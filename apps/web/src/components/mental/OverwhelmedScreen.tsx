import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task } from '@/types';

interface OverwhelmedScreenProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  onCreateTask: (title: string) => void;
}

export function OverwhelmedScreen({ 
  open, 
  onClose, 
  tasks, 
  onSelectTask,
  onCreateTask 
}: OverwhelmedScreenProps) {
  const [step, setStep] = useState<'breathe' | 'action'>('breathe');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);

  const pendingTasks = tasks.filter(t => t.status === 'todo').slice(0, 5);

  // Breathing cycle controller
  useEffect(() => {
    if (!open || step !== 'breathe') return;

    const phases = ['in', 'hold', 'out'] as const;
    let currentPhaseIndex = 0;
    
    const interval = setInterval(() => {
      currentPhaseIndex = (currentPhaseIndex + 1) % 3;
      setBreathPhase(phases[currentPhaseIndex]);
      
      if (currentPhaseIndex === 0) {
        setBreathCycle(prev => {
          if (prev >= 2) {
            setTimeout(() => setStep('action'), 500);
            return prev;
          }
          return prev + 1;
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, step]);

  const handleCreateTask = () => {
    if (newTaskTitle.trim()) {
      onCreateTask(newTaskTitle.trim());
      setNewTaskTitle('');
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('breathe');
    setBreathCycle(0);
    setBreathPhase('in');
    setNewTaskTitle('');
    onClose();
  };

  const getBreathText = () => {
    switch (breathPhase) {
      case 'in': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'out': return 'Breathe out...';
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-hidden"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Calming background with very slow movement */}
      <motion.div 
        className="absolute inset-0 bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      
      {/* Soft ambient layers */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, hsl(var(--secondary) / 0.15) 0%, transparent 60%)',
            'radial-gradient(circle at 45% 55%, hsl(var(--secondary) / 0.1) 0%, transparent 65%)',
            'radial-gradient(circle at 55% 45%, hsl(var(--secondary) / 0.15) 0%, transparent 60%)',
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <AnimatePresence mode="wait">
        {step === 'breathe' ? (
          <motion.div
            key="breathe"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm text-center z-10"
          >
            {/* Close button */}
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute -top-12 right-0 p-2 rounded-full hover:bg-secondary/50 transition-colors duration-300"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <motion.p 
              className="text-muted-foreground mb-12 text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              It's okay. Let's take a moment.
            </motion.p>

            {/* Enhanced breathing circle */}
            <div className="relative w-44 h-44 mx-auto">
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
                }}
                animate={{
                  scale: breathPhase === 'in' ? [1, 1.4] : breathPhase === 'hold' ? 1.4 : [1.4, 1],
                  opacity: breathPhase === 'hold' ? 0.4 : [0.2, 0.4],
                }}
                transition={{
                  duration: 2,
                  ease: 'easeInOut',
                }}
              />

              {/* Main breathing circle */}
              <motion.div
                className="absolute inset-2 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 40% 40%, hsl(var(--secondary) / 0.4) 0%, hsl(var(--primary) / 0.15) 70%)',
                }}
                animate={{
                  scale: breathPhase === 'in' ? [1, 1.25] : breathPhase === 'hold' ? 1.25 : [1.25, 1],
                }}
                transition={{
                  duration: 2,
                  ease: 'easeInOut',
                }}
              >
                <motion.div
                  className="text-base text-foreground/70 font-medium"
                  key={breathPhase}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {getBreathText()}
                </motion.div>
              </motion.div>

              {/* Progress dots */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    animate={{
                      backgroundColor: i <= breathCycle 
                        ? 'hsl(var(--primary))' 
                        : 'hsl(var(--muted))',
                      scale: i === breathCycle ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-16 text-sm text-muted-foreground"
            >
              Take 3 slow breaths
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="mt-6"
            >
              <Button
                variant="ghost"
                onClick={() => setStep('action')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip to next step
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="action"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm z-10"
          >
            {/* Close button */}
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute -top-12 right-0 p-2 rounded-full hover:bg-secondary/50 transition-colors duration-300"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <div className="text-center mb-8">
              <motion.h2 
                className="text-xl font-semibold text-foreground mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                One small thing
              </motion.h2>
              <motion.p 
                className="text-muted-foreground text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                What's the one small thing you can do next?
              </motion.p>
            </div>

            {/* Existing tasks */}
            {pendingTasks.length > 0 && (
              <motion.div 
                className="mb-6 space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                  Pick from your tasks
                </p>
                {pendingTasks.map((task, index) => (
                  <motion.button
                    key={task.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSelectTask(task.id);
                      handleClose();
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-card/80 transition-all duration-300 text-left group"
                  >
                    <span className="text-foreground">{task.title}</span>
                    <motion.div
                      className="opacity-50 group-hover:opacity-100 transition-opacity"
                      whileHover={{ scale: 1.1 }}
                    >
                      <Check className="w-4 h-4 text-primary" />
                    </motion.div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Create tiny task */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Or create something tiny
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Reply to one email"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                />
                <Button
                  size="icon"
                  onClick={handleCreateTask}
                  disabled={!newTaskTitle.trim()}
                  className="transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 text-center text-sm text-muted-foreground"
            >
              You don't have to do everything. Just this one thing.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
