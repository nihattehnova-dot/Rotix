import { getSupabaseAdmin } from './supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDueMistakes, listGapTopics } from './mistakeService.js';
import { listCurriculumTopics } from './curriculumCatalog.js';

export type StudyPlanItem = {
  subject: string;
  topic: string;
  minutes: number;
  source: 'mistake' | 'curriculum' | 'micro_test' | 'review';
  done: boolean;
};

const MOTIVATION_CARDS = [
  'Küçük adımlar büyük netler getirir — bugün bir konuyu bitirmen yeterli.',
  'Hata defterin seni büyütüyor; unutma eğrisini sen yönetiyorsun.',
  'Takıldığın yerde sor — düşünmek öğrenmektir.',
  '25 dakika odak + 5 dakika mola: kısa sprintler uzun yol alır.',
  'Velin seni izlemiyor; sen kendi koçunsun. Planına sadık kal.',
];

export function pickMotivationCard(seed = Date.now()): string {
  return MOTIVATION_CARDS[seed % MOTIVATION_CARDS.length];
}

/**
 * Rule-based daily plan (zero LLM cost).
 * Priority: due mistakes → weak topics → light curriculum review.
 */
export async function generateDailyPlan(
  userId: string,
  planDate = new Date().toISOString().slice(0, 10),
): Promise<{
  id: string;
  plan_date: string;
  items: StudyPlanItem[];
  generated_by: string;
}> {
  const { getDueMistakesGrouped } = await import('./mistakeService.js');
  const { mistakes: due } = await getDueMistakesGrouped(userId, 5);
  const items: StudyPlanItem[] = [];

  for (const m of due.slice(0, 3)) {
    items.push({
      subject: m.subject ?? 'Genel',
      topic: m.topic ?? 'Hata tekrarı',
      minutes: 15,
      source: 'mistake',
      done: false,
    });
  }

  const { data: weak } = await getSupabaseAdmin()
    .from('topic_mastery')
    .select('subject, topic, mastery_score')
    .eq('user_id', userId)
    .lt('mastery_score', 60)
    .order('mastery_score', { ascending: true })
    .limit(3);

  for (const w of weak ?? []) {
    if (items.length >= 5) break;
    items.push({
      subject: w.subject,
      topic: w.topic,
      minutes: 20,
      source: 'review',
      done: false,
    });
  }

  if (items.length < 3) {
    items.push({
      subject: 'Matematik',
      topic: 'Günlük mikro tekrar',
      minutes: 15,
      source: 'micro_test',
      done: false,
    });
  }

  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from('study_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_date', planDate)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from('study_plans')
      .update({
        items,
        generated_by: 'rules',
        total_count: items.length,
        completed_count: 0,
      })
      .eq('id', existing.id)
      .select('id, plan_date, items, generated_by')
      .single();
    if (error) throw error;
    return data as {
      id: string;
      plan_date: string;
      items: StudyPlanItem[];
      generated_by: string;
    };
  }

  const { data, error } = await db
    .from('study_plans')
    .insert({
      user_id: userId,
      plan_date: planDate,
      items,
      generated_by: 'rules',
      total_count: items.length,
      completed_count: 0,
    })
    .select('id, plan_date, items, generated_by')
    .single();

  if (error) throw error;
  return data as {
    id: string;
    plan_date: string;
    items: StudyPlanItem[];
    generated_by: string;
  };
}

export async function getTodayPlan(userId: string) {
  const planDate = new Date().toISOString().slice(0, 10);
  const { data, error } = await getSupabaseAdmin()
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_date', planDate)
    .maybeSingle();

  if (error) throw error;
  if (!data) return generateDailyPlan(userId, planDate);
  return data;
}

