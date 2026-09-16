/**
 * IndexedDB-based persistence layer for tasks and time blocks.
 * Falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = 'dailyRhythm_db';
const DB_VERSION = 1;

interface StoreConfig {
  name: string;
  keyPath: string;
}

const STORES: StoreConfig[] = [
  { name: 'tasks', keyPath: 'id' },
  { name: 'timeBlocks', keyPath: 'id' },
];

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or get the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[PersistenceDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      STORES.forEach(({ name, keyPath }) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath });
          // Index by dateKey for efficient date-based queries
          store.createIndex('dateKey', 'dateKey', { unique: false });
        }
      });
    };
  });

  return dbPromise;
}

/**
 * Get all items from a store
 */
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        resolve(items);
      };

      request.onerror = () => {
        console.error(`[PersistenceDB] Error loading from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.warn('[PersistenceDB] IndexedDB failed, falling back to localStorage');
    return getFromLocalStorage<T[]>(storeName) || [];
  }
}

/**
 * Save an item to a store (create or update)
 */
export async function saveToStore<T extends { id: string }>(
  storeName: string,
  item: T
): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`[PersistenceDB] Error saving to ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.warn('[PersistenceDB] IndexedDB failed, falling back to localStorage');
    await saveToLocalStorage(storeName, item);
  }
}

/**
 * Save multiple items to a store
 */
export async function saveAllToStore<T extends { id: string }>(
  storeName: string,
  items: T[]
): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach((item) => {
        store.put(item);
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.error(`[PersistenceDB] Error batch saving to ${storeName}:`, transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.warn('[PersistenceDB] IndexedDB failed, falling back to localStorage');
    // For localStorage fallback, save entire array
    const key = `dailyRhythm_${storeName}`;
    localStorage.setItem(key, JSON.stringify(items));
  }
}

/**
 * Delete an item from a store
 */
export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`[PersistenceDB] Error deleting from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.warn('[PersistenceDB] IndexedDB failed, falling back to localStorage');
    await deleteFromLocalStorage(storeName, id);
  }
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error(`[PersistenceDB] Error clearing ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.warn('[PersistenceDB] IndexedDB failed, falling back to localStorage');
    localStorage.removeItem(`dailyRhythm_${storeName}`);
  }
}

// LocalStorage fallback helpers
function getFromLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(`dailyRhythm_${key}`);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

async function saveToLocalStorage<T extends { id: string }>(
  storeName: string,
  item: T
): Promise<void> {
  const key = `dailyRhythm_${storeName}`;
  const existing = getFromLocalStorage<T[]>(storeName) || [];
  const index = existing.findIndex((i: T) => i.id === item.id);
  
  if (index >= 0) {
    existing[index] = item;
  } else {
    existing.push(item);
  }
  
  localStorage.setItem(key, JSON.stringify(existing));
}

async function deleteFromLocalStorage(storeName: string, id: string): Promise<void> {
  const key = `dailyRhythm_${storeName}`;
  const existing = getFromLocalStorage<{ id: string }[]>(storeName) || [];
  const filtered = existing.filter((item) => item.id !== id);
  localStorage.setItem(key, JSON.stringify(filtered));
}

/**
 * Migrate data from old localStorage format to IndexedDB
 * Also handles converting old 'date' field to 'dateKey'
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const migrationKey = 'dailyRhythm_migrated_v2';
  
  // Check if already migrated
  if (localStorage.getItem(migrationKey)) {
    return;
  }

  const oldTasksKey = 'dailyRhythm_tasks';
  const oldBlocksKey = 'dailyRhythm_timeBlocks';

  try {
    const oldTasks = localStorage.getItem(oldTasksKey);
    const oldBlocks = localStorage.getItem(oldBlocksKey);

    if (oldTasks) {
      const tasks = JSON.parse(oldTasks);
      if (Array.isArray(tasks) && tasks.length > 0) {
        // Migrate old 'date' field to 'dateKey'
        const migratedTasks = tasks.map((task: any) => ({
          ...task,
          dateKey: task.dateKey || task.date, // Use dateKey if exists, else use old date
          createdAt: task.createdAt || new Date().toISOString(),
        }));
        await saveAllToStore('tasks', migratedTasks);
      }
    }

    if (oldBlocks) {
      const blocks = JSON.parse(oldBlocks);
      if (Array.isArray(blocks) && blocks.length > 0) {
        // Migrate old 'date' field to 'dateKey'
        const migratedBlocks = blocks.map((block: any) => ({
          ...block,
          dateKey: block.dateKey || block.date, // Use dateKey if exists, else use old date
          createdAt: block.createdAt || new Date().toISOString(),
        }));
        await saveAllToStore('timeBlocks', migratedBlocks);
      }
    }

    // Mark as migrated
    localStorage.setItem(migrationKey, 'true');
  } catch (error) {
    console.error('[PersistenceDB] Migration error:', error);
  }
}
