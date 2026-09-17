import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { startTrialWindow } from './trialService.js';
import { getSupabaseAdmin } from './supabase.js';
import type { DbUser } from '../types/domain.js';
import { AppError } from '../middleware/errorHandler.js';

function getAuthClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new AppError(
      503,
      'Supabase auth not configured',
      'SUPABASE_AUTH_NOT_CONFIGURED',
    );
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function verifyAccessToken(token: string) {
  const client = getAuthClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new AppError(401, 'Invalid token', 'INVALID_TOKEN');
  }
  return data.user;
}

export async function getUserByAuthId(authId: string): Promise<DbUser | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select(
      'id, auth_id, full_name, phone, grade_level, role, tier, streak_count, total_points, parent_user_id, locale, subscription_status, trial_started_at, trial_ends_at, exam_track, target_exam_date',
    )
    .eq('auth_id', authId)
    .maybeSingle();

  if (error) throw error;
  return data as DbUser | null;
}

export async function bootstrapProfile(input: {
  authId: string;
  fullName?: string;
  phone?: string;
  gradeLevel: number;
  role?: 'student' | 'parent';
  examTrack?: string;
}): Promise<DbUser> {
  const existing = await getUserByAuthId(input.authId);
  if (existing) return existing;

  const trial = startTrialWindow();
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .insert({
      auth_id: input.authId,
      full_name: input.fullName ?? null,
      phone: input.phone ?? null,
      grade_level: input.gradeLevel,
      role: input.role ?? 'student',
      exam_track: input.examTrack ?? 'school',
      subscription_status: trial.subscription_status,
      trial_started_at: trial.trial_started_at,
      trial_ends_at: trial.trial_ends_at,
    })
    .select(
      'id, auth_id, full_name, phone, grade_level, role, tier, streak_count, total_points, parent_user_id, locale, subscription_status, trial_started_at, trial_ends_at, exam_track, target_exam_date',
    )
    .single();

  if (error) throw error;
  return data as DbUser;
}
