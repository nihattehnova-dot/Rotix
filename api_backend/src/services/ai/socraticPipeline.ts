import { pedagogicalBandForGrade } from '../../config/tiers.js';
import { buildMasterSystemPrompt } from '../../config/socraticPrompt.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CanvasCommand, SocraticAiResult } from '../../types/domain.js';
import { generateGeminiJsonTurn } from './geminiClient.js';
import { MAX_WRONG_PER_STAGE } from '../tutorSessionState.js';
import { parseGeminiJsonObject } from './parseGeminiJson.js';

export type SocraticTurnInput = {
  gradeLevel: number;
  subject?: string;
  questionText: string;
  studentAnswer?: string;
  topic?: string;
  outcomeCodes?: string[];
  unitName?: string;
  wrongAnswerCount?: number;
  questionStage?: number;
  interactionTurnCount?: number;
  forceReveal?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  recentHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
};

function parseCanvasCommands(raw: unknown): CanvasCommand[] {
  if (!Array.isArray(raw)) return [];
  const out: CanvasCommand[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    let type = String(c.type ?? c.action_type ?? '');
    if (type === 'write_text_at_coords') type = 'text';
    if (type === 'highlight_area') type = 'highlight';
    if (type === 'draw_shape') type = 'shape';
    if (type === 'draw_coordinate_system') type = 'coords';
    const delayMs =
      typeof c.delayMs === 'number' ? c.delayMs : undefined;
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
            y: Number(c.y ?? 200),
            latex: String(c.content ?? c.latex ?? ''),
            delayMs,
          });
          break;
        case 'highlight':
          out.push({
            type: 'highlight',
            x: Number(c.x ?? 60),
            y: Number(c.y ?? 80),
            w: Number(c.w ?? 400),
            h: Number(c.h ?? 80),
            delayMs,
          });
          break;
        case 'line':
          out.push({
            type: 'line',
            x1: Number(c.x1 ?? 0),
            y1: Number(c.y1 ?? 0),
            x2: Number(c.x2 ?? 200),
            y2: Number(c.y2 ?? 200),
            delayMs,
          });
          break;
        case 'arrow':
          out.push({
            type: 'arrow',
            x1: Number(c.x1 ?? 0),
            y1: Number(c.y1 ?? 0),
            x2: Number(c.x2 ?? 200),
            y2: Number(c.y2 ?? 200),
            delayMs,
          });
          break;
        case 'rect':
          out.push({
            type: 'rect',
            x: Number(c.x ?? 0),
            y: Number(c.y ?? 0),
            w: Number(c.w ?? 100),
            h: Number(c.h ?? 100),
            delayMs,
          });
          break;
        case 'shape':
        case 'coords': {
          const shapeRaw = String(
            c.shape ?? (type === 'coords' ? 'coords' : 'circle'),
          );
          const shape =
            shapeRaw === 'triangle'
              ? 'triangle'
              : shapeRaw === 'coords'
                ? 'coords'
                : 'circle';
          out.push({
            type: 'shape',
            shape,
            x: Number(c.x ?? 200),
            y: Number(c.y ?? 200),
            w: Number(c.w ?? 220),
            h: Number(c.h ?? 220),
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

export type SocraticTurnResult = SocraticAiResult & {
  detectedSubject: string | null;
  detectedTopic: string | null;
  offTopic: boolean;
  sessionComplete: boolean;
  stageComplete: boolean;
  encouragement: string;
  spokenNarration: string;
  forceRevealApplied: boolean;
  interactionTurnCount: number;
  questionStage: number;
  fromCache?: boolean;
};

/**
 * Fast path: tek JSON generateContent (tools yok → düşük latency).
 */
export async function runSocraticTurn(
  input: SocraticTurnInput,
): Promise<SocraticTurnResult> {
  const band = pedagogicalBandForGrade(input.gradeLevel);
  const turn = input.interactionTurnCount ?? 0;
  const wrongs = input.wrongAnswerCount ?? 0;
  const stage = input.questionStage ?? 1;
  const forceReveal =
    input.forceReveal === true || wrongs >= MAX_WRONG_PER_STAGE;
  const hasImage = Boolean(input.imageBase64);

  const systemInstruction = buildMasterSystemPrompt({
    gradeLevel: input.gradeLevel,
    band,
    wrongAnswerCount: wrongs,
    questionStage: stage,
    interactionTurnCount: turn,
    forceReveal,
    hasImage,
  });

  const historyBlock =
    input.recentHistory && input.recentHistory.length > 0
      ? input.recentHistory
          .slice(-4)
          .map((h) => `${h.role === 'user' ? 'Öğrenci' : 'Roti'}: ${h.text}`)
          .join('\n')
      : '';

  const shapeRule = hasImage
    ? 'FOTO: canvasCommands içinde shape/line/arrow zorunlu; yalnız rakam yasak.'
    : 'Formülleri formula/text ile yaz.';

  const userMessage = [
    `Soru: ${input.questionText}`,
    input.studentAnswer
      ? `Öğrenci denemesi: ${input.studentAnswer}`
      : 'İlk yönlendirme.',
    `Kademe ${stage}; yanlış ${wrongs}/${MAX_WRONG_PER_STAGE}`,
    input.topic ? `Konu: ${input.subject ?? ''} / ${input.topic}` : null,
    historyBlock ? `Geçmiş:\n${historyBlock}` : null,
    shapeRule,
    forceReveal
      ? 'AÇIKLA: spokenNarration 3–6 cümle sesli anlatım; tahtaya çöz; stageComplete=true.'
      : 'Kısa ipucu; spokenNarration 1–2 cümle; cevabı verme.',
    'SADECE JSON: {"guidingQuestion":"...","spokenNarration":"...","detectedSubject":null,"detectedTopic":null,"offTopic":false,"sessionComplete":false,"stageComplete":false,"encouragement":"","neverRevealAnswer":true,"canvasCommands":[{"type":"clear"},{"type":"text","x":80,"y":120,"content":"...","delayMs":80}]}',
  ]
    .filter(Boolean)
    .join('\n');

  const maxOutputTokens = forceReveal ? 800 : hasImage ? 600 : 360;

  let tokensUsed = 0;
  const first = await generateGeminiJsonTurn({
    systemInstruction,
    userMessage,
    imageBase64: input.imageBase64,
    imageMimeType: input.imageMimeType,
    maxOutputTokens,
    temperature: hasImage ? 0.2 : 0.3,
    preferLite: !hasImage && !forceReveal,
  });
  tokensUsed += first.tokensUsed;

  let reply = parseGeminiJsonObject(first.text ?? '');
  if (!reply) {
    const retry = await generateGeminiJsonTurn({
      systemInstruction:
        systemInstruction +
        '\nÖNEMLİ: Yalnızca tek satır geçerli JSON. canvasCommands en fazla 5 eleman.',
      userMessage:
        userMessage +
        '\nKISA JSON zorunlu. Örnek: {"guidingQuestion":"...","spokenNarration":"...","canvasCommands":[{"type":"clear"}],"offTopic":false,"sessionComplete":false,"stageComplete":false,"neverRevealAnswer":true}',
      imageBase64: input.imageBase64,
      imageMimeType: input.imageMimeType,
      maxOutputTokens: forceReveal ? 700 : 400,
      temperature: 0.1,
      preferLite: true,
    });
    tokensUsed += retry.tokensUsed;
    reply = parseGeminiJsonObject(retry.text ?? '');
    if (!reply) {
      throw new AppError(
        502,
        'Yanıt okunamadı, tekrar dene.',
        'GEMINI_BAD_SCHEMA',
      );
    }
  }

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
  if (!guidingQuestion) {
    throw new AppError(502, 'Missing guidingQuestion', 'GEMINI_BAD_SCHEMA');
  }

  let canvasCommands = parseCanvasCommands(reply.canvasCommands);
  if (hasImage) {
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
          delayMs: 80,
        },
        ...canvasCommands.filter((c) => c.type !== 'clear'),
      ];
    }
  }

  const stageComplete = reply.stageComplete === true || forceReveal;
  // Kademe açıklandıktan sonra çok adımlı soruda session devam edebilir
  const sessionComplete = reply.sessionComplete === true;

  return {
    guidingQuestion,
    latexHints: [],
    canvasCommands,
    pedagogicalBand: band,
    tokensUsed,
    neverRevealAnswer: reply.neverRevealAnswer !== false && !forceReveal,
    detectedSubject:
      typeof reply.detectedSubject === 'string' ? reply.detectedSubject : null,
    detectedTopic:
      typeof reply.detectedTopic === 'string' ? reply.detectedTopic : null,
    offTopic: reply.offTopic === true,
    sessionComplete,
    stageComplete,
    encouragement:
      typeof reply.encouragement === 'string' ? reply.encouragement : '',
    spokenNarration,
    forceRevealApplied: forceReveal,
    interactionTurnCount: turn,
    questionStage: stage,
  };
}
