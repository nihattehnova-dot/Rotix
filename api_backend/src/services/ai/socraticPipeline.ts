import { pedagogicalBandForGrade } from '../../config/tiers.js';
import { buildMasterSystemPrompt } from '../../config/socraticPrompt.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CanvasCommand, SocraticAiResult } from '../../types/domain.js';
import { generateGeminiJsonTurn } from './geminiClient.js';
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
  encouragement: string;
  forceRevealApplied: boolean;
  interactionTurnCount: number;
  fromCache?: boolean;
};

/**
 * Fast path: tek JSON generateContent (tools yok → çok daha hızlı).
 */
export async function runSocraticTurn(
  input: SocraticTurnInput,
): Promise<SocraticTurnResult> {
  const band = pedagogicalBandForGrade(input.gradeLevel);
  const turn = input.interactionTurnCount ?? 0;
  const forceReveal =
    input.forceReveal === true || turn >= MAX_SOCRATIC_TURNS;
  const hasImage = Boolean(input.imageBase64);

  const systemInstruction = buildMasterSystemPrompt({
    gradeLevel: input.gradeLevel,
    band,
    wrongAnswerCount: input.wrongAnswerCount,
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
    ? [
        'FOTOĞRAF VAR — ZORUNLU:',
        '1) Önce canvasCommands içinde şekli yeniden çiz: shape/circle/triangle/rect/line/arrow (sadece rakam/yazı YETERLİ DEĞİL).',
        '2) Sonra oklar ve kısa etiketlerle ipucu ekle.',
        '3) En az 1 shape VEYA 2 line/arrow komutu olmalı.',
      ].join(' ')
    : 'Metin sorusu: formülleri adım adım formula/text ile tahtaya yaz.';

  const userMessage = [
    `Soru: ${input.questionText}`,
    input.studentAnswer
      ? `Öğrenci cevabı/denemesi: ${input.studentAnswer}`
      : 'İlk yönlendirme.',
    `Tur ${turn}/${MAX_SOCRATIC_TURNS}`,
    input.topic ? `Konu: ${input.subject ?? ''} / ${input.topic}` : null,
    historyBlock ? `Geçmiş:\n${historyBlock}` : null,
    shapeRule,
    forceReveal
      ? 'EXIT&EXPLAIN: çözümü açıkla, tahtaya çiz, sessionComplete=true.'
      : 'Tek kısa guidingQuestion; cevabı verme.',
    'SADECE JSON:',
    '{"guidingQuestion":"...","detectedSubject":null,"detectedTopic":null,"offTopic":false,"sessionComplete":false,"encouragement":"","neverRevealAnswer":true,"canvasCommands":[{"type":"clear"},{"type":"shape","shape":"triangle","x":200,"y":150,"w":300,"h":260,"delayMs":200},{"type":"text","x":80,"y":450,"content":"...","delayMs":400}]}',
  ]
    .filter(Boolean)
    .join('\n');

  const maxOutputTokens = forceReveal ? 700 : hasImage ? 550 : 320;

  const { text, tokensUsed } = await generateGeminiJsonTurn({
    systemInstruction,
    userMessage,
    imageBase64: input.imageBase64,
    imageMimeType: input.imageMimeType,
    maxOutputTokens,
    temperature: hasImage ? 0.3 : 0.35,
    // Takip turlarında flash-lite tercih
    preferLite: !hasImage && !forceReveal && turn > 1,
  });

  let reply: Record<string, unknown>;
  try {
    const raw = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    reply = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new AppError(502, 'Invalid JSON from Gemini', 'GEMINI_BAD_SCHEMA');
  }

  const guidingQuestion =
    typeof reply.guidingQuestion === 'string'
      ? reply.guidingQuestion.trim()
      : '';
  if (!guidingQuestion) {
    throw new AppError(502, 'Missing guidingQuestion', 'GEMINI_BAD_SCHEMA');
  }

  let canvasCommands = parseCanvasCommands(reply.canvasCommands);
  // Fotoğrafta şekil yoksa en azından boş şekil iskeleti ekleme — model başarısızsa uyarı text
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
          delayMs: 150,
        },
        ...canvasCommands.filter((c) => c.type !== 'clear'),
        {
          type: 'text',
          x: 80,
          y: 480,
          content: 'Şekli tahtaya taşıdım — hangi kenar / açı?',
          delayMs: 350,
        },
      ];
    }
  }

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
    sessionComplete: reply.sessionComplete === true || forceReveal,
    encouragement:
      typeof reply.encouragement === 'string' ? reply.encouragement : '',
    forceRevealApplied: forceReveal,
    interactionTurnCount: turn,
  };
}
