import { useLocalStorage, formatDate } from './useLocalStorage';
import { ReflectionEntry } from '@/types';

const STORAGE_KEY = 'dailyRhythm_reflections';

export type EmotionalScore = 'hard' | 'okay' | 'good';
export type DailyWin = 'completed' | 'showedUp' | 'selfCare' | 'learned';

export const REFLECTION_QUESTIONS = [
  { id: 'went-well', text: 'What went well today?' },
  { id: 'drained', text: 'What drained you today?' },
  { id: 'grateful', text: 'What are you grateful for?' },
  { id: 'different', text: 'What would you do differently tomorrow?' },
  { id: 'proud', text: 'What made you proud today?' },
  { id: 'learned', text: 'What did you learn today?' },
  { id: 'kind', text: 'How were you kind to yourself today?' },
];

export function useReflection() {
  const [reflections, setReflections] = useLocalStorage<ReflectionEntry[]>(STORAGE_KEY, []);

  const getReflectionForDate = (date: string): ReflectionEntry | undefined => {
    return reflections.find(r => r.date === date);
  };

  const hasReflectedToday = (): boolean => {
    const today = formatDate(new Date());
    return reflections.some(r => r.date === today);
  };

  const saveReflection = (entry: ReflectionEntry) => {
    setReflections(prev => {
      const existing = prev.findIndex(r => r.date === entry.date);
      if (existing >= 0) {
        return prev.map((r, i) => i === existing ? entry : r);
      }
      return [...prev, entry];
    });
  };

  const getTodaysQuestion = (): { id: string; text: string } => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return REFLECTION_QUESTIONS[dayOfYear % REFLECTION_QUESTIONS.length];
  };

  const getRecentReflections = (limit = 7): ReflectionEntry[] => {
    return [...reflections].reverse().slice(0, limit);
  };

  const clearAllEntries = () => {
    setReflections([]);
  };

  return {
    reflections,
    getReflectionForDate,
    hasReflectedToday,
    saveReflection,
    getTodaysQuestion,
    getRecentReflections,
    clearAllEntries,
  };
}
