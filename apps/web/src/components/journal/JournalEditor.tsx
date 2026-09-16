/**
 * JournalEditor - Rich journal entry editor with diary-like styling
 * Features autosave, optional title, tags, and subtle ink animation
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, PenTool } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { JournalEntry, JournalTag, JOURNAL_TAG_OPTIONS } from '@/types/journal';

interface JournalEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: JournalEntry | null;
  onSave: (data: { title: string; body: string; tags: JournalTag[] }) => void;
  onDelete?: () => void;
}

export function JournalEditor({ 
  open, 
  onOpenChange, 
  entry, 
  onSave, 
  onDelete 
}: JournalEditorProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<JournalTag[]>(['general']);
  const [saved, setSaved] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setBody(entry.body);
      setTags(entry.tags);
    } else {
      setTitle('');
      setBody('');
      setTags(['general']);
    }
    setSaved(false);
  }, [entry, open]);

  // Autosave logic
  useEffect(() => {
    if (!open || !body.trim()) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      onSave({ title, body, tags });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, body, tags, open, onSave]);

  // Typing indicator
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 500);
  };

  const toggleTag = (tag: JournalTag) => {
    setTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      return [...prev, tag];
    });
  };

  const handleClose = () => {
    if (body.trim()) {
      onSave({ title, body, tags });
    }
    onOpenChange(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-3xl border-0 p-0 overflow-hidden"
      >
        {/* Diary paper texture background */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                transparent 0px,
                transparent 31px,
                hsl(var(--border) / 0.3) 31px,
                hsl(var(--border) / 0.3) 32px
              )
            `,
            backgroundSize: '100% 32px',
            backgroundPositionY: '80px',
          }}
        />
        
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">
                {entry ? 'Edit Entry' : 'New Entry'}
              </SheetTitle>
              <div className="flex items-center gap-2">
                {/* Saved indicator */}
                <AnimatePresence>
                  {saved && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 text-xs text-green-500"
                    >
                      <Check className="w-3 h-3" />
                      Saved
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Typing pen indicator */}
                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      className="text-primary"
                    >
                      <motion.div
                        animate={{ rotate: [-5, 5, -5] }}
                        transition={{ duration: 0.3, repeat: Infinity }}
                      >
                        <PenTool className="w-4 h-4" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {entry && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(entry.createdAt)}
              </p>
            )}
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Title (optional) */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="text-lg font-medium rounded-xl px-4 py-3 bg-secondary/50 border border-border/40 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Body */}
            <div className="flex-1">
              <Textarea
                value={body}
                onChange={handleBodyChange}
                placeholder="Start writing..."
                className="min-h-[300px] resize-none border-0 bg-transparent focus-visible:ring-0 text-foreground leading-8"
                style={{ lineHeight: '32px' }}
                autoFocus
              />
            </div>

            {/* Tags */}
            <div className="pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {JOURNAL_TAG_OPTIONS.map((option) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleTag(option.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
                      ${tags.includes(option.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }
                    `}
                  >
                    {option.emoji} {option.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-border/30 flex gap-3">
            {onDelete && entry && (
              <Button
                variant="ghost"
                onClick={onDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button
              onClick={handleClose}
              className="px-6"
            >
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
