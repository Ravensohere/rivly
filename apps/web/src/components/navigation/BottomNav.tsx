import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Zap, GraduationCap, Moon, BarChart3 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/app',      label: 'Day',      icon: Calendar  },
  { path: '/focus',    label: 'Focus',    icon: Zap       },
  { path: '/learn',    label: 'Learn',    icon: GraduationCap },
  { path: '/sleep',    label: 'Sleep',    icon: Moon      },
  { path: '/insights', label: 'Insights', icon: BarChart3 },
];

const HIDDEN_NAV_ROUTES = ['/alarm/ringing'];

export function BottomNav() {
  const location = useLocation();
  const navigate  = useNavigate();

  if (HIDDEN_NAV_ROUTES.some(r => location.pathname.startsWith(r))) return null;

  return (
    <motion.nav
      initial={{ y: 110, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260, delay: 0.15 }}
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft:   'env(safe-area-inset-left,   0px)',
        paddingRight:  'env(safe-area-inset-right,  0px)',
      }}
    >
      <div className="bottom-nav-bar pointer-events-auto">
        <div
          className="relative flex items-center justify-around w-full max-w-lg mx-auto"
          style={{ height: '4.3rem' }}
        >
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center flex-1 h-full min-w-0 gap-0.5"
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {/* Active background circle — uses margin:auto trick to center */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        width:  '3.8rem',
                        height: '3.8rem',
                        top:    '50%',
                        left:   '50%',
                        marginTop:  '-1.9rem',
                        marginLeft: '-1.9rem',
                        background: 'hsl(var(--primary) / 0.12)',
                      }}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1   }}
                      exit={{    opacity: 0, scale: 0.4 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon */}
                <div className="relative flex items-center justify-center">
                  {isActive && (
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: '2rem', height: '2rem',
                        background: 'hsl(var(--primary) / 0.25)',
                        filter: 'blur(8px)',
                      }}
                    />
                  )}
                  <Icon
                    className="relative transition-colors duration-300"
                    style={{
                      width:  '1.25rem',
                      height: '1.25rem',
                      color: isActive
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--nav-inactive))',
                      strokeWidth: isActive ? 2.5 : 2,
                    }}
                  />
                </div>

                {/* Label */}
                <span
                  className="relative transition-colors duration-300 leading-none"
                  style={{
                    fontFamily:    "'DM Mono', monospace",
                    fontSize:      'max(0.62rem, 10px)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color:   isActive
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--nav-inactive))',
                    opacity:    isActive ? 1 : 0.65,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>

                {/* Top active dot */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full"
                      style={{
                        width: '0.22rem', height: '0.22rem',
                        background: 'hsl(var(--primary))',
                        boxShadow:  '0 0 6px 2px hsl(var(--primary) / 0.5)',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{    opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}