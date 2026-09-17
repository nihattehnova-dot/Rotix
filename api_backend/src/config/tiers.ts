import { env } from './env.js';

export type SubscriptionTier = 'basic' | 'pro' | 'limitless';

export type TierLimits = {
  dailyMinutes: number;
  monthlyQuestions: number;
  priceTry: number;
};

export const TIER_QUOTAS: Record<SubscriptionTier, TierLimits> = {
  basic: {
    dailyMinutes: env.tierLimits.basic.dailyMinutes,
    monthlyQuestions: env.tierLimits.basic.monthlyQuestions,
    priceTry: 349,
  },
  pro: {
    dailyMinutes: env.tierLimits.pro.dailyMinutes,
    monthlyQuestions: env.tierLimits.pro.monthlyQuestions,
    priceTry: 599,
  },
  limitless: {
    dailyMinutes: env.tierLimits.limitless.dailyMinutes,
    monthlyQuestions: env.tierLimits.limitless.monthlyQuestions,
    priceTry: 899,
  },
};

/** @deprecated Prefer config/pricing.ts catalog (monthly + annual). */
export { MONTHLY_PRICE_TRY, annualPriceTry, buildPlanCatalog } from './pricing.js';


export type UserRole = 'student' | 'parent';

export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type PedagogicalBand = 'primary' | 'middle' | 'exam_lgs' | 'high' | 'exam_yks';

export type SessionMode =
  | 'evening_review'
  | 'socratic'
  | 'spaced_repetition'
  | 'gap_fill';

export function pedagogicalBandForGrade(grade: number): PedagogicalBand {
  if (grade <= 4) return 'primary';
  if (grade <= 7) return 'middle';
  if (grade === 8) return 'exam_lgs';
  if (grade <= 11) return 'high';
  return 'exam_yks';
}

export function isUnlimited(value: number): boolean {
  return value < 0;
}
