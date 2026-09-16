import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SleepCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SleepCard({ children, className = '', delay = 0 }: SleepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.7, 
        delay,
        ease: [0.16, 1, 0.3, 1]
      }}
      className={`
        relative overflow-hidden rounded-3xl p-6
        bg-card border border-border/40
        ${className}
      `}
      style={{
        boxShadow: 'var(--shadow-medium)',
      }}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

interface SleepCardHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export function SleepCardHeader({ icon, title, subtitle }: SleepCardHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-foreground font-semibold text-base">{title}</h3>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}