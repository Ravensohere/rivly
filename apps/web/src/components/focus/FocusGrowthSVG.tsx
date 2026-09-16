import { motion } from 'framer-motion';

interface FocusGrowthSVGProps {
  progress: number; // 0 to 1
  isPaused: boolean;
  isComplete: boolean;
}

export function FocusGrowthSVG({ progress, isPaused, isComplete }: FocusGrowthSVGProps) {
  const scale = 0.5 + progress * 0.5;
  const leafCount = Math.floor(progress * 8);
  
  const generateLeaves = () => {
    const leaves = [];
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / 8) * 360;
      const delay = i * 0.1;
      leaves.push(
        <motion.ellipse
          key={i}
          cx="100"
          cy="100"
          rx="12"
          ry="24"
          fill="hsl(var(--primary))"
          fillOpacity={0.6}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: isPaused ? 0.4 : 0.6,
            rotate: angle,
            x: Math.cos((angle * Math.PI) / 180) * (35 + progress * 20),
            y: Math.sin((angle * Math.PI) / 180) * (35 + progress * 20),
          }}
          transition={{ 
            duration: 0.8, 
            delay,
            ease: "easeOut"
          }}
        />
      );
    }
    return leaves;
  };

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Background glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/10"
        animate={{
          scale: isPaused ? [1, 1] : [1, 1.1, 1],
          opacity: isPaused ? 0.3 : [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <svg 
        viewBox="0 0 200 200" 
        className="w-full h-full"
      >
        {/* Breathing ring */}
        <motion.circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          strokeOpacity={0.2}
          animate={{
            r: isPaused ? [80, 80] : [75, 85, 75],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Growth leaves */}
        <g>
          {generateLeaves()}
        </g>
        
        {/* Center circle - core growth */}
        <motion.circle
          cx="100"
          cy="100"
          fill="hsl(var(--primary))"
          initial={{ r: 20 }}
          animate={{ 
            r: 20 + progress * 25,
            fillOpacity: isPaused ? 0.5 : 0.8,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        
        {/* Inner glow */}
        <motion.circle
          cx="100"
          cy="100"
          r={15 + progress * 15}
          fill="hsl(var(--primary-foreground))"
          fillOpacity={0.3}
          animate={{
            scale: isPaused ? [1, 1] : [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Completion bloom effect */}
        {isComplete && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.circle
                key={`bloom-${i}`}
                cx="100"
                cy="100"
                r="4"
                fill="hsl(var(--primary))"
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1,
                  scale: 1
                }}
                animate={{ 
                  x: Math.cos((i / 12) * 2 * Math.PI) * 80,
                  y: Math.sin((i / 12) * 2 * Math.PI) * 80,
                  opacity: 0,
                  scale: 0
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: i * 0.05,
                  ease: "easeOut"
                }}
              />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
