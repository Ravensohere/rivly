import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandscapeState, Collectible, FocusSeed } from '@/types/landscape';

interface PremiumLandscapeSceneProps {
  landscapeState: LandscapeState;
  seeds: (FocusSeed & { xPosition: number; dayLabel?: string; dayOfMonth?: number })[];
  unlockedCollectibles: Collectible[];
  viewMode: 'day' | 'week' | 'month';
  isInteractive?: boolean;
}

// Premium tree component with distinct 3D styling
function PremiumTree({ 
  x, 
  size, 
  type, 
  delay,
  onTap,
  info,
}: { 
  x: number; 
  size: 'small' | 'medium' | 'large'; 
  type: 'oak' | 'pine' | 'bamboo' | 'willow' | 'seedling';
  delay: number;
  onTap?: () => void;
  info?: { duration: number; time?: string };
}) {
  const sizeMap = { small: 0.7, medium: 1, large: 1.3 };
  const scale = sizeMap[size];
  const baseHeight = { small: 18, medium: 24, large: 30 }[size];
  const groundY = 92; // Pushed to bottom to survive widescreen cropping

  // Random sway duration for organic feel
  const duration = 3 + Math.random() * 2;
  
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.6, type: 'spring' }}
      style={{ cursor: onTap ? 'pointer' : 'default', transformBox: 'fill-box', transformOrigin: 'bottom center' }}
      onClick={onTap}
    >
      {/* Soft ground shadow */}
      <ellipse
        cx={x}
        cy={groundY - 2}
        rx={7 * scale}
        ry={2 * scale}
        fill="rgba(0,0,0,0.15)"
        filter="blur(1px)"
      />
      
      {/* Tree Sway Group */}
      <motion.g
        animate={{ rotate: [0, 1, 0, -1, 0] }}
        transition={{ duration: duration, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformBox: 'fill-box', transformOrigin: 'bottom center' }}
      >
        {type === 'oak' && (
          <>
            {/* Trunk */}
            <path
              d={`M${x - 1.5 * scale},${groundY} L${x + 1.5 * scale},${groundY} L${x + 1 * scale},${groundY - baseHeight * 0.6} L${x - 1 * scale},${groundY - baseHeight * 0.6} Z`}
              fill="url(#trunkGradient)"
            />
            {/* 3D Canopy Layers */}
            <circle cx={x} cy={groundY - baseHeight * 0.9} r={11 * scale} fill="url(#oakGradient1)" />
            <circle cx={x - 5 * scale} cy={groundY - baseHeight * 0.75} r={9 * scale} fill="url(#oakGradient2)" />
            <circle cx={x + 5 * scale} cy={groundY - baseHeight * 0.75} r={9 * scale} fill="url(#oakGradient3)" />
            {/* Highlights */}
            <ellipse cx={x - 3 * scale} cy={groundY - baseHeight * 1} rx={4 * scale} ry={2 * scale} fill="white" opacity={0.15} transform={`rotate(-15 ${x - 3 * scale} ${groundY - baseHeight * 1})`} />
          </>
        )}
        
        {type === 'pine' && (
          <>
            {/* Trunk */}
            <rect
              x={x - 1.5 * scale}
              y={groundY - baseHeight * 0.2}
              width={3 * scale}
              height={baseHeight * 0.2}
              fill="url(#trunkGradient)"
            />
            {/* Conical Layers */}
            <path
              d={`M${x},${groundY - baseHeight} L${x - 9 * scale},${groundY - baseHeight * 0.4} Q${x},${groundY - baseHeight * 0.35} ${x + 9 * scale},${groundY - baseHeight * 0.4} Z`}
              fill="url(#pineGradient)"
            />
            <path
              d={`M${x},${groundY - baseHeight * 0.7} L${x - 11 * scale},${groundY - baseHeight * 0.2} Q${x},${groundY - baseHeight * 0.15} ${x + 11 * scale},${groundY - baseHeight * 0.2} Z`}
              fill="url(#pineGradient)"
            />
          </>
        )}
        
        {/* Bamboo mapped to pine for consistency */}
        {type === 'bamboo' && (
          <>
            {/* Trunk */}
            <rect
              x={x - 1.5 * scale}
              y={groundY - baseHeight * 0.2}
              width={3 * scale}
              height={baseHeight * 0.2}
              fill="url(#trunkGradient)"
            />
            {/* Conical Layers */}
            <path
              d={`M${x},${groundY - baseHeight} L${x - 9 * scale},${groundY - baseHeight * 0.4} Q${x},${groundY - baseHeight * 0.35} ${x + 9 * scale},${groundY - baseHeight * 0.4} Z`}
              fill="url(#pineGradient)"
            />
            <path
              d={`M${x},${groundY - baseHeight * 0.7} L${x - 11 * scale},${groundY - baseHeight * 0.2} Q${x},${groundY - baseHeight * 0.15} ${x + 11 * scale},${groundY - baseHeight * 0.2} Z`}
              fill="url(#pineGradient)"
            />
          </>
        )}
        
        {type === 'willow' && (
          <>
             {/* Trunk - straighter than oak but thick */}
            <path
              d={`M${x - 1 * scale},${groundY} L${x + 1 * scale},${groundY} L${x + 0.8 * scale},${groundY - baseHeight * 0.5} L${x - 0.8 * scale},${groundY - baseHeight * 0.5} Z`}
              fill="url(#trunkGradient)"
            />
            {/* Round Canopy (Maple-like) */}
             <circle cx={x} cy={groundY - baseHeight * 0.8} r={9 * scale} fill="url(#willowGradient)" />
             <circle cx={x - 4 * scale} cy={groundY - baseHeight * 0.6} r={6 * scale} fill="url(#willowGradient)" />
             <circle cx={x + 4 * scale} cy={groundY - baseHeight * 0.6} r={6 * scale} fill="url(#willowGradient)" />
             <circle cx={x} cy={groundY - baseHeight * 1.0} r={7 * scale} fill="url(#willowGradient)" />
          </>
        )}
        
        {/* Seedling mapped to small oak */}
        {type === 'seedling' && (
          <>
            {/* Trunk */}
            <path
              d={`M${x - 1.5 * scale},${groundY} L${x + 1.5 * scale},${groundY} L${x + 1 * scale},${groundY - baseHeight * 0.6} L${x - 1 * scale},${groundY - baseHeight * 0.6} Z`}
              fill="url(#trunkGradient)"
            />
            {/* 3D Canopy Layers */}
            <circle cx={x} cy={groundY - baseHeight * 0.9} r={11 * scale} fill="url(#oakGradient1)" />
            <circle cx={x - 5 * scale} cy={groundY - baseHeight * 0.75} r={9 * scale} fill="url(#oakGradient2)" />
            <circle cx={x + 5 * scale} cy={groundY - baseHeight * 0.75} r={9 * scale} fill="url(#oakGradient3)" />
            {/* Highlights */}
            <ellipse cx={x - 3 * scale} cy={groundY - baseHeight * 1} rx={4 * scale} ry={2 * scale} fill="white" opacity={0.15} transform={`rotate(-15 ${x - 3 * scale} ${groundY - baseHeight * 1})`} />
          </>
        )}
      </motion.g>
    </motion.g>
  );
}

