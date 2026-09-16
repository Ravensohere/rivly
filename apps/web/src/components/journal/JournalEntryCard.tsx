/**
 * JournalEntryCard - Card displaying a journal entry summary
 */

import { motion } from 'framer-motion';
import { JournalEntry, JOURNAL_TAG_OPTIONS } from '@/types/journal';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onClick: () => void;
  index?: number;
}

export function JournalEntryCard({ entry, onClick, index = 0 }: JournalEntryCardProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
    
    if (isToday) {
      return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTagEmoji = (tag: string) => {
    const option = JOURNAL_TAG_OPTIONS.find(t => t.value === tag);
    return option?.emoji || '✏️';
  };

  // Truncate body for preview
  const preview = entry.body.length > 120 
    ? entry.body.substring(0, 120) + '...' 
    : entry.body;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full text-left p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 transition-all duration-300"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {/* Date & Tags */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          {formatDate(entry.createdAt)}
        </span>
        <div className="flex gap-1">
          {entry.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs">
              {getTagEmoji(tag)}
            </span>
          ))}
        </div>
      </div>

      {/* Title */}
      {entry.title && (
        <h3 className="font-medium text-foreground mb-1 line-clamp-1">
          {entry.title}
        </h3>
      )}

      {/* Preview */}
      <p className="text-sm text-muted-foreground line-clamp-2">
        {preview}
      </p>
    </motion.button>
  );
}
