/**
 * ReflectAndJournalPage.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Card: reflect-and-journal (redesign pipeline, Task 4).
 *
 * ReflectAndJournalPage is the single component behind TWO routes in
 * AnimatedRoutes.tsx: `/reflect` and `/journal` (both protected, both
 * `user ? <ReflectAndJournalPage /> : <Navigate to="/login" replace />`).
 * `JournalPage.tsx`/`ReflectionPage.tsx` are confirmed-dead code per
 * `_inventory.md` — this file is the only one in scope.
 *
 * The page's own container logic: a 3-way tab switcher (Reflect/Journal/
 * Thoughts) driven by the `?tab=` query param, a guest-lock overlay, and the
 * Journal tab's own search/filter/list/editor wiring (via the real
 * `useJournal` hook contract, mocked here). The three tab bodies
 * (`CloseYourDay`, `ThoughtsTab`) and the `JournalEditor`/`JournalEntryCard`
 * children are shallow-stubbed — each is either out of this card's scope
 * (no individual card exists for them) or, for JournalEditor/JournalEntryCard,
 * private to this page with no behavior of their own worth re-testing here.
 *
 * Most assertions below are a baseline-contract lock: they pass against the
 * *original*, unmodified component (confirmed in the RED run) and continue to
 * pass after the redesign-pipeline changes (contrast fixes only, no behavior
 * change). One group is a genuine pre-existing bug fix, called out explicitly
 * below, and is expected to FAIL against the original code:
 *
 *   "navigating directly to /journal (no ?tab= param) shows the Journal tab"
 *
 * Audit finding: `initialTab = searchParams.get('tab') || 'reflect'` ignores
 * the route pathname entirely, so the `/journal` route — which exists
 * specifically as an alternate URL for the Journal tab (per `_inventory.md`'s
 * "JournalPage.tsx redundant; ReflectAndJournalPage handles both /journal and
 * /reflect routes") — actually lands on the Reflect tab unless `?tab=journal`
 * is also present. Every real in-app navigation already passes `?tab=journal`
 * explicitly (`useRivaLogic.ts`, `FloatingActionButton.tsx` both navigate to
 * `/reflect?tab=journal`, never bare `/journal`), so this bug is latent —
 * only a direct nav/bookmark to bare `/journal` hits it — but it is a real
 * mismatch between the route's name and what it shows, squarely in this
 * card's "check both route behaviors work correctly" brief. Fixed by
 * defaulting the initial tab from `location.pathname` when no `?tab=` is
 * present.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Hooks / contexts (module mocks; configured per-test) ────────────────────
vi.mock('@/hooks/useJournal', () => ({ useJournal: vi.fn() }));
vi.mock('@/hooks/useParkedThoughts', () => ({ useParkedThoughts: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: vi.fn() }));

// ── Child components — shallow stubs so this file tests the page's OWN
//    tab-switching / guest-lock / journal-list container logic ─────────────
vi.mock('@/components/reflect/CloseYourDay', () => ({
  CloseYourDay: ({ onWriteInJournal }: any) => (
    <div data-testid="close-your-day">
      <button onClick={onWriteInJournal}>go-to-journal-from-reflect</button>
    </div>
  ),
}));
vi.mock('@/components/thoughts/ThoughtsTab', () => ({
  ThoughtsTab: () => <div data-testid="thoughts-tab" />,
}));
vi.mock('@/components/journal/JournalEditor', () => ({
  JournalEditor: ({ open, entry, onSave, onDelete }: any) =>
    open ? (
      <div data-testid="journal-editor-open">
        {entry ? `editing:${entry.id}` : 'new-entry'}
        <button onClick={() => onSave({ title: 'T', body: 'B', tags: ['general'] })}>save</button>
        {onDelete && <button onClick={onDelete}>delete</button>}
      </div>
    ) : null,
}));
vi.mock('@/components/journal/JournalEntryCard', () => ({
  JournalEntryCard: ({ entry, onClick }: any) => (
    <div data-testid={`entry-${entry.id}`} onClick={onClick}>
      {entry.title || entry.body}
    </div>
  ),
}));

import ReflectAndJournalPage from '@/pages/ReflectAndJournalPage';
import { useJournal } from '@/hooks/useJournal';
import { useParkedThoughts } from '@/hooks/useParkedThoughts';
import { useAuthContext } from '@/contexts/AuthContext';

function makeEntry(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'e1',
    title: 'My Title',
    body: 'My body text',
    tags: ['general'],
    createdAt: '2026-11-10T12:00:00.000Z',
    updatedAt: '2026-11-10T12:00:00.000Z',
    ...overrides,
  };
}

const DEFAULT_ENTRIES = [makeEntry()];

function setupDefaultMocks(overrides: {
  filteredEntries?: any[];
  searchQuery?: string;
  tagFilter?: string | null;
  totalCount?: number;
  isGuest?: boolean;
  activeCount?: number;
} = {}) {
  const createEntry = vi.fn();
  const updateEntry = vi.fn();
  const deleteEntry = vi.fn();
  const clearFilters = vi.fn();
  const setSearchQuery = vi.fn();
  const setTagFilter = vi.fn();

  (useJournal as any).mockReturnValue({
    filteredEntries: overrides.filteredEntries ?? DEFAULT_ENTRIES,
    searchQuery: overrides.searchQuery ?? '',
    setSearchQuery,
    tagFilter: overrides.tagFilter ?? null,
    setTagFilter,
    createEntry,
    updateEntry,
    deleteEntry,
    clearFilters,
    totalCount: overrides.totalCount ?? (overrides.filteredEntries ?? DEFAULT_ENTRIES).length,
  });
  (useParkedThoughts as any).mockReturnValue({
    activeCount: overrides.activeCount ?? 0,
  });
  (useAuthContext as any).mockReturnValue({
    isGuest: overrides.isGuest ?? false,
  });

  return { createEntry, updateEntry, deleteEntry, clearFilters, setSearchQuery, setTagFilter };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ReflectAndJournalPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReflectAndJournalPage — route-mode default tab', () => {
  it('defaults to the Reflect tab on bare /reflect (no ?tab=)', () => {
    setupDefaultMocks();
    renderAt('/reflect');
    expect(screen.getByTestId('close-your-day')).toBeInTheDocument();
    expect(screen.queryByTestId('thoughts-tab')).not.toBeInTheDocument();
  });

  it('shows the Journal tab on /reflect?tab=journal', () => {
    setupDefaultMocks();
    renderAt('/reflect?tab=journal');
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.queryByTestId('close-your-day')).not.toBeInTheDocument();
  });

  it('shows the Thoughts tab on /reflect?tab=thoughts', () => {
    setupDefaultMocks();
    renderAt('/reflect?tab=thoughts');
    expect(screen.getByTestId('thoughts-tab')).toBeInTheDocument();
  });

  // Bug fix (see file header) — expected to FAIL against the unmodified
  // component (defaults to Reflect regardless of path), PASS after the fix.
  it('shows the Journal tab on bare /journal (no ?tab=) — route name matches content', () => {
    setupDefaultMocks();
    renderAt('/journal');
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.queryByTestId('close-your-day')).not.toBeInTheDocument();
  });

  it('an explicit ?tab= on /journal still wins over the path default', () => {
    setupDefaultMocks();
    renderAt('/journal?tab=thoughts');
    expect(screen.getByTestId('thoughts-tab')).toBeInTheDocument();
  });

  it('clicking the tab buttons switches the visible content', async () => {
    setupDefaultMocks();
    renderAt('/reflect');
    fireEvent.click(screen.getByRole('button', { name: 'Journal' }));
    // AnimatePresence mode="wait" defers mounting the new tab until the old
    // one's exit transition finishes, so wait rather than assert synchronously.
    expect(await screen.findByText('My Title')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thoughts' }));
    expect(await screen.findByTestId('thoughts-tab')).toBeInTheDocument();
  });
});

describe('ReflectAndJournalPage — guest lock', () => {
  it('shows the lock overlay for guests', () => {
    setupDefaultMocks({ isGuest: true });
    renderAt('/reflect');
    expect(screen.getByText('Reflection is Locked')).toBeInTheDocument();
  });

  it('does not show the lock overlay for signed-in users', () => {
    setupDefaultMocks({ isGuest: false });
    renderAt('/reflect');
    expect(screen.queryByText('Reflection is Locked')).not.toBeInTheDocument();
  });
});

describe('ReflectAndJournalPage — Journal tab wiring (real useJournal contract)', () => {
  it('shows the real total entry count, pluralized', () => {
    setupDefaultMocks({ filteredEntries: DEFAULT_ENTRIES, totalCount: 1 });
    renderAt('/reflect?tab=journal');
    expect(screen.getByText('1 entry')).toBeInTheDocument();
  });

  it('pluralizes correctly for more than one entry', () => {
    setupDefaultMocks({
      filteredEntries: [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2', title: 'Second' })],
      totalCount: 2,
    });
    renderAt('/reflect?tab=journal');
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('shows the empty state when there are no entries and no active filters', () => {
    setupDefaultMocks({ filteredEntries: [], totalCount: 0 });
    renderAt('/reflect?tab=journal');
    expect(screen.getByText('Start writing your first entry')).toBeInTheDocument();
  });

  it('shows the no-match empty state when filters are active and nothing matches', () => {
    setupDefaultMocks({ filteredEntries: [], totalCount: 0, searchQuery: 'xyz' });
    renderAt('/reflect?tab=journal');
    expect(screen.getByText('No entries match your filters')).toBeInTheDocument();
  });

  it('opens the editor in "new entry" mode from the New Entry button', () => {
    setupDefaultMocks();
    renderAt('/reflect?tab=journal');
    fireEvent.click(screen.getByText('New Entry'));
    expect(screen.getByTestId('journal-editor-open')).toHaveTextContent('new-entry');
  });

  it('opens the editor in "editing" mode when an entry card is clicked, and calls updateEntry on save', () => {
    const { updateEntry } = setupDefaultMocks();
    renderAt('/reflect?tab=journal');
    fireEvent.click(screen.getByTestId('entry-e1'));
    expect(screen.getByTestId('journal-editor-open')).toHaveTextContent('editing:e1');
    fireEvent.click(screen.getByText('save'));
    expect(updateEntry).toHaveBeenCalledWith('e1', { title: 'T', body: 'B', tags: ['general'] });
  });

  it('calls createEntry (not updateEntry) when saving a brand-new entry', () => {
    const { createEntry, updateEntry } = setupDefaultMocks();
    renderAt('/reflect?tab=journal');
    fireEvent.click(screen.getByText('New Entry'));
    fireEvent.click(screen.getByText('save'));
    expect(createEntry).toHaveBeenCalledWith({ title: 'T', body: 'B', tags: ['general'] });
    expect(updateEntry).not.toHaveBeenCalled();
  });

  it('shows "Clear filters" only when a filter is active, and calls clearFilters on click', () => {
    const { clearFilters } = setupDefaultMocks({ searchQuery: 'abc' });
    renderAt('/reflect?tab=journal');
    fireEvent.click(screen.getByText('Clear filters'));
    expect(clearFilters).toHaveBeenCalled();
  });

  it('does not show "Clear filters" when no filter is active', () => {
    setupDefaultMocks();
    renderAt('/reflect?tab=journal');
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('calls setSearchQuery as the user types in the search box', () => {
    const { setSearchQuery } = setupDefaultMocks();
    renderAt('/reflect?tab=journal');
    fireEvent.change(screen.getByPlaceholderText('Search entries...'), { target: { value: 'hello' } });
    expect(setSearchQuery).toHaveBeenCalledWith('hello');
  });

  it('toggles a tag filter when a tag chip is clicked, after opening the filter panel', () => {
    const { setTagFilter } = setupDefaultMocks();
    renderAt('/reflect?tab=journal');
    fireEvent.click(screen.getByRole('button', { name: '' })); // Filter icon toggle (only unnamed button here)
    fireEvent.click(screen.getByText(/Ideas/));
    expect(setTagFilter).toHaveBeenCalledWith('ideas');
  });
});

describe('ReflectAndJournalPage — redesign (contrast fix)', () => {
  const FIXED_MUTED = 'text-[hsl(230,10%,42%)] dark:text-[hsl(230,10%,55%)]';
  const FIXED_MUTED_SECONDARY = 'text-[hsl(230,10%,40%)] dark:text-[hsl(230,10%,60%)]';

  it('the entry-count line (flat page background) uses the AA-passing muted color', () => {
    setupDefaultMocks({ totalCount: 1 });
    renderAt('/reflect?tab=journal');
    const node = screen.getByText('1 entry');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('"Clear filters" (flat page background) uses the AA-passing muted color', () => {
    setupDefaultMocks({ searchQuery: 'abc' });
    renderAt('/reflect?tab=journal');
    const node = screen.getByText('Clear filters');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('the empty-state message (flat page background) uses the AA-passing muted color', () => {
    setupDefaultMocks({ filteredEntries: [], totalCount: 0 });
    renderAt('/reflect?tab=journal');
    const node = screen.getByText('Start writing your first entry');
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED);
  });

  it('an inactive tag filter chip (bg-secondary background) uses the secondary-specific AA-passing color', () => {
    setupDefaultMocks();
    renderAt('/reflect?tab=journal');
    fireEvent.click(screen.getByRole('button', { name: '' })); // open filter panel
    const node = screen.getByText(/Ideas/);
    expect(node.className).not.toContain('text-muted-foreground');
    expect(node.className).toContain(FIXED_MUTED_SECONDARY);
  });

  it('leaves the already-passing tab-switcher inactive labels (bg-card/80) untouched', () => {
    setupDefaultMocks();
    renderAt('/reflect');
    const node = screen.getByText('Journal'); // the inactive tab-switcher button itself (icon sibling has no text)
    expect(node.className).toContain('text-muted-foreground');
    expect(node.className).not.toContain(FIXED_MUTED);
    expect(node.className).not.toContain(FIXED_MUTED_SECONDARY);
  });
});
