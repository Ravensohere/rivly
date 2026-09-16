/**
 * useParkedThoughts - Hook for managing parked thoughts
 * 
 * Features:
 * - Local-first with localStorage fallback for anonymous users
 * - Supabase sync for logged-in users
 * - CRUD operations with optimistic updates
 * - Ledger integration for analytics
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ParkedThought, ThoughtCategory, ThoughtStatus, mapLegacyCategory } from '@/types/thoughts';

const LOCAL_STORAGE_KEY = 'rivly_parked_thoughts_v1';
const LEGACY_STORAGE_KEY = 'dailyRhythm_thoughts'; // Old key from useThoughtParking

function generateId(): string {
  return crypto.randomUUID();
}

function getLocalThoughts(): ParkedThought[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Try to migrate from legacy storage
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const legacyThoughts = JSON.parse(legacy);
      const migrated: ParkedThought[] = legacyThoughts.map((t: any) => ({
        id: t.id || generateId(),
        text: t.text,
        category: mapLegacyCategory(t.category),
        status: 'active' as ThoughtStatus,
        createdAt: t.date ? `${t.date}T12:00:00Z` : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      // Save migrated thoughts
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(migrated));
      
      return migrated;
    }
  } catch (error) {
    console.error('[ParkedThoughts] Failed to load local thoughts:', error);
  }
  return [];
}

function saveLocalThoughts(thoughts: ParkedThought[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(thoughts));
  } catch (error) {
    console.error('[ParkedThoughts] Failed to save local thoughts:', error);
  }
}

export function useParkedThoughts() {
  const { user, isGuest } = useAuth();
  const [thoughts, setThoughts] = useState<ParkedThought[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load thoughts on mount and when auth changes
  useEffect(() => {
    async function loadThoughts() {
      setIsLoading(true);
      
      if (user && !isGuest) {
        // Load from Supabase for logged-in users
        try {
          const { data, error } = await supabase
            .from('parked_thoughts')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          const mapped: ParkedThought[] = (data || []).map(row => ({
            id: row.id,
            userId: row.user_id,
            text: row.text,
            category: row.category as ThoughtCategory,
            status: row.status as ThoughtStatus,
            linkedTaskId: row.linked_task_id || undefined,
            tags: row.tags || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
          
          setThoughts(mapped);
        } catch (error) {
          console.error('[ParkedThoughts] Failed to load from Supabase:', error);
          // Fall back to local storage
          setThoughts(getLocalThoughts());
        }
      } else {
        // Load from localStorage for anonymous users
        setThoughts(getLocalThoughts());
      }
      
      setIsLoading(false);
    }
    
    loadThoughts();
  }, [user]);

  // Save to localStorage when thoughts change (for anonymous users)
  useEffect(() => {
    if ((!user || isGuest) && !isLoading) {
      saveLocalThoughts(thoughts);
    }
  }, [thoughts, user, isLoading]);

  // Get active thoughts (not archived/converted)
  const activeThoughts = thoughts.filter(t => t.status === 'active');
  const archivedThoughts = thoughts.filter(t => t.status === 'archived');
  const convertedThoughts = thoughts.filter(t => t.status === 'converted');

  // Add a new thought
  const addThought = useCallback(async (
    text: string, 
    category: ThoughtCategory,
    tags?: string[]
  ): Promise<ParkedThought | null> => {
    const now = new Date().toISOString();
    const newThought: ParkedThought = {
      id: generateId(),
      userId: user?.id,
      text,
      category,
      status: 'active',
      tags,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    setThoughts(prev => [newThought, ...prev]);

    if (user && !isGuest) {
      try {
        const { error } = await supabase
          .from('parked_thoughts')
          .insert({
            id: newThought.id,
            user_id: user.id,
            text,
            category,
            status: 'active',
            tags,
          });
        
        if (error) throw error;
      } catch (error) {
        console.error('[ParkedThoughts] Failed to add to Supabase:', error);
        // Revert optimistic update
        setThoughts(prev => prev.filter(t => t.id !== newThought.id));
        return null;
      }
    }

    return newThought;
  }, [user]);

  // Update a thought
  const updateThought = useCallback(async (
    id: string,
    updates: Partial<Pick<ParkedThought, 'text' | 'category' | 'tags'>>
  ): Promise<boolean> => {
    const now = new Date().toISOString();
    
    // Optimistic update
    setThoughts(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: now } : t
    ));

    if (user && !isGuest) {
      try {
        const { error } = await supabase
          .from('parked_thoughts')
          .update({
            ...updates,
            updated_at: now,
          })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('[ParkedThoughts] Failed to update in Supabase:', error);
        return false;
      }
    }

    return true;
  }, [user]);

  // Archive a thought
  const archiveThought = useCallback(async (id: string): Promise<boolean> => {
    const now = new Date().toISOString();
    
    // Optimistic update
    setThoughts(prev => prev.map(t => 
      t.id === id ? { ...t, status: 'archived' as ThoughtStatus, updatedAt: now } : t
    ));

    if (user && !isGuest) {
      try {
        const { error } = await supabase
          .from('parked_thoughts')
          .update({ status: 'archived', updated_at: now })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('[ParkedThoughts] Failed to archive in Supabase:', error);
        return false;
      }
    }

    return true;
  }, [user]);

  // Convert thought to task (marks as converted and returns the thought)
  const convertToTask = useCallback(async (id: string, taskId: string): Promise<boolean> => {
    const now = new Date().toISOString();
    
    // Optimistic update
    setThoughts(prev => prev.map(t => 
      t.id === id ? { 
        ...t, 
        status: 'converted' as ThoughtStatus, 
        linkedTaskId: taskId,
        updatedAt: now 
      } : t
    ));

    if (user && !isGuest) {
      try {
        const { error } = await supabase
          .from('parked_thoughts')
          .update({ 
            status: 'converted', 
            linked_task_id: taskId,
            updated_at: now 
          })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('[ParkedThoughts] Failed to convert in Supabase:', error);
        return false;
      }
    }

    return true;
  }, [user]);

  // Delete a thought
  const deleteThought = useCallback(async (id: string): Promise<boolean> => {
    // Optimistic update
    setThoughts(prev => prev.filter(t => t.id !== id));

    if (user && !isGuest) {
      try {
        const { error } = await supabase
          .from('parked_thoughts')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('[ParkedThoughts] Failed to delete from Supabase:', error);
        return false;
      }
    }

    return true;
  }, [user]);

  // Restore an archived thought
  const restoreThought = useCallback(async (id: string): Promise<boolean> => {
    const now = new Date().toISOString();
    
    // Optimistic update
    setThoughts(prev => prev.map(t => 
      t.id === id ? { ...t, status: 'active' as ThoughtStatus, updatedAt: now } : t
    ));

    if (user && !isGuest) {
      try {
        const { error } = await supabase
          .from('parked_thoughts')
          .update({ status: 'active', updated_at: now })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('[ParkedThoughts] Failed to restore in Supabase:', error);
        return false;
      }
    }

    return true;
  }, [user]);

  // Clear ALL thoughts (destructive)
  const clearAllThoughts = useCallback(async (): Promise<boolean> => {
    // Optimistic update
    setThoughts([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    if (user && !isGuest) {
      try {
        const { error } = await supabase
          .from('parked_thoughts')
          .delete()
          .eq('user_id', user.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('[ParkedThoughts] Failed to clear all in Supabase:', error);
        // Reload to restore state if failed
        window.location.reload();
        return false;
      }
    }

    return true;
  }, [user]);

  return {
    thoughts,
    activeThoughts,
    archivedThoughts,
    convertedThoughts,
    isLoading,
    activeCount: activeThoughts.length,
    
    // Actions
    addThought,
    updateThought,
    archiveThought,
    convertToTask,
    deleteThought,
    restoreThought,
    clearAllThoughts,
  };
}
