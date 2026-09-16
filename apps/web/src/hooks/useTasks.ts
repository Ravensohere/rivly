import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { getLocalDateKey } from '@/lib/dateUtils';
import {
  getAllFromStore,
  saveToStore,
  deleteFromStore,
  migrateFromLocalStorage,
} from '@/lib/persistenceDb'; // Assuming these exist
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { scheduleNotification, cancelNotification } from '@/lib/notifications';

const STORE_NAME = 'tasks';

export function useTasks() {
  const { user, isGuest } = useAuthContext();
  const queryClient = useQueryClient();
  const [guestTasks, setGuestTasks] = useState<Task[]>([]);

  // Helper: Convert DB format to app format
  const convertFromDBFormat = useCallback((dbTask: any): Task => {
    return {
      id: dbTask.id,
      title: dbTask.title,
      status: dbTask.status === 'completed' ? 'done' : 'todo',
      tag: (dbTask.tag || 'other') as any,
      dateKey: dbTask.due_date ? dbTask.due_date.split('T')[0] : getLocalDateKey(),
      createdAt: dbTask.created_at,
      completedAt: dbTask.status === 'completed' ? dbTask.updated_at : undefined,
      linkedBlockId: dbTask.linked_block_id || undefined,
      reminder: dbTask.reminder || undefined,
    };
  }, []);

  // Fetch Tasks Query
  const { data: serverTasks = [], isLoading: isServerLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      if (!user || isGuest) return [];
      console.log('[useTasks] Fetching tasks from API...');
      const { tasks: data } = await api.tasks.list();
      return (data || []).map(convertFromDBFormat);
    },
    enabled: !!user && !isGuest,
    staleTime: 1000 * 60, // 1 minute stale time
  });

  // Guest Mode: Load from IndexedDB
  useEffect(() => {
    if (isGuest || !user) {
      const loadGuestTasks = async () => {
        await migrateFromLocalStorage();
        const stored = await getAllFromStore<Task>(STORE_NAME);
        setGuestTasks(stored);
      };
      loadGuestTasks();
    }
  }, [isGuest, user]);

  // Combine tasks based on mode
  const tasks = (user && !isGuest) ? serverTasks : guestTasks;
  const isLoaded = (user && !isGuest) ? !isServerLoading : true;

  // Add Task Mutation
  const addTaskMutation = useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'createdAt'>) => {
        console.log('[useTasks] Creating task:', task);
        const { task: newTask } = await api.tasks.create({
            title: task.title,
            date_key: task.dateKey || getLocalDateKey(),
            status: (task.status === 'done' ? 'completed' : 'pending')
        });
        return convertFromDBFormat(newTask);
    },
    onSuccess: (newTask) => {
        console.log('[useTasks] Task created successfully, invalidating query...');
        queryClient.setQueryData(['tasks', user?.id], (old: Task[] | undefined) => [newTask, ...(old || [])]);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    let newTask: Task;
    if (user && !isGuest) {
        newTask = await addTaskMutation.mutateAsync(task);
    } else {
        // Guest Logic
        const tempId = `guest-${Date.now()}`;
        newTask = { ...task, id: tempId, createdAt: new Date().toISOString(), dateKey: task.dateKey || getLocalDateKey() };
        setGuestTasks(prev => [newTask, ...prev]);
        await saveToStore(STORE_NAME, newTask);
    }

    if (newTask.reminder && newTask.dateKey && newTask.id) {
        try {
            // Very simple deterministic ID out of the task ID string
            const notificationId = Math.abs(newTask.id.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
            const reminderDate = new Date(`${newTask.dateKey}T${newTask.reminder}:00`);
            if (reminderDate.getTime() > Date.now()) {
                await scheduleNotification(
                    'Task Reminder',
                    newTask.title,
                    notificationId,
                    reminderDate,
                    'TASK',
                    newTask.id
                );
            }
        } catch(e) { console.error('Failed to schedule notification', e); }
    }
    
    return newTask;
  }, [user, isGuest, addTaskMutation]);

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
        // Map updates to DB format
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.status !== undefined) dbUpdates.status = updates.status === 'done' ? 'completed' : 'pending';
        if (updates.tag !== undefined) dbUpdates.tag = updates.tag;
        if (updates.dateKey !== undefined) dbUpdates.due_date = updates.dateKey;
        if (updates.linkedBlockId !== undefined) dbUpdates.linked_block_id = updates.linkedBlockId;
        if (updates.reminder !== undefined) dbUpdates.reminder = updates.reminder;
        
        await api.tasks.update(id, dbUpdates);
    },
    onMutate: async ({ id, updates }) => {
        await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });
        const previousTasks = queryClient.getQueryData<Task[]>(['tasks', user?.id]);
        queryClient.setQueryData(['tasks', user?.id], (old: Task[] | undefined) => 
            (old || []).map(t => t.id === id ? { ...t, ...updates } : t)
        );
        return { previousTasks };
    },
    onError: (err, newTodo, context) => {
        queryClient.setQueryData(['tasks', user?.id], context?.previousTasks);
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
      let taskToUpdate = tasks.find(t => t.id === id);
      
      if (user && !isGuest) {
          updateTaskMutation.mutate({ id, updates });
      } else {
          // Guest update local
           setGuestTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
           if (taskToUpdate) await saveToStore(STORE_NAME, { ...taskToUpdate, ...updates });
      }

      // Handle Notifications update
      if (taskToUpdate && (updates.reminder !== undefined || updates.dateKey !== undefined || updates.title !== undefined || updates.status !== undefined)) {
         try {
             // Deterministic ID for scheduling/cancelling
             const notificationId = Math.abs(id.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
             
             // Cancel existing first if there was one, or if we are completing it
             await cancelNotification(notificationId);
             
             const finalTask = { ...taskToUpdate, ...updates };
             if (finalTask.status !== 'done' && finalTask.reminder && finalTask.dateKey) {
                 const reminderDate = new Date(`${finalTask.dateKey}T${finalTask.reminder}:00`);
                 if (reminderDate.getTime() > Date.now()) {
                     await scheduleNotification('Task Reminder', finalTask.title, notificationId, reminderDate, 'TASK', finalTask.id);
                 }
             }
         } catch(e) { console.error('Failed to update notification', e); }
      }
  }, [user, isGuest, updateTaskMutation, tasks]);

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
        await api.tasks.delete(id);
    },
    onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });
        const previousTasks = queryClient.getQueryData<Task[]>(['tasks', user?.id]);
        queryClient.setQueryData(['tasks', user?.id], (old: Task[] | undefined) => 
            (old || []).filter(t => t.id !== id)
        );
        return { previousTasks };
    },
    onError: (err, id, context) => {
        queryClient.setQueryData(['tasks', user?.id], context?.previousTasks);
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const deleteTask = useCallback(async (id: string) => {
      if (user && !isGuest) {
          deleteTaskMutation.mutate(id);
      } else {
          setGuestTasks(prev => prev.filter(t => t.id !== id));
          await deleteFromStore(STORE_NAME, id);
      }
      
      try {
          const notificationId = Math.abs(id.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
          await cancelNotification(notificationId);
      } catch(e) { console.error('Failed to cancel notification on delete', e); }
  }, [user, isGuest, deleteTaskMutation]);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isNowDone = task.status !== 'done';
    const updates: Partial<Task> = {
      status: isNowDone ? 'done' : 'todo',
      completedAt: isNowDone ? new Date().toISOString() : undefined,
    };

    await updateTask(id, updates);
  }, [tasks, updateTask]);

  const cleanupCompletedTasks = useCallback(async () => {
    const CLEANUP_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours
    const now = Date.now();
    
    const tasksToRemove = tasks.filter(task => {
      if (task.status !== 'done' || !task.completedAt) return false;
      const completedTime = new Date(task.completedAt).getTime();
      return now - completedTime > CLEANUP_THRESHOLD_MS;
    });

    if (tasksToRemove.length === 0) return;

    for (const task of tasksToRemove) {
      await deleteTask(task.id);
    }
  }, [tasks, deleteTask]);

  const linkTaskToBlock = useCallback(async (taskId: string, blockId: string | undefined) => {
    await updateTask(taskId, { linkedBlockId: blockId });
  }, [updateTask]);

  const getTaskById = useCallback((id: string): Task | undefined => {
    return tasks.find(task => task.id === id);
  }, [tasks]);

  const getActiveTasksForDate = useCallback((dateKey: string): Task[] => {
    return tasks.filter(task => task.dateKey === dateKey && task.status !== 'done');
  }, [tasks]);

  const getCompletedTasksForDate = useCallback((dateKey: string): Task[] => {
    return tasks.filter(task => task.dateKey === dateKey && task.status === 'done');
  }, [tasks]);

  const getTasksForDate = useCallback((dateKey: string): Task[] => {
    return tasks.filter(task => task.dateKey === dateKey);
  }, [tasks]);

  const getTasksForBlock = useCallback((blockId: string): Task[] => {
    return tasks.filter(task => task.linkedBlockId === blockId);
  }, [tasks]);

  const getUnlinkedTasks = useCallback((dateKey: string): Task[] => {
    return tasks.filter(task => task.dateKey === dateKey && !task.linkedBlockId);
  }, [tasks]);

  return {
    tasks,
    isLoaded,
    isSyncing: isServerLoading,
    getTasksForDate,
    getTasksForBlock,
    getUnlinkedTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    linkTaskToBlock,
    getTaskById,
    getActiveTasksForDate,
    getCompletedTasksForDate,
    cleanupCompletedTasks,
  };
}
