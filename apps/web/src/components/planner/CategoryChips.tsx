/**
 * Shared CategoryChips component for Tasks and Time Blocks
 * Provides consistent category selection UI
 */

import { motion } from 'framer-motion';
import { TaskTag, BlockColor } from '@/types';

// Task tag options (for tasks)
export const taskTagOptions: { key: TaskTag; label: string; className: string }[] = [
  { key: 'work', label: 'Work', className: 'bg-block-sky' },
  { key: 'study', label: 'Study', className: 'bg-block-lavender' },
  { key: 'personal', label: 'Personal', className: 'bg-block-peach' },
  { key: 'health', label: 'Health', className: 'bg-block-mint' },
  { key: 'other', label: 'Other', className: 'bg-muted' },
];

// Block color options (for time blocks)
export const blockColorOptions: { key: BlockColor; label: string; className: string }[] = [
  { key: 'sage', label: 'Focus', className: 'bg-block-sage' },
  { key: 'lavender', label: 'Creative', className: 'bg-block-lavender' },
  { key: 'peach', label: 'Meeting', className: 'bg-block-peach' },
  { key: 'sky', label: 'Learning', className: 'bg-block-sky' },
  { key: 'mint', label: 'Health', className: 'bg-block-mint' },
  { key: 'rose', label: 'Personal', className: 'bg-block-rose' },
];

interface CategoryChipsProps<T extends string> {
  options: { key: T; label: string; className: string }[];
  selected: T;
  onSelect: (value: T) => void;
  label?: string;
}

export function CategoryChips<T extends string>({
  options,
  selected,
  onSelect,
  label = 'Category',
}: CategoryChipsProps<T>) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-3">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <motion.button
            key={option.key}
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + index * 0.05 }}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(option.key)}
            className={`
              px-4 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-300 min-h-[44px]
              ${selected === option.key 
                ? `${option.className} text-foreground ring-2 ring-primary/30 shadow-md` 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }
            `}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
