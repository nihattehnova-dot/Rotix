import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
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
  const model = env.geminiModel;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(env.geminiApiKey!)}`;

  const visionRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'Bu bir öğrenci ödev fotoğrafı.',
                'Görseldeki SORULARI say. Bir sayfada birden fazla soru (1), 2), a), b) vb.) varsa her birini ayrı maddede yaz.',
                'Çözüm veya cevap YAZMA.',
                'SADECE JSON döndür:',
                '{"questionCount": number, "questions": string[], "combinedText": string}',
                'questionCount: kaç ayrı soru var.',
                'questions: her sorunun kısa metni (LaTeX olabilir).',
                'combinedText: tüm metin birleşik.',
              ].join('\n'),
            },
            {
              inlineData: {
                mimeType: input.mimeType,
                data: input.imageBase64.replace(/^data:[^;]+;base64,/, ''),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  const visionBody = (await visionRes.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!visionRes.ok) {
    throw new AppError(
      502,
      visionBody.error?.message ?? 'Vision failed',
      'GEMINI_VISION_ERROR',
    );
  }

  const raw =
    visionBody.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim() ?? '';

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
  const analyzed = await analyzeHomeworkImage({
    imageBase64: input.imageBase64,
    mimeType: mime,
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

  const subjectHint = input.subject ?? 'Genel';
  const match = await resolveQuestionTopic({
    questionText,
    gradeLevel: input.gradeLevel,
    subjectHint: input.subject,
  });

  const subject = match?.subject ?? subjectHint;
  const topic = match?.topic ?? 'Ödev sorusu';

  const socratic = await runSocraticTurn({
    gradeLevel: input.gradeLevel,
    subject,
    topic,
    questionText,
    outcomeCodes: match?.outcomeCodes,
    unitName: match?.unitName ?? undefined,
  });

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
  };
}
