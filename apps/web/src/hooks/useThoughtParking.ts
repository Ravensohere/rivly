import { useLocalStorage, generateId, formatDate } from './useLocalStorage';
import { ThoughtParking } from '@/types';

const STORAGE_KEY = 'dailyRhythm_thoughts';

export type ThoughtCategory = 'worry' | 'idea' | 'reminder' | 'other';

export function useThoughtParking() {
  const [thoughts, setThoughts] = useLocalStorage<ThoughtParking[]>(STORAGE_KEY, []);

  const getThoughtsForDate = (date: string): ThoughtParking[] => {
    return thoughts.filter(thought => thought.date === date);
  };

  const addThought = (text: string, category: ThoughtCategory = 'other') => {
    const newThought: ThoughtParking = {
      id: generateId(),
      date: formatDate(new Date()),
      text,
      category,
    };
    setThoughts(prev => [...prev, newThought]);
    return newThought;
  };

  const updateThought = (id: string, updates: Partial<ThoughtParking>) => {
    setThoughts(prev => prev.map(thought => 
      thought.id === id ? { ...thought, ...updates } : thought
    ));
  };

  const deleteThought = (id: string) => {
    setThoughts(prev => prev.filter(thought => thought.id !== id));
  };

  const getRecentThoughts = (limit = 5): ThoughtParking[] => {
    return [...thoughts].reverse().slice(0, limit);
  };

  const clearAllThoughts = () => {
    setThoughts([]);
  };

  return {
    thoughts,
    getThoughtsForDate,
    addThought,
    updateThought,
    deleteThought,
    getRecentThoughts,
    clearAllThoughts,
  };
}
