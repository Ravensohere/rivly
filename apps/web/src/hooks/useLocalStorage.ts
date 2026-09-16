import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced useLocalStorage hook with:
 * - Proper merging of defaults with stored values (handles schema additions)
 * - Cross-tab sync
 * - Consistent state after reloads
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state with merged stored + default values
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      const parsed = JSON.parse(item);
      
      // If initialValue is an object, merge with stored to pick up new schema fields
      if (initialValue && typeof initialValue === 'object' && !Array.isArray(initialValue)) {
        return { ...initialValue, ...parsed };
      }
      
      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Keep ref to latest value for cross-tab sync
  const valueRef = useRef(storedValue);
  valueRef.current = storedValue;

  // Cross-tab and same-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      let changedKey: string | null = null;
      let newValue: string | null = null;

      if (e instanceof StorageEvent) {
        changedKey = e.key;
        newValue = e.newValue;
      } else if (e instanceof CustomEvent && e.detail) {
        changedKey = e.detail.key;
        newValue = e.detail.newValue;
      }

      if (changedKey === key && newValue) {
        try {
          const newData = JSON.parse(newValue);
          // Defer state update to avoid updating during render
          queueMicrotask(() => {
            // Merge with defaults for objects
            if (initialValue && typeof initialValue === 'object' && !Array.isArray(initialValue)) {
              setStoredValue({ ...initialValue, ...newData });
            } else {
              setStoredValue(newData);
            }
          });
        } catch {
          // Ignore parse errors
        }
      } else if (changedKey === key && !newValue) {
        // Handle explicit clearing (null value)
        queueMicrotask(() => {
          setStoredValue(initialValue);
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleStorageChange as EventListener);
    };
  }, [key, initialValue]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        const jsonValue = JSON.stringify(valueToStore);
        
        window.localStorage.setItem(key, jsonValue);
        
        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new CustomEvent('local-storage-update', {
          detail: { key, newValue: jsonValue }
        }));
        
        return valueToStore;
      });
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(date: Date): string {
  // Use local time for date string (YYYY-MM-DD)
  // 'en-CA' locale always outputs YYYY-MM-DD
  return date.toLocaleDateString('en-CA');
}

export function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
}

export function formatTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function formatTimeDisplay(time: string): string {
  const { hours, minutes } = parseTime(time);
  const period = (hours >= 12 && hours < 24) ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
