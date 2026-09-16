/**
 * plans.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side plan catalog — the only place a price is decided.
 *
 * The client sends a plan id and nothing else. Amount, tier and duration are
 * all looked up here, so a tampered request buys nothing.
 *
 * Keep in sync with apps/web/src/constants/pricing.ts, which is display-only.
 */

export interface PlanDefinition {
  /** Tier granted on successful payment. */
  tierId: 'student' | 'plus' | 'pro';
  /** Price in INR. Authoritative. */
  amount: number;
  currency: 'INR';
  /** Subscription length granted, in days. */
  periodDays: number;
  label: string;
}

export const PLAN_CATALOG = {
  student_monthly: { tierId: 'student', amount: 49, currency: 'INR', periodDays: 30, label: 'Student Monthly' },
  plus_monthly: { tierId: 'plus', amount: 149, currency: 'INR', periodDays: 30, label: 'Plus Monthly' },
  plus_annual: { tierId: 'plus', amount: 999, currency: 'INR', periodDays: 365, label: 'Plus Annual' },
  pro_monthly: { tierId: 'pro', amount: 349, currency: 'INR', periodDays: 30, label: 'Pro Monthly' },
  pro_annual: { tierId: 'pro', amount: 2499, currency: 'INR', periodDays: 365, label: 'Pro Annual' },
} as const satisfies Record<string, PlanDefinition>;

export type PlanId = keyof typeof PLAN_CATALOG;

export function getPlan(planId: unknown): (PlanDefinition & { id: PlanId }) | null {
  if (typeof planId !== 'string') return null;
  const plan = (PLAN_CATALOG as Record<string, PlanDefinition>)[planId];
  return plan ? { ...plan, id: planId as PlanId } : null;
}
