import { pedagogicalBandForGrade } from '../config/tiers.js';
import { buildMasterSystemPrompt } from '../config/socraticPrompt.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateGeminiJsonTurn } from './ai/geminiClient.js';
import { runInBackground } from './backgroundTasks.js';
import { getSupabaseAdmin } from './supabase.js';
import { consumeQuestion } from './quotaService.js';
import { logMistake } from './mistakeService.js';
import type { CanvasCommand } from '../types/domain.js';

type PhotoSinglePass = {
  questionCount: number;
  questions: string[];
  combinedText: string;
  guidingQuestion: string;
  spokenNarration: string;
  detectedSubject: string | null;
  detectedTopic: string | null;
  offTopic: boolean;
  sessionComplete: boolean;
  stageComplete: boolean;
  encouragement: string;
  neverRevealAnswer: boolean;
  canvasCommands: CanvasCommand[];
  tokensUsed: number;
};

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseCanvasCommands(raw: unknown): CanvasCommand[] {
  if (!Array.isArray(raw)) return [];
  const out: CanvasCommand[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    let type = String(c.type ?? '');
    if (type === 'write_text_at_coords') type = 'text';
    if (type === 'draw_shape') type = 'shape';
    const delayMs = typeof c.delayMs === 'number' ? c.delayMs : undefined;
    try {
      switch (type) {
        case 'clear':
          out.push({ type: 'clear', delayMs });
          break;
        case 'text':
          out.push({
            type: 'text',
            x: Number(c.x ?? 80),
            y: Number(c.y ?? 120),
            content: String(c.content ?? ''),
            delayMs,
          });
          break;
        case 'formula':
          out.push({
            type: 'formula',
            x: Number(c.x ?? 80),
            y: Number(c.y ?? 120),
            latex: String(c.latex ?? c.content ?? ''),
            delayMs,
          });
          break;
        case 'line':
        case 'arrow':
          out.push({
            type: type as 'line' | 'arrow',
            x1: Number(c.x1 ?? 0),
            y1: Number(c.y1 ?? 0),
            x2: Number(c.x2 ?? 100),
            y2: Number(c.y2 ?? 100),
            delayMs,
          });
          break;
        case 'rect':
        case 'highlight':
          out.push({
            type: type as 'rect' | 'highlight',
            x: Number(c.x ?? 0),
            y: Number(c.y ?? 0),
            w: Number(c.w ?? 100),
            h: Number(c.h ?? 40),
            delayMs,
          });
          break;
        case 'shape': {
          const shapeRaw = String(c.shape ?? 'triangle');
          const shape =
            shapeRaw === 'circle' || shapeRaw === 'coords'
              ? shapeRaw
              : 'triangle';
          out.push({
            type: 'shape',
            shape,
            x: Number(c.x ?? 200),
            y: Number(c.y ?? 150),
            w: Number(c.w ?? 280),
            h: Number(c.h ?? 240),
            delayMs,
          });
          break;
        }
        default:
          break;
      }
    } catch {
      /* skip bad cmd */
    }
  }
  return out;
}

/**
 * Tek Gemini Vision çağrısı: OCR + ilk Sokratik tur + tahta.
 * Topic match / DB yazımı arka planda.
 */
