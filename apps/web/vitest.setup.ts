import { vi } from 'vitest';
// The /vitest entry point registers the matchers with Vitest's expect *and*
// augments its Assertion type — importing the bare package does neither.
import '@testing-library/jest-dom/vitest';

// Emulate Jest's global mapping so all existing mock/timers syntax runs flawlessly in Vitest
(globalThis as any).jest = vi;

// Mock scrollBy for jsdom (not implemented)
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollBy = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}
