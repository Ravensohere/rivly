
import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface FocusLandscapeGrowthProps {
  progress: number; // 0 to 1
  isPaused: boolean;
  isComplete: boolean;
  className?: string; // Add className prop for flexibility
}

export function FocusLandscapeGrowth({ progress, isPaused, isComplete, className = "" }: FocusLandscapeGrowthProps) {
  // Generate random tree structure (deterministic based on seed)
  const branches = useMemo(() => {
    // Simple fractal tree generation
    const generateBranches = (depth: number, angle: number, length: number, x: number, y: number, branchProgressStart: number): any[] => {
      if (depth === 0) return [];

      const branchList = [];
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      
      // Each branch grows between specific progress milestones
      // Core trunk grows 0-20%
      // Level 1 branches grow 20-50%
      // Level 2 branches grow 50-80%
      // Leaves grow 80-100%
      
      const width = Math.max(1, depth * 2);
      
      branchList.push({
        x1: x,
        y1: y,
        x2: endX,
        y2: endY,
        width,
        depth,
        progressStart: branchProgressStart,
        progressEnd: branchProgressStart + 0.2, // Each level takes 20% of progress
        key: `branch-${depth}-${x}-${y}`
      });

      // Child branches
      const childLength = length * 0.7;
      const childDepth = depth - 1;
      const childStart = branchProgressStart + 0.15; // Start children slightly before parent finishes
      
      if (childDepth > 0) {
        branchList.push(...generateBranches(childDepth, angle - 0.5, childLength, endX, endY, childStart));
        branchList.push(...generateBranches(childDepth, angle + 0.5, childLength, endX, endY, childStart));
      }

      return branchList;
    };

    // Trunk starts at bottom center
    return generateBranches(4, -Math.PI / 2, 40, 100, 180, 0);
  }, []);

  const leaves = useMemo(() => {
    // Generate leaves at the ends of smallest branches (depth 1)
    return branches
      .filter(b => b.depth === 1)
      .flatMap((b, i) => {
        // Cluster of leaves at end
        return Array.from({ length: 5 }).map((_, j) => ({
          x: b.x2 + (Math.random() - 0.5) * 15,
          y: b.y2 + (Math.random() - 0.5) * 15,
          color: ['#4ade80', '#22c55e', '#16a34a'][Math.floor(Math.random() * 3)],
          key: `leaf-${i}-${j}`,
          progressStart: 0.7 + Math.random() * 0.2
        }));
      });
  }, [branches]);

  // Calculate opacity/scale for branches based on progress
  const getBranchStyle = (start: number, end: number) => {
    const localProgress = Math.max(0, Math.min(1, (progress - start) / (end - start)));
    return {
      pathLength: localProgress,
      opacity: localProgress > 0 ? 1 : 0
    };
  };

  return (
    <div className={`relative w-80 h-80 mx-auto ${className}`}>
      {/* Background Atmosphere */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-t from-emerald-50 to-sky-100 dark:from-emerald-950/30 dark:to-sky-900/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1 }}
      />
      
      <svg 
        viewBox="0 0 200 200" 
        className="w-full h-full drop-shadow-xl"
        style={{ overflow: 'visible' }}
      >
        {/* Ground */}
        <motion.path
          d="M 40 180 Q 100 170 160 180"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeOpacity="0.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress > 0.05 ? 1 : 0 }}
          transition={{ duration: 1 }}
        />

        {/* Tree Branches */}
        <g strokeLinecap="round">
          {branches.map((branch) => {
             // Calculate how much of this branch should be visible
             // If global progress is below start, 0
             // If above start, linearly animate to 1 until end
             const duration = (branch.progressEnd - branch.progressStart);
             const normalized = Math.max(0, Math.min(1, (progress - branch.progressStart) / duration));
             
             return (
              <motion.line
                key={branch.key}
                x1={branch.x1}
                y1={branch.y1}
                x2={branch.x2}
                y2={branch.y2}
                stroke="hsl(var(--primary))" // Use primary theme color for tree trunk
                strokeWidth={branch.width}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: normalized }}
                // Use spring for organic growth feel
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              />
            );
          })}
        </g>

        {/* Leaves */}
        <g>
          {leaves.map((leaf) => (
            <motion.circle
              key={leaf.key}
              cx={leaf.x}
              cy={leaf.y}
              r={3}
              fill={leaf.color}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: progress > leaf.progressStart ? 1 : 0,
                opacity: progress > leaf.progressStart ? (isPaused ? 0.6 : 0.9) : 0,
                x: isPaused ? 0 : [0, 1, -1, 0], // Subtle breeze effect
                y: isPaused ? 0 : [0, -1, 1, 0]
              }}
              transition={{
                scale: { duration: 0.5, type: 'spring' },
                opacity: { duration: 0.5 },
                x: { duration: 3 + Math.random(), repeat: Infinity, ease: 'easeInOut' },
                y: { duration: 4 + Math.random(), repeat: Infinity, ease: 'easeInOut' }
              }}
            />
          ))}
        </g>
        
        {/* Sun/Moon indicator based on progress? Optional nice touch */}
        <motion.circle
            cx={10 + progress * 180}
            cy={30 - Math.sin(progress * Math.PI) * 20}
            r={6}
            fill="hsl(var(--primary))"
            fillOpacity={0.4}
            animate={{
                r: isPaused ? [6, 5, 6] : 6
            }}
            transition={{ duration: 2, repeat: Infinity }}
        />

      </svg>
      
      {/* Sparkles for completion or high progress */}
      {(progress > 0.9 || isComplete) && (
        <div className="absolute inset-0 pointer-events-none">
             {[...Array(6)].map((_, i) => (
                 <motion.div
                    key={`sparkle-${i}`}
                    className="absolute bg-yellow-400 rounded-full w-1 h-1"
                    style={{ left: '50%', top: '40%' }}
                    initial={{ scale: 0 }}
                    animate={{ 
                        scale: [0, 1, 0],
                        x: (Math.random() - 0.5) * 100,
                        y: (Math.random() - 0.5) * 100,
                        opacity: [1, 0]
                    }}
                    transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        delay: i * 0.3, 
                        ease: "easeOut"
                    }}
                 />
             ))}
        </div>
      )}
    </div>
  );
}
