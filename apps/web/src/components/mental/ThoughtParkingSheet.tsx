import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Lightbulb, Bell, MoreHorizontal, ArrowRight, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetBody, 
  SheetFooter,
  SheetTitle 
} from '@/components/ui/sheet';
import { ThoughtCategory } from '@/hooks/useThoughtParking';

interface ThoughtParkingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (text: string, category: ThoughtCategory, convertToTask: boolean) => void;
}

const categoryOptions: { value: ThoughtCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'worry', label: 'Needs action', icon: <AlertCircle className="w-4 h-4" />, color: 'from-rose-500/20 to-rose-500/5' },
  { value: 'idea', label: 'Can wait', icon: <Lightbulb className="w-4 h-4" />, color: 'from-amber-500/20 to-amber-500/5' },
  { value: 'reminder', label: 'Out of my control', icon: <Bell className="w-4 h-4" />, color: 'from-sky-500/20 to-sky-500/5' },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="w-4 h-4" />, color: 'from-muted to-muted/50' },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export function ThoughtParkingSheet({ open, onOpenChange, onSave }: ThoughtParkingSheetProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<ThoughtCategory | null>(null);

  const handleSave = (convertToTask = false) => {
    if (text.trim() && category) {
      onSave(text.trim(), category, convertToTask);
      setText('');
      setCategory(null);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setText('');
    setCategory(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {/* Subtle gradient background */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none rounded-t-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative flex flex-col h-full"
        >
          <SheetHeader>
            <motion.div variants={itemVariants}>
              <SheetTitle className="text-lg font-semibold text-foreground flex items-center gap-2 justify-center sm:justify-start">
                <Brain className="w-5 h-5 text-primary" />
                Park a thought
              </SheetTitle>
            </motion.div>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {/* Text input */}
            <motion.div variants={itemVariants}>
              <p className="text-sm text-muted-foreground mb-3">
                Something on your mind?
              </p>
              <Textarea
                placeholder="Write it down and let it go for now..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[100px] resize-none rounded-2xl border-border/50 bg-muted/30 focus:bg-background transition-all duration-300"
              />
            </motion.div>

            {/* Category selection */}
            <AnimatePresence>
              {text.trim() && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                >
                  <motion.p 
                    className="text-sm text-muted-foreground mb-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    What kind of thought is this?
                  </motion.p>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryOptions.map((option, index) => (
                      <motion.button
                        key={option.value}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 + index * 0.05 }}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCategory(option.value)}
                        className={`relative flex items-center gap-2 p-3.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden min-h-[44px] ${
                          category === option.value
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {/* Background gradient for non-selected */}
                        {category !== option.value && (
                          <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 hover:opacity-100 transition-opacity duration-300`} />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          {option.icon}
                          {option.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!text.trim() && (
              <motion.p 
                variants={itemVariants}
                className="text-center text-xs text-muted-foreground/70"
              >
                No analysis. No advice. Just space to let go.
              </motion.p>
            )}
          </SheetBody>

          {/* Actions in footer */}
          <AnimatePresence>
            {category && (
              <SheetFooter>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                  className="flex gap-3 w-full"
                >
                  <motion.div 
                    className="flex-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-2xl text-base font-medium"
                      onClick={() => handleSave(false)}
                    >
                      Park it
                    </Button>
                  </motion.div>
                  {category === 'worry' && (
                    <motion.div 
                      className="flex-1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        className="w-full h-12 rounded-2xl text-base font-medium shadow-lg shadow-primary/20"
                        onClick={() => handleSave(true)}
                      >
                        Make it a task
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </SheetFooter>
            )}
          </AnimatePresence>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
