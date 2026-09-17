import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';

type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string; status?: string };
};

export type GeminiGenerateResult = {
  text: string;
  tokensUsed: number;
  modelUsed: string;
};

/** Yoğunluk / 404 durumunda sırayla dene (yalnızca bu anahtarla çalışanlar). */
function modelCandidates(preferred?: string): string[] {
  const list = [
    preferred?.trim(),
    env.geminiModel,
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.6-flash',
    'gemini-flash-latest',
  ].filter((m): m is string => !!m && m.length > 0);
  // Eski / new-user’a kapalı modelleri ele
  const blocked = new Set([
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro',
  ]);
  return [...new Set(list)].filter((m) => !blocked.has(m));
}

function isRetryableGeminiError(status: number, message: string): boolean {
  const m = message.toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    status === 404 ||
    m.includes('high demand') ||
    m.includes('resource_exhausted') ||
    m.includes('unavailable') ||
    m.includes('no longer available') ||
    m.includes('not found')
  );
}

async function postGenerateContent(input: {
  model: string;
  body: Record<string, unknown>;
}): Promise<{ ok: true; body: GeminiResponse } | { ok: false; status: number; message: string }> {
  if (!env.geminiApiKey) {
    return { ok: false, status: 503, message: 'GEMINI_API_KEY missing' };
  }
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent` +
    `?key=${encodeURIComponent(env.geminiApiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.body),
  });
  const body = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: body.error?.message ?? `Gemini HTTP ${res.status}`,
    };
  }
  return { ok: true, body };
}

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

  const payload = {
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
  };

  let lastMessage = 'Gemini failed';
  for (const model of modelCandidates()) {
    const result = await postGenerateContent({ model, body: payload });
    if (!result.ok) {
      lastMessage = result.message;
      if (isRetryableGeminiError(result.status, result.message)) {
        console.warn(`[gemini] ${model} failed (${result.status}): ${result.message}`);
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw new AppError(502, result.message, 'GEMINI_HTTP_ERROR');
    }

    const text = result.body.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();

    if (!text) {
      lastMessage = 'Empty Gemini response';
      continue;
    }

    const tokensUsed =
      result.body.usageMetadata?.totalTokenCount ??
      (result.body.usageMetadata?.promptTokenCount ?? 0) +
        (result.body.usageMetadata?.candidatesTokenCount ?? 0);

    return { text, tokensUsed, modelUsed: model };
  }

  throw new AppError(
    503,
    lastMessage.includes('high demand')
      ? 'Yapay zeka şu an yoğun. 30 sn sonra tekrar dene.'
      : lastMessage,
    'GEMINI_UNAVAILABLE',
  );
}

/** Vision / foto — aynı model yedekleri. */
export async function generateGeminiVision(input: {
  prompt: string;
  imageBase64: string;
  mimeType: string;
  temperature?: number;
}): Promise<GeminiGenerateResult> {
  if (!env.geminiApiKey) {
    throw new AppError(
      503,
      'Gemini is not configured (GEMINI_API_KEY)',
      'GEMINI_NOT_CONFIGURED',
    );
  }

  const raw = input.imageBase64.includes(',')
    ? input.imageBase64.split(',').pop()!
    : input.imageBase64;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: input.prompt },
          {
            inlineData: {
              mimeType: input.mimeType || 'image/jpeg',
              data: raw,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: input.temperature ?? 0.2,
      responseMimeType: 'application/json',
    },
  };

  let lastMessage = 'Gemini vision failed';
  for (const model of modelCandidates()) {
    const result = await postGenerateContent({ model, body: payload });
    if (!result.ok) {
      lastMessage = result.message;
      if (isRetryableGeminiError(result.status, result.message)) {
        console.warn(`[gemini-vision] ${model} failed: ${result.message}`);
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw new AppError(502, result.message, 'GEMINI_VISION_ERROR');
    }

    const text = result.body.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!text) {
      lastMessage = 'Empty vision response';
      continue;
    }

    const tokensUsed =
      result.body.usageMetadata?.totalTokenCount ??
      (result.body.usageMetadata?.promptTokenCount ?? 0) +
        (result.body.usageMetadata?.candidatesTokenCount ?? 0);

    return { text, tokensUsed, modelUsed: model };
  }

  throw new AppError(
    503,
    lastMessage.includes('high demand')
      ? 'Yapay zeka şu an yoğun. 30 sn sonra tekrar dene.'
      : lastMessage,
    'GEMINI_UNAVAILABLE',
  );
}
