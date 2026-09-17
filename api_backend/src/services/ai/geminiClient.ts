import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';

type GeminiPart = { text?: string };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
};

export type GeminiGenerateResult = {
  text: string;
  tokensUsed: number;
};

export async function generateGeminiContent(input: {
  systemInstruction: string;
  userMessage: string;
  temperature?: number;
}): Promise<GeminiGenerateResult> {
  if (!env.geminiApiKey) {
    throw new AppError(
      503,
      'Gemini is not configured (GEMINI_API_KEY)',
      'GEMINI_NOT_CONFIGURED',
    );
  }

  const model = env.geminiModel;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(env.geminiApiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: input.systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: input.userMessage }],
        },
      ],
      generationConfig: {
        temperature: input.temperature ?? 0.4,
        responseMimeType: 'application/json',
      },
    }),
  });

  const body = (await res.json()) as GeminiResponse;

  if (!res.ok) {
    throw new AppError(
      502,
      body.error?.message ?? `Gemini HTTP ${res.status}`,
      'GEMINI_HTTP_ERROR',
    );
  }

  const text = body.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new AppError(502, 'Empty Gemini response', 'GEMINI_EMPTY');
  }

  const tokensUsed =
    body.usageMetadata?.totalTokenCount ??
    (body.usageMetadata?.promptTokenCount ?? 0) +
      (body.usageMetadata?.candidatesTokenCount ?? 0);

  return { text, tokensUsed };
}
