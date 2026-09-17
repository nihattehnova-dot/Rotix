import type { SubscriptionTier } from './tiers.js';

export type BillingPeriod = 'monthly' | 'annual';

export type PlanSku = `${SubscriptionTier}_${BillingPeriod}`;

export type PlanOffer = {
  sku: PlanSku;
  tier: SubscriptionTier;
  period: BillingPeriod;
  /** Müşteriye yansıyan toplam TL (KDV hariç liste — fatura fazında netleştirilir) */
  totalPriceTry: number;
  /** Aylık referans fiyat */
  monthlyListTry: number;
  /** Yıllıkta 12 ay × aylık (karşılaştırma) */
  annualListIf12Try: number | null;
  /** Yıllıkta 2 ay hediye = 10 ay fiyatı */
  billedMonths: number;
  labelTr: string;
  descriptionTr: string;
};

/** Aylık liste fiyatları (müşteriye yansıyan paket bedeli). */
export const MONTHLY_PRICE_TRY: Record<SubscriptionTier, number> = {
  basic: 349,
  pro: 599,
  limitless: 899,
};

/** Yıllık = 10 × aylık (12 ay hizmet, 10 ay ödeme). */
export const ANNUAL_BILLED_MONTHS = 10;
export const ANNUAL_SERVICE_MONTHS = 12;

export function annualPriceTry(tier: SubscriptionTier): number {
  return MONTHLY_PRICE_TRY[tier] * ANNUAL_BILLED_MONTHS;
}

export function buildPlanCatalog(): PlanOffer[] {
  const tiers: SubscriptionTier[] = ['basic', 'pro', 'limitless'];
  const labels: Record<SubscriptionTier, string> = {
    basic: 'Temel',
    pro: 'Pro',
    limitless: 'Sınırsız',
  };
  const descs: Record<SubscriptionTier, string> = {
    basic: 'Günde 30 dk · aylık 100 soru',
    pro: 'Günde 50 dk · aylık 300 soru · sınav odaklı',
    limitless: 'Sınırsız süre ve soru',
  };

  const offers: PlanOffer[] = [];
  for (const tier of tiers) {
    const monthly = MONTHLY_PRICE_TRY[tier];
    offers.push({
      sku: `${tier}_monthly`,
      tier,
      period: 'monthly',
      totalPriceTry: monthly,
      monthlyListTry: monthly,
      annualListIf12Try: null,
      billedMonths: 1,
      labelTr: `${labels[tier]} · Aylık`,
      descriptionTr: descs[tier],
    });
    const annual = annualPriceTry(tier);
    offers.push({
      sku: `${tier}_annual`,
      tier,
      period: 'annual',
      totalPriceTry: annual,
      monthlyListTry: monthly,
      annualListIf12Try: monthly * ANNUAL_SERVICE_MONTHS,
      billedMonths: ANNUAL_BILLED_MONTHS,
      labelTr: `${labels[tier]} · Yıllık`,
      descriptionTr: `${descs[tier]} · 12 ay kullanım, 10 ay fiyatı (${monthly * 2} TL tasarruf)`,
    });
  }
  return offers;
}

export function getPlanBySku(sku: string): PlanOffer | undefined {
  return buildPlanCatalog().find((p) => p.sku === sku);
}

export const TRIAL_DAYS = 7;

export const PAYMENT_CHANNEL = 'web_pos' as const;
export const PAYMENT_PROVIDER = 'vakifpays' as const;
