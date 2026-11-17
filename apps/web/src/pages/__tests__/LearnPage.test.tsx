/**
 * LearnPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: learn (redesign pipeline, Task 4). Route `/learn`, protected in
 * AnimatedRoutes.tsx (confirmed: AnimatedRoutes.tsx:23 lazy import, :99 the
 * `user ? <LearnPage /> : <Navigate to="/login" />` route).
 *
 * Content-claim check: the landing page (`LandingPage.tsx`) makes no marketing
 * claim about a "Learn" feature (grepped — no hits), so there is no
 * advertised-vs-real cross-check to run here, unlike the landscape card.
 * The one page-local claim worth checking is the empty-state copy ("she'll
 * create a curated roadmap with the best YouTube videos for you") — traced to
 * `useRivaLogic.ts`'s `create_learning_path` action (real AI-planned
 * checkpoints with real `resources`/`videos` arrays) and the `replace_video`
 * edit action's real `api.riva.searchVideo()` call. This is marketing framing
 * ("curated", "best") over a genuinely-implemented AI-planning + video-search
 * mechanism, not a fabricated statistic — there is no further claim here to
 * verify the way the Problem section's uncited research stats needed
 * verification; "best" is normal subjective product copy, not a checkable
 * research claim.
 *
 * `useLearningPaths` and `useRiva` are mocked so these tests exercise
 * LearnPage's own container logic (today's-study-plan rendering, path-card
 * progress, roadmap overlay open/close, checkpoint expand/complete, resource
 * list rendering incl. legacy-video fallback, video-overlay playback) against
 * real mocked hook data — matching the established pattern from
 * LandscapePage.test.tsx for this pipeline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/hooks/useLearningPaths', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useLearningPaths')>('@/hooks/useLearningPaths');
  return {
    ...actual,
    useLearningPaths: vi.fn(),
  };
});
vi.mock('@/hooks/useRiva', () => ({ useRiva: vi.fn() }));

import LearnPage from '@/pages/LearnPage';
import { useLearningPaths } from '@/hooks/useLearningPaths';
import { useRiva } from '@/hooks/useRiva';
import type { LearningPath, LearningCheckpoint } from '@/types/learningPath';

function checkpoint(overrides: Partial<LearningCheckpoint> = {}): LearningCheckpoint {
  return {
    id: 'cp-1',
    title: 'React Hooks',
    description: 'Learn useState and useEffect',
    estimatedHours: 1,
    type: 'theory',
    difficulty: 'beginner',
    ...overrides,
  };
}

function path(overrides: Partial<LearningPath> = {}): LearningPath {
  return {
    id: 'path-1',
    topic: 'React',
    createdAt: new Date().toISOString(),
    checkpoints: [checkpoint()],
    ...overrides,
  };
}

function setupLearningPathsMock({
  paths = [] as LearningPath[],
  todayStudyPlan = [] as { path: LearningPath; checkpoints: LearningCheckpoint[] }[],
  progressByPath = {} as Record<string, { completed: number; total: number; percent: number; hoursLeft: number }>,
} = {}) {
  const deletePath = vi.fn();
  const markCheckpointComplete = vi.fn();
  const uncheckCheckpoint = vi.fn();
  const addNoteToCheckpoint = vi.fn();
  const getProgress = vi.fn((pathId: string) => progressByPath[pathId] || { completed: 0, total: 1, percent: 0, hoursLeft: 1 });

  (useLearningPaths as any).mockReturnValue({
    paths,
    todayStudyPlan,
    getProgress,
    deletePath,
    markCheckpointComplete,
    uncheckCheckpoint,
    addNoteToCheckpoint,
  });

  return { deletePath, markCheckpointComplete, uncheckCheckpoint, getProgress };
}

function setupRivaMock() {
  const setIsCommandBarOpen = vi.fn();
  (useRiva as any).mockReturnValue({ setIsCommandBarOpen });
  return { setIsCommandBarOpen };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LearnPage — empty state (no real paths)', () => {
  it('shows the empty-state copy and "Ask Riva" CTA when there are no learning paths', () => {
    setupLearningPathsMock({ paths: [] });
    const { setIsCommandBarOpen } = setupRivaMock();

    render(<LearnPage />);

    expect(screen.getByText('Start learning something new')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ask Riva'));
    expect(setIsCommandBarOpen).toHaveBeenCalledWith(true);
  });

  it('does not render "Your Roadmaps" section when there are no paths', () => {
    setupLearningPathsMock({ paths: [] });
    setupRivaMock();

    render(<LearnPage />);

    expect(screen.queryByText('Your Roadmaps')).not.toBeInTheDocument();
  });
});

describe('LearnPage — today\'s study plan (real hook data)', () => {
  it('renders today\'s checkpoints per path when todayStudyPlan is non-empty', () => {
    const p = path({ id: 'p1', topic: 'React' });
    const cp = checkpoint({ id: 'cp1', title: 'React Hooks', estimatedHours: 2 });
    setupLearningPathsMock({ paths: [p], todayStudyPlan: [{ path: p, checkpoints: [cp] }] });
    setupRivaMock();

    render(<LearnPage />);

    expect(screen.getByText("Today's Study")).toBeInTheDocument();
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('~2h today')).toBeInTheDocument();
  });

  it('opens the roadmap overlay for that path when the today-card is clicked', () => {
    const p = path({ id: 'p1', topic: 'React Basics' });
    const cp = checkpoint({ id: 'cp1', title: 'React Hooks' });
    setupLearningPathsMock({ paths: [p], todayStudyPlan: [{ path: p, checkpoints: [cp] }] });
    setupRivaMock();

    render(<LearnPage />);

    fireEvent.click(screen.getByText('Start studying'));
    // RoadmapView renders the path topic as an <h2> (PathCard's own <h3> also
    // shares the name, so disambiguate by heading level).
    expect(screen.getByRole('heading', { level: 2, name: 'React Basics' })).toBeInTheDocument();
  });
});

describe('LearnPage — roadmap list & progress (real getProgress data)', () => {
  it('renders a path card with its real progress fraction, not a hardcoded value', () => {
    const p = path({ id: 'p1', topic: 'Python', checkpoints: [checkpoint(), checkpoint({ id: 'cp2' })] });
    setupLearningPathsMock({
      paths: [p],
      progressByPath: { p1: { completed: 1, total: 2, percent: 50, hoursLeft: 3 } },
    });
    setupRivaMock();

    render(<LearnPage />);

    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('~3h remaining')).toBeInTheDocument();
    expect(screen.getByText('2 chapters')).toBeInTheDocument();
  });

  it('deletes the path via the real deletePath call without opening the roadmap (stopPropagation)', () => {
    const p = path({ id: 'p1', topic: 'Python' });
    const { deletePath } = setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);

    const deleteBtn = screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-trash2'))!;
    fireEvent.click(deleteBtn);

    expect(deletePath).toHaveBeenCalledWith('p1');
    // stopPropagation on the delete button means the card's own onOpen never
    // fires, so no <h2> roadmap-overlay heading should appear (the card's own
    // <h3> is unaffected since deletePath is a mock and doesn't re-render).
    expect(screen.queryByRole('heading', { level: 2, name: 'Python' })).not.toBeInTheDocument();
  });

  it('opens the roadmap overlay when a path card is clicked', () => {
    const p = path({ id: 'p1', topic: 'Python' });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);

    fireEvent.click(screen.getByText('Python'));
    expect(screen.getByRole('heading', { level: 2, name: 'Python' })).toBeInTheDocument();
  });
});

describe('LearnPage — roadmap overlay interactions (real checkpoint actions)', () => {
  it('closes the overlay via the close button', async () => {
    const p = path({ id: 'p1', topic: 'Python' });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);
    fireEvent.click(screen.getByText('Python'));
    expect(screen.getByRole('heading', { level: 2, name: 'Python' })).toBeInTheDocument();

    const closeBtn = screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-x'))!;
    fireEvent.click(closeBtn);
    // AnimatePresence runs an exit transition before unmounting, so the
    // removal is asynchronous even though the state update is synchronous.
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Python' })).not.toBeInTheDocument();
    });
  });

  it('expands a checkpoint and marks it complete via the real markCheckpointComplete call', () => {
    const cp = checkpoint({ id: 'cp1', title: 'React Hooks' });
    const p = path({ id: 'p1', topic: 'React', checkpoints: [cp] });
    const { markCheckpointComplete } = setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);
    fireEvent.click(screen.getByText('React'));
    fireEvent.click(screen.getByText('React Hooks'));

    const markDoneBtn = screen.getByText('Mark done');
    fireEvent.click(markDoneBtn);
    expect(markCheckpointComplete).toHaveBeenCalledWith('p1', 'cp1');
  });

  it('shows "Mark incomplete" and calls uncheckCheckpoint for an already-completed checkpoint', () => {
    const cp = checkpoint({ id: 'cp1', title: 'React Hooks', completedAt: new Date().toISOString() });
    const p = path({ id: 'p1', topic: 'React', checkpoints: [cp] });
    const { uncheckCheckpoint } = setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);
    fireEvent.click(screen.getByText('React'));
    fireEvent.click(screen.getByText('React Hooks'));

    fireEvent.click(screen.getByText('Mark incomplete'));
    expect(uncheckCheckpoint).toHaveBeenCalledWith('p1', 'cp1');
  });
});

describe('LearnPage — resource list (real resources, legacy fallback)', () => {
  it('renders rich resources[] and opens the video overlay with the real videoId when a video resource is clicked', () => {
    const cp = checkpoint({
      id: 'cp1',
      title: 'React Hooks',
      resources: [
        { kind: 'video', source: 'youtube', title: 'Hooks Crash Course', url: 'https://youtube.com/watch?v=abc123', videoId: 'abc123' },
        { kind: 'article', source: 'mdn', title: 'Using Hooks', url: 'https://mdn.io/hooks' },
      ],
    });
    const p = path({ id: 'p1', topic: 'React', checkpoints: [cp] });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);
    fireEvent.click(screen.getByText('React'));
    fireEvent.click(screen.getByText('React Hooks'));

    expect(screen.getByText('Hooks Crash Course')).toBeInTheDocument();
    expect(screen.getByText('Using Hooks')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hooks Crash Course'));
    const iframe = screen.getByTitle('YouTube') as HTMLIFrameElement;
    expect(iframe.src).toContain('abc123');
  });

  it('falls back to the legacy videoId field when resources[] and videos[] are both absent', () => {
    const cp = checkpoint({
      id: 'cp1',
      title: 'React Hooks',
      resources: undefined,
      videos: undefined,
      videoId: 'legacy123',
      videoTitle: 'Legacy Hooks Video',
    });
    const p = path({ id: 'p1', topic: 'React', checkpoints: [cp] });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);
    fireEvent.click(screen.getByText('React'));
    fireEvent.click(screen.getByText('React Hooks'));

    fireEvent.click(screen.getByText('Legacy Hooks Video'));
    const iframe = screen.getByTitle('YouTube') as HTMLIFrameElement;
    expect(iframe.src).toContain('legacy123');
  });
});

describe('LearnPage — contrast fix (recurring text-muted-foreground-on-background defect)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';

  it('the "Your Roadmaps" section label uses the AA-passing muted color, not the inline var(--muted-foreground) style', () => {
    const p = path({ id: 'p1', topic: 'React' });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);

    const node = screen.getByText('Your Roadmaps');
    expect(node.style.color).not.toBe('hsl(var(--muted-foreground))');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the empty-state body paragraph uses the AA-passing muted color, not the failing shared token', () => {
    setupLearningPathsMock({ paths: [] });
    setupRivaMock();

    render(<LearnPage />);

    const node = screen.getByText(/create a curated roadmap/);
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the roadmap overlay description paragraph uses the AA-passing muted color', () => {
    const p = path({ id: 'p1', topic: 'React', description: 'A focused path through React fundamentals.' });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);
    fireEvent.click(screen.getByText('React'));

    // The PathCard (still mounted behind the overlay) renders the same
    // description text in a line-clamp-1 paragraph — target the overlay's
    // own (non-line-clamped) copy specifically.
    const node = screen.getAllByText('A focused path through React fundamentals.')
      .find((n) => !n.className.includes('line-clamp-1'))!;
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the path-card description paragraph uses the AA-passing muted color (bg-card/60 composite failed at ~4.48:1)', () => {
    const p = path({ id: 'p1', topic: 'React', description: 'Short blurb.' });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);

    const node = screen.getByText('Short blurb.');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the checkpoint estimated-hours text no longer uses the severely-failing opacity-reduced muted color', () => {
    const cp = checkpoint({ id: 'cp1', title: 'React Hooks', estimatedHours: 3 });
    const p = path({ id: 'p1', topic: 'React', checkpoints: [cp] });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);
    fireEvent.click(screen.getByText('React'));
    fireEvent.click(screen.getByText('React Hooks'));

    const node = screen.getByText('~3h');
    expect(node.className).not.toContain('text-muted-foreground/70');
  });

  // Fix round 2 (coordinator review): TodayCard's "~Nh today" label and its
  // per-checkpoint <li> were left unfixed on the theory that bg-card/80
  // computed to ~4.51:1 (just passing). A reviewer recomputed the real
  // 3-stop --gradient-calm backdrop (not a flat color) at ~4.50-4.52:1 —
  // part of that range genuinely fails — so these are fixed too, for
  // consistency with the other 15 sites in this file.
  it('the TodayCard "~Nh today" label uses the AA-passing muted color', () => {
    const p = path({ id: 'p1', topic: 'React' });
    const cp = checkpoint({ id: 'cp1', title: 'React Hooks', estimatedHours: 2 });
    setupLearningPathsMock({ paths: [p], todayStudyPlan: [{ path: p, checkpoints: [cp] }] });
    setupRivaMock();

    render(<LearnPage />);

    const node = screen.getByText('~2h today');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the TodayCard per-checkpoint list item uses the AA-passing muted color', () => {
    const p = path({ id: 'p1', topic: 'React' });
    const cp = checkpoint({ id: 'cp1', title: 'React Hooks', estimatedHours: 2 });
    setupLearningPathsMock({ paths: [p], todayStudyPlan: [{ path: p, checkpoints: [cp] }] });
    setupRivaMock();

    render(<LearnPage />);

    const li = screen.getByText('React Hooks').closest('li')!;
    expect(li.className).not.toContain('text-muted-foreground');
    expect(li.className).toContain(FIXED_MUTED);
  });

  // Fix round 2: this site stacked opacity-60 on top of the inherited
  // muted-foreground color, compounding an already-borderline contrast down
  // to ~2.25:1 (reviewer-computed) — the same severely-failing category as
  // the /70-opacity checkpoint-hours case above. Swapping just the color
  // while keeping opacity-60 still computes to ~2.49:1 (fails), so the
  // opacity is dropped entirely, not just the color swapped.
  it('the TodayCard checkpoint estimated-hours span no longer stacks opacity-60 on the muted color', () => {
    const p = path({ id: 'p1', topic: 'React' });
    const cp = checkpoint({ id: 'cp1', title: 'React Hooks', estimatedHours: 2 });
    setupLearningPathsMock({ paths: [p], todayStudyPlan: [{ path: p, checkpoints: [cp] }] });
    setupRivaMock();

    render(<LearnPage />);

    const node = screen.getByText('2h');
    expect(node.className).not.toContain('opacity-60');
  });

  // Whole-branch review (fix wave) found that the className-string-matching
  // tests above can't catch a same-value regression: dark:55% is
  // byte-identical to the broken shared --muted-foreground token, so a test
  // that only asserts "not the raw token string" would pass even though the
  // rendered color still fails AA against a solid --muted/--secondary
  // background. This test computes a real WCAG contrast ratio instead, as a
  // template for future cards to copy.
  it('[ratio-computed] the step-number badge text clears the WCAG AA 4.5:1 floor against bg-muted in dark mode', () => {
    function parseHsl(hsl: string): [number, number, number] {
      const m = hsl.match(/hsl\(\s*([-\d.]+)[,\s]+([-\d.]+)%[,\s]+([-\d.]+)%\s*\)/);
      if (!m) throw new Error(`not an hsl() string: ${hsl}`);
      return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
    }
    function hslToRgb(h: number, s: number, l: number): [number, number, number] {
      s /= 100; l /= 100;
      const k = (n: number) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [255 * f(0), 255 * f(8), 255 * f(4)];
    }
    function relativeLuminance([r, g, b]: [number, number, number]): number {
      const [rs, gs, bs] = [r, g, b].map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    function contrastRatio(hslA: string, hslB: string): number {
      const lA = relativeLuminance(hslToRgb(...parseHsl(hslA)));
      const lB = relativeLuminance(hslToRgb(...parseHsl(hslB)));
      const lighter = Math.max(lA, lB);
      const darker = Math.min(lA, lB);
      return (lighter + 0.05) / (darker + 0.05);
    }

    const p = path({
      id: 'p1',
      topic: 'React',
      checkpoints: [checkpoint({ id: 'cp1', title: 'Badge Contrast Checkpoint' })],
    });
    setupLearningPathsMock({ paths: [p] });
    setupRivaMock();

    render(<LearnPage />);
    fireEvent.click(screen.getByText('React'));

    const badge = screen.getByText('Badge Contrast Checkpoint')
      .closest('button')!
      .querySelector('div.bg-muted')!;
    const darkColorMatch = badge.className.match(/dark:text-\[(hsl\([^\]]+\))\]/);
    expect(darkColorMatch).toBeTruthy();
    const textColorDark = darkColorMatch![1];

    // Known value from src/index.css's `.dark` block: `--muted: 230 18% 15%`.
    const mutedBackgroundDark = 'hsl(230, 18%, 15%)';

    const ratio = contrastRatio(textColorDark, mutedBackgroundDark);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
