import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './useAuth';

// Regression: signIn/signUp passed the raw input straight to Supabase. Mobile
// keyboards capitalize the first letter and readily append a trailing space,
// and Supabase stores addresses lowercased — so a perfectly valid account
// rejected the login with a bare "Invalid login credentials".
describe('normalizeEmail', () => {
  it('strips the trailing space a mobile keyboard adds', () => {
    expect(normalizeEmail('venkat@example.com ')).toBe('venkat@example.com');
  });

  it('strips leading whitespace from a paste', () => {
    expect(normalizeEmail('  venkat@example.com')).toBe('venkat@example.com');
  });

  it('lowercases an autocapitalized address', () => {
    expect(normalizeEmail('Venkat@Example.com')).toBe('venkat@example.com');
  });

  it('makes signup and signin agree on the same typed address', () => {
    expect(normalizeEmail(' Venkat@Example.com ')).toBe(normalizeEmail('venkat@example.com'));
  });

  it('leaves an already-clean address untouched', () => {
    expect(normalizeEmail('venkat@example.com')).toBe('venkat@example.com');
  });
});
