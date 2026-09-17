import { getSupabaseAdmin, isSupabaseConfigured } from './supabase.js';
import { env } from '../config/env.js';
import { listGapTopics } from './mistakeService.js';

/**
 * Daily parent report job.
 * Includes MEB-linked gap topics so parents see subject/topic deficiencies.
 */
export async function runDailyParentReports(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
}> {
  if (!isSupabaseConfigured()) {
    return { processed: 0, sent: 0, skipped: 0 };
  }

  const db = getSupabaseAdmin();
  const { data: students, error } = await db
    .from('users')
    .select(
      'id, full_name, grade_level, streak_count, total_points, parent_user_id',
    )
    .eq('role', 'student')
    .not('parent_user_id', 'is', null);

  if (error) throw error;

  let processed = 0;
  let sent = 0;
  let skipped = 0;

  for (const student of students ?? []) {
    processed += 1;
    const today = new Date().toISOString().slice(0, 10);

    const { data: sessionRows } = await db
      .from('sessions')
      .select('id, mode, points_earned, success_rate, topics_covered')
      .eq('user_id', student.id)
      .gte('start_time', `${today}T00:00:00.000Z`);

    const gaps = await listGapTopics(student.id, 5);
    const dueTopics = gaps.filter((g) => g.openMistakes > 0);
    const dueCount = dueTopics.reduce((n, g) => n + g.openMistakes, 0);

    const gapLines = gaps.slice(0, 3).map((g) => {
      const mastery =
        g.masteryScore != null ? ` (ustalık ${Math.round(g.masteryScore)})` : '';
      return `• ${g.subject} / ${g.topic}${mastery}`;
    });

    const gapText =
      gapLines.length > 0
        ? ` Eksik/zayıf konular:\n${gapLines.join('\n')}`
        : ' Bugün belirgin eksik konu yok.';

    const payload = {
      studentId: student.id,
      studentName: student.full_name,
      grade: student.grade_level,
      streak: student.streak_count,
      points: student.total_points,
      sessionsToday: sessionRows?.length ?? 0,
      topics: (sessionRows ?? []).flatMap(
        (s) => (s.topics_covered as string[]) ?? [],
      ),
      dueMistakes: dueCount,
      dueTopics: dueTopics.map((g) => ({
        subject: g.subject,
        topic: g.topic,
        openMistakes: g.openMistakes,
        masteryScore: g.masteryScore,
      })),
      gapTopics: gaps,
      messageTr:
        `${student.full_name ?? 'Öğrenci'} bugün ${sessionRows?.length ?? 0} oturum tamamladı. ` +
        `Seri: ${student.streak_count}. Tekrar bekleyen konu: ${dueTopics.length} (${dueCount} kayıt).` +
        gapText,
    };

    const channel = env.whatsappApiUrl ? 'whatsapp' : 'sms';
    let status: 'pending' | 'sent' | 'failed' = 'pending';
    let errorMessage: string | null = null;

    try {
      if (env.whatsappApiUrl && env.whatsappApiToken) {
        await fetch(env.whatsappApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.whatsappApiToken}`,
          },
          body: JSON.stringify({
            to: student.parent_user_id,
            text: payload.messageTr,
          }),
        });
        status = 'sent';
        sent += 1;
      } else if (env.smsApiUrl && env.smsApiToken) {
        await fetch(env.smsApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.smsApiToken}`,
          },
          body: JSON.stringify({
            to: student.parent_user_id,
            text: payload.messageTr,
          }),
        });
        status = 'sent';
        sent += 1;
      } else {
        status = 'pending';
        skipped += 1;
      }
    } catch (e) {
      status = 'failed';
      errorMessage = e instanceof Error ? e.message : 'send failed';
      skipped += 1;
    }

    await db.from('parent_report_logs').insert({
      student_id: student.id,
      parent_id: student.parent_user_id,
      channel,
      payload,
      status,
      error_message: errorMessage,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
  }

  return { processed, sent, skipped };
}
