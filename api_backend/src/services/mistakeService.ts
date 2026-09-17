import { AppError } from '../middleware/errorHandler.js';
import type { DbMistake, QuestionData } from '../types/domain.js';
import {
  advanceStage,
  nextReviewDate,
  REPETITION_INTERVALS_DAYS,
} from './spacedRepetition.js';
import { getSupabaseAdmin } from './supabase.js';
import { topicKey } from './topicMatcher.js';

async function bumpMastery(input: {
  userId: string;
  subject: string;
  topic: string;
  correct: boolean;
}) {
  try {
    const { upsertMastery } = await import('./learningService.js');
    await upsertMastery(input);
  } catch {
    // mastery is secondary — don't fail mistake logging
  }
}

export type CreateMistakeInput = {
  userId: string;
  questionData: QuestionData;
  sessionId?: string | null;
  curriculumId?: string | null;
  subject?: string | null;
  topic?: string | null;
  struggleScore?: number;
};

export type ReviewMistakeInput = {
  mistakeId: string;
  userId: string;
  /** true = recalled correctly → advance stage; false = reset to stage 0 */
  mastered: boolean;
  /** force close regardless of stage */
  markResolved?: boolean;
};

export type TopicMistakeGroup = {
  key: string;
  subject: string;
  topic: string;
  curriculumId: string | null;
  count: number;
  maxStruggle: number;
  /** Single review item — avoids asking the same topic repeatedly */
  representative: DbMistake;
  relatedIds: string[];
};

function asQuestionData(value: unknown): QuestionData {
  if (value && typeof value === 'object') return value as QuestionData;
  return { prompt: String(value ?? '') };
}

/**
 * Log a mistake. Same open subject+topic → merge into one record (no duplicate reminders).
 */
export async function logMistake(input: CreateMistakeInput): Promise<DbMistake> {
  const subject = input.subject?.trim() || 'Genel';
  const topic = input.topic?.trim() || 'Belirsiz konu';
  const struggle = input.struggleScore ?? 1;
  const db = getSupabaseAdmin();

  const { data: existingRows, error: findError } = await db
    .from('user_mistakes')
    .select('*')
    .eq('user_id', input.userId)
    .eq('resolved', false)
    .eq('subject', subject)
    .eq('topic', topic)
    .order('created_at', { ascending: true })
    .limit(1);

  if (findError) throw findError;

  const existing = (existingRows?.[0] ?? null) as DbMistake | null;

  if (existing) {
    const prev = asQuestionData(existing.question_data);
    const variants = Array.isArray((prev as { variants?: unknown }).variants)
      ? ([...(prev as { variants: string[] }).variants] as string[])
      : prev.prompt
        ? [prev.prompt]
        : [];
    const newPrompt = input.questionData.prompt;
    if (newPrompt && !variants.includes(newPrompt)) {
      variants.push(newPrompt);
      // Keep list bounded
      while (variants.length > 5) variants.shift();
    }

    const mergedQuestion: QuestionData = {
      ...prev,
      ...input.questionData,
      prompt: prev.prompt || newPrompt,
      variants,
      last_prompt: newPrompt,
      merge_count: variants.length,
    };

    const { data, error } = await db
      .from('user_mistakes')
      .update({
        struggle_score: Math.min(
          5,
          Math.max(existing.struggle_score, struggle),
        ),
        curriculum_id: input.curriculumId ?? existing.curriculum_id,
        session_id: input.sessionId ?? existing.session_id,
        question_data: mergedQuestion,
        // Keep earlier due date so topic stays in review queue
        next_review_date:
          existing.next_review_date < nextReviewDate(0).toISOString()
            ? existing.next_review_date
            : nextReviewDate(Math.min(existing.repetition_stage, 1)).toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;

    await bumpMastery({
      userId: input.userId,
      subject,
      topic,
      correct: false,
    });

    return data as DbMistake;
  }

  const stage = 0;
  const { data, error } = await db
    .from('user_mistakes')
    .insert({
      user_id: input.userId,
      session_id: input.sessionId ?? null,
      curriculum_id: input.curriculumId ?? null,
      subject,
      topic,
      question_data: {
        ...input.questionData,
        variants: input.questionData.prompt ? [input.questionData.prompt] : [],
        merge_count: 1,
      },
      repetition_stage: stage,
      next_review_date: nextReviewDate(stage).toISOString(),
      struggle_score: struggle,
      resolved: false,
    })
    .select('*')
    .single();

  if (error) throw error;

  await bumpMastery({
    userId: input.userId,
    subject,
    topic,
    correct: false,
  });

  return data as DbMistake;
}

export async function getDueMistakes(
  userId: string,
  limit = 20,
): Promise<DbMistake[]> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from('user_mistakes')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .lte('next_review_date', now)
    .order('next_review_date', { ascending: true })
    .limit(Math.min(limit, 50));

  if (error) throw error;
  return (data ?? []) as DbMistake[];
}

/** One reminder per topic — prevents redundant same-topic drills in a session */
export function groupMistakesByTopic(
  mistakes: DbMistake[],
): TopicMistakeGroup[] {
  const map = new Map<string, TopicMistakeGroup>();

  for (const m of mistakes) {
    const key = topicKey(m.subject, m.topic);
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        key,
        subject: m.subject ?? 'Genel',
        topic: m.topic ?? 'Belirsiz konu',
        curriculumId: m.curriculum_id,
        count: 1,
        maxStruggle: m.struggle_score,
        representative: m,
        relatedIds: [m.id],
      });
      continue;
    }
    current.count += 1;
    current.relatedIds.push(m.id);
    current.maxStruggle = Math.max(current.maxStruggle, m.struggle_score);
    // Prefer higher struggle, then earlier due date
    const prefer =
      m.struggle_score > current.representative.struggle_score ||
      (m.struggle_score === current.representative.struggle_score &&
        m.next_review_date < current.representative.next_review_date);
    if (prefer) current.representative = m;
  }

  return [...map.values()].sort(
    (a, b) =>
      b.maxStruggle - a.maxStruggle ||
      a.representative.next_review_date.localeCompare(
        b.representative.next_review_date,
      ),
  );
}

