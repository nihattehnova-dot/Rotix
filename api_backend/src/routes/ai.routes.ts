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
import { runInBackground } from '../services/backgroundTasks.js';
import {
  lookupSemanticCache,
  storeSemanticCache,
} from '../services/semanticCache.js';
import { optimizeQuestionImage } from '../services/imageOptimize.js';
import { suggestVideoCard } from '../services/videoCatalog.js';
import {
  advanceQuestionStage,
  applyLoopGuard,
  getRecentHistory,
  getTutorSession,
  lockDetectedTopic,
  pushTurnHistory,
  recordCorrectOrReset,
  recordInteractionTurn,
  recordWrongAnswer,
  setOriginalQuestion,
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
  sessionId: z.string().optional(),
  /** Cümle cümle WAV dizisi (kesilme önleme) */
  sentenceChunks: z.boolean().optional().default(true),
  billAs: z.enum(['none', 'minute']).default('none'),
  minutes: z.number().positive().max(10).optional(),
});

aiRouter.post(
  '/speak',
  asyncHandler(async (req, res) => {
    const parsed = speakSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }
    const { text, voice, sessionId, sentenceChunks, billAs, minutes } =
      parsed.data;
    if (sentenceChunks) {
      const { generateWarmSpeechSentences } = await import(
        '../services/ai/geminiTts.js'
      );
      const chunks = await generateWarmSpeechSentences(text, {
        voice,
        sessionId,
      });
      if (billAs === 'minute' && req.user) {
        await consumeMinutes(req.user.id, minutes ?? 0.5);
      }
      res.json({
        chunks: chunks.map((c) => ({
          mimeType: c.mimeType,
          audioBase64: c.audioBase64,
          index: c.index,
          text: c.text,
          done: c.done,
        })),
        voice: chunks[0]?.voiceName ?? 'Callirrhoe',
        seed: chunks[0]?.seed,
        engine: 'gemini-tts-sentences',
      });
      return;
    }
    const speech = await generateWarmSpeech(text, voice, sessionId);
    if (billAs === 'minute' && req.user) {
      await consumeMinutes(req.user.id, minutes ?? 0.5);
    }
    res.json({
      mimeType: speech.mimeType,
      audioBase64: speech.audioBase64,
      voice: speech.voiceName,
      seed: speech.seed,
      engine: 'gemini-tts',
    });
  }),
);

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

type SocraticBody = z.infer<typeof socraticTurnSchema>;

