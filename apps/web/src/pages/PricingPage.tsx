/**
 * PricingPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Pricing page with Cashfree payment integration for Indian users.
 * Supports UPI, Cards, Net Banking, and Wallets.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Sparkles, Zap, Crown, GraduationCap,
  ChevronRight, Loader2, Mail, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/ui/PageTransition';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCashfree } from '@/hooks/useCashfree';
import {
  PRICING_TIERS,
  PLAN_IDS,
  PlanId,
  PlanType,
  getPriceForPlan,
  getAnnualSavings,
  getTierDetails,
} from '@/constants/pricing';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanCardProps {
  tierId: string;
  planType: PlanType;
  isPopular?: boolean;
  onSelect: (planId: PlanId) => void;
  isProcessing: boolean;
  processingPlan?: string;
}

interface StudentVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Check className="w-5 h-5" />,
  student: <GraduationCap className="w-5 h-5" />,
  plus: <Zap className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5" />,
};

const PLAN_COLORS: Record<string, string> = {
  free: 'from-gray-500 to-gray-600',
  student: 'from-blue-500 to-cyan-500',
  plus: 'from-violet-500 to-purple-600',
  pro: 'from-amber-500 to-orange-600',
};

// ── Components ────────────────────────────────────────────────────────────────

/**
 * Student email verification component
 */
function StudentVerification({ onVerified, onCancel }: StudentVerificationProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyStudentEmail } = useCashfree();

  const handleVerify = async () => {
    setError('');
    setIsVerifying(true);

    const result = await verifyStudentEmail(email);

    setIsVerifying(false);

    if (result.valid) {
      onVerified();
    } else {
      setError(result.error || 'Invalid email');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-3xl p-6 w-full max-w-md border border-border"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Student Verification</h3>
            <p className="text-sm text-muted-foreground">Verify your .edu email address</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Student Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="pl-10"
                disabled={isVerifying}
              />
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive mt-2 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {error}
              </motion.p>
            )}
          </div>

          <div className="bg-blue-500/5 rounded-xl p-3 text-sm text-blue-400">
            <p>We'll send a verification link to your .edu email address to confirm your student status.</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              disabled={isVerifying || !email}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Individual plan card component
 */
