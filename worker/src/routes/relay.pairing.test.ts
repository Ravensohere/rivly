import { describe, it, expect } from 'vitest';
import { generatePairingCode } from './relay';

describe('generatePairingCode', () => {
  it('is 8 characters, using only the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generatePairingCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it('does not repeat across a large sample', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generatePairingCode());
    // Collisions are possible in principle but should be vanishingly rare at this sample size.
    expect(seen.size).toBeGreaterThan(1990);
  });
});