// Premium sky gradient with time-of-day dynamics
function PremiumSky({ skyState, lightState }: { skyState: string; lightState: string }) {
  // Determine time of day
  const hour = new Date().getHours();
  
  let timeTheme: 'morning' | 'day' | 'evening' | 'night';
  if (hour >= 5 && hour < 11) timeTheme = 'morning';
  else if (hour >= 11 && hour < 17) timeTheme = 'day';
  else if (hour >= 17 && hour < 20) timeTheme = 'evening';
  else timeTheme = 'night';

  const gradients = {
    morning: { colors: ['#87CEEB', '#B0E0E6', '#FFDAB9'], opacity: 1 }, // Sky blue to peach
    day: { colors: ['#1E90FF', '#87CEEB', '#E0F7FA'], opacity: 1 }, // Deep blue to bright cyan
    evening: { colors: ['#4B0082', '#FF4500', '#FFD700'], opacity: 1 }, // Indigo to orange/gold
    night: { colors: ['#0F172A', '#1E1B4B', '#312E81'], opacity: 1 }, // Dark slate to deep indigo
  };

  const currentGradient = gradients[timeTheme];

  // Helper to generate random stars
  const generateStars = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
      cx: `${Math.random() * 100}%`,
      cy: `${Math.random() * 60}%`, // Stars only in top 60%
      r: Math.random() * 0.2 + 0.1,
      opacity: Math.random() * 0.8 + 0.2,
      delay: Math.random() * 2,
    }));
  };

  const stars = useMemo(() => generateStars(50), []);

  return (
    <>
      <defs>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={currentGradient.colors[0]} />
          <stop offset="50%" stopColor={currentGradient.colors[1]} />
          <stop offset="100%" stopColor={currentGradient.colors[2]} />
        </linearGradient>

        {/* 3D Tree Gradients - Keep these available */}
        <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4e342e" />
          <stop offset="40%" stopColor="#795548" />
          <stop offset="60%" stopColor="#795548" />
          <stop offset="100%" stopColor="#4e342e" />
        </linearGradient>
        
        <radialGradient id="oakGradient1" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#66BB6A" />
          <stop offset="100%" stopColor="#2E7D32" />
        </radialGradient>
        <radialGradient id="oakGradient2" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#81C784" />
          <stop offset="100%" stopColor="#388E3C" />
        </radialGradient>
        <radialGradient id="oakGradient3" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="100%" stopColor="#43A047" />
        </radialGradient>
        
        <linearGradient id="pineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1B5E20" />
          <stop offset="50%" stopColor="#4CAF50" />
          <stop offset="100%" stopColor="#1B5E20" />
        </linearGradient>
        
        <linearGradient id="bambooGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#33691E" />
          <stop offset="30%" stopColor="#7CB342" />
          <stop offset="70%" stopColor="#7CB342" />
          <stop offset="100%" stopColor="#33691E" />
        </linearGradient>
        
        <radialGradient id="willowGradient" cx="50%" cy="20%" r="80%">
           <stop offset="0%" stopColor="#81C784" />
           <stop offset="100%" stopColor="#2E7D32" />
        </radialGradient>

        {/* Moon Glow */}
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.8" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        
        {/* Sun Glow */}
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDB813" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FDB813" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="100%" height="100%" fill="url(#skyGradient)" />
      
      {/* Celestial Bodies */}
      
      {/* Morning/Day Sun */}
      {(timeTheme === 'morning' || timeTheme === 'day') && (
        <motion.g 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Sun Glow */}
          <circle cx={timeTheme === 'morning' ? "20%" : "50%"} cy={timeTheme === 'morning' ? "30%" : "15%"} r="8%" fill="url(#sunGlow)" opacity={0.6} />
          {/* Sun Core */}
          <circle cx={timeTheme === 'morning' ? "20%" : "50%"} cy={timeTheme === 'morning' ? "30%" : "15%"} r="3%" fill="#FDB813">
             <animate attributeName="r" values="3%;3.2%;3%" dur="4s" repeatCount="indefinite" />
          </circle>
        </motion.g>
      )}

      {/* Evening Sun (Setting) */}
      {timeTheme === 'evening' && (
        <motion.g
           initial={{ y: -20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ duration: 1 }}
        >
           <circle cx="80%" cy="40%" r="10%" fill="#FF4500" opacity={0.4} />
           <circle cx="80%" cy="40%" r="4%" fill="#FF8C00" />
        </motion.g>
      )}

      {/* Night Moon and Stars */}
      {timeTheme === 'night' && (
        <>
          {/* Stars */}
          {stars.map((star, i) => (
            <circle 
              key={i}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill="white"
              opacity={star.opacity}
            >
              <animate 
                attributeName="opacity" 
                values={`${star.opacity};${star.opacity * 0.3};${star.opacity}`} 
                dur={`${2 + star.delay}s`} 
                repeatCount="indefinite" 
              />
            </circle>
          ))}
          
          {/* Moon */}
          <motion.g
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.5 }}
          >
             {/* Moon Glow */}
             <circle cx="85%" cy="15%" r="6%" fill="url(#moonGlow)" opacity={0.3} />
             {/* Crescent Moon shape */}
             <path d="M 85 10 A 5 5 0 1 1 85 20 A 4 4 0 1 0 85 10 Z" fill="#F4F6F0" transform="translate(-2, 0) scale(0.15) translate(500, 50)" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} /> 
             {/* Simple Circle Moon if path too complex to position relatively */}
             <circle cx="85%" cy="15%" r="2.5%" fill="#F4F6F0" />
             <circle cx="86%" cy="14%" r="2.5%" fill="#1E1B4B" /> {/* Shadow to make crescent - matches sky color roughly */}
          </motion.g>
        </>
      )}
    </>
  );
}