function PlanCard({
  tierId,
  planType,
  isPopular,
  onSelect,
  isProcessing,
  processingPlan,
}: PlanCardProps) {
  const tier = getTierDetails(tierId);
  const price = getPriceForPlan(tierId, planType);
  const savings = getAnnualSavings(tierId);
  const isFree = tierId === 'free';
  const isStudent = tierId === 'student';

  const currentPlan = isProcessing && processingPlan === tierId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`relative rounded-3xl border ${
        isPopular ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/50'
      } bg-card overflow-hidden`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-xl">
          Most Popular
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${PLAN_COLORS[tierId]} flex items-center justify-center text-white`}>
              {PLAN_ICONS[tierId]}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{tier.name}</h3>
              <p className="text-xs text-muted-foreground">{tier.description}</p>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">₹{price}</span>
            {planType === 'annual' && savings > 0 && (
              <span className="text-sm text-emerald-500 font-medium">
                Save {savings}%
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isFree ? 'Forever' : planType === 'annual' ? '/year' : '/month'}
          </p>
        </div>

        {/* Credits */}
        {tier.credits > 0 && (
          <div className="mb-6 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">AI Credits</span>
              <span className="font-semibold text-primary">{tier.credits.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          onClick={() => !isFree && onSelect(`${tierId}_${planType}` as PlanId)}
          disabled={isFree || currentPlan}
          className={`w-full h-12 rounded-xl font-medium ${
            isFree
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : isPopular
              ? 'bg-primary hover:bg-primary/90'
              : 'bg-secondary hover:bg-secondary/90'
          }`}
        >
          {currentPlan ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isFree ? (
            'Current Plan'
          ) : (
            <>
              Subscribe
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Student Badge */}
        {isStudent && (
          <div className="mt-3 flex items-center justify-center gap-1 text-xs text-blue-400">
            <GraduationCap className="w-3 h-3" />
            .edu verification required
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, isGuest } = useAuthContext();
  const { openCheckout, isProcessing } = useCashfree();

  const [planType, setPlanType] = useState<PlanType>('monthly');
  const [showStudentVerification, setShowStudentVerification] = useState(false);
  const [pendingStudentPlan, setPendingStudentPlan] = useState<PlanId | null>(null);

  const handleSelectPlan = useCallback((planId: PlanId) => {
    if (isGuest) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    if (planId === PLAN_IDS.STUDENT_MONTHLY) {
      setShowStudentVerification(true);
      setPendingStudentPlan(planId);
    } else {
      openCheckout(planId);
    }
  }, [isGuest, navigate, openCheckout]);

  const handleStudentVerified = useCallback(() => {
    setShowStudentVerification(false);
    if (pendingStudentPlan) {
      openCheckout(pendingStudentPlan, true);
      setPendingStudentPlan(null);
    }
  }, [pendingStudentPlan, openCheckout]);

  const annualSavings = getAnnualSavings('plus');

  return (
    <PageTransition className="page-container">
      <div className="content-wrapper pt-8 sm:pt-12 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Simple, Transparent Pricing
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Choose Your Productivity Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free, upgrade when you're ready. All plans include a 7-day money-back guarantee.
          </p>
        </motion.div>

        {/* Plan Type Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <span className={`text-sm font-medium ${planType === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <button
            onClick={() => setPlanType(planType === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-14 h-7 rounded-full bg-secondary transition-colors"
          >
            <motion.div
              animate={{ x: planType === 'monthly' ? 2 : 28 }}
              className="absolute top-1 w-5 h-5 rounded-full bg-primary transition-colors"
            />
          </button>
          <span className={`text-sm font-medium ${planType === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Annual
            <span className="ml-2 text-xs text-emerald-500 font-medium">
              Save up to {annualSavings}%
            </span>
          </span>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Free Plan */}
          <PlanCard
            tierId="free"
            planType={planType}
            onSelect={handleSelectPlan}
            isProcessing={isProcessing}
          />

          {/* Student Plan */}
          <PlanCard
            tierId="student"
            planType={planType}
            onSelect={handleSelectPlan}
            isProcessing={isProcessing}
          />

          {/* Plus Plan (Popular) */}
          <PlanCard
            tierId="plus"
            planType={planType}
            isPopular
            onSelect={handleSelectPlan}
            isProcessing={isProcessing}
          />

          {/* Pro Plan */}
          <PlanCard
            tierId="pro"
            planType={planType}
            onSelect={handleSelectPlan}
            isProcessing={isProcessing}
          />
        </div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-8">
            Compare Features
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 font-medium">Free</th>
                  <th className="text-center py-4 px-4 font-medium">Student</th>
                  <th className="text-center py-4 px-4 font-medium">Plus</th>
                  <th className="text-center py-4 px-4 font-medium">Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'AI Credits', free: '100', student: '1,000', plus: '3,000', pro: '10,000' },
                  { feature: 'Focus Timer', free: true, student: true, plus: true, pro: true },
                  { feature: 'Unlimited Tasks', free: false, student: true, plus: true, pro: true },
                  { feature: 'Morning Bridge', free: false, student: true, plus: true, pro: true },
                  { feature: 'Advanced Analytics', free: false, student: false, plus: true, pro: true },
                  { feature: 'AI Planning', free: false, student: false, plus: false, pro: true },
                  { feature: 'Priority Support', free: false, student: false, plus: true, pro: true },
                  { feature: 'API Access', free: false, student: false, plus: false, pro: true },
                ].map((row, index) => (
                  <tr key={index} className="border-b border-border/50">
                    <td className="py-4 px-4 text-muted-foreground">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <Check className="w-4 h-4 text-emerald-500 inline" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 inline" />
                        )
                      ) : (
                        row.free
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.student === 'boolean' ? (
                        row.student ? (
                          <Check className="w-4 h-4 text-emerald-500 inline" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 inline" />
                        )
                      ) : (
                        row.student
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.plus === 'boolean' ? (
                        row.plus ? (
                          <Check className="w-4 h-4 text-emerald-500 inline" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 inline" />
                        )
                      ) : (
                        row.plus
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? (
                          <Check className="w-4 h-4 text-emerald-500 inline" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 inline" />
                        )
                      ) : (
                        row.pro
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'What payment methods are accepted?',
                a: 'We accept UPI, Credit/Debit Cards, Net Banking, and Wallets through our secure Cashfree payment gateway.'
              },
              {
                q: 'Can I cancel my subscription anytime?',
                a: 'Yes, you can cancel your subscription at any time. Your plan will remain active until the end of the billing period.'
              },
              {
                q: 'How does the student discount work?',
                a: 'Students with a valid .edu email address can subscribe to the Student plan at ₹49/month. We verify your email to ensure you\'re a current student.'
              },
              {
                q: 'Is there a refund policy?',
                a: 'Yes, we offer a 7-day money-back guarantee. If you\'re not satisfied, contact support within 7 days for a full refund.'
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/50 p-4 bg-card/50"
              >
                <h3 className="font-medium mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Student Verification Modal */}
      <AnimatePresence>
        {showStudentVerification && (
          <StudentVerification
            onVerified={handleStudentVerified}
            onCancel={() => {
              setShowStudentVerification(false);
              setPendingStudentPlan(null);
            }}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
