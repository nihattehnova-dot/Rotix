import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new AppError(
      503,
      'Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
      'SUPABASE_NOT_CONFIGURED',
    );
  }

  adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}
