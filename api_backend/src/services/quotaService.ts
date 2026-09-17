import { isUnlimited, TIER_QUOTAS, type SubscriptionTier } from '../config/tiers.js';
import { AppError } from '../middleware/errorHandler.js';
import type { DbUsageQuota, DbUser } from '../types/domain.js';
import { getSupabaseAdmin } from './supabase.js';

export type QuotaCheckKind = 'question' | 'session_start';

function utcNowParts(d = new Date()) {
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    date: d.toISOString().slice(0, 10),
  };
}

export type QuotaSnapshot = {
  tier: SubscriptionTier;
  limits: {
    dailyMinutes: number;
    monthlyQuestions: number;
  };
  usage: {
    dailyMinutesUsed: number;
    dailyQuestionsUsed: number;
    monthlyMinutesUsed: number;
    monthlyQuestionsUsed: number;
  };
  remaining: {
    dailyMinutes: number | null;
    monthlyQuestions: number | null;
  };
};

async function loadOrCreateQuotaRow(userId: string): Promise<DbUsageQuota> {
  const { year, month, date } = utcNowParts();
  const db = getSupabaseAdmin();

  const { data: existing, error: selectError } = await db
    .from('usage_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('period_year', year)
    .eq('period_month', month)
    .maybeSingle();

  if (selectError) throw selectError;

  if (!existing) {
    const { data: created, error: insertError } = await db
      .from('usage_quotas')
      .insert({
        user_id: userId,
        period_year: year,
        period_month: month,
        questions_used: 0,
        minutes_used: 0,
        daily_date: date,
        daily_minutes_used: 0,
        daily_questions_used: 0,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;
    return created as DbUsageQuota;
  }

  // Roll daily counters when the UTC day changes
  if (existing.daily_date !== date) {
    const { data: rolled, error: rollError } = await db
      .from('usage_quotas')
      .update({
        daily_date: date,
        daily_minutes_used: 0,
        daily_questions_used: 0,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (rollError) throw rollError;
    return rolled as DbUsageQuota;
  }

  return existing as DbUsageQuota;
}

export async function getQuotaSnapshot(user: DbUser): Promise<QuotaSnapshot> {
  const row = await loadOrCreateQuotaRow(user.id);
  const limits = TIER_QUOTAS[user.tier];

  const remainingDaily = isUnlimited(limits.dailyMinutes)
    ? null
    : Math.max(0, limits.dailyMinutes - Number(row.daily_minutes_used));

  const remainingQuestions = isUnlimited(limits.monthlyQuestions)
    ? null
    : Math.max(0, limits.monthlyQuestions - row.questions_used);

  return {
    tier: user.tier,
    limits: {
      dailyMinutes: limits.dailyMinutes,
      monthlyQuestions: limits.monthlyQuestions,
    },
    usage: {
      dailyMinutesUsed: Number(row.daily_minutes_used),
      dailyQuestionsUsed: row.daily_questions_used,
      monthlyMinutesUsed: Number(row.minutes_used),
      monthlyQuestionsUsed: row.questions_used,
    },
    remaining: {
      dailyMinutes: remainingDaily,
      monthlyQuestions: remainingQuestions,
    },
  };
}

export async function assertWithinQuota(user: DbUser, kind: QuotaCheckKind): Promise<void> {
  const snap = await getQuotaSnapshot(user);
  const limits = TIER_QUOTAS[user.tier];

  if (kind === 'question' && !isUnlimited(limits.monthlyQuestions)) {
    if (snap.usage.monthlyQuestionsUsed >= limits.monthlyQuestions) {
      throw new AppError(
        429,
        `Aylık soru kotası doldu (${limits.monthlyQuestions}). Paketi yükseltin.`,
        'QUOTA_MONTHLY_QUESTIONS',
      );
    }
  }

  if (kind === 'session_start' && !isUnlimited(limits.dailyMinutes)) {
    if (snap.usage.dailyMinutesUsed >= limits.dailyMinutes) {
      throw new AppError(
        429,
        `Günlük süre kotası doldu (${limits.dailyMinutes} dk). Yarın tekrar deneyin veya paketi yükseltin.`,
        'QUOTA_DAILY_MINUTES',
      );
    }
  }
}

export async function consumeQuestion(userId: string, count = 1): Promise<DbUsageQuota> {
  const row = await loadOrCreateQuotaRow(userId);
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from('usage_quotas')
    .update({
      questions_used: row.questions_used + count,
      daily_questions_used: row.daily_questions_used + count,
    })
    .eq('id', row.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as DbUsageQuota;
}

export async function consumeMinutes(userId: string, minutes: number): Promise<DbUsageQuota> {
  if (minutes <= 0) {
    return loadOrCreateQuotaRow(userId);
  }

  const row = await loadOrCreateQuotaRow(userId);
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from('usage_quotas')
    .update({
      minutes_used: Number(row.minutes_used) + minutes,
      daily_minutes_used: Number(row.daily_minutes_used) + minutes,
    })
    .eq('id', row.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as DbUsageQuota;
}