export async function getDueMistakesGrouped(
  userId: string,
  limit = 20,
): Promise<{ groups: TopicMistakeGroup[]; mistakes: DbMistake[] }> {
  // Fetch more raw rows so grouping still has material after collapse
  const raw = await getDueMistakes(userId, Math.min(limit * 3, 60));
  const groups = groupMistakesByTopic(raw).slice(0, limit);
  return {
    groups,
    mistakes: groups.map((g) => g.representative),
  };
}

export async function listMistakes(
  userId: string,
  opts: { resolved?: boolean; limit?: number; grouped?: boolean } = {},
): Promise<DbMistake[] | { groups: TopicMistakeGroup[]; mistakes: DbMistake[] }> {
  let query = getSupabaseAdmin()
    .from('user_mistakes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 50, 100));

  if (typeof opts.resolved === 'boolean') {
    query = query.eq('resolved', opts.resolved);
  }

  const { data, error } = await query;
  if (error) throw error;
  const mistakes = (data ?? []) as DbMistake[];
  if (opts.grouped) {
    const groups = groupMistakesByTopic(mistakes);
    return { groups, mistakes: groups.map((g) => g.representative) };
  }
  return mistakes;
}

export async function reviewMistake(input: ReviewMistakeInput): Promise<DbMistake> {
  const { data: existing, error: findError } = await getSupabaseAdmin()
    .from('user_mistakes')
    .select('*')
    .eq('id', input.mistakeId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (findError) throw findError;
  if (!existing) throw new AppError(404, 'Mistake not found', 'MISTAKE_NOT_FOUND');
  if (existing.resolved) {
    throw new AppError(409, 'Mistake already resolved', 'MISTAKE_RESOLVED');
  }

  const maxStage = REPETITION_INTERVALS_DAYS.length - 1;
  const nextStage = advanceStage(existing.repetition_stage, input.mastered);

  const resolved =
    input.markResolved === true ||
    (input.mastered && existing.repetition_stage >= maxStage);

  const { data, error } = await getSupabaseAdmin()
    .from('user_mistakes')
    .update({
      repetition_stage: resolved ? existing.repetition_stage : nextStage,
      next_review_date: resolved
        ? existing.next_review_date
        : nextReviewDate(nextStage).toISOString(),
      resolved,
      times_reviewed: existing.times_reviewed + 1,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.mistakeId)
    .select('*')
    .single();

  if (error) throw error;

  if (existing.subject && existing.topic) {
    await bumpMastery({
      userId: input.userId,
      subject: existing.subject,
      topic: existing.topic,
      correct: input.mastered,
    });
  }

  return data as DbMistake;
}

export async function resolveMistake(
  mistakeId: string,
  userId: string,
): Promise<DbMistake> {
  const { data, error } = await getSupabaseAdmin()
    .from('user_mistakes')
    .update({
      resolved: true,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', mistakeId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AppError(404, 'Mistake not found', 'MISTAKE_NOT_FOUND');
  return data as DbMistake;
}

export type GapTopic = {
  subject: string;
  topic: string;
  openMistakes: number;
  maxStruggle: number;
  masteryScore: number | null;
  curriculumId: string | null;
  samplePrompt: string | null;
};

/** Topics the student is missing / weak on — for parent reports & gap UI */
export async function listGapTopics(
  userId: string,
  limit = 10,
): Promise<GapTopic[]> {
  const { data: openMistakes, error } = await getSupabaseAdmin()
    .from('user_mistakes')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('struggle_score', { ascending: false })
    .limit(100);

  if (error) throw error;

  const groups = groupMistakesByTopic((openMistakes ?? []) as DbMistake[]);
  const { data: masteryRows } = await getSupabaseAdmin()
    .from('topic_mastery')
    .select('subject, topic, mastery_score')
    .eq('user_id', userId);

  const masteryMap = new Map<string, number>();
  for (const row of masteryRows ?? []) {
    masteryMap.set(topicKey(row.subject, row.topic), Number(row.mastery_score));
  }

  const gaps: GapTopic[] = groups.map((g) => ({
    subject: g.subject,
    topic: g.topic,
    openMistakes: g.count,
    maxStruggle: g.maxStruggle,
    masteryScore: masteryMap.get(g.key) ?? null,
    curriculumId: g.curriculumId,
    samplePrompt:
      asQuestionData(g.representative.question_data).prompt ?? null,
  }));

  // Also include weak mastery topics with no open mistake
  for (const row of masteryRows ?? []) {
    const key = topicKey(row.subject, row.topic);
    if (gaps.some((g) => topicKey(g.subject, g.topic) === key)) continue;
    if (Number(row.mastery_score) > 45) continue;
    gaps.push({
      subject: row.subject,
      topic: row.topic,
      openMistakes: 0,
      maxStruggle: 0,
      masteryScore: Number(row.mastery_score),
      curriculumId: null,
      samplePrompt: null,
    });
  }

  gaps.sort(
    (a, b) =>
      b.openMistakes - a.openMistakes ||
      b.maxStruggle - a.maxStruggle ||
      (a.masteryScore ?? 0) - (b.masteryScore ?? 0),
  );

  return gaps.slice(0, limit);
}
