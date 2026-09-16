import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TaskTag } from '@/types';
import { 
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from '@/components/ui/ResponsiveModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Clock, Tag, AlertTriangle, Layers } from 'lucide-react';
import { CategoryChips, taskTagOptions } from './CategoryChips';
import { parseNaturalTask, ParsedTask } from '@/lib/naturalLanguageTask';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (task: {
    title: string;
    tag: TaskTag;
    dateKey?: string;
    time?: string;
    priority?: 1|2|3;
    isMultiLine?: boolean;
    tasks?: ParsedTask[];
  }) => void;
  /** Optional pre-filled title (e.g., when converting from a thought) */
  initialTitle?: string;
}

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    },
  },
};

export function AddTaskDialog({ open, onOpenChange, onAdd, initialTitle }: AddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<TaskTag>('work');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      console.log('[AddTaskDialog] Dialog OPENED');
      setTitle(initialTitle || '');
      setTag('work');
      setParsed(null);
      // Focus input on next tick
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialTitle]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (value.length > 3) {
      setParsed(parseNaturalTask(value));
    } else {
      setParsed(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AddTaskDialog] handleSubmit called', { title, tag, hasOnAdd: !!onAdd });
    if (!title.trim()) {
        console.log('[AddTaskDialog] Title is empty, ignoring submit');
        return;
    }
    
    onAdd({
      title: parsed?.title || title.trim(),
      tag: (parsed?.tag as TaskTag) || tag,
      dateKey: parsed?.dateKey,
      time: parsed?.time,
      priority: parsed?.priority,
      isMultiLine: parsed?.isMultiLine,
      tasks: parsed?.tasks,
    });
    
    // Reset form
    setTitle('');
    setTag('work');
    setParsed(null);
    onOpenChange(false);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent 
        className="bg-card/95 backdrop-blur-xl border-0 shadow-2xl"
        aria-describedby="add-task-description"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none rounded-3xl" />
        
        <motion.form
          onSubmit={handleSubmit}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative flex flex-col h-full"
        >
          <ResponsiveModalHeader className="mb-2 flex-shrink-0">
            <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <ResponsiveModalTitle>New Task</ResponsiveModalTitle>
              <ResponsiveModalDescription id="add-task-description" className="sr-only">
                Add a new task to your list.
              </ResponsiveModalDescription>
            </motion.div>
          </ResponsiveModalHeader>

          <ResponsiveModalBody className="space-y-5">
            {/* Title */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                What needs to be done?
              </label>
              <textarea
                ref={inputRef as any}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., Review project proposal"
                rows={title.trim().includes('\n') ? 4 : 2}
                className="w-full rounded-xl border border-border/50 bg-muted/30 focus:bg-background transition-all duration-300 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              
              {/* Live Parsing Preview */}
              {parsed && (parsed.dateKey || parsed.time || parsed.tag || parsed.priority) && !parsed.isMultiLine && (
                <div className="flex flex-wrap gap-2 mt-3 pl-1">
                  {parsed.dateKey && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                       <Calendar className="w-3.5 h-3.5" />
                       {new Date(parsed.dateKey).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  {parsed.time && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-xs font-medium">
                       <Clock className="w-3.5 h-3.5" />
                       {parsed.time}
                    </div>
                  )}
                  {parsed.tag && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-xs font-medium capitalize">
                       <Tag className="w-3.5 h-3.5" />
                       {parsed.tag}
                    </div>
                  )}
                  {parsed.priority && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-xs font-medium">
                       <AlertTriangle className="w-3.5 h-3.5" />
                       Priority {parsed.priority}
                    </div>
                  )}
                </div>
              )}

              {/* Multi-line Detection Preview */}
              {parsed && parsed.isMultiLine && parsed.tasks && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                       📋 Detected {parsed.tasks.length} tasks — will add all
                    </span>
                </div>
              )}
            </motion.div>

            {/* Tag selection - uses shared component */}
            <motion.div variants={itemVariants} className={parsed?.tag || parsed?.isMultiLine ? 'opacity-50 pointer-events-none' : ''}>
              <CategoryChips<TaskTag>
                options={taskTagOptions}
                selected={tag}
                onSelect={setTag}
                label="Category"
              />
            </motion.div>
          </ResponsiveModalBody>
          {/* Sticky footer with CTA */}
          <ResponsiveModalFooter>
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: title.trim() ? 1.02 : 1 }}
              whileTap={{ scale: title.trim() ? 0.98 : 1 }}
              className="w-full"
            >
              <Button
                type="submit"
                onClick={handleSubmit} // Explicitly call handler
                disabled={!title.trim()}
                className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-primary/20 transition-all duration-300"
              >
                {parsed?.isMultiLine && parsed.tasks ? `Add ${parsed.tasks.length} Tasks` : 'Add Task'}
              </Button>
            </motion.div>
          </ResponsiveModalFooter>
        </motion.form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
