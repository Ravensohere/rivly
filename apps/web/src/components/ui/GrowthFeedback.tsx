import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GrowthFeedbackProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

const messages = [
  "Something took root today.",
  "Your rhythm is settling.",
  "Growth in small steps.",
  "A seed of progress.",
  "Momentum building gently.",
];

export function GrowthFeedback({ show, message, onComplete }: GrowthFeedbackProps) {
  const [displayMessage, setDisplayMessage] = useState('');

  useEffect(() => {
    if (show) {
      setDisplayMessage(message || messages[Math.floor(Math.random() * messages.length)]);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, message, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Soft background overlay */}
          <motion.div
            className="absolute inset-0 bg-background/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Growth animation container */}
          <motion.div
            className="relative flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Growing orb */}
            <motion.div
              className="relative w-24 h-24"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            >
              {/* Outer glow */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, hsl(var(--secondary) / 0.4) 0%, transparent 70%)',
                }}
                animate={{
                  scale: [1, 1.3, 1.2],
                  opacity: [0.4, 0.6, 0.5],
                }}
                transition={{
                  duration: 2,
                  ease: 'easeOut',
                }}
              />

              {/* Inner growth */}
              <motion.div
                className="absolute inset-3 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 40% 40%, hsl(var(--secondary) / 0.6) 0%, hsl(var(--primary) / 0.3) 70%)',
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Sparkle particles */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-secondary"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    x: Math.cos((i / 5) * Math.PI * 2) * 50,
                    y: Math.sin((i / 5) * Math.PI * 2) * 50,
                    scale: [0, 1.2, 0],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.5 + i * 0.12,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </motion.div>

            {/* Message */}
            <motion.p
              className="text-foreground/90 text-lg font-medium text-center px-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              {displayMessage}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
