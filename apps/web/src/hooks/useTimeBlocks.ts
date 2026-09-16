import { useState, useEffect, useCallback, useRef } from 'react';
import { TimeBlock } from '@/types';
import { getLocalDateKey } from '@/lib/dateUtils';
import {
  getAllFromStore,
  saveToStore,
  deleteFromStore,
  migrateFromLocalStorage,
} from '@/lib/persistenceDb';
import { useAuthContext } from '@/contexts/AuthContext';
import { useGoogleCalendarSimple } from './useGoogleCalendarSimple';
import { scheduleNotification, cancelNotification } from '@/lib/notifications';

const STORE_NAME = 'timeBlocks';

// Event for syncing across hook instances
const BLOCKS_UPDATED_EVENT = 'time-blocks-updated';

export function useTimeBlocks() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuthContext();
  const initialLoadRef = useRef(false);
  const { updateCalendarEvent } = useGoogleCalendarSimple();

  // Load blocks from IndexedDB
  const loadBlocks = useCallback(async () => {
    try {
      if (!initialLoadRef.current) {
         // console.log('[useTimeBlocks] Loading blocks...');
         await migrateFromLocalStorage();
      }
      
      const storedBlocks = await getAllFromStore<TimeBlock>(STORE_NAME);
      setBlocks(storedBlocks);
      setIsLoaded(true);
      if (user) initialLoadRef.current = true;
    } catch (error) {
      console.error('[useTimeBlocks] Failed to load blocks:', error);
      setIsLoaded(true);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  // Listen for cross-component updates
  useEffect(() => {
      const handleUpdate = () => {
          loadBlocks();
      };
      
      window.addEventListener(BLOCKS_UPDATED_EVENT, handleUpdate);
      return () => window.removeEventListener(BLOCKS_UPDATED_EVENT, handleUpdate);
  }, [loadBlocks]);

  // Handle logout
  useEffect(() => {
    if (!user) {
        setBlocks([]);
        setIsLoaded(false);
        initialLoadRef.current = false;
        // Trigger a fresh load from IDB for anonymous state if needed
        const timer = setTimeout(() => {
            if (!user) loadBlocks();
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [user, loadBlocks]);

  const getBlocksForDate = useCallback((dateKey: string): TimeBlock[] => {
    const filtered = blocks
      .filter(block => {
        // Standard match
        if (block.dateKey === dateKey && !block.endDateKey) return true;
        
        // Multi-day match
        if (block.endDateKey) {
          return dateKey >= block.dateKey && dateKey <= block.endDateKey;
        }
        return false;
      })
      .map(block => {
        // If it's a simple match or single day, return as is
        if (!block.endDateKey || block.dateKey === block.endDateKey) return block;

        // Clone to avoid mutation
        const virtualBlock = { ...block };

        // Adjust times for display based on which day of the span we are viewing
        if (dateKey === block.dateKey) {
          // First day: original start -> 24:00
          virtualBlock.endTime = '24:00';
        } else if (dateKey === block.endDateKey) {
          // Last day: 00:00 -> original end
          virtualBlock.startTime = '00:00';
        } else {
          // Middle days: 00:00 -> 24:00
          virtualBlock.startTime = '00:00';
          virtualBlock.endTime = '24:00';
        }

        return virtualBlock;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    return filtered;
  }, [blocks]);

  const addBlock = useCallback(async (block: Omit<TimeBlock, 'id' | 'createdAt'>) => {
    const newBlock: TimeBlock = {
      ...block,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      // Ensure dateKey is set
      dateKey: block.dateKey || getLocalDateKey(),
    };
    
    // Optimistic update
    setBlocks(prev => [...prev, newBlock]);
    
    // Persist to IndexedDB
    try {
      await saveToStore(STORE_NAME, newBlock);
      // Dispatch update event
      window.dispatchEvent(new Event(BLOCKS_UPDATED_EVENT));
      
      // Schedule reminder if present
      if (newBlock.reminder && newBlock.dateKey) {
          const notificationId = Math.abs(newBlock.id.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
          const reminderDate = new Date(`${newBlock.dateKey}T${newBlock.reminder}:00`);
          if (reminderDate.getTime() > Date.now()) {
              await scheduleNotification('Time Block Reminder', newBlock.title, notificationId, reminderDate, 'BLOCK', newBlock.id);
          }
      }
    } catch (error) {
      console.error('[useTimeBlocks] Failed to save block:', error);
    }

    return newBlock;
  }, []);

  const updateBlock = useCallback(async (id: string, updates: Partial<TimeBlock>) => {
    let updatedBlock: TimeBlock | null = null;
    let oldBlock: TimeBlock | undefined = undefined;
    
    setBlocks(prev => {
        oldBlock = prev.find(b => b.id === id);
        return prev.map(block => {
            if (block.id === id) {
                updatedBlock = { ...block, ...updates };
                return updatedBlock;
            }
            return block;
        });
    });

    // Handle Google Calendar Sync
    if (updatedBlock && oldBlock && (updatedBlock as TimeBlock).googleEventId) {
        const blk = updatedBlock as TimeBlock;
        // Only update if relevant fields changed
        if (
            updates.title !== undefined ||
            updates.startTime !== undefined ||
            updates.endTime !== undefined ||
            updates.dateKey !== undefined || 
            updates.notes !== undefined
        ) {
            // Construct full Date objects for Google
            const startDate = blk.dateKey;
            const endDate = blk.endDateKey || blk.dateKey;
            const startDateTime = `${startDate}T${blk.startTime}:00`;
            const endDateTime = `${endDate}T${blk.endTime}:00`;
            
            updateCalendarEvent(blk.googleEventId, {
                title: updates.title, // Undefined if not changed
                description: updates.notes,
                startTime: (updates.startTime || updates.dateKey || updates.endDateKey) ? startDateTime : undefined,
                endTime: (updates.endTime || updates.dateKey || updates.endDateKey) ? endDateTime : undefined,
            }).catch(console.error);
        }
    }

    // Persist to IndexedDB
    if (updatedBlock) {
      try {
        await saveToStore(STORE_NAME, updatedBlock);
        window.dispatchEvent(new Event(BLOCKS_UPDATED_EVENT));
        
        // Handle Notifications
        const blk = updatedBlock as TimeBlock;
        if (updates.reminder !== undefined || updates.dateKey !== undefined || updates.title !== undefined || updates.status !== undefined) {
             const notificationId = Math.abs(id.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
             await cancelNotification(notificationId);
             
             if (blk.status !== 'completed' && blk.reminder && blk.dateKey) {
                 const reminderDate = new Date(`${blk.dateKey}T${blk.reminder}:00`);
                 if (reminderDate.getTime() > Date.now()) {
                     await scheduleNotification('Time Block Reminder', blk.title, notificationId, reminderDate, 'BLOCK', blk.id);
                 }
             }
        }
      } catch (error) {
        console.error('[useTimeBlocks] Failed to update block:', error);
      }
    }
  }, [updateCalendarEvent]);

  const deleteBlock = useCallback(async (id: string) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
    
    // Remove from IndexedDB
    try {
      await deleteFromStore(STORE_NAME, id);
      window.dispatchEvent(new Event(BLOCKS_UPDATED_EVENT));
      const notificationId = Math.abs(id.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
      await cancelNotification(notificationId);
    } catch (error) {
      console.error('[useTimeBlocks] Failed to delete block:', error);
    }
  }, []);

  const completeBlock = useCallback(async (id: string) => {
    await updateBlock(id, { status: 'completed' });
  }, [updateBlock]);

  const startBlock = useCallback(async (id: string) => {
    await updateBlock(id, { status: 'inProgress' });
  }, [updateBlock]);

  const getBlockById = useCallback((id: string): TimeBlock | undefined => {
    return blocks.find(block => block.id === id);
  }, [blocks]);

  return {
    blocks,
    isLoaded,
    getBlocksForDate,
    addBlock,
    updateBlock,
    deleteBlock,
    completeBlock,
    startBlock,
    getBlockById,
  };
}
