import { motion } from 'framer-motion';

interface DayStateIconProps {
  state: 'hard' | 'okay' | 'good';
  isSelected?: boolean;
  className?: string;
}

export function DayStateIcon({ state, isSelected = false, className = '' }: DayStateIconProps) {
  const baseColor = isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))';
  const mutedColor = isSelected ? 'hsl(var(--primary-foreground) / 0.6)' : 'hsl(var(--muted-foreground))';
  
  // All icons share the same: stroke width (1.5), corner softness, and overall proportions
  const strokeWidth = 1.5;
  
  return (
    <motion.svg
      viewBox="0 0 32 32"
      fill="none"
      className={`w-8 h-8 ${className}`}
      initial={false}
      animate={{ 
        scale: isSelected ? 1.05 : 1,
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {state === 'hard' && (
        <>
          {/* Soft cloud - rounded, friendly shape */}
          <motion.path
            d="M8 18C5.79 18 4 16.21 4 14C4 12.14 5.28 10.59 7 10.14C7 10.09 7 10.05 7 10C7 7.24 9.24 5 12 5C14.05 5 15.81 6.24 16.58 8C16.72 8 16.86 8 17 8C19.76 8 22 10.24 22 13C22 13.34 21.97 13.67 21.91 14C23.66 14.35 25 15.89 25 17.78C25 19.99 23.21 21.78 21 21.78H8C5.79 21.78 4 19.99 4 17.78"
            stroke={baseColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Gentle mist drops - soft, small, evenly spaced */}
          <motion.circle
            cx="10"
            cy="25"
            r="1"
            fill={mutedColor}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          />
          <motion.circle
            cx="14.5"
            cy="26"
            r="1"
            fill={mutedColor}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          />
          <motion.circle
            cx="19"
            cy="25"
            r="1"
            fill={mutedColor}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          />
        </>
      )}
      
      {state === 'okay' && (
        <>
          {/* Soft cloud - same style as hard day cloud */}
          <motion.path
            d="M6 17C3.79 17 2 15.21 2 13C2 11.14 3.28 9.59 5 9.14C5 9.09 5 9.05 5 9C5 6.24 7.24 4 10 4C12.05 4 13.81 5.24 14.58 7C14.72 7 14.86 7 15 7C17.76 7 20 9.24 20 12C20 12.34 19.97 12.67 19.91 13C21.66 13.35 23 14.89 23 16.78C23 18.99 21.21 20.78 19 20.78H6"
            stroke={baseColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Sun peeking through - soft, partial circle */}
          <motion.path
            d="M26 18C27.66 16.34 28.5 14.17 28.5 12C28.5 9.83 27.66 7.66 26 6"
            stroke={baseColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          />
          {/* Subtle sun rays */}
          <motion.line
            x1="29"
            y1="12"
            x2="31"
            y2="12"
            stroke={mutedColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          />
          <motion.line
            x1="27.5"
            y1="7.5"
            x2="29"
            y2="6"
            stroke={mutedColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.55, duration: 0.3 }}
          />
          <motion.line
            x1="27.5"
            y1="16.5"
            x2="29"
            y2="18"
            stroke={mutedColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          />
        </>
      )}
      
      {state === 'good' && (
        <>
          {/* Full sun - soft, rounded */}
          <motion.circle
            cx="16"
            cy="16"
            r="6"
            stroke={baseColor}
            strokeWidth={strokeWidth}
            fill="none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
          {/* Gentle rays - evenly distributed, rounded ends */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const innerR = 9;
            const outerR = 12;
            const x1 = 16 + Math.cos(rad) * innerR;
            const y1 = 16 + Math.sin(rad) * innerR;
            const x2 = 16 + Math.cos(rad) * outerR;
            const y2 = 16 + Math.sin(rad) * outerR;
            
            return (
              <motion.line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={baseColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: 1, pathLength: 1 }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.3 }}
              />
            );
          })}
        </>
      )}
    </motion.svg>
  );
}