async function analyzeAndTutorPhoto(input: {
  imageBase64: string;
  mimeType: string;
  gradeLevel: number;
  subjectHint?: string;
  selectedQuestionIndex?: number;
}): Promise<PhotoSinglePass> {
  const band = pedagogicalBandForGrade(input.gradeLevel);
  const systemInstruction = [
    buildMasterSystemPrompt({
      gradeLevel: input.gradeLevel,
      band,
      wrongAnswerCount: 0,
      questionStage: 1,
      interactionTurnCount: 1,
      forceReveal: false,
      hasImage: true,
    }),
    'FOTOĞRAF MODU (tek geçiş): Önce soruları say; birden fazlaysa yalnızca listele, çözüm verme.',
    'Tek soru veya seçilmiş soru: şekli tahtaya çiz + kısa spokenNarration + guidingQuestion.',
  ].join('\n');

  const selectHint =
    input.selectedQuestionIndex != null
      ? `Öğrenci ${input.selectedQuestionIndex + 1}. soruyu seçti — yalnız onu çöz.`
      : 'Birden fazla soru varsa needsClarification mantığında questionCount>1 ve questions doldur; guidingQuestion kısa seçim mesajı olsun; canvasCommands=[{"type":"clear"}].';

  const userMessage = [
    selectHint,
    input.subjectHint ? `Ders ipucu: ${input.subjectHint}` : null,
    'SADECE JSON:',
    JSON.stringify({
      questionCount: 1,
      questions: ['...'],
      combinedText: '...',
      guidingQuestion: '...',
      spokenNarration: '...',
      detectedSubject: null,
      detectedTopic: null,
      offTopic: false,
      sessionComplete: false,
      stageComplete: false,
      encouragement: '',
      neverRevealAnswer: true,
      canvasCommands: [
        { type: 'clear' },
        {
          type: 'shape',
          shape: 'triangle',
          x: 220,
          y: 120,
          w: 300,
          h: 260,
          delayMs: 60,
        },
        { type: 'text', x: 80, y: 420, content: '...', delayMs: 120 },
      ],
    }),
  ]
    .filter(Boolean)
    .join('\n');

  const { text, tokensUsed } = await generateGeminiJsonTurn({
    systemInstruction,
    userMessage,
    imageBase64: input.imageBase64,
    imageMimeType: input.mimeType,
    maxOutputTokens: 700,
    temperature: 0.2,
    preferLite: false,
  });

  if (!text?.trim()) {
    throw new AppError(422, 'Görselden soru okunamadı', 'OCR_EMPTY');
  }

  let reply: Record<string, unknown>;
  try {
    reply = JSON.parse(stripCodeFences(text)) as Record<string, unknown>;
  } catch {
    throw new AppError(422, 'Görselden soru okunamadı', 'OCR_PARSE');
  }

  const questions = Array.isArray(reply.questions)
    ? reply.questions.filter(
        (q): q is string => typeof q === 'string' && q.trim().length > 0,
      )
    : [];
  const questionCount =
    typeof reply.questionCount === 'number' && reply.questionCount > 0
      ? reply.questionCount
      : Math.max(1, questions.length);

  let guidingQuestion =
    typeof reply.guidingQuestion === 'string'
      ? reply.guidingQuestion.trim()
      : '';
  let spokenNarration =
    typeof reply.spokenNarration === 'string'
      ? reply.spokenNarration.trim()
      : '';
  if (!spokenNarration) spokenNarration = guidingQuestion;
  if (!guidingQuestion) guidingQuestion = spokenNarration;

  if (!guidingQuestion && questions.length === 0) {
    throw new AppError(422, 'Görselden soru okunamadı', 'OCR_EMPTY');
  }

  let canvasCommands = parseCanvasCommands(reply.canvasCommands);
  const multi = questionCount > 1 || questions.length > 1;
  if (!multi && input.selectedQuestionIndex == null) {
    const hasGeom = canvasCommands.some((c) =>
      ['shape', 'line', 'arrow', 'rect'].includes(c.type),
    );
    if (!hasGeom) {
      canvasCommands = [
        { type: 'clear', delayMs: 0 },
        {
          type: 'shape',
          shape: 'triangle',
          x: 250,
          y: 120,
          w: 320,
          h: 280,
          delayMs: 60,
        },
        ...canvasCommands.filter((c) => c.type !== 'clear'),
      ];
    }
  }

  const combinedText =
    typeof reply.combinedText === 'string' && reply.combinedText.trim()
      ? reply.combinedText
      : questions.join('\n') || guidingQuestion;

  return {
    questionCount,
    questions: questions.length > 0 ? questions : [combinedText],
    combinedText,
    guidingQuestion: guidingQuestion || 'Bu sayfada birden fazla soru görüyorum. Hangisini çözelim?',
    spokenNarration: spokenNarration || guidingQuestion,
    detectedSubject:
      typeof reply.detectedSubject === 'string' ? reply.detectedSubject : null,
    detectedTopic:
      typeof reply.detectedTopic === 'string' ? reply.detectedTopic : null,
    offTopic: reply.offTopic === true,
    sessionComplete: reply.sessionComplete === true,
    stageComplete: reply.stageComplete === true,
    encouragement:
      typeof reply.encouragement === 'string' ? reply.encouragement : '',
    neverRevealAnswer: reply.neverRevealAnswer !== false,
    canvasCommands,
    tokensUsed,
  };
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

  const analyzed = await analyzeAndTutorPhoto({
    imageBase64: optimized.base64,
    mimeType: optimized.mimeType,
    gradeLevel: input.gradeLevel,
    subjectHint: input.subject,
    selectedQuestionIndex: input.selectedQuestionIndex,
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

  const band = pedagogicalBandForGrade(input.gradeLevel);
  const socratic = {
    guidingQuestion: analyzed.guidingQuestion,
    spokenNarration: analyzed.spokenNarration,
    latexHints: [] as string[],
    canvasCommands: analyzed.canvasCommands,
    pedagogicalBand: band,
    tokensUsed: analyzed.tokensUsed,
    neverRevealAnswer: analyzed.neverRevealAnswer,
    detectedSubject: analyzed.detectedSubject,
    detectedTopic: analyzed.detectedTopic,
    offTopic: analyzed.offTopic,
    sessionComplete: analyzed.sessionComplete,
    stageComplete: analyzed.stageComplete,
    encouragement: analyzed.encouragement,
    forceRevealApplied: false,
    interactionTurnCount: 1,
    questionStage: 1,
  };

  const subject =
    socratic.detectedSubject ?? input.subject ?? 'Genel';
  const topic = socratic.detectedTopic ?? 'Ödev sorusu';

  if (socratic.offTopic) {
    return {
      needsClarification: false,
      questionCount: 1,
      questions: [questionText],
      message: socratic.guidingQuestion,
      photoQuestion: null,
      extractedText: questionText,
      socratic,
      topicMatch: null,
      subject,
      topic,
      offTopic: true,
      spokenNarration: socratic.spokenNarration,
    };
  }

  const { suggestVideoCard } = await import('./videoCatalog.js');
  const video = suggestVideoCard({
    topic,
    subject,
    struggleCount: 1,
    wantsSummary: false,
  });

  // Kota + DB + mistake arka planda — kullanıcı yanıtı beklemesin
  runInBackground(async () => {
    await consumeQuestion(input.userId, 1);
    await getSupabaseAdmin()
      .from('photo_questions')
      .insert({
        user_id: input.userId,
        session_id: input.sessionId ?? null,
        extracted_text: questionText,
        subject,
        socratic_payload: socratic,
        status: 'processed',
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
      },
    }).catch(() => undefined);
  }, 'photo-post');

  return {
    needsClarification: false,
    questionCount: 1,
    questions: [questionText],
    message: null,
    photoQuestion: null,
    extractedText: questionText,
    socratic,
    topicMatch: null,
    subject,
    topic,
    video,
    spokenNarration: socratic.spokenNarration,
    costPath: 'photo_single_pass',
  };
}
