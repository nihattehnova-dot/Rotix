import type { DbUser } from '../types/domain.js';
import { AppError } from '../middleware/errorHandler.js';
import { TRIAL_DAYS } from '../config/pricing.js';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'past_due';

export type AccessibleUser = DbUser & {
  subscription_status?: SubscriptionStatus;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  exam_track?: string;
  target_exam_date?: string | null;
};

/** True if user may use paid product features (trial or active sub). */
export function hasProductAccess(user: AccessibleUser): boolean {
  const status = user.subscription_status ?? 'trialing';
  if (status === 'active') return true;
  if (status === 'trialing') {
    if (!user.trial_ends_at) return true;
    return new Date(user.trial_ends_at).getTime() > Date.now();
  }
  return false;
}

export function assertProductAccess(user: AccessibleUser): void {
  if (hasProductAccess(user)) return;

  const ends = user.trial_ends_at
    ? new Date(user.trial_ends_at).toISOString()
    : null;

  throw new AppError(
    402,
    ends
      ? `${TRIAL_DAYS} günlük deneme süresi doldu (${ends}). Web üzerinden paket seçerek devam edin.`
      : 'Abonelik gerekli. Web POS ile paket seçin.',
    'TRIAL_OR_SUBSCRIPTION_REQUIRED',
  );
}

export function startTrialWindow(from = new Date()): {
  trial_started_at: string;
  trial_ends_at: string;
  subscription_status: 'trialing';
} {
  const start = new Date(from);
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + TRIAL_DAYS);
  return {
    trial_started_at: start.toISOString(),
    trial_ends_at: end.toISOString(),
    subscription_status: 'trialing',
  };
}
