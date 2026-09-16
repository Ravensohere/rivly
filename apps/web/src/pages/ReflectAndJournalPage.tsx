/**
 * ReflectAndJournalPage - Combined page with Reflect, Journal, and Thoughts sub-tabs
 * 
 * Reflect: "Close Your Day" flow with structured daily snapshot
 * Journal: Free-form personal entries with search/filter
 * Thoughts: Parked thoughts with actions (convert to task, archive, delete)
 * 
 * Key improvements:
 * - Reflect uses new CloseDay system (one entry per day, immutable)
 * - Journal has single source of truth (no duplicate rendering)
 * - Thoughts provides a home for parked thoughts
 * - Full scroll support with safe-area padding
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, BookOpen, Plus, Search, Filter, X, Brain, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloseYourDay } from '@/components/reflect/CloseYourDay';
import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalEntryCard } from '@/components/journal/JournalEntryCard';
import { ThoughtsTab } from '@/components/thoughts/ThoughtsTab';
import { useJournal } from '@/hooks/useJournal';
import { useParkedThoughts } from '@/hooks/useParkedThoughts';
import { JournalEntry, JournalTag, JOURNAL_TAG_OPTIONS } from '@/types/journal';
import { useAuthContext } from '@/contexts/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';

import { PageTransition } from '@/components/ui/PageTransition';

type TabId = 'reflect' | 'journal' | 'thoughts';

export default function ReflectAndJournalPage() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'reflect';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabId;
    if (tabFromUrl && ['reflect', 'journal', 'thoughts'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const { activeCount } = useParkedThoughts();
  const { isGuest } = useAuthContext();

  return (
    <PageTransition className="page-container relative">
      <div className={`content-wrapper pt-4 pb-8 space-y-6 ${isGuest ? 'blur-sm pointer-events-none select-none opacity-50' : ''}`}>
        {/* Navigation Tabs - Centered & Integrated */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-md rounded-2xl p-1.5 border border-border/40 shadow-sm"
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('reflect')}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-sm transition-all duration-300
                ${activeTab === 'reflect' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}
              `}
            >
              <Heart className="w-4 h-4" />
              Reflect
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-sm transition-all duration-300
                ${activeTab === 'journal' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}
              `}
            >
              <BookOpen className="w-4 h-4" />
              Journal
            </button>
            <button
              onClick={() => setActiveTab('thoughts')}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-sm transition-all duration-300 relative
                ${activeTab === 'thoughts' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}
              `}
            >
              <Brain className="w-4 h-4" />
              Thoughts
              {activeCount > 0 && activeTab !== 'thoughts' && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-card">
                  {activeCount > 9 ? '9+' : activeCount}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="min-h-[60vh]">
          <AnimatePresence mode="wait">
            {activeTab === 'reflect' ? (
              <motion.div
                key="reflect"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <CloseYourDay 
                  onWriteInJournal={() => setActiveTab('journal')}
                />
              </motion.div>
            ) : activeTab === 'journal' ? (
              <JournalTab key="journal" />
            ) : (
              <ThoughtsTab key="thoughts" />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Guest Lock Overlay */}
      {isGuest && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-card/90 backdrop-blur-md p-8 rounded-3xl border border-border shadow-xl text-center max-w-xs mx-4">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Reflection is Locked</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Sign in to save your reflections, journal entries, and track your thoughts privately.
            </p>
            <Link to="/login">
              <Button className="w-full rounded-full">
                Sign in to Unlock
              </Button>
            </Link>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

function JournalTab() {
  const {
    filteredEntries,
    searchQuery,
    setSearchQuery,
    tagFilter,
    setTagFilter,
    createEntry,
    updateEntry,
    deleteEntry,
    clearFilters,
    totalCount,
  } = useJournal();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleNewEntry = useCallback(() => {
    setEditingEntry(null);
    setEditorOpen(true);
  }, []);

  const handleEditEntry = useCallback((entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback((data: { title: string; body: string; tags: JournalTag[] }) => {
    if (editingEntry) {
      // Update existing - only update, don't create
      updateEntry(editingEntry.id, data);
    } else {
      // Create new - only create once
      createEntry(data);
    }
  }, [editingEntry, updateEntry, createEntry]);

  const handleDelete = useCallback(() => {
    if (editingEntry) {
      deleteEntry(editingEntry.id);
      setEditorOpen(false);
      setEditingEntry(null);
    }
  }, [editingEntry, deleteEntry]);

  const handleEditorClose = useCallback((open: boolean) => {
    setEditorOpen(open);
    if (!open) {
      setEditingEntry(null);
    }
  }, []);

  const hasActiveFilters = searchQuery || tagFilter;

  // Deduplicate entries by ID (defensive - should not be needed with proper state)
  const uniqueEntries = filteredEntries.filter((entry, index, self) =>
    index === self.findIndex(e => e.id === entry.id)
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Journal
          </h1>
          <Button onClick={handleNewEntry} size="sm" className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" />
            New Entry
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="pl-10 rounded-xl"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-xl"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Tag filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 overflow-hidden"
            >
              {JOURNAL_TAG_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTagFilter(tagFilter === option.value ? null : option.value)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${tagFilter === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}
                  `}
                >
                  {option.emoji} {option.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Entries list */}
      <div className="space-y-3">
        {uniqueEntries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? 'No entries match your filters' : 'Start writing your first entry'}
            </p>
            {!hasActiveFilters && (
              <Button onClick={handleNewEntry} variant="outline" className="mt-4 rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                New Entry
              </Button>
            )}
          </div>
        ) : (
          uniqueEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <JournalEntryCard
                entry={entry}
                onClick={() => handleEditEntry(entry)}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Journal Editor Sheet */}
      <JournalEditor
        open={editorOpen}
        onOpenChange={handleEditorClose}
        entry={editingEntry || undefined}
        onSave={handleSave}
        onDelete={editingEntry ? handleDelete : undefined}
      />
    </motion.div>
  );
}
