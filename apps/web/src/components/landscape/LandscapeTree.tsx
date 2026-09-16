import { motion } from 'framer-motion';

interface LandscapeTreeProps {
  type: 'oak' | 'bamboo' | 'pine' | 'willow' | 'seedling';
  size?: 'small' | 'medium' | 'large';
  growthProgress?: number; // 0-1 for animation
  x: number; // percentage position
  delay?: number;
}

export function LandscapeTree({ type, size = 'medium', growthProgress = 1, x, delay = 0 }: LandscapeTreeProps) {
  const sizeScale = {
    small: 0.6,
    medium: 1,
    large: 1.4,
  };

  const scale = sizeScale[size] * Math.max(0.1, growthProgress);

  const renderTree = () => {
    switch (type) {
      case 'oak':
        return (
          <g>
            {/* Trunk */}
            <motion.path
              d="M48 100 L48 65 Q48 55 42 45 L58 45 Q52 55 52 65 L52 100 Z"
              fill="hsl(28 40% 30%)"
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: growthProgress }}
              transition={{ duration: 1.2, delay, ease: 'easeOut' }}
            />
            {/* Canopy */}
            <motion.g 
              initial={{ scale: 0 }} 
              animate={{ scale: growthProgress }} 
              transition={{ delay: delay + 0.3, duration: 1.2, type: "spring", bounce: 0.4 }}
              style={{ originX: '50px', originY: '50px' }}
            >
                <circle cx="50" cy="30" r="25" fill="hsl(145 35% 45%)" />
                <circle cx="30" cy="50" r="22" fill="hsl(145 30% 40%)" />
                <circle cx="70" cy="50" r="22" fill="hsl(145 30% 40%)" />
                <circle cx="50" cy="55" r="22" fill="hsl(145 25% 35%)" />
            </motion.g>
          </g>
        );

      case 'bamboo':
        return (
          <g>
             {[35, 50, 65].map((bx, i) => (
                <motion.g key={i} 
                    initial={{ scaleY: 0, originY: 1 }} 
                    animate={{ scaleY: growthProgress }} 
                    transition={{ delay: delay + i * 0.15, duration: 1.2, ease: 'easeOut' }}>
                    {/* Stalk */}
                    <rect x={bx - 2} y="15" width="4" height="85" fill="hsl(100 30% 45%)" rx="2" />
                    {/* Nodes */}
                    {[30, 50, 70, 90].map(y => (
                        <rect key={y} x={bx - 3} y={y} width="6" height="2" fill="hsl(100 25% 35%)" rx="1" />
                    ))}
                    {/* Leaves */}
                     <path d={`M${bx} 30 Q${bx + 12} 20 ${bx + 18} 25 Q${bx + 10} 30 ${bx} 30`} fill="hsl(100 35% 55%)" />
                     <path d={`M${bx} 50 Q${bx - 12} 40 ${bx - 18} 45 Q${bx - 10} 50 ${bx} 50`} fill="hsl(100 35% 55%)" />
                     <path d={`M${bx} 70 Q${bx + 12} 60 ${bx + 18} 65 Q${bx + 10} 70 ${bx} 70`} fill="hsl(100 35% 55%)" />
                </motion.g>
             ))}
          </g>
        );

      case 'pine':
        return (
          <g>
            <motion.rect
              x="46" y="85" width="8" height="15"
              fill="hsl(25 35% 25%)"
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: growthProgress }}
              transition={{ duration: 0.8, delay }}
            />
            {/* Layers */}
            {[
                { d: "M20 90 L80 90 L50 45 Z", fill: "hsl(155 35% 30%)", dy: 0.2 },
                { d: "M25 65 L75 65 L50 25 Z", fill: "hsl(155 40% 35%)", dy: 0.4 },
                { d: "M32 40 L68 40 L50 10 Z", fill: "hsl(155 45% 40%)", dy: 0.6 }
            ].map((layer, i) => (
                <motion.path
                    key={i}
                    d={layer.d}
                    fill={layer.fill}
                    initial={{ scale: 0, originY: 1 }}
                    animate={{ scale: growthProgress }}
                    transition={{ delay: delay + layer.dy, duration: 1, type: 'spring' }}
                    style={{ originX: '50px', originY: '90px' }}
                />
            ))}
          </g>
        );

      case 'willow':
        return (
          <g>
            {/* Trunk */}
             <motion.path
              d="M50 100 L50 60 Q50 50 40 45"
              stroke="hsl(30 25% 35%)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: growthProgress }}
              transition={{ duration: 1.5, delay }}
            />
             {/* Canopy top */}
            <ellipse cx="50" cy="45" rx="15" ry="10" fill="hsl(130 25% 45%)" />
            
            {/* Drooping branches */}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: growthProgress }} transition={{ delay: delay + 0.5, duration: 2 }}>
                {[10, 30, 50, 70, 90].map(tx => (
                     <path 
                        key={tx}
                        d={`M${tx} 45 Q${tx} 60 ${tx + (Math.random() * 10 - 5)} 90`} 
                        stroke="hsl(130 30% 50%)" 
                        strokeWidth="3" 
                        fill="none" 
                        className="opacity-90"
                     />
                ))}
                 {[20, 40, 60, 80].map(tx => (
                     <path 
                        key={tx}
                        d={`M${tx} 45 Q${tx} 55 ${tx + (Math.random() * 10 - 5)} 80`} 
                        stroke="hsl(130 35% 55%)" 
                        strokeWidth="2" 
                        fill="none" 
                        className="opacity-90"
                     />
                ))}
            </motion.g>
          </g>
        );

      case 'seedling':
      default:
        return (
          <g>
            <motion.path
               d="M50 100 L50 75"
               stroke="hsl(140 35% 45%)"
               strokeWidth="4"
               fill="none"
               strokeLinecap="round"
               initial={{ pathLength: 0 }}
               animate={{ pathLength: growthProgress }}
               transition={{ duration: 0.5, delay }}
            />
             <motion.g 
                initial={{ scale: 0 }} 
                animate={{ scale: growthProgress }} 
                transition={{ delay: delay + 0.3, duration: 0.8, type: 'spring' }}
                style={{ originX: '50px', originY: '75px' }}
             >
                <ellipse cx="35" cy="65" rx="10" ry="15" fill="hsl(140 40% 60%)" transform="rotate(-30 35 65)" />
                <ellipse cx="65" cy="65" rx="10" ry="15" fill="hsl(140 40% 60%)" transform="rotate(30 65 65)" />
             </motion.g>
          </g>
        );
    }
  };

  return (
    <motion.svg
      viewBox="0 0 100 100" // Increased viewBox for more detailed drawing
      className="absolute bottom-8"
      style={{
        left: `${x}%`,
        width: `${5 * scale}%`, // Adjusted width scaler for new viewBox
        height: 'auto',
        transformOrigin: 'bottom center',
        zIndex: 10,
        filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' // subtle shadow for depth
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay }}
    >
      {renderTree()}
    </motion.svg>
  );
}
