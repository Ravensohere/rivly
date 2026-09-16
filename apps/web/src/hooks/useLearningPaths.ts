import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LearningPath, LearningCheckpoint, LearningVideo } from '@/types/learningPath';

const STORAGE_KEY = 'rivly_learning_paths_v1';
// Each useLearningPaths() call has its own state; this event keeps all
// instances in sync so a path added by Riva shows up everywhere immediately.
const PATHS_CHANGED_EVENT = 'vivly:learning-paths-changed';

function loadPaths(): LearningPath[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePaths(paths: LearningPath[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
    // Deferred so the dispatch never runs inside a React state updater
    setTimeout(() => window.dispatchEvent(new CustomEvent(PATHS_CHANGED_EVENT)), 0);
  } catch (e) {
    console.error('[useLearningPaths] save failed', e);
  }
}

/** Get the primary videoId from a checkpoint (backward compat) */
export function getCheckpointVideoId(c: LearningCheckpoint): string | undefined {
  return c.videos?.[0]?.videoId || c.videoId;
}

export function getCheckpointVideoTitle(c: LearningCheckpoint): string {
  return c.videos?.[0]?.title || c.videoTitle || c.title;
}

/**
 * Find a checkpoint from a spoken title like "the hooks chapter".
 * Tries exact, then substring, then any shared word — widest last so a precise
 * phrase never loses to a loose one.
 */
export function findCheckpointByTitle(
  path: LearningPath | undefined,
  titleQuery: string
): LearningCheckpoint | undefined {
  if (!path || !titleQuery) return undefined;
  const query = titleQuery.toLowerCase().trim();
  if (!query) return undefined;

  const exact = path.checkpoints.find((c) => c.title.toLowerCase() === query);
  if (exact) return exact;

  const partial = path.checkpoints.find((c) => c.title.toLowerCase().includes(query));
  if (partial) return partial;

  // Ignore filler words so "the hooks chapter" matches "React Hooks".
  const stopWords = new Set(['the', 'a', 'an', 'chapter', 'section', 'module', 'part', 'on', 'of', 'for']);
  const words = query.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));

  return path.checkpoints.find((c) => {
    const title = c.title.toLowerCase();
    return words.some((word) => title.includes(word));
  });
}

/** Resolve a checkpoint id from either an explicit id or a spoken title. */
function resolveCheckpointId(
  path: LearningPath | undefined,
  checkpointId?: string,
  checkpointTitle?: string
): string | undefined {
  if (!path) return undefined;
  if (checkpointId && path.checkpoints.some((c) => c.id === checkpointId)) return checkpointId;
  if (checkpointTitle) return findCheckpointByTitle(path, checkpointTitle)?.id;
  return undefined;
}

