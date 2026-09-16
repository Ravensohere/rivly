import { useState, useEffect, useCallback } from 'react';

export interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
  addedAt: number;
  category?: string;
}

const STORAGE_KEY = 'vivly_shopping_list';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  groceries: ['milk', 'doodh', 'eggs', 'ande', 'bread', 'rice', 'chawal', 'dal', 'atta', 'flour', 'sugar', 'cheeni', 'oil', 'tel', 'butter', 'makhan', 'ghee', 'paneer', 'cheese', 'curd', 'dahi', 'yogurt', 'vegetables', 'sabzi', 'fruits', 'onion', 'pyaz', 'tomato', 'tamatar', 'potato', 'aloo', 'chicken', 'mutton', 'fish', 'tea', 'chai', 'coffee'],
  household: ['soap', 'detergent', 'shampoo', 'toothpaste', 'brush', 'tissue', 'toilet', 'cleaner', 'sponge', 'dustbin', 'mop', 'broom', 'jhaadu', 'bucket', 'towel'],
  medicines: ['medicine', 'tablet', 'dawai', 'paracetamol', 'crocin', 'bandage', 'ointment', 'syrup', 'vitamins', 'supplement'],
  personal: ['perfume', 'cream', 'lotion', 'sunscreen', 'razor', 'comb', 'deodorant', 'lipstick', 'makeup'],
};

function categorizeItem(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'other';
}

function loadList(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveList(items: ShoppingItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[useShoppingList] save failed', e);
  }
}

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);

  useEffect(() => {
    setItems(loadList());
  }, []);

  const addItem = useCallback((text: string) => {
    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      text: text.trim(),
      checked: false,
      addedAt: Date.now(),
      category: categorizeItem(text),
    };
    setItems(prev => {
      const next = [...prev, item];
      saveList(next);
      return next;
    });
    return item;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveList(next);
      return next;
    });
  }, []);

  const removeByText = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    setItems(prev => {
      const next = prev.filter(i => !i.text.toLowerCase().includes(lower));
      saveList(next);
      return next;
    });
  }, []);

  const toggleItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
      saveList(next);
      return next;
    });
  }, []);

  const getList = useCallback(() => items, [items]);

  const clearChecked = useCallback(() => {
    setItems(prev => {
      const next = prev.filter(i => !i.checked);
      saveList(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    saveList([]);
  }, []);

  return {
    items,
    addItem,
    removeItem,
    removeByText,
    toggleItem,
    getList,
    clearChecked,
    clearAll,
  };
}