// Premium hills with dynamically generated paths based on width
function PremiumHills({ width }: { width: number }) {
  // Generate hill paths dynamically to cover the full width
  const generateHillPath = (yBase: number, amplitude: number, frequency: number, seed: number) => {
    let d = `M0,${yBase}`;
    const segments = Math.ceil(width / frequency);
    
    for (let i = 0; i <= segments; i++) {
        const x = i * frequency;
        // Simple pseudo-random variation based on index and seed
        const offset = Math.sin(i * 0.5 + seed) * amplitude;
        // Use smooth quadratic bezier curves
        d += ` Q${x + frequency/2},${yBase - offset} ${x + frequency},${yBase}`;
    }
    
    d += ` L${width},100 L0,100 Z`;
    return d;
  };

  return (
    <>
      {/* Far hills */}
      <path
        d={generateHillPath(78, 4, 60, 1)}
        fill="#6B8E6B"
        opacity={0.4}
      />
      {/* Mid hills */}
      <path
        d={generateHillPath(82, 3, 50, 2)}
        fill="#5A7D5A"
        opacity={0.6}
      />
      {/* Near ground */}
      <path
        d={generateHillPath(86, 2, 40, 3)}
        fill="#4A6D4A"
      />
      {/* Grass texture */}
      <rect x="0" y="88" width="100%" height="12%" fill="#3D5C3D" />
    </>
  );
}

