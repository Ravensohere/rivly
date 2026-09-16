/**
 * payment.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cashfree payment routes.
 *
 * Two rules govern this file:
 *   1. The client names a plan. The server decides the price, the tier and the
 *      duration — all from PLAN_CATALOG.
 *   2. An entitlement is granted only after Cashfree confirms the money moved,
 *      either on the webhook or on a server-side order read. Never on the
 *      client's say-so.
 */

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { createSupabaseClient } from '../services/supabase';
import { getPlan, PLAN_CATALOG, type PlanDefinition } from '../config/plans';
import {
  createCashfreeOrder,
  fetchCashfreeOrder,
  isCashfreeConfigured,
  verifyWebhookSignature,
} from '../services/cashfree';

const paymentRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

/**
 * Grant a subscription for a paid order. Idempotent: an order already marked
 * paid is a no-op, so a webhook retry and a client-side verify cannot both
 * extend the same subscription.
 */
async function grantSubscription(
  supabase: SupabaseClient,
  orderRecord: any,
  plan: PlanDefinition,
  paymentId: string | null
): Promise<{ granted: boolean }> {
  const { data: claimed, error: claimError } = await supabase
    .from('payment_orders')
    .update({
      status: 'paid',
      payment_id: paymentId,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderRecord.id)
    .neq('status', 'paid')
    .select()
    .maybeSingle();

  if (claimError) {
    console.error('[Payment] Failed to mark order paid:', claimError);
    throw new Error('Could not record payment');
  }

  // Another request (webhook or verify) already granted this order.
  if (!claimed) return { granted: false };

  const now = Date.now();
  const endDate = new Date(now + plan.periodDays * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('user_subscriptions').upsert({
    user_id: orderRecord.user_id,
    tier_id: plan.tierId,
    plan_id: orderRecord.plan_id,
    status: 'active',
    start_date: new Date(now).toISOString(),
    end_date: endDate,
  });

  await supabase.from('user_preferences').upsert({
    user_id: orderRecord.user_id,
    tier: plan.tierId,
    updated_at: new Date().toISOString(),
  });

  await supabase.from('events_ledger').insert({
    user_id: orderRecord.user_id,
    event_type: 'subscription_purchased',
    date_key: new Date().toISOString().split('T')[0],
    metadata: {
      plan_id: orderRecord.plan_id,
      tier_id: plan.tierId,
      amount: orderRecord.amount,
      payment_id: paymentId,
    },
  });

  console.log('[Payment] Subscription granted:', {
    userId: orderRecord.user_id,
    planId: orderRecord.plan_id,
  });

  return { granted: true };
}

/**
 * GET /api/payment/plans
 * The catalog the pricing page should render, straight from server truth.
 */
paymentRoutes.get('/plans', (c) => {
  return c.json({
    plans: Object.entries(PLAN_CATALOG).map(([id, plan]) => ({ id, ...plan })),
  });
});

/**
 * POST /api/payment/create-order
 * Creates a Cashfree order. The body carries a planId; everything else is
 * derived server-side.
 */
paymentRoutes.post('/create-order', async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const body = await c.req.json().catch(() => ({}));

    const plan = getPlan(body?.planId);
    if (!plan) {
      return c.json({ error: 'Unknown plan' }, 400);
    }

    if (!isCashfreeConfigured(c.env)) {
      console.error('[Payment] Cashfree credentials missing — refusing to create order');
      return c.json({ error: 'Payments are temporarily unavailable' }, 503);
    }

    const supabase = createSupabaseClient(c.env);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('name, phone')
      .eq('user_id', userId)
      .maybeSingle();

    const email = (userEmail || '').trim().toLowerCase();
    if (!email) {
      return c.json({ error: 'Your account has no email address on file' }, 400);
    }

    const orderId = `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Record the order with the server's amount before going to Cashfree, so
    // verification later compares against a number the client never touched.
    const { data: orderRecord, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        user_id: userId,
        order_id: orderId,
        plan_id: plan.id,
        amount: plan.amount,
        currency: plan.currency,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError || !orderRecord) {
      console.error('[Payment] Failed to create order record:', orderError);
      return c.json({ error: 'Failed to create order' }, 500);
    }

    const frontendUrl = c.env.FRONTEND_URL || 'https://vivly.app';

    let cashfreeOrder;
    try {
      cashfreeOrder = await createCashfreeOrder(c.env, {
        orderId,
        amount: plan.amount,
        currency: plan.currency,
        customerId: userId,
        customerEmail: email,
        customerPhone: profileData?.phone || '9999999999',
        customerName: profileData?.name || email.split('@')[0] || 'Customer',
        returnUrl: `${frontendUrl}/pricing?order_id={order_id}`,
        notifyUrl: `${new URL(c.req.url).origin}/api/payment/webhook`,
      });
    } catch (error: any) {
      await supabase
        .from('payment_orders')
        .update({ status: 'failed' })
        .eq('id', orderRecord.id);
      console.error('[Payment] Cashfree order creation failed:', error);
      return c.json({ error: 'Could not start checkout. Please try again.' }, 502);
    }

    return c.json({
      orderId,
      orderAmount: plan.amount,
      orderCurrency: plan.currency,
      orderNote: plan.label,
      paymentSessionId: cashfreeOrder.payment_session_id,
    });
  } catch (error: any) {
    console.error('[Payment] Create order error:', error);
    return c.json({ error: 'Failed to create order' }, 500);
  }
});

/**
 * POST /api/payment/verify-payment
 * Confirms an order against Cashfree and grants the subscription if it is paid.
 * The webhook is the primary path; this exists so the UI can settle promptly
 * after checkout without waiting for the callback.
 */
paymentRoutes.post('/verify-payment', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => ({}));
    const { orderId } = body || {};

    if (!orderId || typeof orderId !== 'string') {
      return c.json({ error: 'Order ID is required' }, 400);
    }

    if (!isCashfreeConfigured(c.env)) {
      return c.json({ error: 'Payments are temporarily unavailable' }, 503);
    }

    const supabase = createSupabaseClient(c.env);

    const { data: orderRecord } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!orderRecord) {
      return c.json({ error: 'Order not found' }, 404);
    }
    if (orderRecord.user_id !== userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const plan = getPlan(orderRecord.plan_id);
    if (!plan) {
      console.error('[Payment] Order references an unknown plan:', orderRecord.plan_id);
      return c.json({ error: 'Order references an unknown plan' }, 500);
    }

    // Already settled by the webhook — report success without re-granting.
    if (orderRecord.status === 'paid') {
      return c.json({ success: true, planId: plan.id, tierId: plan.tierId });
    }

    const remoteOrder = await fetchCashfreeOrder(c.env, orderId);
    if (!remoteOrder) {
      return c.json({ success: false, error: 'Could not confirm payment' }, 502);
    }

    const isPaid =
      remoteOrder.order_status === 'PAID' && Number(remoteOrder.order_amount) === plan.amount;

    if (!isPaid) {
      await supabase
        .from('payment_orders')
        .update({ status: remoteOrder.order_status === 'PAID' ? 'mismatch' : 'failed' })
        .eq('id', orderRecord.id);

      if (remoteOrder.order_status === 'PAID') {
        console.error('[Payment] Amount mismatch', {
          orderId,
          expected: plan.amount,
          received: remoteOrder.order_amount,
        });
      }
      return c.json({ success: false, error: 'Payment not confirmed' }, 400);
    }

    await grantSubscription(supabase, orderRecord, plan, body?.paymentId ?? null);

    return c.json({ success: true, planId: plan.id, tierId: plan.tierId });
  } catch (error: any) {
    console.error('[Payment] Verify payment error:', error);
    return c.json({ error: 'Failed to verify payment' }, 500);
  }
});

/**
 * POST /api/payment/webhook
 * Cashfree's server-to-server callback. Public by necessity — the signature is
 * the authentication, so an unsigned or missigned request is rejected outright.
 */
paymentRoutes.post('/webhook', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-webhook-signature') || '';
  const timestamp = c.req.header('x-webhook-timestamp') || '';
  const secret = c.env.CASHFREE_WEBHOOK_SECRET || c.env.CASHFREE_SECRET_KEY || '';

  const valid = await verifyWebhookSignature(secret, timestamp, rawBody, signature);
  if (!valid) {
    console.warn('[Payment] Rejected webhook with invalid signature');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Malformed payload' }, 400);
  }

  const orderId = event?.data?.order?.order_id;
  const paymentStatus = event?.data?.payment?.payment_status;
  const paymentId = event?.data?.payment?.cf_payment_id ?? null;
  const paidAmount = Number(event?.data?.order?.order_amount ?? NaN);

  if (!orderId) {
    return c.json({ received: true, ignored: 'no order id' });
  }
  if (paymentStatus !== 'SUCCESS') {
    return c.json({ received: true, ignored: `status ${paymentStatus}` });
  }

  const supabase = createSupabaseClient(c.env);
  const { data: orderRecord } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (!orderRecord) {
    console.error('[Payment] Webhook for unknown order:', orderId);
    return c.json({ received: true, ignored: 'unknown order' });
  }

  const plan = getPlan(orderRecord.plan_id);
  if (!plan) {
    console.error('[Payment] Webhook order references unknown plan:', orderRecord.plan_id);
    return c.json({ received: true, ignored: 'unknown plan' });
  }

  if (Number.isFinite(paidAmount) && paidAmount !== plan.amount) {
    console.error('[Payment] Webhook amount mismatch', {
      orderId,
      expected: plan.amount,
      received: paidAmount,
    });
    await supabase.from('payment_orders').update({ status: 'mismatch' }).eq('id', orderRecord.id);
    return c.json({ received: true, ignored: 'amount mismatch' });
  }

  try {
    await grantSubscription(supabase, orderRecord, plan, paymentId ? String(paymentId) : null);
  } catch (error) {
    console.error('[Payment] Webhook grant failed:', error);
    return c.json({ error: 'Could not process webhook' }, 500);
  }

  return c.json({ received: true });
});

/**
 * GET /api/payment/status
 * Current entitlement for the signed-in user. This is the only source the
 * client should trust for what tier someone is on.
 */
paymentRoutes.get('/status', async (c) => {
  try {
    const userId = c.get('userId');
    const supabase = createSupabaseClient(c.env);

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      return c.json({ active: false, tier: 'free' });
    }

    if (new Date() > new Date(subscription.end_date)) {
      await supabase
        .from('user_subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);

      await supabase.from('user_preferences').upsert({
        user_id: userId,
        tier: 'free',
        updated_at: new Date().toISOString(),
      });

      return c.json({ active: false, tier: 'free', expired: true });
    }

    return c.json({
      active: true,
      tier: subscription.tier_id,
      planId: subscription.plan_id,
      endDate: subscription.end_date,
    });
  } catch (error: any) {
    console.error('[Payment] Get status error:', error);
    return c.json({ error: 'Failed to get subscription status' }, 500);
  }
});

/**
 * POST /api/payment/cancel-subscription
 */
paymentRoutes.post('/cancel-subscription', async (c) => {
  try {
    const userId = c.get('userId');
    const supabase = createSupabaseClient(c.env);

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!subscription) {
      return c.json({ error: 'No active subscription found' }, 404);
    }

    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', subscription.id);

    await supabase.from('events_ledger').insert({
      user_id: userId,
      event_type: 'subscription_cancelled',
      date_key: new Date().toISOString().split('T')[0],
      metadata: { plan_id: subscription.plan_id, tier_id: subscription.tier_id },
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Payment] Cancel subscription error:', error);
    return c.json({ error: 'Failed to cancel subscription' }, 500);
  }
});

export default paymentRoutes;
