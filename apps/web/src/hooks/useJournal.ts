import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage, generateId } from './useLocalStorage';
import { JournalEntry, JournalTag } from '@/types/journal';

const STORAGE_KEY = 'dailyRhythm_journal';

export function useJournal() {
  const [entries, setEntries] = useLocalStorage<JournalEntry[]>(STORAGE_KEY, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<JournalTag | null>(null);

  // Get all entries sorted by creation date (newest first)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries]);

  // Filter entries based on search, date, and tag
  const filteredEntries = useMemo(() => {
    return sortedEntries.filter(entry => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(query);
        const matchesBody = entry.body.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBody) return false;
      }

      // Date filter
      if (dateFilter) {
        const entryDate = entry.createdAt.split('T')[0];
        if (entryDate !== dateFilter) return false;
      }

      // Tag filter
      if (tagFilter) {
        if (!entry.tags.includes(tagFilter)) return false;
      }

      return true;
    });
  }, [sortedEntries, searchQuery, dateFilter, tagFilter]);

  const createEntry = useCallback((data: { title?: string; body: string; tags?: JournalTag[] }) => {
    const now = new Date().toISOString();
    const newEntry: JournalEntry = {
      id: generateId(),
      title: data.title || '',
      body: data.body,
      tags: data.tags || ['general'],
      createdAt: now,
      updatedAt: now,
    };
    setEntries(prev => [...prev, newEntry]);
    return newEntry;
  }, [setEntries]);

  const updateEntry = useCallback((id: string, updates: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        return {
          ...entry,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    }));
  }, [setEntries]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  }, [setEntries]);

  const getEntryById = useCallback((id: string) => {
    return entries.find(entry => entry.id === id);
  }, [entries]);

  const getEntriesForDate = useCallback((date: string) => {
    return sortedEntries.filter(entry => entry.createdAt.startsWith(date));
  }, [sortedEntries]);

  const getRecentEntries = useCallback((limit = 5) => {
    return sortedEntries.slice(0, limit);
  }, [sortedEntries]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDateFilter(null);
    setTagFilter(null);
  }, []);

  const clearAllEntries = useCallback(() => {
    setEntries([]);
  }, [setEntries]);

  return {
    entries: sortedEntries,
    filteredEntries,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    tagFilter,
    setTagFilter,
    createEntry,
    updateEntry,
    deleteEntry,
    getEntryById,
    getEntriesForDate,
    getRecentEntries,
    clearFilters,
    clearAllEntries,
    totalCount: entries.length,
  };
}
