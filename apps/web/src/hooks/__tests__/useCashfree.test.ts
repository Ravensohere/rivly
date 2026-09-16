/**
 * useCashfree.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for Cashfree payment hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PLAN_IDS } from '@/constants/pricing';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock toast - must be defined before vi.mock
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock contexts and hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: vi.fn(),
}));

// The hook talks to the worker through the typed API client, never raw fetch —
// the worker owns the price, so the client only ever sends a plan id.
vi.mock('@/lib/api', () => ({
  api: {
    payment: {
      createOrder: vi.fn(),
      verify: vi.fn(),
      status: vi.fn(),
    },
  },
}));

import { useCashfree, isValidStudentEmail } from '../useCashfree';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Mock Cashfree SDK
const mockCashfreeCheckout = vi.fn();

const mockUpdatePreferences = vi.fn();

// ── Helper to setup mocks ─────────────────────────────────────────────────────

function setupMocks(options?: {
  user?: any;
  checkoutResult?: any;
  orderResult?: any;
  verifyResult?: any;
  statusResult?: any;
}) {
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    phone: '9999999999',
    user_metadata: { full_name: 'Test User' },
  };

  const defaultCheckoutResult = {
    paymentDetails: { orderId: 'order_123', paymentId: 'pay_456' },
  };

  const defaultOrderResult = {
    orderId: 'order_123',
    orderAmount: 199,
    orderCurrency: 'INR',
    paymentSessionId: 'session_abc',
  };

  vi.mocked(useAuthContext).mockReturnValue({ user: options?.user ?? defaultUser } as any);
  vi.mocked(useUserPreferences).mockReturnValue({ updatePreferences: mockUpdatePreferences } as any);

  mockCashfreeCheckout.mockResolvedValue(options?.checkoutResult ?? defaultCheckoutResult);
  vi.mocked(api.payment.createOrder).mockResolvedValue(options?.orderResult ?? defaultOrderResult);
  vi.mocked(api.payment.verify).mockResolvedValue(options?.verifyResult ?? { success: true });
  vi.mocked(api.payment.status).mockResolvedValue(options?.statusResult ?? { tier: 'plus' });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  window.Cashfree = { checkout: mockCashfreeCheckout };
  setupMocks();
});

afterEach(() => {
  delete window.Cashfree;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCashfree', () => {
  describe('isValidStudentEmail', () => {
    it('returns true for valid .edu email', () => {
      expect(isValidStudentEmail('student@university.edu')).toBe(true);
      expect(isValidStudentEmail('john.doe@college.edu')).toBe(true);
    });

    it('returns true for .edu with country TLD', () => {
      expect(isValidStudentEmail('student@university.edu.in')).toBe(true);
      expect(isValidStudentEmail('test@college.edu.au')).toBe(true);
    });

    it('returns false for non-.edu email', () => {
      expect(isValidStudentEmail('user@gmail.com')).toBe(false);
      expect(isValidStudentEmail('test@company.com')).toBe(false);
    });

    it('returns false for empty email', () => {
      expect(isValidStudentEmail('')).toBe(false);
      expect(isValidStudentEmail('invalid')).toBe(false);
    });
  });

  describe('openCheckout', () => {
    it('calls API and opens Cashfree for plus_monthly', async () => {
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PLUS_MONTHLY);
      });

      expect(api.payment.createOrder).toHaveBeenCalledWith(PLAN_IDS.PLUS_MONTHLY);
      expect(mockCashfreeCheckout).toHaveBeenCalled();
    });

    it('shows error when user is not signed in', async () => {
      vi.mocked(useAuthContext).mockReturnValue({ user: null } as any);
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PLUS_MONTHLY);
      });

      expect(toast.error).toHaveBeenCalledWith('Please sign in to subscribe');
      expect(mockCashfreeCheckout).not.toHaveBeenCalled();
    });

    it('shows error for student plan without verification', async () => {
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.STUDENT_MONTHLY);
      });

      expect(toast.error).toHaveBeenCalledWith('Please verify your student email first');
    });

    it('calls verify-payment API on success', async () => {
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PLUS_MONTHLY);
      });

      expect(api.payment.verify).toHaveBeenCalledWith('order_123', 'pay_456');
    });

    it('shows success toast on successful payment', async () => {
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PLUS_MONTHLY);
      });

      expect(toast.success).toHaveBeenCalledWith('Subscription activated successfully! 🎉');
    });

    it('shows error toast on payment failure', async () => {
      setupMocks({ checkoutResult: { error: { message: 'Payment failed' } } });
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PLUS_MONTHLY);
      });

      expect(toast.error).toHaveBeenCalled();
    });

    it('handles PRO monthly plan', async () => {
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PRO_MONTHLY);
      });

      expect(api.payment.createOrder).toHaveBeenCalledWith(PLAN_IDS.PRO_MONTHLY);
    });

    it('handles PLUS annual plan', async () => {
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PLUS_ANNUAL);
      });

      expect(api.payment.createOrder).toHaveBeenCalledWith(PLAN_IDS.PLUS_ANNUAL);
    });

    it('never sends a price from the client — only the plan id', async () => {
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PLUS_ANNUAL);
      });

      // A second argument here would mean the browser could name its own price.
      expect(vi.mocked(api.payment.createOrder).mock.calls[0]).toEqual([PLAN_IDS.PLUS_ANNUAL]);
    });

    it('adopts the tier the server reports, not one the client picks', async () => {
      setupMocks({ statusResult: { tier: 'pro' } });
      const { result } = renderHook(() => useCashfree());

      await act(async () => {
        await result.current.openCheckout(PLAN_IDS.PLUS_ANNUAL);
      });

      expect(mockUpdatePreferences).toHaveBeenCalledWith({ tier: 'pro' });
    });
  });

  describe('verifyStudentEmail', () => {
    it('returns valid for .edu email', async () => {
      const { result } = renderHook(() => useCashfree());
      const response = await result.current.verifyStudentEmail('student@university.edu');
      expect(response.valid).toBe(true);
    });

    it('returns invalid for non-.edu email', async () => {
      const { result } = renderHook(() => useCashfree());
      const response = await result.current.verifyStudentEmail('user@gmail.com');
      expect(response.valid).toBe(false);
      expect(response.error).toContain('.edu');
    });

    it('returns invalid for empty email', async () => {
      const { result } = renderHook(() => useCashfree());
      const response = await result.current.verifyStudentEmail('');
      expect(response.valid).toBe(false);
    });
  });

  describe('Plan ID constants', () => {
    it('has correct plan IDs defined', () => {
      expect(PLAN_IDS.STUDENT_MONTHLY).toBe('student_monthly');
      expect(PLAN_IDS.PLUS_MONTHLY).toBe('plus_monthly');
      expect(PLAN_IDS.PLUS_ANNUAL).toBe('plus_annual');
      expect(PLAN_IDS.PRO_MONTHLY).toBe('pro_monthly');
      expect(PLAN_IDS.PRO_ANNUAL).toBe('pro_annual');
    });
  });
});
