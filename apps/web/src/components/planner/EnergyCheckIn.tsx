/**
 * EnergyCheckIn - Simple 1-tap energy level selector
 */

import { motion } from 'framer-motion';
import { Battery, BatteryLow, BatteryFull } from 'lucide-react';
import { EnergyLevel } from '@/hooks/useRhythmScore';

interface EnergyCheckInProps {
  value: EnergyLevel | null;
  onChange: (level: EnergyLevel) => void;
}

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; icon: typeof Battery; color: string }[] = [
  { value: 'low', label: 'Low', icon: BatteryLow, color: 'text-orange-400' },
  { value: 'ok', label: 'Ok', icon: Battery, color: 'text-yellow-400' },
  { value: 'high', label: 'High', icon: BatteryFull, color: 'text-green-400' },
];

export function EnergyCheckIn({ value, onChange }: EnergyCheckInProps) {
  return (
    <div className="flex items-center gap-1">
      {ENERGY_OPTIONS.map((option, index) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        
        return (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(option.value)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
              transition-all duration-300
              ${isSelected 
                ? 'bg-primary/15 border border-primary/30' 
                : 'bg-secondary/50 border border-transparent hover:bg-secondary'}
            `}
          >
            <Icon className={`w-4 h-4 ${isSelected ? option.color : 'text-muted-foreground'}`} />
            <span className={isSelected ? 'text-foreground' : 'text-muted-foreground'}>
              {option.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
