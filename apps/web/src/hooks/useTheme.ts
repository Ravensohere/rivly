import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'dailyRhythm_theme';

export function useTheme() {
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>(THEME_KEY, 'light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initial theme resolution and system listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      const newTheme = themeMode === 'system' ? systemTheme : themeMode;
      
      setResolvedTheme(newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    updateTheme(); // Run immediately

    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [themeMode]);

  // Apply theme when mode changes


  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, [setThemeMode]);

  return {
    themeMode,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === 'dark',
  };
}
