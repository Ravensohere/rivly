import { describe, it, expect } from 'vitest';
import { verifyWebhookSignature, isCashfreeConfigured } from './cashfree';
import { getPlan, PLAN_CATALOG } from '../config/plans';
import type { Bindings } from '../types';

const SECRET = 'test-webhook-secret';

async function sign(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}${body}`));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

describe('verifyWebhookSignature', () => {
  const timestamp = '1723800000';
  const body = JSON.stringify({ data: { order: { order_id: 'order_1' } } });

  it('accepts a correctly signed payload', async () => {
    const signature = await sign(SECRET, timestamp, body);
    expect(await verifyWebhookSignature(SECRET, timestamp, body, signature)).toBe(true);
  });

  it('rejects a payload signed with a different secret', async () => {
    const signature = await sign('wrong-secret', timestamp, body);
    expect(await verifyWebhookSignature(SECRET, timestamp, body, signature)).toBe(false);
  });

  it('rejects a tampered body', async () => {
    const signature = await sign(SECRET, timestamp, body);
    const tampered = JSON.stringify({ data: { order: { order_id: 'order_2' } } });
    expect(await verifyWebhookSignature(SECRET, timestamp, tampered, signature)).toBe(false);
  });

  it('rejects a replayed signature under a different timestamp', async () => {
    const signature = await sign(SECRET, timestamp, body);
    expect(await verifyWebhookSignature(SECRET, '1723800999', body, signature)).toBe(false);
  });

  it('rejects missing secret, timestamp, or signature', async () => {
    const signature = await sign(SECRET, timestamp, body);
    expect(await verifyWebhookSignature('', timestamp, body, signature)).toBe(false);
    expect(await verifyWebhookSignature(SECRET, '', body, signature)).toBe(false);
    expect(await verifyWebhookSignature(SECRET, timestamp, body, '')).toBe(false);
  });
});

describe('isCashfreeConfigured', () => {
  it('requires both credentials', () => {
    expect(isCashfreeConfigured({} as Bindings)).toBe(false);
    expect(isCashfreeConfigured({ CASHFREE_APP_ID: 'a' } as Bindings)).toBe(false);
    expect(isCashfreeConfigured({ CASHFREE_SECRET_KEY: 'b' } as Bindings)).toBe(false);
    expect(
      isCashfreeConfigured({ CASHFREE_APP_ID: 'a', CASHFREE_SECRET_KEY: 'b' } as Bindings)
    ).toBe(true);
  });
});

describe('plan catalog', () => {
  it('resolves a known plan to its server-side price and tier', () => {
    expect(getPlan('pro_annual')).toMatchObject({
      id: 'pro_annual',
      tierId: 'pro',
      amount: 2499,
      periodDays: 365,
    });
  });

  it('refuses anything not in the catalog', () => {
    expect(getPlan('pro_annual_free')).toBeNull();
    expect(getPlan('')).toBeNull();
    expect(getPlan(undefined)).toBeNull();
    expect(getPlan(42)).toBeNull();
    // A client cannot smuggle a price through by sending an object.
    expect(getPlan({ tierId: 'pro', amount: 1 })).toBeNull();
  });

  it('has no free or zero-priced paid plan', () => {
    for (const [id, plan] of Object.entries(PLAN_CATALOG)) {
      expect(plan.amount, `${id} must cost something`).toBeGreaterThan(0);
      expect(plan.periodDays, `${id} must have a duration`).toBeGreaterThan(0);
    }
  });
});
