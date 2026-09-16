import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Root-level Vitest config for the Vivly monorepo.
 * Runs all tests inside apps/web with the correct jsdom + globals setup.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./apps/web/vitest.setup.ts'],
    include: ['apps/web/src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
});
