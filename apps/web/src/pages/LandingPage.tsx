import { useRef, useState, useEffect, useCallback } from 'react';
import { ReactLenis, useLenis } from '@studio-freight/react-lenis';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setIsDesktop(mq.matches && !reduced.matches);
    update();
    mq.addEventListener('change', update);
    reduced.addEventListener('change', update);
    return () => {
      mq.removeEventListener('change', update);
      reduced.removeEventListener('change', update);
    };
  }, []);
  return isDesktop;
}
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence,
  MotionValue,
  useInView,
} from 'framer-motion';
import { ArrowUpRight, Mic, Wind, Sun, Moon, Zap, Brain, Leaf, Calendar, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/SEO';

/* ─────────────────────────────────────────────────────
   TOKENS
───────────────────────────────────────────────────── */
const T = {
  bg:        'hsl(38, 35%, 96%)',          // App: var(--background)
  surface:   'hsl(38, 30%, 98%)',          // App: var(--card) / var(--popover)
  ink:       'hsl(230, 15%, 22%)',         // App: var(--foreground)
  muted:     'hsl(230, 10%, 48%)',         // App: var(--muted-foreground)
  border:    'hsl(38, 18%, 88%)',          // App: var(--border)
  indigo:    'hsl(235, 35%, 55%)',         // App: var(--primary)
  indigoL:   'hsl(235, 40%, 65%)',         // App: var(--primary-glow)
  indigoXL:  'hsl(235, 45%, 75%)',
  indigoSub: 'hsl(235, 40%, 92%)',
  cream:     'hsl(38, 35%, 92%)',
  amber:     'hsl(38, 92%, 50%)',          // App: var(--warning)
  night:     'hsl(230, 20%, 9%)',          // App: dark primary
  nightSub:  'hsl(230, 18%, 12%)',         // App: dark card
  sage:      'hsl(165, 40%, 50%)',         // App: var(--success)
};

const E = [0.22, 1, 0.36, 1] as const;
const E2 = [0.65, 0, 0.35, 1] as const;

/* ─────────────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

  html { scroll-behavior: auto; }
  @media (hover: hover) and (pointer: fine) {
    .rv-body, .rv-body * { cursor: none !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rv-grain, .rv-progress { animation: none !important; }
  }
  .rv-body ::-webkit-scrollbar { width: 2px; }
  .rv-body ::-webkit-scrollbar-track { background: #F5F3EE; }
  .rv-body ::-webkit-scrollbar-thumb { background: #3D3BBF; border-radius: 99px; }

  .rv-display { font-family: 'Playfair Display', Georgia, serif !important; }
  .rv-sans    { font-family: 'Roboto', system-ui, sans-serif !important; }
  .rv-mono    { font-family: 'DM Mono', monospace !important; }

  /* Grain */
  .rv-grain {
    position: fixed; inset: -200%; width: 400%; height: 400%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.028; pointer-events: none; z-index: 9000;
    animation: rv-grain-shift 0.45s steps(2) infinite;
  }
  @keyframes rv-grain-shift {
    0%   { transform: translate(0,0); }
    50%  { transform: translate(-5px,-4px); }
    100% { transform: translate(4px,5px); }
  }

  /* Cursor */
  .rv-cursor-dot {
    position: fixed; width: 6px; height: 6px;
    background: #0E0D0B; border-radius: 50%;
    pointer-events: none; z-index: 9999;
    transform: translate(-50%,-50%);
    mix-blend-mode: difference;
  }
  .rv-cursor-ring {
    position: fixed; width: 38px; height: 38px;
    border: 1.5px solid rgba(61,59,191,0.3); border-radius: 50%;
    pointer-events: none; z-index: 9998;
    transform: translate(-50%,-50%);
    transition: width .55s cubic-bezier(.25,1,.5,1), height .55s, background .4s, border-color .4s, border-radius .4s;
  }
  .rv-cursor-ring.rv-hov { width: 64px; height: 64px; background: rgba(61,59,191,0.08); border-color: #3D3BBF; }
  .rv-cursor-ring.rv-text { width: 90px; height: 90px; background: rgba(61,59,191,0.06); border-color: rgba(61,59,191,0.5); border-radius: 8px; }

  /* Progress */
  .rv-progress {
    position: fixed; top: 0; left: 0; height: 2px; width: 0;
    background: linear-gradient(90deg, #3D3BBF, #A5A4EF, #3D3BBF);
    background-size: 200%;
    z-index: 9990; pointer-events: none;
    animation: rv-prog-shift 3s linear infinite;
  }
  @keyframes rv-prog-shift { 0% { background-position: 0%; } 100% { background-position: 200%; } }

  /* Chapter label */
  .rv-chapter {
    writing-mode: vertical-rl; text-orientation: mixed;
    font-family: 'DM Mono', monospace; font-size: 9px;
    letter-spacing: 0.22em; text-transform: uppercase;
    position: fixed; right: clamp(1rem, 2.5vw, 2rem); top: 50%;
    transform: translateY(-50%);
    color: rgba(61,59,191,0.35); pointer-events: none; z-index: 50;
    transition: color 0.6s;
  }

  /* Breathe */
  @keyframes rv-breathe {
    0%, 100% { opacity: 0.25; transform: scale(1) rotate(0deg); }
    50%       { opacity: 0.45; transform: scale(1.04) rotate(180deg); }
  }

  /* Scroll cue */
  @keyframes rv-scroll-cue {
    0%   { transform: scaleY(0); opacity: 0; transform-origin: top; }
    40%  { transform: scaleY(1); opacity: 1; transform-origin: top; }
    60%  { transform: scaleY(1); opacity: 1; transform-origin: bottom; }
    100% { transform: scaleY(0); opacity: 0; transform-origin: bottom; }
  }
  .rv-scroll-bar { animation: rv-scroll-cue 2.6s ease-in-out infinite; }

  /* Marquee */
  @keyframes rv-mq-f { from { transform:translateX(0); } to { transform:translateX(-50%); } }
  @keyframes rv-mq-r { from { transform:translateX(-50%); } to { transform:translateX(0); } }
  .rv-mq-f { animation: rv-mq-f 36s linear infinite; will-change: transform; }
  .rv-mq-r { animation: rv-mq-r 28s linear infinite; will-change: transform; }

  /* Underline animation */
  .rv-ul { position: relative; }
  .rv-ul::after {
    content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 1px;
    background: currentColor; transform: scaleX(0); transform-origin: right;
    transition: transform .5s cubic-bezier(.25,1,.5,1);
  }
  .rv-ul:hover::after { transform: scaleX(1); transform-origin: left; }

  /* Orb pulse */
  @keyframes rv-orb-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(61,59,191,0.4); }
    50%       { box-shadow: 0 0 0 24px rgba(61,59,191,0); }
  }

  /* Feature card hover */
  .rv-feat-card { transition: transform .5s cubic-bezier(.25,1,.5,1), box-shadow .5s; }
  .rv-feat-card:hover { transform: translateY(-6px); }

  /* Night section stars */
  @keyframes rv-twinkle {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 1; }
  }

  /* Text scramble effect */
  @keyframes rv-scramble-in {
    from { opacity: 0; filter: blur(8px); letter-spacing: 0.5em; }
    to   { opacity: 1; filter: blur(0); letter-spacing: -0.02em; }
  }
  .rv-scramble { animation: rv-scramble-in 1.2s cubic-bezier(.25,1,.5,1) both; }
