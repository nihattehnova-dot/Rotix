import { pedagogicalBandForGrade } from '../../config/tiers.js';
import { buildSocraticSystemPrompt } from '../../config/socraticPrompt.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CanvasCommand, SocraticAiResult } from '../../types/domain.js';
import { generateGeminiContent } from './geminiClient.js';

export type SocraticTurnInput = {
  gradeLevel: number;
  subject: string;
  questionText: string;
  studentAnswer?: string;
  topic?: string;
  outcomeCodes?: string[];
  unitName?: string;
};

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function isCanvasCommand(value: unknown): value is CanvasCommand {
  if (!value || typeof value !== 'object') return false;
  const t = (value as { type?: unknown }).type;
  return (
    t === 'clear' ||
    t === 'text' ||
    t === 'line' ||
    t === 'rect' ||
    t === 'highlight' ||
    t === 'formula'
  );
}

function parseSocraticJson(raw: string): {
  guidingQuestion: string;
  latexHints: string[];
  canvasCommands: CanvasCommand[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    throw new AppError(502, 'Gemini returned invalid JSON', 'GEMINI_BAD_JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AppError(502, 'Gemini JSON root invalid', 'GEMINI_BAD_JSON');
  }

  const obj = parsed as Record<string, unknown>;
  const guidingQuestion =
    typeof obj.guidingQuestion === 'string' ? obj.guidingQuestion.trim() : '';

  if (!guidingQuestion) {
    throw new AppError(502, 'Missing guidingQuestion', 'GEMINI_BAD_SCHEMA');
  }

  const latexHints = Array.isArray(obj.latexHints)
    ? obj.latexHints.filter((h): h is string => typeof h === 'string')
    : [];

  const canvasCommands = Array.isArray(obj.canvasCommands)
    ? obj.canvasCommands.filter(isCanvasCommand)
    : [];

  return { guidingQuestion, latexHints, canvasCommands };
}

/**
 * Costly dynamic path — call ONLY for Socratic / student Q&A.
 * Standard lectures must use curriculum cache instead.
 */
export async function runSocraticTurn(
  input: SocraticTurnInput,
): Promise<SocraticAiResult> {
  const band = pedagogicalBandForGrade(input.gradeLevel);
  const systemInstruction = buildSocraticSystemPrompt({
    gradeLevel: input.gradeLevel,
    band,
    subject: input.subject,
    topic: input.topic,
    unitName: input.unitName,
    outcomeCodes: input.outcomeCodes,
  });

  const userMessage = [
    input.topic ? `Müfredat konusu: ${input.topic}` : null,
    input.unitName ? `Ünite: ${input.unitName}` : null,
    input.outcomeCodes?.length
      ? `Kazanım kodları: ${input.outcomeCodes.slice(0, 8).join(', ')}`
      : null,
    `Öğrenci sorusu / problem: ${input.questionText}`,
    input.studentAnswer
      ? `Öğrencinin denemesi: ${input.studentAnswer}`
      : 'Öğrenci henüz cevap vermedi.',
    'Kurallara uyarak tek bir yönlendirici soru üret. Yanıtını bu müfredat konusuna bağla.',
  ]
    .filter(Boolean)
    .join('\n');

  const { text, tokensUsed } = await generateGeminiContent({
    systemInstruction,
    userMessage,
  });

  const parsed = parseSocraticJson(text);

  return {
    ...parsed,
    pedagogicalBand: band,
    tokensUsed,
    neverRevealAnswer: true,
  };
}