export function useLearningPaths() {
  const [paths, setPaths] = useState<LearningPath[]>([]);

  useEffect(() => {
    setPaths(loadPaths());
    const sync = () => setPaths(loadPaths());
    window.addEventListener(PATHS_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync); // cross-tab sync
    return () => {
      window.removeEventListener(PATHS_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const addPath = useCallback((
    topic: string,
    checkpoints: (Omit<LearningCheckpoint, 'id' | 'completedAt'> & { id?: string })[],
    meta?: Partial<Pick<LearningPath, 'description' | 'difficulty' | 'totalEstimatedHours' | 'category'>>
  ) => {
    const pathId = crypto.randomUUID();
    const path: LearningPath = {
      id: pathId,
      topic,
      createdAt: new Date().toISOString(),
      ...meta,
      checkpoints: checkpoints.map((c) => ({
        ...c,
        id: c.id ?? crypto.randomUUID(),
      })),
    };
    setPaths((prev) => {
      const next = [path, ...prev];
      savePaths(next);
      return next;
    });
    return pathId;
  }, []);

  const markCheckpointComplete = useCallback((pathId: string, checkpointId: string) => {
    setPaths((prev) => {
      const next = prev.map((p) => {
        if (p.id !== pathId) return p;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          checkpoints: p.checkpoints.map((c) =>
            c.id === checkpointId ? { ...c, completedAt: new Date().toISOString() } : c
          ),
        };
      });
      savePaths(next);
      return next;
    });
  }, []);

  const uncheckCheckpoint = useCallback((pathId: string, checkpointId: string) => {
    setPaths((prev) => {
      const next = prev.map((p) => {
        if (p.id !== pathId) return p;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          checkpoints: p.checkpoints.map((c) =>
            c.id === checkpointId ? { ...c, completedAt: undefined } : c
          ),
        };
      });
      savePaths(next);
      return next;
    });
  }, []);

  const getPath = useCallback(
    (pathId: string) => paths.find((p) => p.id === pathId),
    [paths]
  );

  const deletePath = useCallback((pathId: string) => {
    setPaths((prev) => {
      const next = prev.filter((p) => p.id !== pathId);
      savePaths(next);
      return next;
    });
  }, []);

  const addNoteToCheckpoint = useCallback((pathId: string, checkpointId: string, note: string) => {
    setPaths((prev) => {
      const next = prev.map((p) => {
        if (p.id !== pathId) return p;
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          checkpoints: p.checkpoints.map((c) =>
            c.id === checkpointId ? { ...c, notes: note } : c
          ),
        };
      });
      savePaths(next);
      return next;
    });
  }, []);

  // ── Voice-driven editing ──
  // Riva calls these with either a checkpoint id or a spoken title, so each one
  // resolves the target itself and no-ops when it cannot find a match.

  /** Apply a transform to one path, stamping updatedAt and persisting. */
  const mutatePath = useCallback(
    (pathId: string, transform: (path: LearningPath) => LearningPath | null) => {
      setPaths((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          if (p.id !== pathId) return p;
          const result = transform(p);
          if (!result) return p;
          changed = true;
          return { ...result, updatedAt: new Date().toISOString() };
        });
        if (!changed) return prev;
        savePaths(next);
        return next;
      });
    },
    []
  );

  const addCheckpointToPath = useCallback(
    (pathId: string, title: string, description = '', afterCheckpointId?: string) => {
      if (!title?.trim()) return;
      mutatePath(pathId, (path) => {
        const checkpoint: LearningCheckpoint = {
          id: crypto.randomUUID(),
          title: title.trim(),
          description: description?.trim() || '',
        };
        const checkpoints = [...path.checkpoints];
        const afterIndex = afterCheckpointId
          ? checkpoints.findIndex((c) => c.id === afterCheckpointId)
          : -1;

        if (afterIndex >= 0) checkpoints.splice(afterIndex + 1, 0, checkpoint);
        else checkpoints.push(checkpoint);

        return { ...path, checkpoints };
      });
    },
    [mutatePath]
  );

  const removeCheckpointFromPath = useCallback(
    (pathId: string, checkpointId?: string, checkpointTitle?: string) => {
      mutatePath(pathId, (path) => {
        const id = resolveCheckpointId(path, checkpointId, checkpointTitle);
        if (!id) return null;
        return { ...path, checkpoints: path.checkpoints.filter((c) => c.id !== id) };
      });
    },
    [mutatePath]
  );

  const reorderCheckpoint = useCallback(
    (pathId: string, checkpointId: string, newPosition: number) => {
      mutatePath(pathId, (path) => {
        const from = path.checkpoints.findIndex((c) => c.id === checkpointId);
        if (from < 0) return null;

        // Spoken positions are 1-based ("move it to number three").
        const target = Number.isFinite(newPosition) ? Math.trunc(newPosition) : NaN;
        if (Number.isNaN(target)) return null;
        const to = Math.max(0, Math.min(path.checkpoints.length - 1, target - 1));
        if (to === from) return null;

        const checkpoints = [...path.checkpoints];
        const [moved] = checkpoints.splice(from, 1);
        checkpoints.splice(to, 0, moved);
        return { ...path, checkpoints };
      });
    },
    [mutatePath]
  );

  const renameCheckpoint = useCallback(
    (pathId: string, checkpointId: string | undefined, oldTitle: string | undefined, newTitle: string) => {
      if (!newTitle?.trim()) return;
      mutatePath(pathId, (path) => {
        const id = resolveCheckpointId(path, checkpointId, oldTitle);
        if (!id) return null;
        return {
          ...path,
          checkpoints: path.checkpoints.map((c) =>
            c.id === id ? { ...c, title: newTitle.trim() } : c
          ),
        };
      });
    },
    [mutatePath]
  );

  const updateCheckpointDescription = useCallback(
    (pathId: string, checkpointId: string | undefined, checkpointTitle: string | undefined, newDescription: string) => {
      mutatePath(pathId, (path) => {
        const id = resolveCheckpointId(path, checkpointId, checkpointTitle);
        if (!id) return null;
        return {
          ...path,
          checkpoints: path.checkpoints.map((c) =>
            c.id === id ? { ...c, description: newDescription ?? '' } : c
          ),
        };
      });
    },
    [mutatePath]
  );

  const replaceCheckpointVideo = useCallback(
    (pathId: string, checkpointId: string | undefined, checkpointTitle: string | undefined, videos: LearningVideo[]) => {
      if (!videos?.length) return;
      mutatePath(pathId, (path) => {
        const id = resolveCheckpointId(path, checkpointId, checkpointTitle);
        if (!id) return null;
        const primary = videos[0];
        return {
          ...path,
          checkpoints: path.checkpoints.map((c) =>
            c.id === id
              ? {
                  ...c,
                  videos,
                  // Keep the legacy single-video fields aligned so older
                  // rendering paths show the new pick too.
                  videoId: primary.videoId,
                  videoTitle: primary.title,
                  url: primary.url,
                }
              : c
          ),
        };
      });
    },
    [mutatePath]
  );

  const splitCheckpoint = useCallback(
    (pathId: string, checkpointId: string | undefined, checkpointTitle: string | undefined, into: string[]) => {
      const titles = (into || []).map((t) => t?.trim()).filter(Boolean) as string[];
      if (titles.length < 2) return;

      mutatePath(pathId, (path) => {
        const id = resolveCheckpointId(path, checkpointId, checkpointTitle);
        if (!id) return null;
        const index = path.checkpoints.findIndex((c) => c.id === id);
        if (index < 0) return null;

        const original = path.checkpoints[index];
        // Split the original estimate across the parts rather than multiplying it.
        const hoursEach = original.estimatedHours
          ? Math.round((original.estimatedHours / titles.length) * 10) / 10
          : undefined;

        const parts: LearningCheckpoint[] = titles.map((title) => ({
          id: crypto.randomUUID(),
          title,
          description: original.description,
          estimatedHours: hoursEach,
          type: original.type,
          difficulty: original.difficulty,
        }));

        const checkpoints = [...path.checkpoints];
        checkpoints.splice(index, 1, ...parts);
        return { ...path, checkpoints };
      });
    },
    [mutatePath]
  );

  const mergeCheckpoints = useCallback(
    (pathId: string, checkpointIds?: string[], checkpointTitles?: string[], mergedTitle?: string) => {
      mutatePath(pathId, (path) => {
        const ids = new Set<string>();
        for (const id of checkpointIds || []) {
          if (path.checkpoints.some((c) => c.id === id)) ids.add(id);
        }
        for (const title of checkpointTitles || []) {
          const found = findCheckpointByTitle(path, title);
          if (found) ids.add(found.id);
        }
        if (ids.size < 2) return null;

        const targets = path.checkpoints.filter((c) => ids.has(c.id));
        const firstIndex = path.checkpoints.findIndex((c) => ids.has(c.id));

        const merged: LearningCheckpoint = {
          id: crypto.randomUUID(),
          title: mergedTitle?.trim() || targets.map((c) => c.title).join(' & '),
          description: targets.map((c) => c.description).filter(Boolean).join(' '),
          estimatedHours: targets.reduce((sum, c) => sum + (c.estimatedHours || 0), 0) || undefined,
          type: targets[0].type,
          difficulty: targets[0].difficulty,
          videos: targets.flatMap((c) => c.videos || []),
          notes: targets.map((c) => c.notes).filter(Boolean).join('\n') || undefined,
        };

        const checkpoints = path.checkpoints.filter((c) => !ids.has(c.id));
        checkpoints.splice(firstIndex, 0, merged);
        return { ...path, checkpoints };
      });
    },
    [mutatePath]
  );

  const updatePathMetadata = useCallback(
    (pathId: string, updates: Partial<Omit<LearningPath, 'id' | 'checkpoints' | 'createdAt'>>) => {
      mutatePath(pathId, (path) => ({ ...path, ...updates }));
    },
    [mutatePath]
  );

  // ── Daily study allocation ──
  // Returns the next incomplete checkpoints the user should study today
  // Aim for ~2 hours of study per day
  const getTodayCheckpoints = useCallback((pathId: string, dailyHours = 2): LearningCheckpoint[] => {
    const path = paths.find((p) => p.id === pathId);
    if (!path) return [];

    const remaining = path.checkpoints.filter((c) => !c.completedAt);
    if (remaining.length === 0) return [];

    const result: LearningCheckpoint[] = [];
    let hoursAccum = 0;

    for (const cp of remaining) {
      const h = cp.estimatedHours || 1;
      if (hoursAccum + h > dailyHours && result.length > 0) break;
      result.push(cp);
      hoursAccum += h;
    }

    return result;
  }, [paths]);

  // ── Progress helpers ──
  const getProgress = useCallback((pathId: string) => {
    const path = paths.find((p) => p.id === pathId);
    if (!path || path.checkpoints.length === 0) return { completed: 0, total: 0, percent: 0, hoursLeft: 0 };
    const completed = path.checkpoints.filter((c) => c.completedAt).length;
    const total = path.checkpoints.length;
    const hoursLeft = path.checkpoints
      .filter((c) => !c.completedAt)
      .reduce((sum, c) => sum + (c.estimatedHours || 1), 0);
    return { completed, total, percent: Math.round((completed / total) * 100), hoursLeft };
  }, [paths]);

  // Across all paths: what should the user study today?
  const todayStudyPlan = useMemo(() => {
    const plan: { path: LearningPath; checkpoints: LearningCheckpoint[] }[] = [];
    for (const p of paths) {
      const remaining = p.checkpoints.filter((c) => !c.completedAt);
      if (remaining.length === 0) continue;
      // Pick next 1-2 checkpoints per path (~2 hours)
      const today: LearningCheckpoint[] = [];
      let hours = 0;
      for (const cp of remaining) {
        const h = cp.estimatedHours || 1;
        if (hours + h > 2 && today.length > 0) break;
        today.push(cp);
        hours += h;
      }
      if (today.length > 0) {
        plan.push({ path: p, checkpoints: today });
      }
    }
    return plan;
  }, [paths]);

  return {
    paths,
    addPath,
    markCheckpointComplete,
    uncheckCheckpoint,
    getPath,
    deletePath,
    addNoteToCheckpoint,
    getTodayCheckpoints,
    getProgress,
    todayStudyPlan,
    // Voice-driven editing
    findCheckpointByTitle,
    addCheckpointToPath,
    removeCheckpointFromPath,
    reorderCheckpoint,
    renameCheckpoint,
    updateCheckpointDescription,
    replaceCheckpointVideo,
    splitCheckpoint,
    mergeCheckpoints,
    updatePathMetadata,
  };
}
