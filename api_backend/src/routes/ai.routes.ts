import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { enforceQuota } from '../middleware/enforceQuota.js';
import { AppError } from '../middleware/errorHandler.js';
import { runSocraticTurn } from '../services/ai/socraticPipeline.js';
import { generateWarmSpeech } from '../services/ai/geminiTts.js';
import { logMistake } from '../services/mistakeService.js';
import { resolveQuestionTopic } from '../services/topicMatcher.js';
import { consumeMinutes, consumeQuestion } from '../services/quotaService.js';
import { addSessionTokens } from '../services/sessionService.js';
import { socraticTurnSchema } from '../validators/schemas.js';

function examFromTrack(track?: string | null): string | undefined {
  if (!track) return undefined;
  const t = track.toUpperCase();
  if (t === 'LGS' || t === 'TYT' || t === 'AYT') return t;
  return undefined;
}

export const aiRouter = Router();

const speakSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().optional(),
  /** evening_interrupt → dakika kotası; homework → soru kotası (ayrı endpoint) */
  billAs: z.enum(['none', 'minute']).default('none'),
  minutes: z.number().positive().max(10).optional(),
});

/**
 * Sevecen Gemini TTS. Standart konu metinleri mümkünse DB'den gelir.
 */
aiRouter.post(
  '/speak',
  asyncHandler(async (req, res) => {
    const parsed = speakSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }
    const speech = await generateWarmSpeech(
      parsed.data.text,
      parsed.data.voice ?? 'Callirrhoe',
    );
    if (parsed.data.billAs === 'minute' && req.user) {
      await consumeMinutes(req.user.id, parsed.data.minutes ?? 0.5);
    }
    res.json({
      mimeType: speech.mimeType,
      audioBase64: speech.audioBase64,
      voice: parsed.data.voice ?? 'Callirrhoe',
      engine: 'gemini-tts',
    });
  }),
);

/** Açılış: bugün hangi konuları işlediniz? */
aiRouter.get(
  '/greeting',
  asyncHandler(async (req, res) => {
    const name = (req.query.name as string) || 'dostum';
    const text =
      `Merhaba ${name}! Ben Roti, senin özel ders arkadaşın. ` +
      `Bugün okulda hangi konuları işlediniz? Sesinle söylemen yeterli — ` +
      `istersen bir ders seçip birlikte tekrar ederiz. Anlamadığın yerde durdurup soru sorabilirsin.`;
    try {
      const speech = await generateWarmSpeech(text, 'Callirrhoe');
      res.json({
        text,
        mimeType: speech.mimeType,
        audioBase64: speech.audioBase64,
        engine: 'gemini-tts',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gemini TTS unavailable';
      // Key yok/geçersizse metin dön — istemci uyarı göstersin
      res.json({
        text,
        mimeType: null,
        audioBase64: null,
        fallback: true,
        error: message,
      });
    }
  }),
);

/**
 * Dynamic Gemini path — Socratic Q&A only.
 * Standard lectures must use curriculum cache (not this endpoint).
 */
aiRouter.post(
  '/socratic',
  enforceQuota('question'),
  asyncHandler(async (req, res) => {
    const parsed = socraticTurnSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }

    const user = req.user!;
    if (!user.grade_level) {
      throw new AppError(400, 'Student grade_level is required', 'GRADE_REQUIRED');
    }

    const match = await resolveQuestionTopic({
      questionText: parsed.data.questionText,
      gradeLevel: user.grade_level,
      subjectHint: parsed.data.subject,
      topicHint: parsed.data.topic,
      exam: examFromTrack(user.exam_track),
    });

    const subject = match?.subject ?? parsed.data.subject;
    const topic =
      match?.topic ??
      (parsed.data.topic?.trim() || undefined);

    if (!topic?.trim() && !subject?.trim()) {
      throw new AppError(
        400,
        'Konu veya ders gerekli — konu dışı sohbet kapalı',
        'TOPIC_REQUIRED',
      );
    }

    const result = await runSocraticTurn({
      gradeLevel: user.grade_level,
      subject,
      questionText: parsed.data.questionText,
      studentAnswer: parsed.data.studentAnswer,
      topic,
      outcomeCodes: match?.outcomeCodes,
      unitName: match?.unitName ?? undefined,
    });

    await consumeQuestion(user.id, 1);

    if (parsed.data.sessionId) {
      await addSessionTokens(parsed.data.sessionId, user.id, result.tokensUsed);
    }

    let mistake = null;
    if (parsed.data.logAsMistake) {
      mistake = await logMistake({
        userId: user.id,
        sessionId: parsed.data.sessionId,
        // catalog ids may not exist in Supabase FK yet — keep in question_data
        curriculumId: null,
        subject,
        topic,
        struggleScore: parsed.data.struggleScore ?? 3,
        questionData: {
          prompt: parsed.data.questionText,
          student_answer: parsed.data.studentAnswer,
          source: 'socratic',
          matched_curriculum_id: match?.curriculumId,
          matched_confidence: match?.confidence,
          outcome_codes: match?.outcomeCodes,
        },
      });
    }

    res.json({
      socratic: result,
      topicMatch: match,
      subject,
      topic,
      mistake,
      costPath: 'dynamic_gemini',
    });
  }),
);