export async function upsertMastery(input: {
  userId: string;
  subject: string;
  topic: string;
  correct: boolean;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: row } = await db
    .from('topic_mastery')
    .select('*')
    .eq('user_id', input.userId)
    .eq('subject', input.subject)
    .eq('topic', input.topic)
    .maybeSingle();

  if (!row) {
    const score = input.correct ? 40 : 15;
    const { error } = await db.from('topic_mastery').insert({
      user_id: input.userId,
      subject: input.subject,
      topic: input.topic,
      mastery_score: score,
      attempts: 1,
      correct_count: input.correct ? 1 : 0,
      last_practiced_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }

  const attempts = row.attempts + 1;
  const correctCount = row.correct_count + (input.correct ? 1 : 0);
  const delta = input.correct ? 8 : -6;
  const mastery = Math.max(0, Math.min(100, Number(row.mastery_score) + delta));

  const { error } = await db
    .from('topic_mastery')
    .update({
      attempts,
      correct_count: correctCount,
      mastery_score: mastery,
      last_practiced_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (error) throw error;
}

export async function listWeakTopics(userId: string, limit = 10) {
  const { data, error } = await getSupabaseAdmin()
    .from('topic_mastery')
    .select('*')
    .eq('user_id', userId)
    .order('mastery_score', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function recordCheckin(input: {
  userId: string;
  hadNewSchoolTopic?: boolean | null;
  mood?: number;
  energy?: number;
  note?: string;
}) {
  const date = new Date().toISOString().slice(0, 10);
  const motivation = pickMotivationCard();
  const { data, error } = await getSupabaseAdmin()
    .from('daily_checkins')
    .upsert(
      {
        user_id: input.userId,
        checkin_date: date,
        had_new_school_topic: input.hadNewSchoolTopic ?? null,
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        note: input.note ?? null,
        motivation_card: motivation,
      },
      { onConflict: 'user_id,checkin_date' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getParentDashboard(parentId: string) {
  const { data: kids, error } = await getSupabaseAdmin()
    .from('users')
    .select(
      'id, full_name, grade_level, streak_count, total_points, subscription_status, trial_ends_at, exam_track',
    )
    .eq('parent_user_id', parentId)
    .eq('role', 'student');

  if (error) throw error;

  const summaries = [];
  for (const kid of kids ?? []) {
    const weak = await listWeakTopics(kid.id, 5);
    const gaps = await listGapTopics(kid.id, 8);
    const due = await getDueMistakes(kid.id, 20);
    const plan = await getTodayPlan(kid.id).catch(() => null);
    summaries.push({
      student: kid,
      weakTopics: weak,
      gapTopics: gaps,
      dueMistakesCount: due.length,
      dueTopicCount: new Set(
        due.map((m) => `${m.subject ?? ''}|${m.topic ?? ''}`),
      ).size,
      todayPlan: plan,
    });
  }

  return { children: summaries };
}

export async function getCurriculumCached(input: {
  grade?: number;
  exam?: string;
  subject?: string;
  topic?: string;
  id?: string;
}) {
  // Primary source: MEB/ÖSYM JSON catalog under assets/data/curriculum
  const fromJson = listCurriculumTopics({
    grade: input.grade,
    exam: input.exam,
    subject: input.subject,
    topic: input.topic,
    id: input.id,
    limit: 200,
  }).map((row) => ({
    id: row.id,
    grade: row.grade,
    subject: row.subject,
    topic: row.topic,
    description: row.description,
    estimated_minutes: row.estimated_minutes,
    unit_name: row.unit_name,
    outcome_codes: row.outcome_codes,
    keywords: row.keywords,
    program_ref: row.program_ref,
    source: row.source,
  }));

  if (fromJson.length > 0) return fromJson;

  // Fallback: sparse Supabase seed rows (grades 1–12 only)
  if (input.exam || input.grade == null) return [];

  let query = getSupabaseAdmin()
    .from('curriculum')
    .select(
      'id, grade, subject, topic, description, estimated_minutes',
    )
    .eq('is_active', true);

  if (input.id) query = query.eq('id', input.id);
  else {
    query = query.eq('grade', input.grade);
    if (input.subject) query = query.eq('subject', input.subject);
    if (input.topic) query = query.eq('topic', input.topic);
  }

  const { data, error } = await query.limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, source: 'db' as const }));
}

export async function getMicroQuiz(curriculumId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('micro_quizzes')
    .select('*')
    .eq('curriculum_id', curriculumId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitMicroQuiz(input: {
  userId: string;
  quizId: string;
  answers: number[];
  sessionId?: string;
  subject: string;
  topic: string;
}) {
  const { data: quiz, error } = await getSupabaseAdmin()
    .from('micro_quizzes')
    .select('*')
    .eq('id', input.quizId)
    .maybeSingle();
  if (error) throw error;
  if (!quiz) throw new AppError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');

  const questions = (quiz.questions as Array<{ correct_index: number }>) ?? [];
  let correct = 0;
  questions.forEach((q, i) => {
    if (input.answers[i] === q.correct_index) correct += 1;
  });
  const score =
    questions.length === 0 ? 0 : (correct / questions.length) * 100;

  const { data: attempt, error: insErr } = await getSupabaseAdmin()
    .from('micro_quiz_attempts')
    .insert({
      user_id: input.userId,
      quiz_id: input.quizId,
      session_id: input.sessionId ?? null,
      answers: input.answers,
      score,
    })
    .select('*')
    .single();
  if (insErr) throw insErr;

  await upsertMastery({
    userId: input.userId,
    subject: input.subject,
    topic: input.topic,
    correct: score >= 70,
  });

  return { attempt, score, correct, total: questions.length };
}