`;

/* ─────────────────────────────────────────────────────
   CURSOR
───────────────────────────────────────────────────── */
function Cursor() {
  const dot  = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const pos   = useRef({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setEnabled(mq.matches);
    const handler = () => setEnabled(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const move = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (dot.current) {
        dot.current.style.left = e.clientX + 'px';
        dot.current.style.top  = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', move);
    let raf: number;
    const loop = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * 0.09;
      pos.current.y += (mouse.current.y - pos.current.y) * 0.09;
      if (ring.current) {
        ring.current.style.left = pos.current.x + 'px';
        ring.current.style.top  = pos.current.y + 'px';
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    const on  = () => ring.current?.classList.add('rv-hov');
    const off = () => ring.current?.classList.remove('rv-hov');
    document.querySelectorAll('a,button,[data-h]').forEach(el => {
      el.addEventListener('mouseenter', on);
      el.addEventListener('mouseleave', off);
    });
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={dot}  className="rv-cursor-dot"  aria-hidden />
      <div ref={ring} className="rv-cursor-ring" aria-hidden />
    </>
  );
}

/* ─────────────────────────────────────────────────────
   SCROLL PROGRESS
───────────────────────────────────────────────────── */
function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = () => {
      if (bar.current)
        bar.current.style.width = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100 + '%';
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return <div ref={bar} className="rv-progress" aria-hidden />;
}

/* ─────────────────────────────────────────────────────
   CHAPTER LABEL
───────────────────────────────────────────────────── */
const CHAPTERS = ['Prologue', 'The Problem', 'Our Way', 'The Contrast', 'Features', 'Riva AI', 'The Promise', 'Begin'];

function ChapterLabel({ chapter }: { chapter: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={chapter} className="rv-chapter"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}>
        {CHAPTERS[chapter] || ''}
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────
   MAG BUTTON
───────────────────────────────────────────────────── */
function Mag({ children, className, href, onClick, style, as: Tag = 'button' }: {
  children: React.ReactNode; className?: string;
  href?: string; onClick?: () => void; style?: React.CSSProperties; as?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [p, setP] = useState({ x: 0, y: 0 });
  const mv = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setP({ x: (e.clientX - r.left - r.width / 2) * 0.32, y: (e.clientY - r.top - r.height / 2) * 0.32 });
  };
  const inner = (
    <button ref={ref} onMouseMove={mv} onMouseLeave={() => setP({ x: 0, y: 0 })} onClick={onClick} data-h="true"
      className={cn('rv-sans relative inline-flex items-center gap-2', className)}
      style={{ ...style, transform: `translate(${p.x}px,${p.y}px)`, transition: 'transform .5s cubic-bezier(.25,1,.5,1)' }}>
      {children}
    </button>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return inner;
}

/* ─────────────────────────────────────────────────────
   WORD REVEAL
───────────────────────────────────────────────────── */
function WordReveal({ text, progress, className, style, delay = 0 }: {
  text: string; progress: MotionValue<number>; className?: string;
  style?: React.CSSProperties; delay?: number;
}) {
  const words = text.split(' ');
  const n = words.length;
  return (
    <div className={className} style={{ ...style, display: 'flex', flexWrap: 'wrap' }}>
      {words.map((w, i) => {
        const start = delay + (i / n) * 0.45;
        const end   = Math.min(start + 0.25, 1);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const opacity = useTransform(progress, [start, end], [0.05, 1]);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const y       = useTransform(progress, [start, end], [20, 0]);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const blur    = useTransform(progress, [start, end], ['blur(8px)', 'blur(0px)']);
        return (
          <motion.span key={i} style={{ opacity, y, filter: blur, display: 'inline-block', marginRight: '0.32em', willChange: 'opacity,filter,transform' }}>
            {w}
          </motion.span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────────────── */
function Navbar({ dark }: { dark?: boolean }) {
  const { user } = useAuthContext();
  const [scrolled, setScrolled] = useState(false);
  const [gone, setGone] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      if (y > last.current + 16 && y > 140) setGone(true);
      if (y < last.current - 10) setGone(false);
      last.current = y;
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navBg = scrolled
    ? (dark ? 'rgba(10,10,15,0.9)' : 'rgba(245,243,238,0.9)')
    : 'transparent';

  return (
    <motion.nav className="rv-sans fixed inset-x-0 top-0 z-50 flex items-center justify-between"
      animate={{ y: gone ? '-100%' : '0%' }}
      transition={{ duration: 0.5, ease: E }}
      style={{
        padding: '1.5rem clamp(1.5rem,5vw,4rem)',
        backgroundColor: navBg,
        backdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
        borderBottom: scrolled ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : T.border}` : '1px solid transparent',
        transition: 'background-color .6s, border-color .6s',
      }}>

      <Link to="/" data-h="true" className="rv-display"
        style={{ fontStyle: 'italic', fontWeight: 400, fontSize: '1.75rem', color: dark ? '#fff' : T.ink, textDecoration: 'none', letterSpacing: '-0.01em' }}>
        Rivly
      </Link>

      <div className="hidden md:flex items-center gap-10">
        {['Why', 'Features', 'Riva AI', 'Family', 'Promise'].map(l => (
          <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} className="rv-sans rv-ul" data-h="true"
            style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.4)' : T.muted, textDecoration: 'none', fontWeight: 500 }}>
            {l}
          </a>
        ))}
      </div>

      {user ? (
        <Link to="/app" data-h="true">
          <Mag className="h-9 px-6 rounded-full text-xs font-medium text-white" style={{ background: T.indigo, fontFamily: "'Roboto', sans-serif" }}>Open App</Mag>
        </Link>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/login" className="rv-sans text-xs font-medium" style={{ color: dark ? 'rgba(255,255,255,0.7)' : T.muted, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = dark ? '#fff' : T.ink} onMouseLeave={(e) => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.7)' : T.muted}>Log in</Link>
          <Mag href="https://ravenso.in/#/" className="h-9 px-6 rounded-full text-xs font-semibold border" style={{ color: dark ? '#fff' : T.ink, borderColor: dark ? 'rgba(255,255,255,0.2)' : T.ink, background: dark ? 'rgba(255,255,255,0.06)' : 'transparent', fontFamily: "'Roboto', sans-serif" }}>
            Join Waitlist
          </Mag>
        </div>
      )}
    </motion.nav>
  );
}

