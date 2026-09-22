import { pedagogicalBandForGrade } from '../config/tiers.js';
import { buildMasterSystemPrompt } from '../config/socraticPrompt.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateGeminiJsonTurn } from './ai/geminiClient.js';
import { parseGeminiJsonObject } from './ai/parseGeminiJson.js';
import { runSocraticTurn } from './ai/socraticPipeline.js';
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
            content: String(c.content ?? '').slice(0, 200),
            delayMs,
          });
          break;
        case 'formula':
          out.push({
            type: 'formula',
            x: Number(c.x ?? 80),
            y: Number(c.y ?? 120),
            latex: String(c.latex ?? c.content ?? '').slice(0, 120),
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
      /* skip */
    }
  }
  return out.slice(0, 8);
}

function mapReplyToPhotoPass(
  reply: Record<string, unknown>,
  tokensUsed: number,
  opts: { selectedQuestionIndex?: number },
): PhotoSinglePass {
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

  let canvasCommands = parseCanvasCommands(reply.canvasCommands);
  const multi = questionCount > 1 || questions.length > 1;
  if (!multi && opts.selectedQuestionIndex == null) {
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

  if (!guidingQuestion && questions.length === 0 && !combinedText.trim()) {
    throw new AppError(422, 'Görselden soru okunamadı', 'OCR_EMPTY');
  }

  return {
    questionCount,
    questions: questions.length > 0 ? questions : [combinedText],
    combinedText,
    guidingQuestion:
      guidingQuestion ||
      'Bu sayfada birden fazla soru görüyorum. Hangisini çözelim?',
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

/** Sadece OCR — hafif, yüksek başarı */
async function ocrOnlyPhoto(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<{
  questionCount: number;
  questions: string[];
  combinedText: string;
  tokensUsed: number;
}> {
  const { text, tokensUsed } = await generateGeminiJsonTurn({
    systemInstruction:
      'Öğrenci ödev fotoğrafı. Soruları oku. Çözüm yazma. SADECE JSON.',
    userMessage:
      '{"questionCount":1,"questions":["soru metni"],"combinedText":"birleşik metin"}',
    imageBase64: input.imageBase64,
    imageMimeType: input.mimeType,
    maxOutputTokens: 400,
    temperature: 0.05,
    preferLite: true,
  });
  const reply = parseGeminiJsonObject(text ?? '');
  if (!reply) {
    throw new AppError(422, 'Görselden soru okunamadı', 'OCR_PARSE');
  }
  const questions = Array.isArray(reply.questions)
    ? reply.questions.filter(
        (q): q is string => typeof q === 'string' && q.trim().length > 0,
      )
    : [];
  const combinedText =
    typeof reply.combinedText === 'string' && reply.combinedText.trim()
      ? reply.combinedText
      : questions.join('\n');
  if (!combinedText.trim() && questions.length === 0) {
    throw new AppError(422, 'Görselden soru okunamadı', 'OCR_EMPTY');
  }
  const questionCount =
    typeof reply.questionCount === 'number' && reply.questionCount > 0
      ? reply.questionCount
      : Math.max(1, questions.length);
  return {
    questionCount,
    questions: questions.length > 0 ? questions : [combinedText],
    combinedText,
    tokensUsed,
  };
}

/**
 * Tek Gemini Vision: OCR + ipucu. Bozulursa OCR→Sokratik yedek.
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
    'FOTO: Önce soru sayısı. Birden fazlaysa yalnız listele (canvasCommands=[{"type":"clear"}]).',
    'Tek soru: kısa spokenNarration + guidingQuestion + en fazla 5 canvas komutu (şekil zorunlu).',
    'JSON kısa tut; uzun paragraf yazma.',
  ].join('\n');

  const selectHint =
    input.selectedQuestionIndex != null
      ? `Öğrenci ${input.selectedQuestionIndex + 1}. soruyu seçti — yalnız onu.`
      : 'Çok soru → questionCount>1, questions doldur, çözüm yok.';

  const userMessage = [
    selectHint,
    input.subjectHint ? `Ders: ${input.subjectHint}` : null,
    'SADECE kompakt JSON: questionCount,questions,combinedText,guidingQuestion,spokenNarration,detectedSubject,detectedTopic,offTopic,sessionComplete,stageComplete,neverRevealAnswer,canvasCommands(max 5).',
  ]
    .filter(Boolean)
    .join('\n');

  let tokensUsed = 0;
  try {
    const first = await generateGeminiJsonTurn({
      systemInstruction,
      userMessage,
      imageBase64: input.imageBase64,
      imageMimeType: input.mimeType,
      maxOutputTokens: 900,
      temperature: 0.15,
      preferLite: false,
    });
    tokensUsed += first.tokensUsed;
    let reply = parseGeminiJsonObject(first.text ?? '');
    if (!reply) {
      const retry = await generateGeminiJsonTurn({
        systemInstruction:
          'Fotoğraf oku. SADECE kısa JSON. canvasCommands max 3.',
        userMessage:
          '{"questionCount":1,"questions":["..."],"combinedText":"...","guidingQuestion":"...","spokenNarration":"...","offTopic":false,"sessionComplete":false,"stageComplete":false,"neverRevealAnswer":true,"canvasCommands":[{"type":"clear"},{"type":"shape","shape":"triangle","x":220,"y":120,"w":280,"h":240},{"type":"text","x":80,"y":420,"content":"..."}]}',
        imageBase64: input.imageBase64,
        imageMimeType: input.mimeType,
        maxOutputTokens: 500,
        temperature: 0.05,
        preferLite: true,
      });
      tokensUsed += retry.tokensUsed;
      reply = parseGeminiJsonObject(retry.text ?? '');
    }
    if (reply) {
      return mapReplyToPhotoPass(reply, tokensUsed, {
        selectedQuestionIndex: input.selectedQuestionIndex,
      });
    }
  } catch (err) {
    if (err instanceof AppError && err.code?.startsWith('OCR')) throw err;
    // fallback below
  }

  // Yedek: OCR sonra sokratik
  const ocr = await ocrOnlyPhoto({
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
  });
  tokensUsed += ocr.tokensUsed;

  const multi = ocr.questionCount > 1 || ocr.questions.length > 1;
  if (multi && input.selectedQuestionIndex == null) {
    return {
      questionCount: ocr.questionCount,
      questions: ocr.questions,
      combinedText: ocr.combinedText,
      guidingQuestion:
        'Bu sayfada birden fazla soru görüyorum. Hangisini çözelim?',
      spokenNarration:
        'Sayfada birden fazla soru var. Numarasını söyle, birlikte çözelim.',
      detectedSubject: null,
      detectedTopic: null,
      offTopic: false,
      sessionComplete: false,
      stageComplete: false,
      encouragement: '',
      neverRevealAnswer: true,
      canvasCommands: [{ type: 'clear', delayMs: 0 }],
      tokensUsed,
    };
  }

  let questionText = ocr.combinedText;
  if (
    input.selectedQuestionIndex != null &&
    ocr.questions[input.selectedQuestionIndex]
  ) {
    questionText = ocr.questions[input.selectedQuestionIndex]!;
  } else if (ocr.questions.length === 1) {
    questionText = ocr.questions[0]!;
  }

  const socratic = await runSocraticTurn({
    gradeLevel: input.gradeLevel,
    subject: input.subjectHint,
    questionText,
    imageBase64: input.imageBase64,
    imageMimeType: input.mimeType,
    wrongAnswerCount: 0,
    questionStage: 1,
    interactionTurnCount: 1,
  });
  tokensUsed += socratic.tokensUsed;

  return {
    questionCount: 1,
    questions: [questionText],
    combinedText: questionText,
    guidingQuestion: socratic.guidingQuestion,
    spokenNarration: socratic.spokenNarration,
    detectedSubject: socratic.detectedSubject,
    detectedTopic: socratic.detectedTopic,
    offTopic: socratic.offTopic,
    sessionComplete: socratic.sessionComplete,
    stageComplete: socratic.stageComplete,
    encouragement: socratic.encouragement,
    neverRevealAnswer: socratic.neverRevealAnswer,
    canvasCommands: socratic.canvasCommands,
    tokensUsed,
  };
}

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

  // Bounding-box crop — çok soru + seçim yoksa clarification
  const { cropSelectedQuestion } = await import('./visionCrop.js');
  let imageForTutor = {
    base64: optimized.base64,
    mimeType: optimized.mimeType,
  };
  try {
    const cropped = await cropSelectedQuestion({
      imageBase64: optimized.base64,
      mimeType: optimized.mimeType,
      selectedIndex: input.selectedQuestionIndex,
    });
    if (cropped.needsClarification) {
      return {
        needsClarification: true,
        questionCount: Math.max(2, cropped.boxes.length),
        questions: cropped.boxes.map(
          (b, i) => `Soru ${i + 1} (bölge ${b.y}–${b.y + b.h})`,
        ),
        message:
          'Bu sayfada birden fazla soru görüyorum. Hangisini çözmemi istiyorsun?',
        extractedText: null,
        socratic: null,
        photoQuestion: null,
      };
    }
    if (cropped.cropped) {
      imageForTutor = cropped.cropped;
    }
  } catch {
    /* crop opsiyonel — orijinal görsel ile devam */
  }

  const analyzed = await analyzeAndTutorPhoto({
    imageBase64: imageForTutor.base64,
    mimeType: imageForTutor.mimeType,
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

  const subject = socratic.detectedSubject ?? input.subject ?? 'Genel';
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
