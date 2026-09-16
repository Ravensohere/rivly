import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLearningPaths, getCheckpointVideoId, getCheckpointVideoTitle } from '@/hooks/useLearningPaths';
import { useRiva } from '@/hooks/useRiva';
import type { LearningPath, LearningCheckpoint, LearningResource, ResourceKind, ResourceSource } from '@/types/learningPath';
import {
  GraduationCap, Play, Check, ChevronRight, Clock, BookOpen,
  Code, Rocket, RefreshCw, X, ChevronDown, ChevronUp, Trash2,
  Plus, Mic, FileText, FileCode, FileCheck, ExternalLink, Wrench,
} from 'lucide-react';

const DIFF_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  advanced: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

const TYPE_ICON: Record<string, typeof BookOpen> = {
  theory: BookOpen,
  practice: Code,
  project: Rocket,
  revision: RefreshCw,
};

const TYPE_LABEL: Record<string, string> = {
  theory: 'Theory',
  practice: 'Practice',
  project: 'Project',
  revision: 'Revision',
};

const RESOURCE_KIND_ICON: Record<ResourceKind, typeof BookOpen> = {
  video: Play,
  article: FileText,
  doc: FileCode,
  pdf: FileCheck,
  course: GraduationCap,
  practice: Wrench,
};

