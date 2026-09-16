/**
 * JournalPage - Personal journal for anytime writing
 * Features: CRUD entries, search, filter by date/tags
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, BookOpen, X } from 'lucide-react';
import { PageTransition, staggerContainer, staggerItem } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalEntryCard } from '@/components/journal/JournalEntryCard';
import { useJournal } from '@/hooks/useJournal';
import { JournalEntry, JournalTag, JOURNAL_TAG_OPTIONS } from '@/types/journal';

export default function JournalPage() {
  const {
    filteredEntries,
    searchQuery,
    setSearchQuery,
    tagFilter,
    setTagFilter,
    createEntry,
    updateEntry,
    deleteEntry,
    getEntryById,
    clearFilters,
    totalCount,
  } = useJournal();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleNewEntry = () => {
    setEditingEntry(null);
    setEditorOpen(true);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditorOpen(true);
  };

  const handleSave = (data: { title: string; body: string; tags: JournalTag[] }) => {
    if (editingEntry) {
      updateEntry(editingEntry.id, data);
    } else {
      createEntry(data);
    }
  };

  const handleDelete = () => {
    if (editingEntry) {
      deleteEntry(editingEntry.id);
      setEditorOpen(false);
      setEditingEntry(null);
    }
  };

  const hasActiveFilters = searchQuery || tagFilter;

  return (
    <PageTransition className="p-6 pb-28">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="max-w-md mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="pt-4">
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
        </motion.div>

        {/* Search & Filter */}
        <motion.div variants={staggerItem} className="space-y-3">
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
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-wrap gap-2"
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
        </motion.div>

        {/* Entries list */}
        <motion.div variants={staggerItem} className="space-y-3">
          {filteredEntries.length === 0 ? (
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
            filteredEntries.map((entry, index) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                index={index}
                onClick={() => handleEditEntry(entry)}
              />
            ))
          )}
        </motion.div>
      </motion.div>

      {/* Editor */}
      <JournalEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        entry={editingEntry}
        onSave={handleSave}
        onDelete={editingEntry ? handleDelete : undefined}
      />
    </PageTransition>
  );
}
