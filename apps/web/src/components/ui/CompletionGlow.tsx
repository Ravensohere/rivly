import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface CompletionGlowProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

export function CompletionGlow({ show, children, className = '' }: CompletionGlowProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      
      <AnimatePresence>
        {show && (
          <>
            {/* Outer glow ring */}
            <motion.div
              className="absolute inset-0 rounded-inherit pointer-events-none"
              style={{
                borderRadius: 'inherit',
                boxShadow: '0 0 0 0 hsl(var(--primary) / 0.3)',
              }}
              initial={{ 
                boxShadow: '0 0 0 0 hsl(var(--primary) / 0.3)',
                scale: 1,
              }}
              animate={{ 
                boxShadow: [
                  '0 0 0 0 hsl(var(--primary) / 0.3)',
                  '0 0 20px 4px hsl(var(--primary) / 0.2)',
                  '0 0 30px 8px hsl(var(--primary) / 0)',
                ],
                scale: [1, 1.02, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />

            {/* Inner scale bounce */}
            <motion.div
              className="absolute inset-0 rounded-inherit pointer-events-none"
              style={{
                borderRadius: 'inherit',
                background: 'radial-gradient(circle at center, hsl(var(--secondary) / 0.15) 0%, transparent 70%)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: [0, 0.6, 0],
                scale: [0.95, 1.02, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Tiny sparkle */}
            <motion.div
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary/60 pointer-events-none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.5, 0],
                opacity: [0, 0.8, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
