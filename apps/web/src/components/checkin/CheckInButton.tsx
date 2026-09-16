import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface CheckInButtonProps {
  onClick: () => void;
}

export function CheckInButton({ onClick }: CheckInButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="flex-shrink-0 p-2.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors duration-200 touch-target relative"
      aria-label="Daily check-in"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Pulsing indicator */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/30"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <Heart className="w-5 h-5 text-primary relative z-10" fill="currentColor" />
    </motion.button>
  );
}
