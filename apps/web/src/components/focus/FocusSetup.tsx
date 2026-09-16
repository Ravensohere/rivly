import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, BookOpen, Briefcase, Palette, Sparkles, TreePine, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { LivingOrb } from '@/components/ui/LivingOrb';
import { TimeBlock, Task } from '@/types';
import { FocusPurpose } from '@/hooks/useFocusSessions';

interface FocusSetupProps {
  blocks: TimeBlock[];
  tasks: Task[];
  onStartFocus: (config: {
    duration: number;
    purpose: FocusPurpose;
    customPurpose?: string;
    linkedTaskId?: string;
    linkedBlockId?: string;
  }) => void;
}

const purposeOptions: { value: FocusPurpose; label: string; icon: React.ReactNode }[] = [
  { value: 'study', label: 'Study', icon: <BookOpen className="w-5 h-5" /> },
  { value: 'work', label: 'Work', icon: <Briefcase className="w-5 h-5" /> },
  { value: 'creative', label: 'Creative', icon: <Palette className="w-5 h-5" /> },
  { value: 'custom', label: 'Custom', icon: <Sparkles className="w-5 h-5" /> },
];

export function FocusSetup({ blocks, tasks, onStartFocus }: FocusSetupProps) {
  const [duration, setDuration] = useState(25);
  const [purpose, setPurpose] = useState<FocusPurpose>('work');
  const [customPurpose, setCustomPurpose] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>();
  const [linkedBlockId, setLinkedBlockId] = useState<string | undefined>();

  const handleStart = () => {
    onStartFocus({
      duration,
      purpose,
      customPurpose: purpose === 'custom' ? customPurpose : undefined,
      linkedTaskId,
      linkedBlockId,
    });
  };

  const pendingTasks = tasks.filter(t => t.status === 'todo');
  const activeBlocks = blocks.filter(b => b.status !== 'completed');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center flex-1 p-6 pb-24 bg-background page-container"
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Living Orb Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center"
        >
          <LivingOrb 
            state="idle"
            className="w-32 h-32"
          />
        </motion.div>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Start a Focus Session
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose your duration and dive in
          </p>
        </motion.div>

        {/* Duration Slider */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="text-2xl font-semibold text-foreground">{duration} min</span>
          </div>
          <Slider
            value={[duration]}
            onValueChange={([val]) => setDuration(val)}
            min={5}
            max={120}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 min</span>
            <span>2 hours</span>
          </div>
        </motion.div>

        {/* Purpose Selection */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <span className="text-sm text-muted-foreground">What are you focusing on?</span>
          <div className="grid grid-cols-2 gap-3">
            {purposeOptions.map((option) => (
              <motion.button
                key={option.value}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPurpose(option.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  purpose === option.value
                    ? 'border-primary bg-accent'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <span className={purpose === option.value ? 'text-primary' : 'text-muted-foreground'}>
                  {option.icon}
                </span>
                <span className={`text-sm font-medium ${
                  purpose === option.value ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {option.label}
                </span>
              </motion.button>
            ))}
          </div>
          
          {purpose === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Input
                placeholder="What's your focus?"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                className="mt-3"
              />
            </motion.div>
          )}
        </motion.div>

        {/* Link to Task/Block (Optional) */}
        {(pendingTasks.length > 0 || activeBlocks.length > 0) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <span className="text-sm text-muted-foreground">Link to (optional)</span>
            
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Tasks</span>
                <div className="flex flex-wrap gap-2">
                  {pendingTasks.slice(0, 4).map(task => (
                    <motion.button
                      key={task.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setLinkedTaskId(linkedTaskId === task.id ? undefined : task.id);
                        setLinkedBlockId(undefined);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        linkedTaskId === task.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {task.title}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            
            {activeBlocks.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Time Blocks</span>
                <div className="flex flex-wrap gap-2">
                  {activeBlocks.slice(0, 3).map(block => (
                    <motion.button
                      key={block.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setLinkedBlockId(linkedBlockId === block.id ? undefined : block.id);
                        setLinkedTaskId(undefined);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        linkedBlockId === block.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {block.title}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <Button
            onClick={handleStart}
            size="lg"
            className="w-full h-14 text-lg font-medium rounded-2xl shadow-lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Focus
          </Button>

          {/* My Landscape Link */}
          <div className="flex flex-col gap-2">
            <Link to="/study" className="block">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-semibold">Join Study Group (Live)</span>
              </motion.div>
            </Link>

            <Link to="/landscape" className="block">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <TreePine className="w-4 h-4" />
                <span className="text-sm font-medium">View My Landscape</span>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
