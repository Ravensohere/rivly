/**
 * useCashfree.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cashfree payment gateway integration for Indian payment processing.
 * Supports UPI, Cards, Net Banking, and Wallets.
 */

import { useState, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { PlanId, PLAN_IDS } from '@/constants/pricing';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    Cashfree?: any;
  }
}

export interface CashfreeOrderResponse {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  orderNote?: string;
  paymentSessionId: string;
}

export interface CashfreePaymentOptions {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  redirectMode: 'redirect' | 'modal' | 'minimum';
  mode: 'cardless' | 'card' | 'netbanking' | 'upi' | 'wallet';
  elements?: {
    style?: {
      buttonColor?: string;
      fontFamily?: string;
      fontSize?: string;
    };
  };
}

export interface UseCashfreeReturn {
  openCheckout: (planId: PlanId, isStudentVerified?: boolean) => Promise<void>;
  isProcessing: boolean;
  verifyStudentEmail: (email: string) => Promise<{ valid: boolean; error?: string }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Cashfree credentials live in the worker only. Anything exposed here as a
// VITE_ variable is compiled into the public bundle, so the secret key must
// never appear in this file.

const STUDENT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu(\.[a-z]{2})?$/i;

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Validate student email (.edu domain)
 */
export function isValidStudentEmail(email: string): boolean {
  return STUDENT_EMAIL_REGEX.test(email.trim());
}

/**
 * Load Cashfree checkout script dynamically
 */
function loadCashfreeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
}

// ── Main Hook ─────────────────────────────────────────────────────────────────

export function useCashfree(): UseCashfreeReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthContext();
  const { updatePreferences } = useUserPreferences();

  /**
   * Verify student email (.edu domain)
   */
  const verifyStudentEmail = useCallback(async (email: string): Promise<{ valid: boolean; error?: string }> => {
    if (!email || email.trim() === '') {
      return { valid: false, error: 'Please enter an email address' };
    }

    if (!isValidStudentEmail(email)) {
      return { valid: false, error: 'Not a valid student email. Please use your .edu email address.' };
    }

    // In production, you would verify the email by sending a confirmation link
    // For now, we just validate the domain format
    return { valid: true };
  }, []);

  /**
   * Create order via API
   */
  const createOrder = useCallback(async (planId: PlanId): Promise<CashfreeOrderResponse> => {
    // Only the plan id goes over the wire — the server owns the price.
    return api.payment.createOrder(planId);
  }, []);

  /**
   * Confirm the payment server-side. The worker checks the order against
   * Cashfree; a `true` here means the money actually moved.
   */
  const verifyPayment = useCallback(async (orderId: string, paymentId: string): Promise<boolean> => {
    const result = await api.payment.verify(orderId, paymentId);
    return result.success === true;
  }, []);

  /**
   * Refresh the local tier from server truth after a successful payment.
   * The client never asserts a tier; it reads the one the server granted.
   */
  const syncSubscription = useCallback(async () => {
    try {
      const status = await api.payment.status();
      await updatePreferences({ tier: status.tier || 'free' });
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
    }
  }, [updatePreferences]);

  /**
   * Open Cashfree checkout modal
   */
  const openCheckout = useCallback(async (planId: PlanId, isStudentVerified?: boolean): Promise<void> => {
    // Validate student plan
    if (planId === PLAN_IDS.STUDENT_MONTHLY && !isStudentVerified) {
      toast.error('Please verify your student email first');
      return;
    }

    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    setIsProcessing(true);

    try {
      // Load Cashfree SDK if not already loaded
      await loadCashfreeScript();

      // Create order via API
      const orderData = await createOrder(planId);

      // Configure Cashfree checkout
      const checkoutOptions: CashfreePaymentOptions = {
        orderId: orderData.orderId,
        orderAmount: orderData.orderAmount,
        orderCurrency: orderData.orderCurrency,
        customerName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer',
        customerEmail: user?.email || '',
        customerPhone: user?.phone || '9999999999',
        redirectMode: 'modal',
        mode: 'cardless', // Shows all payment modes
        elements: {
          style: {
            buttonColor: '#7C3AED', // Vivly purple
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
          },
        },
      };

      // Initialize Cashfree checkout
      const cashfree = window.Cashfree;
      
      if (!cashfree) {
        throw new Error('Cashfree SDK not loaded');
      }

      // Create checkout session
      const checkoutSession = {
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: '_modal',
      };

      // Open checkout
      const result = await cashfree.checkout(checkoutSession);
      
      if (result.error) {
        throw new Error(result.error.message || 'Payment failed');
      }

      if (result.paymentDetails) {
        // Payment successful
        const { orderId, paymentId } = result.paymentDetails;
        
        // Verify payment on server
        const verified = await verifyPayment(orderId, paymentId);

        if (verified) {
          // Read back the tier the server actually granted.
          await syncSubscription();

          toast.success('Subscription activated successfully! 🎉');
        } else {
          toast.error('Payment verification failed. Please contact support.');
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.message?.includes('User closed')) {
        // User dismissed the modal - no error toast
        return;
      }
      
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, createOrder, verifyPayment, syncSubscription]);

  return {
    openCheckout,
    isProcessing,
    verifyStudentEmail,
  };
}
