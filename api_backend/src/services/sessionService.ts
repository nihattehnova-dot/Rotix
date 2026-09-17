import type { SessionMode } from '../config/tiers.js';
import { AppError } from '../middleware/errorHandler.js';
import type { DbSession } from '../types/domain.js';
import { getSupabaseAdmin } from './supabase.js';
import { consumeMinutes } from './quotaService.js';
import { addUserPoints, bumpStreak } from './userService.js';

export type StartSessionInput = {
  userId: string;
  mode?: SessionMode;
  hadNewSchoolTopic?: boolean | null;
  topicsCovered?: string[];
  metadata?: Record<string, unknown>;
};

export type EndSessionInput = {
  sessionId: string;
  userId: string;
  topicsCovered?: string[];
  tokensUsed?: number;
  successRate?: number | null;
  pointsEarned?: number;
};

function resolveMode(
  mode: SessionMode | undefined,
  hadNewSchoolTopic: boolean | null | undefined,
): SessionMode {
  if (mode) return mode;
  if (hadNewSchoolTopic === false) return 'gap_fill';
  return 'evening_review';
}

export async function startSession(input: StartSessionInput): Promise<DbSession> {
  const mode = resolveMode(input.mode, input.hadNewSchoolTopic);

  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .insert({
      user_id: input.userId,
      mode,
      had_new_school_topic: input.hadNewSchoolTopic ?? null,
      topics_covered: input.topicsCovered ?? [],
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as DbSession;
}

export async function getSession(sessionId: string, userId: string): Promise<DbSession> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
  return data as DbSession;
}

export async function endSession(input: EndSessionInput): Promise<DbSession> {
  const existing = await getSession(input.sessionId, input.userId);
  if (existing.end_time) {
    throw new AppError(409, 'Session already ended', 'SESSION_ALREADY_ENDED');
  }

  const endTime = new Date();
  const start = new Date(existing.start_time);
  const durationSeconds = Math.max(
    0,
    Math.floor((endTime.getTime() - start.getTime()) / 1000),
  );
  const minutes = Math.max(0.1, durationSeconds / 60);
  const points = input.pointsEarned ?? (durationSeconds >= 60 ? 10 : 5);

  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .update({
      end_time: endTime.toISOString(),
      topics_covered: input.topicsCovered ?? existing.topics_covered,
      tokens_used: input.tokensUsed ?? existing.tokens_used,
      success_rate: input.successRate ?? existing.success_rate,
      points_earned: points,
    })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) throw error;

  await consumeMinutes(input.userId, Number(minutes.toFixed(2)));
  await addUserPoints(input.userId, points);
  await bumpStreak(input.userId);

  return data as DbSession;
}

export async function listSessions(
  userId: string,
  limit = 20,
): Promise<DbSession[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) throw error;
  return (data ?? []) as DbSession[];
}

export async function addSessionTokens(
  sessionId: string,
  userId: string,
  tokens: number,
): Promise<void> {
  if (tokens <= 0) return;
  const session = await getSession(sessionId, userId);
  const { error } = await getSupabaseAdmin()
    .from('sessions')
    .update({ tokens_used: session.tokens_used + tokens })
    .eq('id', sessionId);

  if (error) throw error;
}