async function executeSocraticTurn(input: {
  userId: string;
  gradeLevel: number;
  examTrack?: string | null;
  body: SocraticBody;
}) {
  const { body, userId, gradeLevel } = input;
  const sessionKey = body.sessionId ?? `anon-${userId}`;
  let tutorState = getTutorSession(sessionKey, userId);
  tutorState = setOriginalQuestion(sessionKey, userId, body.questionText);

  const looksWrong =
    body.answerWrong === true ||
    (Boolean(body.studentAnswer?.trim()) && body.logAsMistake !== false);

  if (looksWrong && body.studentAnswer?.trim()) {
    tutorState = recordWrongAnswer(
      sessionKey,
      userId,
      body.studentAnswer,
    );
    tutorState = applyLoopGuard(sessionKey, userId);
  } else if (body.answerWrong === false) {
    tutorState = recordCorrectOrReset(sessionKey, userId);
  }

  tutorState = recordInteractionTurn(sessionKey, userId);

  // Semantic cache — görsel yoksa ve Exit değilse
  const canCache = !body.imageBase64 && !tutorState.forceReveal;
  if (canCache) {
    const cached = lookupSemanticCache({
      questionText: body.questionText + (body.studentAnswer ?? ''),
      gradeLevel,
    });
    if (cached.hit) {
      return {
        payload: {
          ...(cached.entry.response as Record<string, unknown>),
          costPath: 'semantic_cache',
          cacheHit: true,
          cacheSimilarity: cached.similarity,
        },
        fromCache: true as const,
      };
    }
  }

  // Topic match — konu kilitli / takip cevabı / reveal → ATLA (latency)
  let match = null as Awaited<ReturnType<typeof resolveQuestionTopic>>;
  const skipTopicMatch =
    Boolean(tutorState.detectedTopic) ||
    Boolean(body.studentAnswer?.trim()) ||
    tutorState.forceReveal;
  if (!skipTopicMatch) {
    try {
      match = await resolveQuestionTopic({
        questionText: body.questionText,
        gradeLevel,
        subjectHint: body.subject ?? tutorState.detectedSubject ?? undefined,
        topicHint: body.topic ?? undefined,
        exam: examFromTrack(input.examTrack),
      });
    } catch {
      match = null;
    }
  }

  const subjectHint =
    tutorState.detectedSubject ??
    match?.subject ??
    body.subject ??
    undefined;
  const topicHint =
    tutorState.detectedTopic ??
    match?.topic ??
    (body.topic?.trim() || undefined);

  // Takip turunda görseli tekrar gönderme — yalnızca ilk görsel tur
  const sendImage =
    Boolean(body.imageBase64) &&
    tutorState.interactionTurnCount <= 1 &&
    !body.studentAnswer;

  let imageBase64 = sendImage ? body.imageBase64 : undefined;
  let imageMimeType = sendImage ? body.imageMimeType : undefined;
  if (imageBase64) {
    const opt = await optimizeQuestionImage({
      imageBase64,
      mimeType: imageMimeType,
    });
    imageBase64 = opt.base64;
    imageMimeType = opt.mimeType;
  }

  pushTurnHistory(
    sessionKey,
    userId,
    'user',
    `${body.questionText}${body.studentAnswer ? ` → ${body.studentAnswer}` : ''}`,
  );

  const result = await runSocraticTurn({
    gradeLevel,
    subject: subjectHint,
    questionText: tutorState.originalQuestion ?? body.questionText,
    studentAnswer: body.studentAnswer,
    topic: topicHint,
    outcomeCodes: match?.outcomeCodes,
    unitName: match?.unitName ?? undefined,
    wrongAnswerCount: tutorState.wrongAnswerCount,
    questionStage: tutorState.questionStage,
    interactionTurnCount: tutorState.interactionTurnCount,
    forceReveal: tutorState.forceReveal,
    fsmState: tutorState.fsmState,
    avoidRepeatHint: tutorState.fsmState === 'HINT_3',
    imageBase64,
    imageMimeType,
    recentHistory: getRecentHistory(sessionKey, userId, 2),
  });

  pushTurnHistory(
    sessionKey,
    userId,
    'assistant',
    result.spokenNarration || result.guidingQuestion,
  );

  if (result.offTopic) {
    return {
      payload: {
        socratic: result,
        topicMatch: null,
        subject: null,
        topic: null,
        mistake: null,
        video: null,
        costPath: 'guardrail_off_topic',
        wrongAnswerCount: tutorState.wrongAnswerCount,
        interactionTurnCount: tutorState.interactionTurnCount,
        forceRevealApplied: false,
        spokenNarration: result.spokenNarration,
      },
      fromCache: false as const,
    };
  }

  // Kademe açıklandı → sonraki kademeye; oturum bittiyse tam sıfırla
  if (result.sessionComplete) {
    tutorState = recordCorrectOrReset(sessionKey, userId);
  } else if (result.stageComplete || result.forceRevealApplied) {
    tutorState = advanceQuestionStage(sessionKey, userId);
  }

  if (result.detectedSubject || result.detectedTopic) {
    tutorState = lockDetectedTopic(
      sessionKey,
      userId,
      result.detectedSubject,
      result.detectedTopic,
    );
  }

  const subject =
    result.detectedSubject ?? subjectHint ?? body.subject ?? 'Genel';
  const topic = result.detectedTopic ?? topicHint ?? 'Öğrenci sorusu';

  const video = suggestVideoCard({
    outcomeCodes: match?.outcomeCodes,
    topic,
    subject,
    struggleCount: Math.max(
      tutorState.wrongAnswerCount,
      tutorState.interactionTurnCount >= 2 ? 2 : 0,
    ),
    wantsSummary: result.forceRevealApplied || result.sessionComplete,
  });

  const responsePayload = {
    socratic: result,
    topicMatch: match,
    subject,
    topic,
    mistake: null as unknown,
    video,
    costPath: 'dynamic_gemini',
    wrongAnswerCount: tutorState.wrongAnswerCount,
    questionStage: tutorState.questionStage,
    interactionTurnCount: tutorState.interactionTurnCount,
    forceRevealApplied: result.forceRevealApplied,
    stageComplete: result.stageComplete,
    sessionComplete: result.sessionComplete,
    spokenNarration: result.spokenNarration,
    fsmState: tutorState.fsmState,
  };

  // Kota + log arka planda — yanıt hızı öncelikli
  runInBackground(async () => {
    await consumeQuestion(userId, 1);
    if (body.sessionId) {
      await addSessionTokens(body.sessionId, userId, result.tokensUsed);
    }
    if (body.logAsMistake && !result.offTopic) {
      responsePayload.mistake = await logMistake({
        userId,
        sessionId: body.sessionId,
        curriculumId: null,
        subject,
        topic,
        struggleScore: body.struggleScore ?? 3,
        questionData: {
          prompt: body.questionText,
          student_answer: body.studentAnswer,
          source: 'socratic',
          matched_curriculum_id: match?.curriculumId,
          matched_confidence: match?.confidence,
          outcome_codes: match?.outcomeCodes,
          wrong_answer_count: tutorState.wrongAnswerCount,
          force_reveal: result.forceRevealApplied,
        },
      });
    }
  }, 'socratic-post');

  if (canCache && !result.offTopic) {
    storeSemanticCache({
      questionText: body.questionText + (body.studentAnswer ?? ''),
      gradeLevel,
      response: responsePayload,
      tokensSavedEstimate: result.tokensUsed,
    });
  }

  return { payload: responsePayload, fromCache: false as const };
}
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

    const { payload } = await executeSocraticTurn({
      userId: user.id,
      gradeLevel: user.grade_level,
      examTrack: user.exam_track,
      body: parsed.data,
    });
    res.json(payload);
  }),
);

