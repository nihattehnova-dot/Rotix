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
import {
  getTutorSession,
  lockDetectedTopic,
  recordCorrectOrReset,
  recordWrongAnswer,
} from '../services/tutorSessionState.js';
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
 * Late binding: konu/ders oturum başında zorunlu değil.
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

    const sessionKey = parsed.data.sessionId ?? `anon-${user.id}`;
    let tutorState = getTutorSession(sessionKey, user.id);

    const looksWrong =
      parsed.data.answerWrong === true ||
      (Boolean(parsed.data.studentAnswer?.trim()) &&
        parsed.data.logAsMistake !== false);

    if (looksWrong && parsed.data.studentAnswer?.trim()) {
      tutorState = recordWrongAnswer(sessionKey, user.id);
    } else if (parsed.data.answerWrong === false) {
      tutorState = recordCorrectOrReset(sessionKey, user.id);
    }

    // Soft topic match — asla erken çapa; sadece ipucu
    let match = null as Awaited<ReturnType<typeof resolveQuestionTopic>>;
    try {
      match = await resolveQuestionTopic({
        questionText: parsed.data.questionText,
        gradeLevel: user.grade_level,
        subjectHint: parsed.data.subject ?? tutorState.detectedSubject ?? undefined,
        topicHint: parsed.data.topic ?? tutorState.detectedTopic ?? undefined,
        exam: examFromTrack(user.exam_track),
      });
    } catch {
      match = null;
    }

    const subjectHint =
      tutorState.detectedSubject ??
      match?.subject ??
      parsed.data.subject ??
      undefined;
    const topicHint =
      tutorState.detectedTopic ??
      match?.topic ??
      (parsed.data.topic?.trim() || undefined);

    const result = await runSocraticTurn({
      gradeLevel: user.grade_level,
      subject: subjectHint,
      questionText: parsed.data.questionText,
      studentAnswer: parsed.data.studentAnswer,
      topic: topicHint,
      outcomeCodes: match?.outcomeCodes,
      unitName: match?.unitName ?? undefined,
      wrongAnswerCount: tutorState.wrongAnswerCount,
      forceReveal: tutorState.forceReveal,
      imageBase64: parsed.data.imageBase64,
      imageMimeType: parsed.data.imageMimeType,
    });

    if (result.offTopic) {
      // Kota düşürme — alakasız
      res.json({
        socratic: result,
        topicMatch: null,
        subject: null,
        topic: null,
        mistake: null,
        costPath: 'guardrail_off_topic',
        wrongAnswerCount: tutorState.wrongAnswerCount,
        forceRevealApplied: false,
      });
      return;
    }

    if (result.detectedSubject || result.detectedTopic) {
      tutorState = lockDetectedTopic(
        sessionKey,
        user.id,
        result.detectedSubject,
        result.detectedTopic,
      );
    }

    if (result.sessionComplete || result.forceRevealApplied) {
      recordCorrectOrReset(sessionKey, user.id);
    }

    await consumeQuestion(user.id, 1);

    if (parsed.data.sessionId) {
      await addSessionTokens(parsed.data.sessionId, user.id, result.tokensUsed);
    }

    const subject =
      result.detectedSubject ?? subjectHint ?? parsed.data.subject ?? 'Genel';
    const topic =
      result.detectedTopic ?? topicHint ?? 'Öğrenci sorusu';

    let mistake = null;
    if (parsed.data.logAsMistake && !result.offTopic) {
      mistake = await logMistake({
        userId: user.id,
        sessionId: parsed.data.sessionId,
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
          wrong_answer_count: tutorState.wrongAnswerCount,
          force_reveal: result.forceRevealApplied,
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
      wrongAnswerCount: tutorState.wrongAnswerCount,
      forceRevealApplied: result.forceRevealApplied,
      sessionComplete: result.sessionComplete,
    });
  }),
);