export function PremiumLandscapeScene({
  landscapeState,
  seeds,
  unlockedCollectibles,
  viewMode,
  isInteractive = true,
}: PremiumLandscapeSceneProps) {
  const [selectedTree, setSelectedTree] = useState<{ x: number; duration: number; time?: string } | null>(null);
  
  // Calculate dynamic width based on number of trees AND screen aspect ratio
  // This prevents "giant trees" on wide screens by ensuring viewBox matches container aspect ratio
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    const updateRatio = () => {
      // Estimate landscape container height (approx 40-50% of screen height)
      // If we assume the container is roughly 400px-500px tall on desktop
      const w = window.innerWidth;
      const h = window.innerHeight * 0.45; // Approx container height
      setAspectRatio(w / h);
    };
    
    updateRatio();
    window.addEventListener('resize', updateRatio);
    return () => window.removeEventListener('resize', updateRatio);
  }, []);

  const sceneWidth = useMemo(() => {
    // 1. Calculate minimum width needed to fill screen without zooming in vertically
    // Height is fixed at 100 units. To fit aspect ratio R, width must be 100 * R.
    const minWidthForScreen = 100 * aspectRatio;

    // 2. Calculate width needed for all trees
    const treeWidth = seeds.length * 15; // 15 units per tree space

    // 3. Take the max, but clamp the minimum for mobile to avoid being too tiny
    // On mobile (portrait), aspectRatio < 1, so minWidthForScreen might be 50.
    // We strictly enforce min 100 for proper mobile framing.
    const baseWidth = Math.max(100, minWidthForScreen);
    
    return Math.max(baseWidth, treeWidth);
  }, [seeds.length, aspectRatio]);

  // Generate trees from seeds with proper positioning and spreading
  const trees = useMemo(() => {
    const rawTrees = seeds.map((seed, i) => {
      // Determine tree type and size based on session
      let type: 'oak' | 'pine' | 'bamboo' | 'willow' | 'seedling' = 'seedling';
      let size: 'small' | 'medium' | 'large' = 'small';

      if (seed.completed) {
        if (seed.durationMinutes < 30) {
          type = 'seedling'; // 0-30 mins: Small tree
          size = 'small';
        } else if (seed.durationMinutes < 60) {
          type = 'pine'; // 30-60 mins: Pine tree
          size = 'medium';
        } else if (seed.durationMinutes < 90) {
          type = 'willow'; // 60-90 mins: Willow tree
          size = 'medium';
        } else {
          type = 'oak'; // 90+ mins: Large Oak
          size = 'large';
        }
      } else {
        // Incomplete sessions show as small seedlings
        type = 'seedling';
        size = 'small';
      }

      // Distribute trees across available width
      // Use 90% of width (5% to 95%) to spread them out more
      const usableWidth = sceneWidth * 0.9;
      const startX = sceneWidth * 0.05;
      
      // If we have position data (0-1), map it to usable width
      const normalizedPos = seed.xPosition; 
      const x = startX + (normalizedPos * usableWidth);

      return {
        id: seed.id,
        type,
        size,
        x,
        duration: seed.durationMinutes,
        delay: i * 0.1,
      };
    });

    // Sort by x position to process spreading
    rawTrees.sort((a, b) => a.x - b.x);

    // Spreading algorithm to prevent tight overlap
    const minGap = 12; // Maintain good gap
    for (let i = 1; i < rawTrees.length; i++) {
        const prev = rawTrees[i - 1];
        const curr = rawTrees[i];
        if (curr.x < prev.x + minGap) {
            curr.x = prev.x + minGap;
        }
    }

    return rawTrees;
  }, [seeds, sceneWidth]);
  
  const handleTreeTap = (tree: typeof trees[0]) => {
    if (!isInteractive) return;
    setSelectedTree({ x: tree.x, duration: tree.duration });
    setTimeout(() => setSelectedTree(null), 3000);
  };

  return (
    <div className="relative w-full h-full overflow-x-auto overflow-y-hidden bg-gradient-to-b from-sky-100 to-green-100 nice-scrollbar">
      <svg
        viewBox={`0 0 ${sceneWidth} 100`}
        preserveAspectRatio="xMidYMax meet"
        className="h-full block"
        style={{ 
          height: '100%',
          width: 'auto',
          aspectRatio: `${sceneWidth} / 100`
        }} 
      >
        {/* Sky */}
        <PremiumSky skyState={landscapeState.skyState} lightState={landscapeState.lightState} />
        
        {/* Hills and ground */}
        <PremiumHills width={sceneWidth} />
        
        {/* Trees */}
        {trees.map((tree) => (
          <PremiumTree
            key={tree.id}
            x={tree.x}
            size={tree.size}
            type={tree.type}
            delay={tree.delay}
            onTap={() => handleTreeTap(tree)}
            info={{ duration: tree.duration }}
          />
        ))}

        {/* Empty state - single seedling hint */}
        {trees.length === 0 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.5 }}
          >
            <circle cx={sceneWidth/2} cy="82" r="8" fill="none" stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" opacity={0.4} />
            <text x={sceneWidth/2} y="95" textAnchor="middle" fontSize="3" fill="hsl(var(--muted-foreground))" opacity={0.5}>
              {viewMode === 'day' ? 'Focus to grow' : 'No sessions'}
            </text>
          </motion.g>
        )}
      </svg>

      {/* Tree tooltip */}
      <AnimatePresence>
        {selectedTree && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg z-50 whitespace-nowrap"
            style={{ 
              left: `${(selectedTree.x / sceneWidth) * 100}%`, // Position relative to scroll container
              bottom: '25%',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-lg">🌳</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedTree.duration} minutes</p>
                <p className="text-xs text-muted-foreground">Focus session</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View mode indicator overlay */}
      {viewMode !== 'day' && (
        <div className="sticky left-4 bottom-4 pointer-events-none">
          {/* Optional decorative overlay */}
        </div>
      )}
    </div>
  );
}
