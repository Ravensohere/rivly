/**
 * ThoughtCard - Display card for a parked thought with actions
 * Per strategy: "Convert to task" + "Schedule later" as fast actions
 */

import { motion } from 'framer-motion';
import { Archive, ArrowRight, Trash2, RotateCcw, MoreVertical, CalendarClock } from 'lucide-react';
import { ParkedThought, THOUGHT_CATEGORY_OPTIONS } from '@/types/thoughts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface ThoughtCardProps {
  thought: ParkedThought;
  onConvertToTask: (thought: ParkedThought) => void;
  onScheduleLater?: (thought: ParkedThought) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onEdit?: (thought: ParkedThought) => void;
}

export function ThoughtCard({
  thought,
  onConvertToTask,
  onScheduleLater,
  onArchive,
  onDelete,
  onRestore,
  onEdit,
}: ThoughtCardProps) {
  const categoryInfo = THOUGHT_CATEGORY_OPTIONS.find(c => c.value === thought.category);
  const isActive = thought.status === 'active';
  const isConverted = thought.status === 'converted';
  const isArchived = thought.status === 'archived';

  const timeAgo = formatDistanceToNow(new Date(thought.createdAt), { addSuffix: true });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        p-4 rounded-2xl border transition-all duration-300
        ${isActive
          ? 'bg-card border-border/50 hover:border-border'
          : 'bg-muted/50 border-border/30 opacity-75'}
      `}
    >
      {/* Header with category badge and menu */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          ${categoryInfo?.color || 'bg-muted text-muted-foreground'}
        `}>
          {categoryInfo?.emoji} {categoryInfo?.label}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && isActive && (
              <DropdownMenuItem onClick={() => onEdit(thought)}>
                Edit thought
              </DropdownMenuItem>
            )}
            {isArchived && onRestore && (
              <DropdownMenuItem onClick={() => onRestore(thought.id)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(thought.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Thought text */}
      <p className="text-foreground text-sm leading-relaxed mb-3">
        {thought.text}
      </p>

      {/* Footer: time + fast action row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{timeAgo}</span>

        {isActive && (
          <div className="flex gap-1.5">
            {/* Convert to task — always visible */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConvertToTask(thought)}
              className="h-8 text-xs gap-1 rounded-xl"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Make task
            </Button>

            {/* Schedule later */}
            {onScheduleLater && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onScheduleLater(thought)}
                className="h-8 text-xs gap-1 rounded-xl text-muted-foreground hover:text-foreground"
                title="Schedule for later"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                Later
              </Button>
            )}

            {/* Archive */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onArchive(thought.id)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <Archive className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {isConverted && (
          <span className="text-xs text-primary flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            Converted to task
          </span>
        )}

        {isArchived && (
          <span className="text-xs text-muted-foreground">Archived</span>
        )}
      </div>
    </motion.div>
  );
}
