import { getSupabaseAdmin } from './supabase.js';
import type { DbUser } from '../types/domain.js';

export async function getUserById(id: string): Promise<DbUser | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select(
      'id, auth_id, full_name, phone, grade_level, role, tier, streak_count, total_points, parent_user_id, locale, subscription_status, trial_started_at, trial_ends_at, exam_track, target_exam_date',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DbUser | null;
}

export async function addUserPoints(userId: string, points: number): Promise<void> {
  if (points <= 0) return;

  const user = await getUserById(userId);
  if (!user) return;

  const { error } = await getSupabaseAdmin()
    .from('users')
    .update({ total_points: user.total_points + points })
    .eq('id', userId);

  if (error) throw error;
}

export async function bumpStreak(userId: string): Promise<number> {
  const user = await getUserById(userId);
  if (!user) return 0;

  const next = user.streak_count + 1;
  const { error } = await getSupabaseAdmin()
    .from('users')
    .update({ streak_count: next })
    .eq('id', userId);

  if (error) throw error;
  return next;
}
