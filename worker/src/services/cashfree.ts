/**
 * cashfree.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cashfree Payment Gateway client and webhook signature verification.
 *
 * Every call here is server-to-server with the secret key. Nothing in this
 * module should ever be reachable from, or reproducible by, the browser.
 */

import { Bindings } from '../types';

const API_VERSION = '2023-08-01';

export interface CashfreeOrder {
  order_id: string;
  order_status: string;
  order_amount: number;
  order_currency: string;
  payment_session_id?: string;
}

export class CashfreeNotConfiguredError extends Error {
  constructor() {
    super('Cashfree credentials are not configured');
    this.name = 'CashfreeNotConfiguredError';
  }
}

function baseUrl(env: Bindings): string {
  return env.CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

export function isCashfreeConfigured(env: Bindings): boolean {
  return Boolean(env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY);
}

function authHeaders(env: Bindings): Record<string, string> {
  if (!isCashfreeConfigured(env)) throw new CashfreeNotConfiguredError();
  return {
    'Content-Type': 'application/json',
    'x-api-version': API_VERSION,
    'x-client-id': env.CASHFREE_APP_ID!,
    'x-client-secret': env.CASHFREE_SECRET_KEY!,
  };
}

export interface CreateOrderInput {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  returnUrl: string;
  notifyUrl?: string;
}

/** Create an order with Cashfree and return the session the SDK needs. */
export async function createCashfreeOrder(
  env: Bindings,
  input: CreateOrderInput
): Promise<CashfreeOrder> {
  const response = await fetch(`${baseUrl(env)}/orders`, {
    method: 'POST',
    headers: authHeaders(env),
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: input.currency,
      customer_details: {
        customer_id: input.customerId,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone,
        customer_name: input.customerName,
      },
      order_meta: {
        return_url: input.returnUrl,
        ...(input.notifyUrl ? { notify_url: input.notifyUrl } : {}),
      },
    }),
  });

  const body = (await response.json().catch(() => null)) as any;

  if (!response.ok) {
    throw new Error(body?.message || `Cashfree order creation failed (${response.status})`);
  }
  if (!body?.payment_session_id) {
    throw new Error('Cashfree did not return a payment session');
  }

  return body as CashfreeOrder;
}

/** Read an order back from Cashfree. This is what proves a payment happened. */
export async function fetchCashfreeOrder(
  env: Bindings,
  orderId: string
): Promise<CashfreeOrder | null> {
  const response = await fetch(`${baseUrl(env)}/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: authHeaders(env),
  });

  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as any;
  return body?.order_id ? (body as CashfreeOrder) : null;
}

/** Constant-time string comparison, so a bad signature leaks no timing signal. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a Cashfree webhook signature.
 *
 * Cashfree signs `timestamp + rawBody` with the secret key using HMAC-SHA256
 * and sends it base64-encoded in `x-webhook-signature`.
 */
export async function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string
): Promise<boolean> {
  if (!secret || !timestamp || !signature) return false;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const mac = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${timestamp}${rawBody}`)
    );
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    return timingSafeEqual(expected, signature);
  } catch (error) {
    console.error('[Cashfree] Signature verification error:', error);
    return false;
  }
}