/* ─────────────────────────────────────────────────────
   HERO  ── "Find your flow / Drop your burnout"
───────────────────────────────────────────────────── */
function Hero({ onChapter }: { onChapter: (n: number) => void }) {
  const { user } = useAuthContext();
  const { scrollY } = useScroll();
  const isDesktop = useIsDesktop();

  const headY  = useTransform(scrollY, [0, 700], [0, -140]);
  const fadeOp = useTransform(scrollY, [0, 500], [1, 0]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const cfg = { stiffness: 32, damping: 16 };
  const ox = useSpring(useTransform(mouseX, [0, typeof window !== 'undefined' ? window.innerWidth  : 1440], [-18, 18]), cfg);
  const oy = useSpring(useTransform(mouseY, [0, typeof window !== 'undefined' ? window.innerHeight : 900],  [-18, 18]), cfg);

  useEffect(() => {
    if (!isDesktop) return;
    const fn = (e: MouseEvent) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, [mouseX, mouseY, isDesktop]);

  return (
    <section id="hero" style={{ position: 'relative', height: '100dvh', overflow: 'hidden', background: T.bg }}>
      {/* Grid background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
        backgroundSize: '64px 64px', opacity: 0.4 }} />

      {/* Gradient wash */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 55% at 72% 28%, rgba(61,59,191,0.09) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(92,122,91,0.06) 0%, transparent 70%)` }} />

      {/* Animated orb — SVG concentric rings */}
      <motion.div style={{ x: ox, y: oy, position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <svg style={{ position: 'absolute', top: '50%', left: '60%', transform: 'translate(-50%,-50%)', animation: 'rv-breathe 10s ease-in-out infinite' }}
          width="780" height="780" viewBox="0 0 780 780" fill="none">
          <circle cx="390" cy="390" r="340" stroke={T.indigo} strokeWidth="0.35" opacity="0.2" strokeDasharray="4 8" />
          <circle cx="390" cy="390" r="256" stroke={T.indigoL} strokeWidth="0.5" opacity="0.15" />
          <circle cx="390" cy="390" r="164" stroke={T.indigoXL} strokeWidth="0.8" opacity={isDesktop ? 0.1 : 0.25} />
          {!isDesktop && (
            <circle cx="390" cy="390" r="90" fill={`${T.indigo}06`} stroke={T.indigo} strokeWidth="0.6" opacity="0.35" />
          )}
        </svg>
      </motion.div>

      {/* Eyebrow */}
      <motion.div style={{ position: 'absolute', top: '22vh', left: 'clamp(1.5rem,5vw,4rem)', opacity: fadeOp }}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: E, delay: 0.05 }}>
        <span style={{ fontSize: 9, letterSpacing: '.24em', textTransform: 'uppercase', color: T.indigo, padding: '6px 16px', borderRadius: 99, border: `1px solid ${T.indigo}44`, background: T.indigoSub, fontFamily:"'Roboto', sans-serif", fontWeight: 500 }}>
          YOUR AI LIFE COMPANION · RIVLY
        </span>
      </motion.div>

      {/* Main headline */}
      <motion.div style={{ y: headY, opacity: fadeOp, position: 'absolute', top: '28vh', left: 0, width: '100%', padding: '0 clamp(1.5rem,5vw,4rem)', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        
        {/* ROW 1: Find your flow. */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(0.4rem, 1.5vw, 1rem)', flexWrap: 'wrap' }}>
          <div style={{ overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' }}>
            <motion.h1 className="rv-display"
              style={{ fontWeight: 400, letterSpacing: '-0.03em', fontSize: 'clamp(3.5rem,10vw,10.5rem)', color: T.ink, margin: 0, lineHeight: 1.15 }}
              initial={{ y: '110%' }} animate={{ y: '0%' }} transition={{ duration: 1.4, ease: E, delay: 0.1 }}>
              Find your
            </motion.h1>
          </div>
          <div style={{ overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' }}>
            <motion.div className="rv-display"
              style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(3.5rem,10vw,10.5rem)', color: T.indigo, letterSpacing: '-0.03em', lineHeight: 1.15, display: 'flex', alignItems: 'flex-start' }}
              initial={{ y: '110%' }} animate={{ y: '0%' }} transition={{ duration: 1.4, ease: E, delay: 0.2 }}>
              flow.
            </motion.div>
          </div>
        </div>

        {/* ROW 2: Drop your burnout. */}
         <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(0.4rem, 1.5vw, 1rem)', flexWrap: 'wrap', marginTop: '-1.5vh' }}>
          <div style={{ overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' }}>
            <motion.div className="rv-display"
              style={{ fontWeight: 400, fontSize: 'clamp(3.5rem,10vw,10.5rem)', color: T.muted, letterSpacing: '-0.03em', lineHeight: 1.15 }}
              initial={{ y: '110%' }} animate={{ y: '0%' }} transition={{ duration: 1.4, ease: E, delay: 0.3 }}>
              Drop your
            </motion.div>
          </div>
          <div style={{ overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' }}>
            <motion.div className="rv-display"
              style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(3.5rem,10vw,10.5rem)', color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.15, textDecoration: 'line-through', textDecorationColor: T.indigo, textDecorationThickness: '0.05em' }}
              initial={{ y: '110%' }} animate={{ y: '0%' }} transition={{ duration: 1.4, ease: E, delay: 0.4 }}>
              burnout.
            </motion.div>
          </div>
        </div>

      </motion.div>

      {/* Sub + CTA */}
      <motion.div style={{ opacity: fadeOp, position: 'absolute', bottom: '5vh', left: 0, right: 0, padding: '0 clamp(1.5rem,5vw,4rem)', zIndex: 2 }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: E, delay: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <p className="rv-sans" style={{ fontWeight: 400, fontSize: 'clamp(0.82rem,1.05vw,0.96rem)', lineHeight: 1.7, maxWidth: 'min(340px, 100%)', color: T.muted, letterSpacing: '0.01em' }}>
            The only AI that knows you, checks on you, and shows up before you ask.
            Live with intention. Rest without guilt. Never feel alone at 2am.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            {user ? (
              <Link to="/app">
                <Mag className="h-13 px-10 rounded-full text-sm font-semibold text-white" style={{ background: T.indigo, height: 52, fontFamily: 'Roboto, sans-serif' }}>
                  Open Dashboard <ArrowUpRight size={15} />
                </Mag>
              </Link>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <Mag href="https://ravenso.in/#/" className="h-13 px-10 rounded-full text-sm font-semibold text-white" style={{ background: T.ink, height: 52, fontFamily: "'Roboto', sans-serif"}}>
                  Join the Waitlist <ArrowUpRight size={15} />
                </Mag>
              </div>
            )}
            
          </div>
        </div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div style={{ position: 'absolute', bottom: '2.5vh', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1.2 }}>
        <div className="rv-scroll-bar" style={{ width: 1, height: 48, background: `linear-gradient(to bottom, ${T.indigo}, transparent)` }} />
        <span className="rv-mono" style={{ fontSize: 7, letterSpacing: '.28em', textTransform: 'uppercase', color: T.muted }}>Scroll</span>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────
   MARQUEE
───────────────────────────────────────────────────── */
const MQ1 = ['Find your flow', 'Drop your burnout', 'Rest without guilt', 'Work in cycles', 'Park a thought', 'Wind down gently', 'Riva checks on you', 'Never start over'];
const MQ2 = ['One session at a time', 'Riva guides your rhythm', 'Progress not perfection', 'Presence over pace', 'Your rhythm stays yours', 'Your family, cared for', "2am and she's awake"];

function MarqueeRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const all = [...items, ...items];
  return (
    <div style={{ overflow: 'hidden', padding: '12px 0' }}>
      <div className={reverse ? 'rv-mq-r' : 'rv-mq-f'} style={{ display: 'flex', width: 'max-content' }}>
        {all.map((item, i) => (
          <div key={i} className="rv-display" style={{ fontStyle: 'italic', fontWeight: 400, display: 'flex', alignItems: 'center', gap: 24, padding: '0 32px', whiteSpace: 'nowrap', color: reverse ? T.indigo : T.muted, fontSize: 'clamp(0.88rem,1.4vw,1.2rem)', letterSpacing: '-0.01em' }}>
            {item}
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: reverse ? T.indigoL : T.muted, opacity: 0.4, flexShrink: 0, display: 'inline-block' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MarqueeStrip() {
  return (
    <div style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: T.surface, overflow: 'hidden' }}>
      <MarqueeRow items={MQ1} />
      <div style={{ borderTop: `1px solid ${T.border}` }} />
      <MarqueeRow items={MQ2} reverse />
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   PROBLEM SECTION  —  Chapter 1
   The relatable hook before the solution
───────────────────────────────────────────────────── */
const PAIN_POINTS = [
  { n: '77%',  l: 'of workers', d: 'experience burnout at their current job', accent: '#C47A1A' },
  { n: '1 in 3', l: 'Indians',  d: 'say they have nobody to talk to when things get hard', accent: T.indigo },
  { n: '0',    l: 'AI companions',  d: 'that know your name, your family, and your 2am', accent: T.sage },
];

function ProblemSection({ onChapter }: { onChapter: (n: number) => void }) {
  const outer = useRef<HTMLDivElement>(null);

  return (
    <section id="why" ref={outer} style={{ padding: '14vh clamp(1.5rem,5vw,4rem)', background: T.bg, borderTop: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: E }}>
          <div style={{ fontSize: 9, letterSpacing: '.24em', textTransform: 'uppercase', color: T.muted, marginBottom: 40, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>Chapter 01 · The Problem</div>
        </motion.div>

        {/* Large statement */}
        <div style={{ marginBottom: 72 }}>
          {['You\'re not lazy.', 'You\'re not undisciplined.', 'You\'re running on empty.'].map((line, i) => (
            <div key={i} style={{ overflow: 'hidden', marginBottom: 8 }}>
              <motion.div className="rv-display"
                style={{ fontWeight: i === 2 ? 400 : 300, fontStyle: i === 2 ? 'italic' : 'normal', fontSize: 'clamp(2.4rem,5.5vw,6.5rem)', letterSpacing: '-0.022em', lineHeight: 1.0, color: i === 2 ? T.indigo : i === 1 ? T.muted : T.ink }}
                initial={{ y: '105%', opacity: 0 }} whileInView={{ y: '0%', opacity: 1 }} viewport={{ once: true }}
                transition={{ duration: 1.2, ease: E, delay: i * 0.14 }}>
                {line}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1, background: T.border }}>
          {PAIN_POINTS.map((p, i) => (
            <motion.div key={i}
              style={{ background: T.surface, padding: '40px 36px' }}
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: E }}>
              <div style={{ fontWeight: 500, fontSize: 'clamp(3rem,5vw,5.5rem)', color: p.accent, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 12, fontFamily: "'Roboto', serif" }}>{p.n}</div>
              <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: T.muted, marginBottom: 8, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>{p.l}</div>
              <div style={{ fontSize: '0.85rem', color: T.muted, lineHeight: 1.75, fontWeight: 400, fontFamily: "'Roboto', sans-serif" }}>{p.d}</div>
            </motion.div>
          ))}
        </div>

        {/* Transition statement */}
        <motion.div style={{ marginTop: 80, textAlign: 'center' }}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }}>
          <p className="rv-display" style={{ fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(1.4rem,2.6vw,2.8rem)', color: T.muted, letterSpacing: '-0.01em', lineHeight: 1.5 }}>
            Every AI answers when you ask. Riva shows up before you do. That's the difference.<br />
            <span style={{ color: T.ink, fontStyle: 'normal', fontWeight: 400 }}>We made something different.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────
   MANIFESTO  — Chapter 2 (sticky, word-by-word)
───────────────────────────────────────────────────── */
function ManifestoSection({ onChapter }: { onChapter: (n: number) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: outer, offset: ['start start', 'end end'] });

  const bgTint  = useTransform(scrollYProgress, [0, 1], ['rgba(237,237,252,0)', 'rgba(237,237,252,0.55)']);
  const eyeOp   = useTransform(scrollYProgress, [0, 0.1], [0, 1]);
  const textProgress = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  const statsOp = useTransform(scrollYProgress, [0.45, 0.6], [0, 1]);
  const statsY  = useTransform(scrollYProgress, [0.45, 0.6], [24, 0]);

  return (
    <div id="manifesto" ref={outer} style={{ position: 'relative', height: '300vh' }}>
      <div style={{ position: 'sticky', top: 0, height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 clamp(2rem,8vw,6rem)', overflow: 'hidden', background: T.bg }}>
        <motion.div style={{ position: 'absolute', inset: 0, backgroundColor: bgTint, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 900 }}>
          <motion.div style={{ opacity: eyeOp, marginBottom: 36 }}>
            <span style={{ fontSize: 9, letterSpacing: '.26em', textTransform: 'uppercase', color: T.indigo, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>Our manifesto · Chapter 02</span>
          </motion.div>

          <WordReveal
            progress={textProgress}
            text="Productivity was never meant to cost you your peace. Your best work lives in the space between effort and ease — not in the relentless push for more. Rivly gives you that space back."
            className="rv-display"
            style={{ fontWeight: 400, fontSize: 'clamp(1.75rem,3.6vw,3.8rem)', lineHeight: 1.35, letterSpacing: '-0.01em', color: T.ink, justifyContent: 'center' }}
          />

          <motion.div style={{ opacity: statsOp, y: statsY, marginTop: 52, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['73%', 'lower task anxiety'], ['0', 'streaks to break'], ['1', 'session at a time']].map(([n, l], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 22px', borderRadius: 99, border: `1px solid ${T.border}`, background: T.surface }}>
                <span className="rv-display" style={{ fontWeight: 400, fontSize: '1.6rem', color: T.indigo }}>{n}</span>
                <span className="rv-mono" style={{ fontSize: 8.5, letterSpacing: '.12em', textTransform: 'uppercase', color: T.muted }}>{l}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   CONTRAST  — Chapter 3
───────────────────────────────────────────────────── */
const STORY = [
  { bad: 'Rush through everything',       good: 'Focus on one thing at a time' },
  { bad: 'Measure yourself constantly',   good: 'Work in natural cycles'       },
  { bad: 'Burnout as discipline',         good: 'Rest without guilt'           },
  { bad: 'Your life becomes a data set',  good: 'Your rhythm stays yours'      },
  { bad: 'No one to talk to at 2am',      good: 'Riva. Always.'                },
  { bad: 'Your parents are in another city', good: 'Riva takes care of them too' },
  { bad: 'Break the streak, lose it all', good: 'Both kinds of days count'     },
];

function ContrastSection({ onChapter }: { onChapter: (n: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  useEffect(() => scrollYProgress.on('change', v => {
    setActive(Math.min(Math.floor((v / 0.8) * STORY.length), STORY.length - 1));
  }), [scrollYProgress]);

  const rightW = useTransform(scrollYProgress, [0, 1], ['30%', '60%']);

  return (
    <div id="contrast" ref={wrap} style={{ height: '300vh' }}>
      <div style={{ position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden', display: 'flex' }}>
        {/* Left */}
        <div style={{ flex: 1, background: T.cream, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 clamp(2rem,5vw,4rem)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ fontSize: 8.5, letterSpacing: '.26em', textTransform: 'uppercase', color: T.muted, marginBottom: 32, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>Chapter 03 · The default world</div>
          <AnimatePresence mode="wait">
            <motion.div key={`bad-${active}`}
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -18, filter: 'blur(4px)' }}
              transition={{ duration: 0.6, ease: E }}>
              <div className="rv-display" style={{ fontWeight: 400, fontSize: 'clamp(1.8rem,4.2vw,5.2rem)', lineHeight: 1.06, color: '#703030', letterSpacing: '-0.015em', marginBottom: 24, textDecoration: 'line-through', textDecorationColor: '#C0606055', textDecorationThickness: 2 }}>
                {STORY[active].bad}
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {STORY.map((_, i) => (
                  <div key={i} style={{ height: 2, borderRadius: 99, transition: 'all .45s', width: i === active ? 24 : 7, background: i === active ? '#B04040' : '#C8B8B0', opacity: i === active ? 0.75 : 0.28 }} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right — Rivly */}
        <motion.div style={{ width: rightW, background: T.indigo, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 clamp(2rem,5vw,4rem)', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 8.5, letterSpacing: '.26em', textTransform: 'uppercase', color: T.indigoXL, marginBottom: 32, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>The Rivly rhythm</div>
          <AnimatePresence mode="wait">
            <motion.div key={`good-${active}`}
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -18, filter: 'blur(4px)' }}
              transition={{ duration: 0.6, ease: E, delay: 0.08 }}>
              <div className="rv-display" style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(1.8rem,4.2vw,5.2rem)', lineHeight: 1.06, color: '#FAFAF7', letterSpacing: '-0.015em', marginBottom: 24 }}>
                {STORY[active].good}
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {STORY.map((_, i) => (
                  <div key={i} style={{ height: 2, borderRadius: 99, transition: 'all .45s', width: i === active ? 24 : 7, background: i === active ? T.indigoXL : `${T.indigoXL}44` }} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   FEATURE ILLUSTRATIONS
───────────────────────────────────────────────────── */
function LandscapeSVG() {
  return (
    <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="lSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EEF2FF" /><stop offset="100%" stopColor="#F2EDE5" /></linearGradient>
        <linearGradient id="lG1"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.indigo} stopOpacity=".2" /><stop offset="100%" stopColor={T.indigo} stopOpacity="0" /></linearGradient>
        <linearGradient id="lG2"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.indigoL} stopOpacity=".12"  /><stop offset="100%" stopColor={T.indigoL} stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="480" height="280" fill="url(#lSky)" rx="20" />
      <path d="M0 180 Q80 130 160 158 Q240 108 320 148 Q400 118 480 136 L480 280 L0 280Z" fill="url(#lG1)" />
      <path d="M0 215 Q120 182 240 205 Q360 168 480 190 L480 280 L0 280Z" fill="url(#lG2)" />
      {/* Trees */}
      {[50, 140, 250, 370, 440].map((x, i) => (
        <g key={i} stroke={T.indigo} strokeWidth="1.4" opacity={0.2 + i * 0.1}>
          <line x1={x} y1={172 - i * 4} x2={x} y2={155 - i * 4} />
          <path d={`M${x-9} ${164-i*4} Q${x} ${150-i*4} ${x+9} ${164-i*4}`} fill={`${T.indigo}22`} />
        </g>
      ))}
      {/* Focus seeds */}
      {[[120, 100], [280, 80], [380, 110]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="6" fill={T.indigo} opacity="0.2" />
          <circle cx={cx} cy={cy} r="3" fill={T.indigo} opacity="0.5" />
        </g>
      ))}
      <circle cx="420" cy="42" r="22" fill="none" stroke={T.indigoXL} strokeWidth="1" opacity="0.45" />
      <circle cx="420" cy="42" r="14" fill={`${T.indigoSub}88`} />
      <text x="240" y="260" textAnchor="middle" fontFamily="DM Mono" fontSize="7.5" fill={T.muted} letterSpacing="2" opacity="0.6">YOUR LANDSCAPE GROWS WITH YOU</text>
    </svg>
  );
}

function SessionSVG() {
  return (
    <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: '100%' }}>
      <rect width="480" height="280" fill={T.indigoSub} rx="20" />
      {/* Rings */}
      {[100, 78, 58, 40].map((r, i) => (
        <circle key={i} cx="240" cy="140" r={r} stroke={T.indigo} strokeWidth="0.7" opacity={0.12 + i * 0.08} />
      ))}
      {/* Clock face */}
      <circle cx="240" cy="140" r="52" fill="white" stroke={T.border} strokeWidth="1" />
      <circle cx="240" cy="140" r="3.5" fill={T.indigo} />
      {/* Hands */}
      <line x1="240" y1="140" x2="240" y2="108" stroke={T.indigo} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="240" y1="140" x2="262" y2="152" stroke={T.indigoL} strokeWidth="1.8" strokeLinecap="round" />
      {/* Tick marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180;
        return <line key={i} x1={240 + 92 * Math.cos(a)} y1={140 + 92 * Math.sin(a)} x2={240 + 99 * Math.cos(a)} y2={140 + 99 * Math.sin(a)} stroke={T.indigoL} strokeWidth="1.2" opacity=".5" />;
      })}
      {/* Labels */}
      <text x="106" y="108" fontFamily="DM Mono" fontSize="7.5" fill={T.muted} letterSpacing="1.8">INTENTION SET</text>
      <text x="296" y="200" fontFamily="DM Mono" fontSize="7.5" fill={T.indigo} letterSpacing="1.8">REFLECT</text>
      <text x="200" y="240" fontFamily="DM Mono" fontSize="7" fill={T.muted} letterSpacing="1.5">DEEP WORK · 45min</text>
    </svg>
  );
}

function ThoughtParkSVG() {
  const pills = [
    { t: '→ Buy groceries',  x: 36,  y: 48,  done: false },
    { t: '✓ Call mum',        x: 200, y: 68,  done: true },
    { t: '→ Book dentist',   x: 110, y: 128, done: false },
    { t: '✓ Deep work done', x: 258, y: 118, done: true },
    { t: '→ Read ch. 4',     x: 150, y: 198, done: false },
    { t: '→ Grocery list',   x: 52,  y: 178, done: false },
  ];
  return (
    <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: '100%' }}>
      <rect width="480" height="280" fill={T.cream} rx="20" />
      {pills.map((p, i) => {
        const w = p.t.length * 6.8 + 28;
        return (
          <g key={i}>
            <rect x={p.x} y={p.y} width={w} height={32} rx="16"
              fill={p.done ? T.indigoSub : 'white'} stroke={p.done ? T.indigoL : T.border} strokeWidth="1" />
            <text x={p.x + 16} y={p.y + 21} fontFamily="DM Sans" fontSize="10.5" fill={p.done ? T.indigo : T.muted}>{p.t}</text>
          </g>
        );
      })}
      <text x="240" y="264" textAnchor="middle" fontFamily="DM Mono" fontSize="7.5" fill={T.muted} letterSpacing="2" opacity="0.6">CAPTURE. CONTINUE. NOTHING LOST.</text>
    </svg>
  );
}

function CalendarSVG() {
  return (
    <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: '100%' }}>
      <rect width="480" height="280" fill={T.surface} rx="20" />
      {/* Header */}
      <rect x="0" y="0" width="480" height="52" fill={T.indigoSub} rx="20" />
      <rect x="0" y="32" width="480" height="20" fill={T.indigoSub} />
      <text x="240" y="32" textAnchor="middle" fontFamily="Roboto" fontSize="13" fontWeight="700" fill={T.indigo}>April 2026</text>
      {/* Time blocks */}
      {[
        { y: 72, h: 38, label: 'Morning Bridge', color: T.indigoSub, stroke: T.indigoL },
        { y: 116, h: 58, label: 'Deep Work · Focus Mode', color: `${T.indigo}18`, stroke: T.indigo },
        { y: 180, h: 30, label: 'Google Calendar · 1:1', color: `${T.amber}18`, stroke: T.amber },
        { y: 216, h: 44, label: 'Wind Down Ritual', color: `${T.sage}18`, stroke: T.sage },
      ].map((b, i) => (
        <g key={i}>
          <rect x="60" y={b.y} width="360" height={b.h} rx="8" fill={b.color} stroke={b.stroke} strokeWidth="1" />
          <text x="76" y={b.y + b.h / 2 + 5} fontFamily="DM Sans" fontSize="10" fill={T.ink} fontWeight="500">{b.label}</text>
        </g>
      ))}
      {/* Hour labels */}
      {['8am', '10am', '12pm', '2pm', '4pm'].map((h, i) => (
        <text key={i} x="20" y={72 + i * 48} fontFamily="DM Mono" fontSize="7" fill={T.muted} letterSpacing="0.5">{h}</text>
      ))}
    </svg>
  );
}

function OverwhelmSVG() {
  return (
    <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: '100%' }}>
      <rect width="480" height="280" fill={T.nightSub} rx="20" />
      {/* Blurred chaos bg */}
      {[40, 90, 160, 220, 290, 350, 410].map((x, i) => (
        <rect key={i} x={x} y={20 + i * 12} width={60 + i * 8} height={16} rx="8" fill="white" opacity="0.04" />
      ))}
      {/* Central calm zone */}
      <circle cx="240" cy="140" r="80" fill={`${T.indigo}20`} stroke={T.indigoL} strokeWidth="1" opacity="0.5" />
      <circle cx="240" cy="140" r="52" fill={`${T.indigo}30`} />
      {/* Panic button */}
      <rect x="196" y="118" width="88" height="44" rx="22" fill={T.indigo} />
      <text x="240" y="145" textAnchor="middle" fontFamily="DM Mono" fontSize="9" fill="white" letterSpacing="1.5">ONE STEP</text>
      {/* Rays */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45) * Math.PI / 180;
        return <line key={i} x1={240 + 88 * Math.cos(a)} y1={140 + 88 * Math.sin(a)} x2={240 + 108 * Math.cos(a)} y2={140 + 108 * Math.sin(a)} stroke={T.indigoXL} strokeWidth="1" opacity="0.3" />;
      })}
      <text x="240" y="264" textAnchor="middle" fontFamily="DM Mono" fontSize="7.5" fill={T.muted} letterSpacing="2">OVERWHELM MODE · JUST ONE STEP</text>
    </svg>
  );
}

function WindDownSVG() {
  return (
    <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: '100%' }}>
      <rect width="480" height="280" fill="#080810" rx="20" />
      {/* Stars */}
      {[[60, 40], [140, 28], [310, 55], [400, 32], [180, 18], [440, 68], [88, 80]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="white" opacity={0.2 + (i % 3) * 0.2} style={{ animation: `rv-twinkle ${2 + i * 0.4}s ease-in-out infinite ${i * 0.3}s` }} />
      ))}
      {/* Moon */}
      <path d="M380 48 A28 28 0 1 1 380 104 A18 18 0 1 0 380 48Z" fill="white" opacity="0.85" />
      {/* Concentric rings */}
      {[3, 5, 7].map((i) => (
        <circle key={i} cx="240" cy="148" r={i * 28} fill="none" stroke={T.indigoXL} strokeWidth="0.6" opacity={0.35 - i * 0.04} />
      ))}
      <circle cx="240" cy="148" r="22" fill={`${T.indigo}60`} stroke={T.indigoL} strokeWidth="1.2" />
      <path d="M233 148 L245 141 L245 155 Z" fill={T.indigoXL} opacity="0.9" />
      <text x="240" y="240" textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={T.muted} letterSpacing="2.5">DAY COMPLETE · REST NOW</text>
    </svg>
  );
}

function MorningBridgeSVG() {
  return (
    <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="dawn" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F2EDE5" />
          <stop offset="60%" stopColor="#FFECD2" />
          <stop offset="100%" stopColor="#FFD6A5" />
        </linearGradient>
      </defs>
      <rect width="480" height="280" fill="url(#dawn)" rx="20" />
      {/* Horizon */}
      <ellipse cx="240" cy="220" rx="180" ry="12" fill={`${T.amber}25`} />
      {/* Sun */}
      <circle cx="240" cy="200" r="36" fill={`${T.amber}30`} />
      <circle cx="240" cy="200" r="22" fill={T.amber} opacity="0.8" />
      {/* Rays */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 - 22) * Math.PI / 180;
        return <line key={i} x1={240 + 30 * Math.cos(a)} y1={200 + 30 * Math.sin(a)} x2={240 + 50 * Math.cos(a)} y2={200 + 50 * Math.sin(a)} stroke={T.amber} strokeWidth="2" strokeLinecap="round" opacity="0.4" />;
      })}
      {/* Intention card */}
      <rect x="100" y="36" width="280" height="72" rx="14" fill="white" opacity="0.88" />
      <text x="120" y="64" fontFamily="DM Mono" fontSize="8" fill={T.muted} letterSpacing="1.5">TODAY'S INTENTION</text>
      <text x="120" y="88" fontFamily="Playfair Display" fontSize="15" fill={T.ink} fontStyle="italic">Stay curious, stay calm.</text>
      <text x="240" y="264" textAnchor="middle" fontFamily="DM Mono" fontSize="7.5" fill={T.muted} letterSpacing="2">MORNING BRIDGE · SET THE TONE</text>
    </svg>
  );
}

function FamilyCareSVG() {
  return (
    <svg viewBox="0 0 480 280" fill="none" style={{ width: '100%', height: '100%' }}>
      <rect width="480" height="280" fill={T.nightSub} rx="20" />
      <rect x="22" y="24" width="436" height="232" rx="18" fill="#121226" stroke="rgba(165,164,239,0.2)" />
      <rect x="46" y="50" width="300" height="52" rx="12" fill="rgba(61,59,191,0.25)" />
      <text x="60" y="76" fontFamily="DM Sans" fontSize="11" fill="white">Riva: Good morning! Time for your medicine.</text>
      <text x="60" y="94" fontFamily="DM Sans" fontSize="11" fill="white">Please reply DONE when finished.</text>
      <rect x="314" y="122" width="120" height="36" rx="12" fill="rgba(255,255,255,0.15)" />
      <text x="374" y="145" textAnchor="middle" fontFamily="DM Sans" fontSize="13" fill="white">Maa: DONE</text>
      <rect x="46" y="172" width="248" height="40" rx="12" fill="rgba(92,122,91,0.28)" />
      <text x="60" y="196" fontFamily="DM Sans" fontSize="11" fill="white">Riva: Perfect. Stay well today.</text>
      <text x="240" y="246" textAnchor="middle" fontFamily="DM Mono" fontSize="8" fill={T.indigoXL} letterSpacing="2">FAMILY CARE · PEACE OF MIND</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────
   FEATURES  — Chapter 4
───────────────────────────────────────────────────── */
const FEATURES = [
  { num: '01', tag: 'Core Experience',   title: 'Living Landscape',       body: 'A world that grows with your focus sessions — not your streaks. Miss a day? The landscape waits, patient as nature itself. Plant Focus Seeds, watch them bloom.',      Visual: LandscapeSVG    },
  { num: '02', tag: 'Focus',             title: 'Intentional Sessions',   body: 'Start with intention. End with reflection. Every session bookended with meaning — never just another timer. Set your purpose: Deep Work, Creative Flow, or just Present.',  Visual: SessionSVG      },
  { num: '03', tag: 'Mind Clarity',      title: 'Park a Thought',         body: 'Clear your mind without breaking flow state. Capture a thought in one tap and continue seamlessly. No idea, task, or worry ever gets lost in the void.',                   Visual: ThoughtParkSVG  },
  { num: '04', tag: 'Planning',          title: 'Day Planner & Calendar', body: 'Flow View and Plan View. Block time with intention. Two-way Google Calendar sync keeps your world connected. Unlinked tasks wait patiently.',                               Visual: CalendarSVG     },
  { num: '05', tag: 'Crisis Mode',       title: 'Overwhelm Mode',         body: 'The panic button that actually works. Simplifies everything down to one small, doable step. Because sometimes the only way out is through — gently.',                         Visual: OverwhelmSVG    },
  { num: '06', tag: 'Morning',           title: 'Morning Bridge',         body: 'A gentle transition from sleep to intention. Log mood, energy, sleep quality. Let Riva set the tone for your day before the chaos begins.',                                   Visual: MorningBridgeSVG },
  { num: '07', tag: 'Evening',           title: 'Wind Down Ritual',       body: 'Close the loop every evening. Review, reflect, release. The day is complete — let it go. Tomorrow begins in peace, not anxiety.',                                             Visual: WindDownSVG     },
  { num: '08', tag: 'Family Care',       title: 'Riva cares for everyone you love.', body: "Add your parents to Riva's world. She sends medicine reminders, answers their questions, and alerts you if something needs your attention. Peace of mind for the whole family.", Visual: FamilyCareSVG },
];

function FeaturesSection({ onChapter }: { onChapter: (n: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  useEffect(() => scrollYProgress.on('change', v => {
    setActive(Math.min(Math.floor((v / 0.9) * FEATURES.length), FEATURES.length - 1));
  }), [scrollYProgress]);

  const Visual = FEATURES[active].Visual;
  const pct = ((active + 1) / FEATURES.length) * 100 + '%';

  return (
    <div ref={wrap} id="features" style={{ height: `${FEATURES.length * 80}vh` }}>
      <div id="family" style={{ position: 'relative', top: '-96px' }} />
      <div style={{ position: 'sticky', top: 0, height: '100dvh', background: T.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '0 clamp(1.5rem,5vw,4rem)', paddingTop: '4.5rem', paddingBottom: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 8.5, letterSpacing: '.24em', textTransform: 'uppercase', color: T.indigo, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>Features · Chapter 04</span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            {FEATURES.map((f, i) => (
              <motion.span key={i} className="rv-mono" style={{ fontSize: 9.5, letterSpacing: '.1em' }}
                animate={{ opacity: i === active ? 1 : 0.2, color: i === active ? T.indigo : T.muted }}
                transition={{ duration: 0.4 }}>
                {f.num}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 clamp(1.5rem,5vw,4rem)', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div key={active}
              initial={{ opacity: 0, y: 28, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -28, filter: 'blur(4px)' }}
              transition={{ duration: 0.65, ease: E }}
              className="flex flex-col-reverse md:grid md:grid-cols-2 w-full items-center"
              style={{ gap: 'clamp(2.5rem,5vw,6rem)' }}>

              <div>
                <span style={{ fontSize: 8.5, letterSpacing: '.2em', textTransform: 'uppercase', color: T.indigo, padding: '5px 14px', borderRadius: 99, border: `1px solid ${T.indigoL}55`, background: T.indigoSub, display: 'inline-block', marginBottom: 22, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>
                  {FEATURES[active].tag}
                </span>
                <h2 className="rv-display" style={{ fontWeight: 400, fontSize: 'clamp(2.8rem,5vw,5.8rem)', lineHeight: 1.02, letterSpacing: '-0.02em', color: T.ink, marginBottom: 22, marginTop: 0 }}>
                  {FEATURES[active].title}
                </h2>
                <p className="rv-sans" style={{ fontWeight: 400, fontSize: 'clamp(0.82rem,1.1vw,0.96rem)', lineHeight: 2, color: T.muted, maxWidth: 400, margin: 0 }}>
                  {FEATURES[active].body}
                </p>
              </div>

              <div className="rv-feat-card" style={{ borderRadius: 22, overflow: 'hidden', aspectRatio: '16/10', border: `1px solid ${T.border}`, boxShadow: '0 24px 64px -12px rgba(14,13,11,0.08)' }}>
                <Visual />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress */}
        <div style={{ height: 2, background: T.border, flexShrink: 0 }}>
          <div style={{ height: '100%', background: `linear-gradient(90deg, ${T.indigo}, ${T.indigoL})`, width: pct, transition: 'width .8s cubic-bezier(.25,1,.5,1)' }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   RIVA AI  — Chapter 5  (dark section)
───────────────────────────────────────────────────── */
const RIVA_FEATURES = [
  { icon: <Sun size={18} />,       title: 'Morning Briefing',   desc: 'Personalized audio after check-in. Riva analyzes your mood, energy, sleep, and intention — then speaks to you in a natural voice.' },
  { icon: <Zap size={18} />,       title: 'Rhythm Orb',         desc: 'A central interactive orb that senses your flow state. Click for real-time guidance. "Your rhythm is steady. Trust your intuition today."' },
  { icon: <Mic size={18} />,       title: 'Voice Commands',     desc: '"Create a task to call mom." "Start a focus session." "Take me to insights." Context-aware commands, even offline.' },
  { icon: <Brain size={18} />,     title: 'Focus Intelligence', desc: 'Tracks your focus history and flow state. Suggests when to work, when to rest, and when to take a breath — based on you, not averages.' },
  { icon: <Headphones size={18} />,title: 'She Reaches Out',    desc: "Riva doesn't wait to be asked. She messages you first - morning check-ins, Sunday nudges, and a quiet 'everything okay?' when you've gone quiet. She shows up." },
  { icon: <Leaf size={18} />,      title: 'Grows With You',     desc: 'Riva gets smarter about your patterns over time. After 30 conversations, she knows you. After 60, she feels like a friend who has known you for years. Your patterns, your story. Never sold, never shared.' },
];

function RivaSection({ onChapter }: { onChapter: (n: number) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: outer, offset: ['start 0.8', 'center 0.3'] });

  const orbScale = useTransform(scrollYProgress, [0, 1], [0.7, 1.1]);
  const orbOp    = useTransform(scrollYProgress, [0, 0.4], [0, 1]);

  return (
    <section id="riva-ai" ref={outer} style={{ background: T.night, padding: '14vh 0', overflow: 'hidden', position: 'relative' }}>
      {/* Stars */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {Array.from({ length: 36 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
            width: Math.random() > 0.7 ? 2 : 1, height: Math.random() > 0.7 ? 2 : 1,
            borderRadius: '50%', background: 'white',
            opacity: Math.random() * 0.4 + 0.1,
            animation: `rv-twinkle ${2 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(1.5rem,5vw,4rem)', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <motion.div style={{ fontSize: 8.5, letterSpacing: '.26em', textTransform: 'uppercase', color: T.indigoXL, marginBottom: 24, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            Chapter 05 · Your Rhythm Guide
          </motion.div>

          {/* Orb */}
          <motion.div style={{ scale: orbScale, opacity: orbOp, display: 'inline-block', marginBottom: 40, position: 'relative' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle at 38% 38%, ${T.indigoL}, ${T.indigo})`, boxShadow: `0 0 0 0 ${T.indigo}55`, animation: 'rv-orb-pulse 3s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
             
            </div>
            <div style={{ position: 'absolute', inset: -18, borderRadius: '50%', border: `1px solid ${T.indigoL}22` }} />
            <div style={{ position: 'absolute', inset: -36, borderRadius: '50%', border: `1px solid ${T.indigoXL}12` }} />
          </motion.div>

          <div style={{ overflow: 'hidden', marginBottom: 8 }}>
            <motion.div className="rv-display"
              style={{ fontWeight: 400, fontSize: 'clamp(3rem,7vw,8rem)', letterSpacing: '-0.025em', lineHeight: 0.92, color: 'white' }}
              initial={{ y: '105%' }} whileInView={{ y: '0%' }} viewport={{ once: true }} transition={{ duration: 1.3, ease: E }}>
              Meet Riva.
            </motion.div>
          </div>
          <div style={{ overflow: 'hidden', marginBottom: 32 }}>
            <motion.div className="rv-display"
              style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(3rem,7vw,8rem)', letterSpacing: '-0.025em', lineHeight: 0.92, color: T.indigoXL }}
              initial={{ y: '105%' }} whileInView={{ y: '0%' }} viewport={{ once: true }} transition={{ duration: 1.3, ease: E, delay: 0.12 }}>
              Your AI life companion.
            </motion.div>
          </div>

          <motion.p className="rv-sans" style={{ fontWeight: 400, fontSize: '0.92rem', color: 'rgba(255,255,255,0.45)', maxWidth: 520, margin: '0 auto', lineHeight: 2 }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4, duration: 0.8 }}>
            Riva isn't a productivity bot. She's the companion who remembers what you told her last Tuesday, messages you first on Sunday evenings, and is still awake when everyone else is asleep. Warmth, not judgement. Presence, not features.
          </motion.p>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
          {RIVA_FEATURES.map((f, i) => (
            <motion.div key={i} data-h="true"
              style={{ padding: '32px 28px', background: T.nightSub, transition: 'background .4s', cursor: 'default' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1A1A2A')}
              onMouseLeave={e => (e.currentTarget.style.background = T.nightSub)}
              initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: E }}>
              <div style={{ color: T.indigoXL, marginBottom: 16 }}>{f.icon}</div>
              <div className="rv-display" style={{ fontWeight: 400, fontSize: '1.2rem', color: 'white', marginBottom: 10, letterSpacing: '-0.01em' }}>{f.title}</div>
              <div className="rv-sans" style={{ fontWeight: 400, fontSize: '0.8rem', lineHeight: 1.85, color: 'rgba(255,255,255,0.38)' }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <motion.div style={{ marginTop: 72, textAlign: 'center', padding: '48px', border: '1px solid rgba(165,164,239,0.15)', borderRadius: 24, background: 'rgba(61,59,191,0.06)' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: E }}>
          <p className="rv-display" style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(1.3rem,2.4vw,2.2rem)', lineHeight: 1.5, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
            "Your rhythm is steady.{' '}
            <span style={{ color: T.indigoXL }}>Trust your intuition today.</span>"
          </p>
          <div className="rv-mono" style={{ fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', color: T.indigoXL, opacity: 0.5, marginTop: 20 }}>— Riva, your rhythm guide</div>
        </motion.div>
      </div>
    </section>
  );
}

function WhyNotSection() {
  return (
    <section id="why-not" style={{ background: T.bg, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: '12vh clamp(1.5rem,5vw,4rem)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
        <p className="rv-display" style={{ fontWeight: 400, fontSize: 'clamp(1.9rem,4vw,4rem)', lineHeight: 1.35, letterSpacing: '-0.015em', color: T.ink, margin: 0 }}>
          ChatGPT answers when you ask.<br />
          Gemini answers when you ask.<br />
          <span style={{ color: T.indigo, fontStyle: 'italic' }}>Riva shows up before you do.</span>
        </p>
        <p className="rv-display" style={{ marginTop: 28, fontWeight: 400, fontSize: 'clamp(1.1rem,2vw,2rem)', lineHeight: 1.5, color: T.muted, fontStyle: 'italic' }}>
          That's not a feature difference.<br />
          That's a relationship difference.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────
   PROMISE  — Chapter 6
───────────────────────────────────────────────────── */
function PromiseSection({ onChapter }: { onChapter: (n: number) => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: outer, offset: ['start start', 'end end'] });
  
  const textProgress = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  
  const [showCards, setShowCards] = useState(false);
  useEffect(() => scrollYProgress.on('change', v => setShowCards(v > 0.45)), [scrollYProgress]);

  const items = [
    { icon: <Sun size={20} />,  t: 'Space to focus',   d: 'One session. One intention. Distraction-aware. Flow starts here.' },
    { icon: <Moon size={20} />, t: 'Space to rest',    d: 'Recovery is progress. Wind down without guilt. You earned this.' },
    { icon: <Wind size={20} />, t: 'Space to reflect', d: 'No judgment. No rankings. Just you and your day, honestly.' },
  ];

  return (
    <div id="promise" ref={outer} style={{ position: 'relative', height: '280vh' }}>
      <div style={{ position: 'sticky', top: 0, height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.surface, padding: '0 clamp(1.5rem,5vw,4rem)', overflow: 'hidden' }}>
        
        <div style={{ maxWidth: 900, width: '100%', textAlign: 'center' }}>
          <motion.div className="mb-6 md:mb-10" style={{ fontSize: 8.5, letterSpacing: '.26em', textTransform: 'uppercase', color: T.indigo, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            Chapter 06 · Our Promise
          </motion.div>

          <WordReveal
            progress={textProgress}
            text="Not here to optimise you."
            className="rv-display mb-8 md:mb-16"
            style={{ fontWeight: 400, fontSize: 'clamp(2.8rem,9vw,9rem)', lineHeight: 0.9, letterSpacing: '-0.025em', color: T.ink, justifyContent: 'center' }}
          />

          <motion.div 
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={showCards ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 24, filter: 'blur(8px)' }}
            transition={{ duration: 0.8, ease: E }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-12"
          >
            {items.map((item, i) => (
              <motion.div key={i} data-h="true"
                initial={{ opacity: 0, y: 24 }}
                animate={showCards ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: 0.65, delay: i * 0.12, ease: E }}
                className="p-5 md:p-8 rounded-2xl md:rounded-[22px] text-left transition-all duration-300"
                style={{ border: `1px solid ${T.border}`, background: T.bg }}
                whileHover={{ y: -5, boxShadow: `0 18px 52px -8px rgba(61,59,191,0.12)`, borderColor: T.indigoL }}>
                <div className="mb-3 md:mb-4" style={{ color: T.indigo }}>{item.icon}</div>
                <div className="rv-display mb-2 md:mb-3" style={{ fontWeight: 500, fontSize: '1.15rem', color: T.ink, letterSpacing: '-0.01em' }}>{item.t}</div>
                <div className="rv-sans" style={{ fontWeight: 400, fontSize: '0.8rem', lineHeight: 1.6, color: T.muted }}>{item.d}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={showCards ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.9, delay: 0.3, ease: E }}
            className="p-6 md:p-11 rounded-2xl md:rounded-[26px]"
            style={{ border: `1px solid ${T.indigoL}44`, background: T.indigoSub }}>
            <p className="rv-display" style={{ fontWeight: 400, fontStyle: 'italic', lineHeight: 1.4, fontSize: 'clamp(1.1rem,2.2vw,2rem)', color: T.ink, margin: 0 }}>
              "Some days you'll do more. Some days you'll simply show up.{' '}
              <strong style={{ fontStyle: 'normal', fontWeight: 500, color: T.indigo }}>Both count.</strong>"
            </p>
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   CTA  — Chapter 7
───────────────────────────────────────────────────── */
function CTASection({ onChapter }: { onChapter: (n: number) => void }) {
  const { user } = useAuthContext();
  const outer = useRef<HTMLDivElement>(null);

  return (
    <section id="cta" ref={outer} style={{ position: 'relative', padding: '16vh 0', textAlign: 'center', background: T.bg, borderTop: `1px solid ${T.border}`, overflow: 'hidden' }}>
      {/* Glow */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 800, height: 800, borderRadius: '50%', background: `radial-gradient(circle, rgba(61,59,191,0.07) 0%, transparent 68%)` }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 clamp(1.5rem,5vw,4rem)' }}>
        <motion.div style={{ fontSize: 8.5, letterSpacing: '.26em', textTransform: 'uppercase', color: T.muted, marginBottom: 32, fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          Chapter 07 · Your story begins
        </motion.div>

        {['Find your', 'flow.', 'Drop your', 'burnout.'].map((line, i) => (
          <div key={i} style={{ overflow: 'hidden', marginBottom: i % 2 === 1 ? 8 : 0 }}>
            <motion.div className="rv-display"
              style={{ fontWeight: 400, fontStyle: i % 2 === 1 ? 'italic' : 'normal', lineHeight: i % 2 === 1 ? 0.88 : 0.95, letterSpacing: '-0.028em', fontSize: 'clamp(4rem,11vw,12.5rem)', color: i === 1 ? T.indigo : i === 3 ? T.muted : T.ink, textDecoration: i === 3 ? 'line-through' : 'none', textDecorationColor: T.indigo, textDecorationThickness: 2 }}
              initial={{ y: '108%' }} whileInView={{ y: '0%' }} viewport={{ once: true }}
              transition={{ duration: 1.3, ease: E, delay: i * 0.12 }}>
              {line}
            </motion.div>
          </div>
        ))}

        <motion.p className="rv-sans" style={{ fontWeight: 400, fontSize: '0.96rem', color: T.muted, margin: '48px 0 44px', letterSpacing: '0.01em' }}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.8 }}>
          Join thousands of calm achievers. No card required.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.65, ease: E, duration: 0.75 }}>
          {user ? (
            <Link to="/app">
              <Mag className="h-16 px-14 rounded-full text-sm font-semibold text-white gap-3" style={{ background: T.indigo, height: 60, fontSize: '0.9rem' }}>
                Open Dashboard <ArrowUpRight size={16} />
              </Mag>
            </Link>
          ) : (
            <Mag href="https://ravenso.in/#/" className="h-16 px-14 rounded-full text-sm font-semibold text-white gap-3" style={{ background: T.ink, height: 60, fontSize: '0.9rem', fontFamily: "'Roboto', sans-serif" }}>
              Join the Waitlist <ArrowUpRight size={16} />
            </Mag>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────────────── */
function Footer() {
  const links = [
    { l: 'Features', h: '#features' }, { l: 'Riva AI', h: '#riva-ai' },
    { l: 'Promise', h: '#promise' }, { l: 'Contact', h: 'mailto:ravenso.here@gmail.com' },
  ];
  return (
    <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '32px clamp(1.5rem,5vw,4rem)', background: T.surface, borderTop: `1px solid ${T.border}` }}>
      <span className="rv-display" style={{ fontStyle: 'italic', fontWeight: 400, fontSize: '1.3rem', color: T.muted }}>Rivly</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
        {links.map(l => (
          <a key={l.l} href={l.h} data-h="true" className="rv-sans rv-ul"
            style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: T.muted, textDecoration: 'none', transition: 'color .3s', fontWeight: 500 }}>
            {l.l}
          </a>
        ))}
      </div>
      <span className="rv-sans" style={{ fontSize: 10, color: T.muted, opacity: 0.35, fontWeight: 500 }}>© 2026 Rivly</span>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────── */
export default function LandingPage() {
  const [chapter, setChapter] = useState(0);
  const onChapter = useCallback((n: number) => setChapter(n), []);
  const isDark = chapter === 5;
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const map: Record<string, number> = {
            'hero': 0, 'why': 1, 'manifesto': 2, 'contrast': 3, 'features': 4, 'riva-ai': 5, 'promise': 6, 'cta': 7
          };
          const chap = map[entry.target.id];
          if (chap !== undefined) onChapter(chap);
        }
      });
    }, { rootMargin: '-49% 0px -49% 0px' });
    
    const ids = ['hero', 'why', 'manifesto', 'contrast', 'features', 'riva-ai', 'promise', 'cta'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    
    return () => observer.disconnect();
  }, [onChapter]);

  // Lenis v1 dropped `smoothTouch`; touch smoothing is off by default
  // (`syncTouch: false`), which is the behaviour this had before.
  return (
    <ReactLenis root options={{ duration: 1.55, smoothWheel: isDesktop, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <div className="rv-body" style={{ minHeight: '100dvh', background: T.bg }}>
        <SEO
          title="Rivly - Meet Riva, Your AI Life Companion"
          description="Riva knows your goals, your schedule, and your family and checks in before you ask. Not a planner. Your Life OS. Built in India."
          keywords={['Rivly', 'Riva', 'AI Life Companion', 'Family Care', 'WhatsApp', 'Life OS']}
        />
        <Cursor />
        <ScrollProgress />
        <div className="rv-grain" aria-hidden />
        <ChapterLabel chapter={chapter} />
        <Navbar dark={isDark} />

        <Hero onChapter={onChapter} />
        <MarqueeStrip />
        <ProblemSection onChapter={onChapter} />
        <ManifestoSection onChapter={onChapter} />
        <ContrastSection onChapter={onChapter} />
        <FeaturesSection onChapter={onChapter} />
        <RivaSection onChapter={onChapter} />
        <WhyNotSection />
        <PromiseSection onChapter={onChapter} />
        <CTASection onChapter={onChapter} />
        <Footer />
      </div>
    </ReactLenis>
  );
}