const SOURCE_LABEL: Record<ResourceSource, string> = {
  youtube: 'YouTube',
  freecodecamp: 'freeCodeCamp',
  mdn: 'MDN',
  khanacademy: 'Khan Academy',
  ncert: 'NCERT',
  devto: 'dev.to',
  medium: 'Medium',
  coursera: 'Coursera',
  edx: 'edX',
  github: 'GitHub',
  'official-docs': 'Official Docs',
  google: 'Web',
  other: 'Web',
};

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────
export default function LearnPage() {
  const { paths, todayStudyPlan, getProgress, deletePath } = useLearningPaths();
  const { setIsCommandBarOpen } = useRiva();
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const selectedPath = useMemo(() => paths.find(p => p.id === selectedPathId), [paths, selectedPathId]);

  const hasActivePaths = paths.some(p => {
    const prog = getProgress(p.id);
    return prog.percent < 100;
  });

  return (
    <PageTransition
      className="flex flex-col flex-1 relative"
      style={{ minHeight: '100dvh', background: 'var(--gradient-calm)', paddingBottom: 'var(--nav-height)' }}
    >
      {/* Ambient bg */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <motion.div
          animate={{ scale: [1, 1.1, 1], x: [0, 12, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-10vw', right: '-10vw',
            width: '60vw', height: '60vw', maxWidth: '30rem', maxHeight: '30rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(180 40% 55% / 0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div className="grain-overlay" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div
          style={{
            background: 'hsl(var(--background) / 0.82)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            borderBottom: '1px solid hsl(var(--border) / 0.2)',
          }}
        >
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h1
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'hsl(var(--foreground))',
                }}
              >
                Learn
              </h1>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setIsCommandBarOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New Path
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-4 space-y-6">
        {/* ── Today's Study Plan ── */}
        {todayStudyPlan.length > 0 && (
          <section>
            <SectionLabel label="Today's Study" />
            <div className="space-y-2.5">
              {todayStudyPlan.map(({ path, checkpoints }) => (
                <TodayCard
                  key={path.id}
                  path={path}
                  checkpoints={checkpoints}
                  onOpenPath={() => setSelectedPathId(path.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── All Learning Paths ── */}
        {paths.length > 0 ? (
          <section>
            <SectionLabel label="Your Roadmaps" />
            <div className="space-y-3">
              {paths.map(p => (
                <PathCard
                  key={p.id}
                  path={p}
                  progress={getProgress(p.id)}
                  onOpen={() => setSelectedPathId(p.id)}
                  onDelete={() => deletePath(p.id)}
                />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState onAsk={() => setIsCommandBarOpen(true)} />
        )}
      </div>

      {/* ── Full Roadmap View (overlay) ── */}
      <AnimatePresence>
        {selectedPath && (
          <RoadmapView
            path={selectedPath}
            onClose={() => setSelectedPathId(null)}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

// ────────────────────────────────────────
// Section Label
// ────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 pl-0.5">
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, hsl(var(--border) / 0.5), transparent)' }} />
    </div>
  );
}

// ────────────────────────────────────────
// Today Card — shows what to study today
// ────────────────────────────────────────
function TodayCard({
  path,
  checkpoints,
  onOpenPath,
}: {
  path: LearningPath;
  checkpoints: LearningCheckpoint[];
  onOpenPath: () => void;
}) {
  const totalHours = checkpoints.reduce((s, c) => s + (c.estimatedHours || 1), 0);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full text-left rounded-2xl border p-4 transition-colors bg-card/80 border-primary/20 hover:border-primary/40"
      style={{ backdropFilter: 'blur(12px)' }}
      onClick={onOpenPath}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif" }}>
          {path.topic}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          ~{totalHours}h today
        </span>
      </div>
      <ul className="space-y-1.5">
        {checkpoints.map((cp) => {
          const TypeIcon = (cp.type && TYPE_ICON[cp.type]) || BookOpen;
          return (
            <li key={cp.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <TypeIcon className="w-3 h-3 flex-shrink-0 text-primary/60" />
              <span className="truncate">{cp.title}</span>
              {cp.estimatedHours && (
                <span className="ml-auto text-[0.65rem] opacity-60">{cp.estimatedHours}h</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-end mt-2 text-xs text-primary font-medium gap-1">
        Start studying <ChevronRight className="w-3 h-3" />
      </div>
    </motion.button>
  );
}

// ────────────────────────────────────────
// Path Card — overview of a learning path
// ────────────────────────────────────────
function PathCard({
  path,
  progress,
  onOpen,
  onDelete,
}: {
  path: LearningPath;
  progress: { completed: number; total: number; percent: number; hoursLeft: number };
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card/60 border-border/60 overflow-hidden"
      style={{ backdropFilter: 'blur(10px)' }}
    >
      <button className="w-full text-left p-4" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
              {path.topic}
            </h3>
            {path.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{path.description}</p>
            )}
          </div>
          {path.difficulty && (
            <span className={`text-[0.6rem] px-2 py-0.5 rounded-full border font-medium ${DIFF_COLORS[path.difficulty] || ''}`}>
              {path.difficulty}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress.percent} className="flex-1 h-1.5" />
          <span className="text-[0.65rem] text-muted-foreground whitespace-nowrap">
            {progress.completed}/{progress.total}
          </span>
        </div>
        {progress.hoursLeft > 0 && (
          <p className="text-[0.6rem] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            ~{progress.hoursLeft}h remaining
          </p>
        )}
      </button>
      <div className="flex items-center justify-between border-t border-border/40 px-4 py-2">
        <span className="text-[0.6rem] text-muted-foreground">
          {path.checkpoints.length} chapters
        </span>
        <button
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────
// Roadmap View — full overlay with chapters, videos, progress
// ────────────────────────────────────────
function RoadmapView({ path, onClose }: { path: LearningPath; onClose: () => void }) {
  const { markCheckpointComplete, uncheckCheckpoint, getProgress, addNoteToCheckpoint } = useLearningPaths();
  const progress = getProgress(path.id);
  const [playingVideo, setPlayingVideo] = useState<{ videoId: string; title: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border/30"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
          background: 'hsl(var(--background) / 0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex-1 min-w-0 mr-3">
          <h2
            className="text-base font-bold truncate"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {path.topic}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progress.percent} className="flex-1 h-1.5 max-w-[140px]" />
            <span className="text-[0.65rem] text-muted-foreground">
              {progress.percent}% done
            </span>
            {path.difficulty && (
              <span className={`text-[0.55rem] px-1.5 py-px rounded-full border font-medium ${DIFF_COLORS[path.difficulty] || ''}`}>
                {path.difficulty}
              </span>
            )}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Checkpoint list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {path.description && (
          <p className="text-xs text-muted-foreground mb-4 px-1">{path.description}</p>
        )}

        <div className="space-y-3">
          {path.checkpoints.map((cp, idx) => {
            const done = !!cp.completedAt;
            const expanded = expandedId === cp.id;
            const videoId = getCheckpointVideoId(cp);
            const videoTitle = getCheckpointVideoTitle(cp);
            const TypeIcon = (cp.type && TYPE_ICON[cp.type]) || BookOpen;

            return (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-xl border transition-colors ${
                  done
                    ? 'bg-primary/5 border-primary/15'
                    : 'bg-card/70 border-border/50'
                }`}
              >
                {/* Header row */}
                <button
                  className="w-full text-left p-3.5 flex items-start gap-3"
                  onClick={() => setExpandedId(expanded ? null : cp.id)}
                >
                  {/* Step number / check */}
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                        {cp.title}
                      </span>
                      {cp.type && (
                        <span className="inline-flex items-center gap-0.5 text-[0.55rem] text-muted-foreground bg-muted/50 px-1.5 py-px rounded-full">
                          <TypeIcon className="w-2.5 h-2.5" />
                          {TYPE_LABEL[cp.type]}
                        </span>
                      )}
                      {cp.difficulty && (
                        <span className={`text-[0.55rem] px-1.5 py-px rounded-full border ${DIFF_COLORS[cp.difficulty] || ''}`}>
                          {cp.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cp.description}</p>
                    {cp.estimatedHours && (
                      <span className="text-[0.6rem] text-muted-foreground/70 flex items-center gap-0.5 mt-1">
                        <Clock className="w-2.5 h-2.5" /> ~{cp.estimatedHours}h
                      </span>
                    )}
                  </div>

                  <div className="flex-shrink-0 pt-1">
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-3.5 pt-0 space-y-3">
                        {/* Resources (videos + articles + docs + …) */}
                        <ResourceList
                          checkpoint={cp}
                          fallbackVideoId={videoId}
                          fallbackVideoTitle={videoTitle}
                          onPlayVideo={(videoId, title) => setPlayingVideo({ videoId, title })}
                        />


                        {/* Notes */}
                        {cp.notes && (
                          <div>
                            <span className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Notes</span>
                            <p className="text-xs text-muted-foreground mt-1 bg-muted/30 rounded-lg p-2">{cp.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {done ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => uncheckCheckpoint(path.id, cp.id)}
                            >
                              Mark incomplete
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="text-xs"
                              onClick={() => markCheckpointComplete(path.id, cp.id)}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark done
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Video overlay */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-4"
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
    </motion.div>
  );
}

// ────────────────────────────────────────
// Resource List — videos + articles + docs + …
// ────────────────────────────────────────
function ResourceList({
  checkpoint,
  fallbackVideoId,
  fallbackVideoTitle,
  onPlayVideo,
}: {
  checkpoint: LearningCheckpoint;
  fallbackVideoId?: string;
  fallbackVideoTitle: string;
  onPlayVideo: (videoId: string, title: string) => void;
}) {
  // Prefer rich resources[]. Fall back to legacy videos[] / single video fields.
  const resources: LearningResource[] = useMemo(() => {
    if (checkpoint.resources && checkpoint.resources.length > 0) {
      return checkpoint.resources;
    }
    if (checkpoint.videos && checkpoint.videos.length > 0) {
      return checkpoint.videos.map((v) => ({
        kind: 'video' as const,
        source: 'youtube' as const,
        title: v.title,
        url: v.url,
        videoId: v.videoId,
      }));
    }
    if (fallbackVideoId) {
      return [{
        kind: 'video' as const,
        source: 'youtube' as const,
        title: fallbackVideoTitle,
        url: `https://www.youtube.com/watch?v=${fallbackVideoId}`,
        videoId: fallbackVideoId,
      }];
    }
    return [];
  }, [checkpoint, fallbackVideoId, fallbackVideoTitle]);

  if (resources.length === 0) return null;

  return (
    <div className="space-y-2">
      <span className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Resources</span>
      {resources.map((r, idx) => {
        const Icon = RESOURCE_KIND_ICON[r.kind] || BookOpen;
        const isVideo = r.kind === 'video' && r.videoId;
        const sourceLabel = SOURCE_LABEL[r.source] || 'Web';

        const inner = (
          <>
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs line-clamp-2">{r.title}</p>
              <p className="text-[0.6rem] text-muted-foreground mt-0.5 flex items-center gap-1">
                <span>{sourceLabel}</span>
                {!isVideo && <ExternalLink className="w-2.5 h-2.5" />}
              </p>
            </div>
          </>
        );

        if (isVideo) {
          return (
            <button
              key={`${r.url}-${idx}`}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              onClick={() => onPlayVideo(r.videoId!, r.title)}
            >
              {inner}
            </button>
          );
        }

        return (
          <a
            key={`${r.url}-${idx}`}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-left"
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────
// Empty State
// ────────────────────────────────────────
function EmptyState({ onAsk }: { onAsk: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center pt-20 px-6"
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <GraduationCap className="w-7 h-7 text-primary" />
      </div>
      <h2
        className="text-lg font-bold mb-2"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Start learning something new
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
        Tell Riva what you want to learn and she'll create a curated roadmap with the best YouTube videos for you.
      </p>
      <Button onClick={onAsk} className="gap-2">
        <Mic className="w-4 h-4" />
        Ask Riva
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        Try: "I want to learn React" or "Teach me Python"
      </p>
    </motion.div>
  );
}
