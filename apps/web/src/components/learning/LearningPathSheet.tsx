import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useLearningPaths, getCheckpointVideoId, getCheckpointVideoTitle } from '@/hooks/useLearningPaths';
import { Check, Play, BookOpen, X, ChevronDown, ChevronUp, Clock, Pencil } from 'lucide-react';

interface LearningPathSheetProps {
  pathId: string | null;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  theory: '\u{1F4D6}',   // book
  practice: '\u{1F4BB}', // laptop
  project: '\u{1F680}',  // rocket
  revision: '\u{1F504}', // arrows
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
  intermediate: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
  advanced: 'bg-red-500/15 text-red-600 border-red-500/20',
};

export function LearningPathSheet({ pathId, onClose }: LearningPathSheetProps) {
  const { getPath, markCheckpointComplete, uncheckCheckpoint, getProgress, addNoteToCheckpoint } = useLearningPaths();
  const path = useMemo(() => (pathId ? getPath(pathId) : null), [pathId, getPath]);
  const progress = useMemo(() => (pathId ? getProgress(pathId) : null), [pathId, getProgress]);
  const [playingVideo, setPlayingVideo] = useState<{ videoId: string; title: string } | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState<{ cpId: string; text: string } | null>(null);

  if (!pathId) return null;

  const toggleNotes = (cpId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(cpId) ? next.delete(cpId) : next.add(cpId);
      return next;
    });
  };

  return (
    <Sheet open={!!pathId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="truncate">Learn: {path?.topic ?? '...'}</span>
          </SheetTitle>
        </SheetHeader>

        {/* Progress bar + stats */}
        {path && progress && (
          <div className="px-1 pt-2 pb-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.completed}/{progress.total} completed</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {progress.hoursLeft.toFixed(1)}h left
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center gap-2">
              {path.difficulty && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[path.difficulty] || DIFFICULTY_COLORS.beginner}`}>
                  {path.difficulty}
                </span>
              )}
              {path.totalEstimatedHours && (
                <span className="text-[10px] text-muted-foreground">
                  ~{path.totalEstimatedHours}h total
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pt-2 pb-8">
          {path && (
            <ul className="space-y-3">
              {path.checkpoints.map((checkpoint, index) => {
                const videoId = getCheckpointVideoId(checkpoint);
                const videoTitle = getCheckpointVideoTitle(checkpoint);
                const isNotesOpen = expandedNotes.has(checkpoint.id);

                return (
                  <motion.li
                    key={checkpoint.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`rounded-xl border p-4 transition-colors ${
                      checkpoint.completedAt ? 'bg-muted/40 border-primary/20' : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {checkpoint.type && TYPE_ICONS[checkpoint.type]}{' '}
                            {index + 1}. {checkpoint.title}
                          </span>
                          {checkpoint.completedAt && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                          {checkpoint.difficulty && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[checkpoint.difficulty] || ''}`}>
                              {checkpoint.difficulty}
                            </span>
                          )}
                          {checkpoint.estimatedHours && (
                            <span className="text-[10px] text-muted-foreground">
                              ~{checkpoint.estimatedHours}h
                            </span>
                          )}
                        </div>
                        {checkpoint.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{checkpoint.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {videoId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-8 text-xs"
                            onClick={() => setPlayingVideo({ videoId, title: videoTitle })}
                          >
                            <Play className="w-3 h-3" />
                            Watch
                          </Button>
                        )}
                        {checkpoint.completedAt ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => uncheckCheckpoint(path.id, checkpoint.id)}
                          >
                            Undo
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => markCheckpointComplete(path.id, checkpoint.id)}
                          >
                            Done
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Multiple videos */}
                    {checkpoint.videos && checkpoint.videos.length > 1 && (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                        {checkpoint.videos.map((v, vi) => (
                          <button
                            key={vi}
                            onClick={() => setPlayingVideo({ videoId: v.videoId, title: v.title })}
                            className="flex-shrink-0 text-xs bg-muted hover:bg-muted/80 rounded-lg px-2.5 py-1.5 flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" /> {v.title.slice(0, 30)}{v.title.length > 30 ? '...' : ''}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Notes toggle */}
                    <button
                      onClick={() => toggleNotes(checkpoint.id)}
                      className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      {checkpoint.notes ? 'Notes' : 'Add note'}
                      {isNotesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isNotesOpen && (
                      <div className="mt-2">
                        <textarea
                          className="w-full text-xs bg-muted/50 border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                          rows={2}
                          placeholder="Add your notes here..."
                          defaultValue={checkpoint.notes || ''}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (checkpoint.notes || '')) {
                              addNoteToCheckpoint(path.id, checkpoint.id, val);
                            }
                          }}
                        />
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        {/* In-sheet video overlay */}
        <AnimatePresence>
          {playingVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-4 rounded-t-2xl"
            >
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium truncate flex-1 mr-2">{playingVideo.title}</p>
                <Button size="icon" variant="ghost" onClick={() => setPlayingVideo(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-black">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${playingVideo.videoId}?autoplay=1`}
                  title="YouTube"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
