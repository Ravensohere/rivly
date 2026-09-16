import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sun, Sunset, Moon, CloudSun, Settings } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useTheme } from '@/hooks/useTheme';
import { useAuthContext } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { CheckInButton } from '@/components/checkin/CheckInButton';
import { firstNameOf, getGreeting, getTimeOfDay } from '@/lib/greeting';

interface TimeGreetingProps {
  hasCheckedIn?: boolean;
  onOpenCheckIn?: () => void;
}

const E = [0.22, 1, 0.36, 1] as const;

const TIME_STYLES = {
  morning:   { Icon: Sun,      color: '#C47A1A' },
  afternoon: { Icon: CloudSun, color: 'hsl(var(--primary))' },
  evening:   { Icon: Sunset,   color: '#C0553A' },
  night:     { Icon: Moon,     color: 'hsl(235 40% 65%)' },
} as const;

const getTimeConfig = () => ({ greeting: getGreeting(), ...TIME_STYLES[getTimeOfDay()] });

export function TimeGreeting({ hasCheckedIn = true, onOpenCheckIn }: TimeGreetingProps) {
  const { firstName: localName } = useUserPreferences();
  const { user, profile, isGuest } = useAuthContext();
  const { setTheme, isDark } = useTheme();

  const { greeting, Icon, color } = useMemo(getTimeConfig, []);

  const displayName = (!isGuest && user)
    ? (profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || localName)
    : (localName || 'Guest');

  const firstName = firstNameOf(displayName);

  const btnSize = 'clamp(2rem, 3.2vw, 2.6rem)';
  const iconSize = 'clamp(0.85rem, 1.3vw, 1.1rem)';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0   }}
      transition={{ duration: 0.55, ease: E }}
      className="flex items-center justify-between w-full"
      style={{ padding: 'clamp(0.7rem, 1.5vh, 1.1rem) clamp(1rem, 2.2vw, 2rem) clamp(0.4rem, 0.8vh, 0.6rem)' }}
    >
      {/* Left: Logo + Greeting */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* App mark */}
        <Link to="/?noredirect=true" className="flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92   }}
            className="flex items-center justify-center rounded-xl overflow-hidden"
            style={{
              width:  'clamp(2.2rem, 3.5vw, 3rem)',
              height: 'clamp(2.2rem, 3.5vw, 3rem)',
            }}
          >
            <img 
              src="/favicon.ico" 
              alt="Rivly Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </motion.div>
        </Link>

        {/* Greeting */}
        <div className="min-w-0">
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize:   'clamp(0.58rem, 0.85vw, 0.75rem)',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'hsl(var(--muted-foreground))', lineHeight: 1, marginBottom: '0.18rem',
            }}
          >
            {greeting}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0  }}
            transition={{ delay: 0.18, duration: 0.45, ease: E }}
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle:  'italic',
              fontSize:   'clamp(1.2rem, 2.2vw, 1.8rem)',
              fontWeight: 400, letterSpacing: '-0.015em',
              color: 'hsl(var(--foreground))',
              lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {firstName || 'Welcome'}
            <motion.span
              animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              style={{ display: 'inline-block', marginLeft: '0.4rem' }}
            >
              <Icon style={{ width: iconSize, height: iconSize, color, display: 'inline', verticalAlign: 'middle' }} />
            </motion.span>
          </motion.h2>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!hasCheckedIn && onOpenCheckIn ? (
          <CheckInButton onClick={onOpenCheckIn} />
        ) : (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="touch-target flex items-center justify-center rounded-full transition-colors duration-300"
            style={{
              width:   btnSize, height: btnSize,
              background: 'hsl(var(--muted) / 0.6)',
              border:  '1px solid hsl(var(--border) / 0.5)',
            }}
            aria-label="Toggle theme"
          >
            {isDark
              ? <Sun  style={{ width: iconSize, height: iconSize, color: 'hsl(var(--muted-foreground))' }} />
              : <Moon style={{ width: iconSize, height: iconSize, color: 'hsl(var(--muted-foreground))' }} />
            }
          </motion.button>
        )}
        <Link to="/settings">
          <motion.div
            whileTap={{ scale: 0.88 }}
            className="touch-target flex items-center justify-center rounded-full transition-colors duration-300"
            style={{
              width:   btnSize, height: btnSize,
              background: 'hsl(var(--muted) / 0.6)',
              border:  '1px solid hsl(var(--border) / 0.5)',
            }}
          >
            <Settings style={{ width: iconSize, height: iconSize, color: 'hsl(var(--muted-foreground))' }} />
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}
