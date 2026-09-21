import { pedagogicalBandForGrade } from '../../config/tiers.js';
import { buildMasterSystemPrompt } from '../../config/socraticPrompt.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CanvasCommand, SocraticAiResult } from '../../types/domain.js';
import { generateGeminiWithTools } from './geminiClient.js';
import { MAX_SOCRATIC_TURNS } from '../tutorSessionState.js';

export type SocraticTurnInput = {
  gradeLevel: number;
  subject?: string;
  questionText: string;
  studentAnswer?: string;
  topic?: string;
  outcomeCodes?: string[];
  unitName?: string;
  wrongAnswerCount?: number;
  interactionTurnCount?: number;
  forceReveal?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  /** Son 3 etkileşim */
  recentHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
};

const DRAW_TOOL = {
  name: 'draw_on_board',
  description:
    'Canlı tahtaya yapısal çizim. Fotoğrafta şekli yeniden çiz; metinde formülleri adım adım yaz.',
  parameters: {
    type: 'object',
    properties: {
      action_type: {
        type: 'string',
        enum: [
          'clear',
          'text',
          'write_text_at_coords',
          'formula',
          'highlight',
          'highlight_area',
          'line',
          'arrow',
          'rect',
          'draw_shape',
          'shape',
          'draw_coordinate_system',
          'coords',
        ],
      },
      content: { type: 'string' },
      shape: {
        type: 'string',
        enum: ['circle', 'triangle', 'coords', 'rectangle'],
      },
      x: { type: 'number' },
      y: { type: 'number' },
      x1: { type: 'number' },
      y1: { type: 'number' },
      x2: { type: 'number' },
      y2: { type: 'number' },
      w: { type: 'number' },
      h: { type: 'number' },
      delayMs: { type: 'number' },
    },
    required: ['action_type'],
  },
};

const REPLY_TOOL = {
  name: 'tutor_reply',
  description: 'Öğrenciye yanıt bayrakları (kısa guidingQuestion).',
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
  let action = String(args.action_type ?? '');
  // Alias map → domain types
  if (action === 'write_text_at_coords') action = 'text';
  if (action === 'highlight_area') action = 'highlight';
  if (action === 'draw_shape') action = 'shape';
  if (action === 'draw_coordinate_system') action = 'coords';

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
    case 'arrow':
      return withDelay({
        type: 'arrow',
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
    case 'shape':
    case 'coords': {
      const shapeRaw = String(args.shape ?? (action === 'coords' ? 'coords' : 'circle'));
      const shape =
        shapeRaw === 'triangle'
          ? 'triangle'
          : shapeRaw === 'coords'
            ? 'coords'
            : 'circle';
      return withDelay({
        type: 'shape',
        shape,
        x: Number(args.x ?? 200),
        y: Number(args.y ?? 200),
        w: Number(args.w ?? 200),
        h: Number(args.h ?? 200),
      });
    }
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
  interactionTurnCount: number;
  fromCache?: boolean;
};

export async function runSocraticTurn(
  input: SocraticTurnInput,
): Promise<SocraticTurnResult> {
  const band = pedagogicalBandForGrade(input.gradeLevel);
  const turn = input.interactionTurnCount ?? 0;
  const forceReveal =
    input.forceReveal === true || turn >= MAX_SOCRATIC_TURNS;

  const systemInstruction = buildMasterSystemPrompt({
    gradeLevel: input.gradeLevel,
    band,
    wrongAnswerCount: input.wrongAnswerCount,
    interactionTurnCount: turn,
    forceReveal,
    hasImage: Boolean(input.imageBase64),
  });

  const historyBlock =
    input.recentHistory && input.recentHistory.length > 0
      ? [
          'Son etkileşimler (en fazla 3 tur):',
          ...input.recentHistory.map(
            (h) => `${h.role === 'user' ? 'Öğrenci' : 'Roti'}: ${h.text}`,
          ),
        ].join('\n')
      : null;

  const userParts: string[] = [
    `Soru: ${input.questionText}`,
    input.studentAnswer
      ? `Öğrenci denemesi: ${input.studentAnswer}`
      : 'Henüz cevap yok — ilk ipucu.',
    `Tur: ${turn}/${MAX_SOCRATIC_TURNS}; yanlış: ${input.wrongAnswerCount ?? 0}`,
    input.outcomeCodes?.length
      ? `MEB kodları: ${input.outcomeCodes.join(', ')}`
      : null,
    input.topic
      ? `Konu ipucu (doğrula): ${input.subject ?? ''} / ${input.topic}`
      : 'Konu kilidi yok — tespit et.',
    historyBlock,
    forceReveal
      ? 'EXIT&EXPLAIN: çözümü tahtaya adım adım çiz.'
      : 'tutor_reply + draw_on_board (kısa).',
  ].filter(Boolean) as string[];

  // Sokratik ipucu kısa; Exit & Explain biraz daha uzun
  const maxOutputTokens = forceReveal ? 900 : 420;

  const { text, tokensUsed, functionCalls } = await generateGeminiWithTools({
    systemInstruction,
    userMessage: userParts.join('\n'),
    tools: [REPLY_TOOL, DRAW_TOOL],
    imageBase64: input.imageBase64,
    imageMimeType: input.imageMimeType,
    maxOutputTokens,
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
    interactionTurnCount: turn,
  };
}
