import {
  Clock,
  IndianRupee,
  CalendarDays,
  CornerUpLeft,
  Package,
  Plane,
  Briefcase,
  Heart,
  Tag,
  type LucideIcon,
} from 'lucide-react';

/** Mirrors worker/src/config/inboxCategories.ts — keep the two in sync. */
export const INBOX_CATEGORIES = [
  'deadline',
  'bill',
  'meeting',
  'followup',
  'order',
  'travel',
  'work',
  'personal',
  'promotion',
] as const;

export type InboxCategory = (typeof INBOX_CATEGORIES)[number];

export const DEFAULT_INBOX_CATEGORIES: InboxCategory[] = [
  'deadline',
  'bill',
  'meeting',
  'followup',
  'order',
  'travel',
];

export interface CategoryMeta {
  icon: LucideIcon;
  label: string;
  /** Shown under the toggle in Settings. */
  hint: string;
}

export const CATEGORY_META: Record<InboxCategory, CategoryMeta> = {
  deadline: { icon: Clock, label: 'Deadlines', hint: 'Due dates, submissions, expiries' },
  bill: { icon: IndianRupee, label: 'Bills & payments', hint: 'Invoices, fees, recharges, EMIs' },
  meeting: { icon: CalendarDays, label: 'Meetings', hint: 'Calls and appointments, with a join link' },
  followup: { icon: CornerUpLeft, label: 'Follow-ups', hint: 'Emails waiting on your reply' },
  order: { icon: Package, label: 'Orders & deliveries', hint: 'Shipping, tracking, refunds, returns' },
  travel: { icon: Plane, label: 'Travel', hint: 'Flights, trains, hotels, check-ins' },
  work: { icon: Briefcase, label: 'Work & study', hint: 'Assignments, reviews, tickets' },
  personal: { icon: Heart, label: 'Personal', hint: 'Family, doctor, school, bank' },
  promotion: { icon: Tag, label: 'Promotions', hint: 'Sales and offers — off by default' },
};

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category as InboxCategory] ?? CATEGORY_META.deadline;
}
