import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface RivaGlobeProps {
  size?: number;        // diameter in px
  onClick?: () => void;
  isThinking?: boolean;
  className?: string;
}

const E = [0.22, 1, 0.36, 1] as const;

export function RivaGlobe({ size = 220, onClick, isThinking = false, className = '' }: RivaGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const tRef      = useRef(0);

  // Draw liquid wave animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const r = size / 2;
    canvas.width  = size;
    canvas.height = size;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, size, size);

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - 2, 0, Math.PI * 2);
      ctx.clip();

      // ─ Base deep water gradient ─
      const base = ctx.createRadialGradient(r * 0.6, r * 0.4, 0, r, r, r);
      base.addColorStop(0,   'hsl(200 60% 82%)');
      base.addColorStop(0.4, 'hsl(220 50% 72%)');
      base.addColorStop(0.75,'hsl(235 40% 60%)');
      base.addColorStop(1,   'hsl(250 35% 45%)');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);

      // ─ Animated liquid waves ─
      const waves = [
        { amp: 0.065, freq: 1.8, phase: t * 0.8,  colorA: 'hsl(185 70% 75% / 0.45)', colorB: 'hsl(200 55% 65% / 0)' },
        { amp: 0.05,  freq: 2.4, phase: t * 1.1 + 1, colorA: 'hsl(260 50% 75% / 0.3)',  colorB: 'hsl(260 50% 70% / 0)' },
        { amp: 0.04,  freq: 3.1, phase: t * 0.6 + 2, colorA: 'hsl(205 80% 85% / 0.25)', colorB: 'hsl(205 60% 80% / 0)' },
      ];

      waves.forEach(({ amp, freq, phase, colorA, colorB }) => {
        const waterLevel = r * (1 + 0.08 * Math.sin(phase * 0.3));
        ctx.beginPath();
        ctx.moveTo(0, waterLevel);
        for (let x = 0; x <= size; x += 2) {
          const y = waterLevel + Math.sin(x / size * Math.PI * freq + phase) * amp * size;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(size, size);
        ctx.lineTo(0, size);
        ctx.closePath();
        const wg = ctx.createLinearGradient(0, waterLevel - 10, 0, waterLevel + 40);
        wg.addColorStop(0, colorA);
        wg.addColorStop(1, colorB);
        ctx.fillStyle = wg;
        ctx.fill();
      });

      // ─ Upper highlight (lens flare) ─
      const hi = ctx.createRadialGradient(r * 0.35, r * 0.28, 0, r * 0.35, r * 0.28, r * 0.55);
      hi.addColorStop(0,   'rgba(255,255,255,0.55)');
      hi.addColorStop(0.4, 'rgba(255,255,255,0.1)');
      hi.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = hi;
      ctx.fillRect(0, 0, size, size);

      // ─ Small specular dot ─
      const spec = ctx.createRadialGradient(r * 0.3, r * 0.22, 0, r * 0.3, r * 0.22, r * 0.15);
      spec.addColorStop(0,   'rgba(255,255,255,0.9)');
      spec.addColorStop(0.5, 'rgba(255,255,255,0.25)');
      spec.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, size, size);

      // ─ Bottom rim shadow ─
      const shadow = ctx.createRadialGradient(r, r * 1.6, r * 0.1, r, r * 1.1, r);
      shadow.addColorStop(0,   'rgba(30,20,80,0.35)');
      shadow.addColorStop(1,   'rgba(30,20,80,0)');
      ctx.fillStyle = shadow;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();

      // ─ Outer ring glow ─
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,210,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    const loop = (ts: number) => {
      tRef.current = ts / 1000;
      draw(tRef.current);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [size]);

  return (
    <motion.div
      className={`relative flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.96 }}
      animate={isThinking ? { scale: [1, 1.04, 0.98, 1.04, 1] } : {}}
      transition={isThinking
        ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        : { type: 'spring', stiffness: 300, damping: 22 }
      }
    >
      {/* Drop shadow beneath */}
      <div
        style={{
          position:  'absolute',
          bottom:    '-1.5rem',
          left:      '50%',
          transform: 'translateX(-50%)',
          width:     size * 0.65,
          height:    size * 0.18,
          background:'radial-gradient(ellipse, hsl(235 35% 45% / 0.22) 0%, transparent 70%)',
          filter:    'blur(8px)',
        }}
      />

      {/* Outer breathing halo */}
      <motion.div
        style={{
          position:     'absolute',
          inset:        '-0.6rem',
          borderRadius: '50%',
          background:   'radial-gradient(circle, hsl(220 50% 70% / 0.18) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Thinking ring */}
      {isThinking && (
        <motion.div
          style={{
            position: 'absolute',
            inset: '-0.8rem',
            borderRadius: '50%',
            border: '1.5px solid hsl(235 50% 65% / 0.5)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Canvas — the actual 3D globe */}
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: '50%',
          width:  size,
          height: size,
        }}
      />

      {/* Outer glass ring */}
      <div
        style={{
          position:    'absolute',
          inset:       0,
          borderRadius:'50%',
          border:      '1px solid rgba(255,255,255,0.22)',
          pointerEvents:'none',
        }}
      />
    </motion.div>
  );
}
