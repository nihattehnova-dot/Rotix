import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateGeminiVision } from './ai/geminiClient.js';
import { runSocraticTurn } from './ai/socraticPipeline.js';
import { getSupabaseAdmin } from './supabase.js';
import { resolveQuestionTopic } from './topicMatcher.js';
import { consumeQuestion } from './quotaService.js';
import { logMistake } from './mistakeService.js';

type VisionAnalyze = {
  questionCount: number;
  questions: string[];
  combinedText: string;
};

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function analyzeHomeworkImage(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<VisionAnalyze> {
  const { text: raw } = await generateGeminiVision({
    prompt: [
      'Bu bir öğrenci ödev fotoğrafı.',
      'Görseldeki SORULARI say. Bir sayfada birden fazla soru (1), 2), a), b) vb.) varsa her birini ayrı maddede yaz.',
      'Çözüm veya cevap YAZMA.',
      'SADECE JSON döndür:',
      '{"questionCount": number, "questions": string[], "combinedText": string}',
      'questionCount: kaç ayrı soru var.',
      'questions: her sorunun kısa metni (LaTeX olabilir).',
      'combinedText: tüm metin birleşik.',
    ].join('\n'),
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
    temperature: 0.1,
  });

  if (!raw) {
    throw new AppError(422, 'Görselden soru okunamadı', 'OCR_EMPTY');
  }

  try {
    const parsed = JSON.parse(stripCodeFences(raw)) as Partial<VisionAnalyze>;
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
      : [];
    const count =
      typeof parsed.questionCount === 'number' && parsed.questionCount > 0
        ? parsed.questionCount
        : Math.max(1, questions.length);
    return {
      questionCount: count,
      questions: questions.length > 0 ? questions : [parsed.combinedText ?? raw],
      combinedText:
        typeof parsed.combinedText === 'string' && parsed.combinedText.trim()
          ? parsed.combinedText
          : questions.join('\n') || raw,
    };
  } catch {
    return {
      questionCount: 1,
      questions: [raw],
      combinedText: raw,
    };
  }
}

/**
 * Photo → en fazla TEK soru. Çok soru varsa netleştirme ister; kota düşmez.
 */
export async function processPhotoQuestion(input: {
  userId: string;
  gradeLevel: number;
  subject?: string;
  imageBase64: string;
  mimeType?: string;
  sessionId?: string;
  /** 0-based — kullanıcı hangi soruyu seçti */
  selectedQuestionIndex?: number;
}) {
  if (!env.geminiApiKey) {
    throw new AppError(503, 'Gemini not configured', 'GEMINI_NOT_CONFIGURED');
  }

  const mime = input.mimeType ?? 'image/jpeg';
  const { optimizeQuestionImage } = await import('./imageOptimize.js');
  const optimized = await optimizeQuestionImage({
    imageBase64: input.imageBase64,
    mimeType: mime,
  });

  const analyzed = await analyzeHomeworkImage({
    imageBase64: optimized.base64,
    mimeType: optimized.mimeType,
  });

  const multi =
    analyzed.questionCount > 1 || analyzed.questions.length > 1;

  if (multi && input.selectedQuestionIndex == null) {
    return {
      needsClarification: true,
      questionCount: analyzed.questionCount,
      questions: analyzed.questions,
      message:
        'Bu sayfada birden fazla soru görüyorum. Her seferinde yalnız bir soruya yardımcı olabilirim. ' +
        'Hangi soruyu çözmemi istiyorsun? Numarasını söyle veya seç.',
      extractedText: analyzed.combinedText,
      socratic: null,
      photoQuestion: null,
    };
  }

  let questionText = analyzed.combinedText;
  if (
    input.selectedQuestionIndex != null &&
    analyzed.questions[input.selectedQuestionIndex]
  ) {
    questionText = analyzed.questions[input.selectedQuestionIndex]!;
  } else if (analyzed.questions.length === 1) {
    questionText = analyzed.questions[0]!;
  }

  const subjectHint = input.subject;
  const match = await resolveQuestionTopic({
    questionText,
    gradeLevel: input.gradeLevel,
    subjectHint: input.subject,
  }).catch(() => null);

  // Late binding: konu varsayımı yok — model tespit eder; match yalnızca ipucu
  const socratic = await runSocraticTurn({
    gradeLevel: input.gradeLevel,
    subject: match?.subject ?? subjectHint,
    topic: match?.topic,
    questionText,
    outcomeCodes: match?.outcomeCodes,
    unitName: match?.unitName ?? undefined,
    imageBase64: optimized.base64,
    imageMimeType: optimized.mimeType,
  });

  const subject =
    socratic.detectedSubject ?? match?.subject ?? subjectHint ?? 'Genel';
  const topic = socratic.detectedTopic ?? match?.topic ?? 'Ödev sorusu';

  if (socratic.offTopic) {
    return {
      needsClarification: false,
      questionCount: 1,
      questions: [questionText],
      message: socratic.guidingQuestion,
      photoQuestion: null,
      extractedText: questionText,
      socratic,
      topicMatch: match,
      subject,
      topic,
      offTopic: true,
    };
  }

  await consumeQuestion(input.userId, 1);

  const { data, error } = await getSupabaseAdmin()
    .from('photo_questions')
    .insert({
      user_id: input.userId,
      session_id: input.sessionId ?? null,
      extracted_text: questionText,
      subject,
      socratic_payload: { ...socratic, topicMatch: match },
      status: 'processed',
    })
    .select('*')
    .single();

  if (error) throw error;

  // Konuyu AI eşler → unutma defterine otomatik arşiv (konuya göre birleşir)
  const { suggestVideoCard } = await import('./videoCatalog.js');
  const video = suggestVideoCard({
    outcomeCodes: match?.outcomeCodes,
    topic,
    subject,
    struggleCount: 1,
    wantsSummary: socratic.forceRevealApplied || socratic.sessionComplete,
  });

  await logMistake({
    userId: input.userId,
    sessionId: input.sessionId,
    curriculumId: null,
    subject,
    topic,
    struggleScore: 2,
    questionData: {
      prompt: questionText,
      source: 'photo_homework',
      matched_curriculum_id: match?.curriculumId,
      matched_confidence: match?.confidence,
      outcome_codes: match?.outcomeCodes,
    },
  }).catch(() => undefined);

  return {
    needsClarification: false,
    questionCount: 1,
    questions: [questionText],
    message: null,
    photoQuestion: data,
    extractedText: questionText,
    socratic,
    topicMatch: match,
    subject,
    topic,
    video,
  };
}