/**
 * SSE — ilk kelimeden itibaren progressive UX (guidingQuestion chunk’ları + canvas).
 */
aiRouter.post(
  '/socratic/stream',
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

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send('status', { phase: 'speaking' });

    try {
      const { payload, fromCache } = await executeSocraticTurn({
        userId: user.id,
        gradeLevel: user.grade_level,
        examTrack: user.exam_track,
        body: parsed.data,
      });

      const socratic = (
        payload as {
          socratic?: {
            guidingQuestion?: string;
            spokenNarration?: string;
            canvasCommands?: unknown[];
          };
          spokenNarration?: string;
        }
      ).socratic;
      const narration =
        socratic?.spokenNarration ||
        (payload as { spokenNarration?: string }).spokenNarration ||
        socratic?.guidingQuestion ||
        '';
      // Cümle cümle progressive (TTS ile hizalı)
      const { splitIntoSentences } = await import(
        '../services/ai/voiceAnchor.js'
      );
      const sentences = splitIntoSentences(narration);
      let acc = '';
      for (const sentence of sentences) {
        acc = acc ? `${acc} ${sentence}` : sentence;
        send('token', { text: sentence, accumulated: acc, sentence: true });
        await new Promise((r) => setTimeout(r, 8));
      }

      const cmds = socratic?.canvasCommands ?? [];
      for (const cmd of cmds) {
        send('canvas', { command: cmd });
        await new Promise((r) => setTimeout(r, 30));
      }

      if ((payload as { video?: unknown }).video) {
        send('video', { video: (payload as { video: unknown }).video });
      }

      send('done', { ...payload, stream: true, fromCache });
    } catch (err) {
      send('error', {
        message: err instanceof Error ? err.message : 'stream failed',
      });
    } finally {
      res.end();
    }
  }),
);
