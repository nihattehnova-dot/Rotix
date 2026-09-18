import { pedagogicalBandForGrade } from '../../config/tiers.js';
import { buildMasterSystemPrompt } from '../../config/socraticPrompt.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CanvasCommand, SocraticAiResult } from '../../types/domain.js';
import { generateGeminiWithTools } from './geminiClient.js';

export type SocraticTurnInput = {
  gradeLevel: number;
  subject?: string;
  questionText: string;
  studentAnswer?: string;
  /** Late-bound — only after prior turn detected; never invent at session start */
  topic?: string;
  outcomeCodes?: string[];
  unitName?: string;
  wrongAnswerCount?: number;
  forceReveal?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
};

const DRAW_TOOL = {
  name: 'draw_on_board',
  description:
    'Canlı tahtaya çizim ekler. Ses ile senkron için adım adım çağır.',
  parameters: {
    type: 'object',
    properties: {
      action_type: {
        type: 'string',
        enum: ['clear', 'text', 'highlight', 'formula', 'line', 'rect'],
      },
      content: { type: 'string', description: 'text içeriği veya LaTeX' },
      x: { type: 'number' },
      y: { type: 'number' },
      x1: { type: 'number' },
      y1: { type: 'number' },
      x2: { type: 'number' },
      y2: { type: 'number' },
      w: { type: 'number' },
      h: { type: 'number' },
      delayMs: {
        type: 'number',
        description: 'Tahtada belirme gecikmesi (ms), ses senkronu için',
      },
    },
    required: ['action_type'],
  },
};

const REPLY_TOOL = {
  name: 'tutor_reply',
  description: 'Öğrenciye sözlü/yazılı yanıt ve oturum bayrakları.',
  parameters: {
    type: 'object',
    properties: {
      guidingQuestion: { type: 'string' },
      detectedSubject: { type: 'string', nullable: true },
      detectedTopic: { type: 'string', nullable: true },
      offTopic: { type: 'boolean' },
      sessionComplete: { type: 'boolean' },
      encouragement: { type: 'string' },
      neverRevealAnswer: { type: 'boolean' },
    },
    required: ['guidingQuestion', 'offTopic', 'sessionComplete'],
  },
};

function toolCallToCanvas(args: Record<string, unknown>): CanvasCommand | null {
  const action = String(args.action_type ?? '');
  const delayMs =
    typeof args.delayMs === 'number' ? args.delayMs : undefined;
  const withDelay = <T extends CanvasCommand>(cmd: T): T =>
    delayMs != null ? ({ ...cmd, delayMs } as T) : cmd;

  switch (action) {
    case 'clear':
      return withDelay({ type: 'clear' });
    case 'text':
      return withDelay({
        type: 'text',
        x: Number(args.x ?? 80),
        y: Number(args.y ?? 120),
        content: String(args.content ?? ''),
      });
    case 'formula':
      return withDelay({
        type: 'formula',
        x: Number(args.x ?? 80),
        y: Number(args.y ?? 200),
        latex: String(args.content ?? args.latex ?? ''),
      });
    case 'highlight':
      return withDelay({
        type: 'highlight',
        x: Number(args.x ?? 60),
        y: Number(args.y ?? 80),
        w: Number(args.w ?? 400),
        h: Number(args.h ?? 80),
      });
    case 'line':
      return withDelay({
        type: 'line',
        x1: Number(args.x1 ?? 0),
        y1: Number(args.y1 ?? 0),
        x2: Number(args.x2 ?? 100),
        y2: Number(args.y2 ?? 100),
      });
    case 'rect':
      return withDelay({
        type: 'rect',
        x: Number(args.x ?? 0),
        y: Number(args.y ?? 0),
        w: Number(args.w ?? 100),
        h: Number(args.h ?? 100),
      });
    default:
      return null;
  }
}

export type SocraticTurnResult = SocraticAiResult & {
  detectedSubject: string | null;
  detectedTopic: string | null;
  offTopic: boolean;
  sessionComplete: boolean;
  encouragement: string;
  forceRevealApplied: boolean;
};

/**
 * Costly dynamic path — Socratic / Q&A only.
 * Topic is late-bound (model detects); not injected as default.
 */
export async function runSocraticTurn(
  input: SocraticTurnInput,
): Promise<SocraticTurnResult> {
  const band = pedagogicalBandForGrade(input.gradeLevel);
  const forceReveal =
    input.forceReveal === true || (input.wrongAnswerCount ?? 0) >= 2;

  const systemInstruction = buildMasterSystemPrompt({
    gradeLevel: input.gradeLevel,
    band,
    wrongAnswerCount: input.wrongAnswerCount,
    forceReveal,
  });

  const userParts: string[] = [
    `Öğrenci sorusu / problem: ${input.questionText}`,
    input.studentAnswer
      ? `Öğrencinin denemesi (muhtemelen yanlış veya eksik): ${input.studentAnswer}`
      : 'Öğrenci henüz cevap vermedi — ilk yönlendirmeyi yap.',
    input.wrongAnswerCount != null
      ? `Bu soruda biriken yanlış deneme sayısı: ${input.wrongAnswerCount}`
      : null,
    // Late binding hint only if already locked from prior turn
    input.topic
      ? `(Önceki turda tespit edilen konu ipucu — doğrula, körü körüne saplanma: ${input.subject ?? ''} / ${input.topic})`
      : 'Henüz kilitlenmiş konu yok — önce anla, detectedSubject/Topic doldur.',
    'Önce tutor_reply, sonra gerekiyorsa draw_on_board çağrılarını yap.',
  ].filter(Boolean) as string[];

  const { text, tokensUsed, functionCalls } = await generateGeminiWithTools({
    systemInstruction,
    userMessage: userParts.join('\n'),
    tools: [REPLY_TOOL, DRAW_TOOL],
    imageBase64: input.imageBase64,
    imageMimeType: input.imageMimeType,
  });

  const canvasCommands: CanvasCommand[] = [];
  let reply: Record<string, unknown> | null = null;

  for (const fc of functionCalls) {
    if (fc.name === 'draw_on_board') {
      const cmd = toolCallToCanvas(fc.args);
      if (cmd) canvasCommands.push(cmd);
    } else if (fc.name === 'tutor_reply') {
      reply = fc.args;
    }
  }

  // Fallback: model text JSON if tools skipped
  if (!reply && text) {
    try {
      const raw = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      reply = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }

  const guidingQuestion =
    typeof reply?.guidingQuestion === 'string'
      ? reply.guidingQuestion.trim()
      : '';

  if (!guidingQuestion) {
    throw new AppError(502, 'Missing guidingQuestion / tutor_reply', 'GEMINI_BAD_SCHEMA');
  }

  return {
    guidingQuestion,
    latexHints: [],
    canvasCommands,
    pedagogicalBand: band,
    tokensUsed,
    neverRevealAnswer: reply?.neverRevealAnswer !== false && !forceReveal,
    detectedSubject:
      typeof reply?.detectedSubject === 'string' ? reply.detectedSubject : null,
    detectedTopic:
      typeof reply?.detectedTopic === 'string' ? reply.detectedTopic : null,
    offTopic: reply?.offTopic === true,
    sessionComplete: reply?.sessionComplete === true || forceReveal,
    encouragement:
      typeof reply?.encouragement === 'string' ? reply.encouragement : '',
    forceRevealApplied: forceReveal,
  };
}
