import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, PenLine, ListTodo, Clock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface FloatingActionButtonProps {
  onAddBlock: () => void;
  onAddTask: () => void;
  onAddReminder?: () => void;
  isHidden?: boolean;
}

export function FloatingActionButton({ onAddBlock, onAddTask, onAddReminder, isHidden }: FloatingActionButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // On /app the Riva command bar occupies ~52px above the 72px nav
  // so lift the FAB an extra 60px to avoid overlap
  const isPlanner = location.pathname === '/app';
  const fabBottom = isPlanner ? 'bottom-[148px]' : 'bottom-24';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleJournal = () => {
    setIsOpen(false);
    navigate('/reflect?tab=journal');
  };

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  if (!mounted || isHidden) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[9990] pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={`fixed ${fabBottom} right-8 z-[9999] flex flex-col items-end pointer-events-none`}>
        <AnimatePresence>
          {isOpen && (
            <div className="flex flex-col items-end gap-5 mb-8 pointer-events-auto mr-0.5">
              
              {/* Journal Card */}
              <motion.button
                onClick={handleJournal}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
                className="flex items-center gap-4 bg-card p-3 pr-6 rounded-[2rem] shadow-xl border border-border/50 w-[210px] h-[88px] cursor-pointer hover:bg-accent/50 transition-colors"
                style={{ borderRadius: '32px' }}
              >
                <div className="w-12 h-12 rounded-full bg-[#fae8ef] flex items-center justify-center text-gray-700 shrink-0 ml-1">
                  <PenLine className="w-6 h-6" strokeWidth={2} />
                </div>
                <div className="flex-1 flex flex-col items-start justify-center h-full min-w-0">
                  <span className="text-xs text-muted-foreground font-medium mb-0.5">Add</span>
                  <span className="font-bold text-foreground text-lg leading-none truncate w-full text-left">Journal</span>
                </div>
              </motion.button>

              {/* Add Task Card */}
              <motion.button
                onClick={() => handleAction(onAddTask)}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.05 }}
                className="flex items-center gap-4 bg-card p-3 pr-6 rounded-[2rem] shadow-xl border border-border/50 w-[210px] h-[88px] cursor-pointer hover:bg-accent/50 transition-colors"
                style={{ borderRadius: '32px' }}
              >
                <div className="w-12 h-12 rounded-full bg-[#e9e8fa] flex items-center justify-center text-gray-700 shrink-0 ml-1">
                  <ListTodo className="w-6 h-6" strokeWidth={2} />
                </div>
                <div className="flex-1 flex flex-col items-start justify-center h-full min-w-0">
                  <span className="text-xs text-muted-foreground font-medium mb-0.5">Add</span>
                  <span className="font-bold text-foreground text-lg leading-none truncate w-full text-left">Task</span>
                </div>
              </motion.button>

              {/* Add Block Card */}
              <motion.button
                onClick={() => handleAction(onAddBlock)}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex items-center gap-4 bg-card p-3 pr-6 rounded-[2rem] shadow-xl border border-border/50 w-[210px] h-[88px] cursor-pointer hover:bg-accent/50 transition-colors"
                style={{ borderRadius: '32px' }}
              >
                <div className="w-12 h-12 rounded-full bg-[#e1f0ec] flex items-center justify-center text-gray-700 shrink-0 ml-1">
                  <Clock className="w-6 h-6" strokeWidth={2} />
                </div>
                <div className="flex-1 flex flex-col items-start justify-center h-full min-w-0">
                  <span className="text-xs text-muted-foreground font-medium mb-0.5">Add</span>
                  <span className="font-bold text-foreground text-lg leading-none truncate w-full text-left">Block</span>
                </div>
              </motion.button>

            </div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close quick add menu' : 'Add task or block'}
          aria-expanded={isOpen}
          className={`relative w-16 h-16 flex items-center justify-center shadow-xl pointer-events-auto z-50 transition-all duration-300`}
          style={{
            borderRadius: '20px', 
            boxShadow: '0 8px 24px -4px rgba(91, 103, 199, 0.4)',
            // Closed: Blue, Open: White with Border
            backgroundColor: isOpen ? '#ffffff' : '#5b67c7',
            color: isOpen ? '#000000' : '#ffffff',
            border: isOpen ? '2px solid #1a1a1a' : '2px solid transparent',
          }}
          animate={{ 
            rotate: isOpen ? 45 : 0, 
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Icon stays relative to button. Closed (0 rot) -> Icon (+). Open (45 rot) -> Icon (x). */}
           <Plus className="w-8 h-8" strokeWidth={2.5} />
        </motion.button>
      </div>
    </>,
    document.body
  );
}