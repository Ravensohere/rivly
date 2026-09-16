export const PRICING_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started with Vivly',
    credits: 100,
    features: [
      'Basic Focus Timer',
      '5 Tasks per day',
      'Daily Check-in',
      'Basic Insights'
    ]
  },
  STUDENT: {
    id: 'student',
    name: 'Student',
    price: 49,
    priceAnnual: 490,
    description: 'Affordable productivity for students',
    credits: 1000,
    features: [
      'Everything in Free',
      'Unlimited Tasks',
      'Focus Timer & Sessions',
      'Daily Morning Bridge',
      'Basic Riva Voice',
      'Mood & Energy Logging',
      '.edu Email Verification Required'
    ]
  },
  PLUS: {
    id: 'plus',
    name: 'Plus',
    price: 149,
    priceAnnual: 999,
    description: 'Enhanced productivity features',
    credits: 3000,
    features: [
      'Everything in Student',
      'Advanced Focus Analytics',
      'Task Completion Insights',
      'Priority Support',
      'Custom Themes',
      'Export Data'
    ]
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 349,
    priceAnnual: 2499,
    description: 'Maximum productivity power',
    credits: 10000,
    features: [
      'Everything in Plus',
      'AI-Powered Planning',
      'Advanced Riva Voice',
      'Team Collaboration',
      'API Access',
      'Priority Feature Requests',
      'Dedicated Support'
    ]
  }
} as const;

export type TierId = typeof PRICING_TIERS[keyof typeof PRICING_TIERS]['id'];
export type PlanType = 'monthly' | 'annual';

export const CREDIT_COSTS = {
  SIMPLE_CHAT: 10,
  DEEP_REASONING: 20,
  WEB_SEARCH: 60,
  YOUTUBE_FINDER: 40,
} as const;

export const TOP_UP_PLANS = [
  {
    id: 'starter_topup',
    credits: 1000,
    price: 29,
    name: 'Starter Refill',
    label: '1k Credits'
  },
  {
    id: 'power_topup',
    credits: 5000,
    price: 99,
    name: 'Power Refill',
    label: '5k Credits'
  },
  {
    id: 'max_topup',
    credits: 12000,
    price: 199,
    name: 'Max Refill',
    label: '12k Credits'
  }
] as const;

// Plan IDs for payment gateway
export const PLAN_IDS = {
  STUDENT_MONTHLY: 'student_monthly',
  PLUS_MONTHLY: 'plus_monthly',
  PLUS_ANNUAL: 'plus_annual',
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_annual',
} as const;

export type PlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS];

// Helper to get tier details by ID
export const getTierDetails = (tierId: string) => {
  return Object.values(PRICING_TIERS).find(t => t.id === tierId) || PRICING_TIERS.FREE;
};

// Helper to calculate price based on plan type
export const getPriceForPlan = (tierId: string, planType: PlanType): number => {
  const tier = Object.values(PRICING_TIERS).find(t => t.id === tierId);
  if (!tier || tier.price === 0) return 0;
  
  if (planType === 'annual' && 'priceAnnual' in tier && tier.priceAnnual) {
    return tier.priceAnnual;
  }
  return tier.price;
};

// Helper to get savings percentage for annual plans
export const getAnnualSavings = (tierId: string): number => {
  const tier = Object.values(PRICING_TIERS).find(t => t.id === tierId);
  if (!tier || tier.price === 0) return 0;

  // The free tier has no annual price at all, so narrow before reading it.
  const priceAnnual = 'priceAnnual' in tier ? tier.priceAnnual : undefined;
  if (!priceAnnual) return 0;

  const monthlyTotal = tier.price * 12;
  const savings = monthlyTotal - priceAnnual;
  return Math.round((savings / monthlyTotal) * 100);
};
