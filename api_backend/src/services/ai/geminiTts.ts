import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getVoiceAnchor, splitIntoSentences } from './voiceAnchor.js';

type GeminiTtsResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
        inline_data?: { mime_type?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string };
};

export type GeminiSpeechResult = {
  mimeType: string;
  audioBase64: string;
  voiceName: string;
  seed: number;
};

export type SpeechChunk = GeminiSpeechResult & {
  index: number;
  text: string;
  done: boolean;
};

function ablaDirector(anchor: { speakingRateHint: string; seed: number }): string {
  return [
    'Audio Profile: Roti, warm Turkish older-sister tutor (abla).',
    'Age vibe: mid-20s, kind, patient, never robotic.',
    'Scene: quiet study room. Soft smile in the voice.',
    `Voice continuity seed=${anchor.seed}; pace=${anchor.speakingRateHint}.`,
    'ALWAYS the same calm abla voice as previous turns in this session.',
    'Natural Türkiye Turkish. Short clear sentences. Not a news reader.',
    'Speak only the lines below:',
    '',
  ].join('\n');
}

function pcmToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const header = Buffer.alloc(44);
  const dataSize = pcm.length;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}

function extractSampleRate(mime: string): number {
  const m = /rate=(\d+)/i.exec(mime);
  return m ? Number(m[1]) : 24000;
}

/**
 * Gemini TTS — oturum Voice Anchor ile sabit ses.
 */
export async function generateWarmSpeech(
  text: string,
  voiceName?: string,
  sessionId?: string | null,
): Promise<GeminiSpeechResult> {
  if (!env.geminiApiKey) {
    throw new AppError(
      503,
      'Gemini is not configured (GEMINI_API_KEY)',
      'GEMINI_NOT_CONFIGURED',
    );
  }

  const cleaned = text.trim();
  if (!cleaned) {
    throw new AppError(400, 'Empty speech text', 'EMPTY_SPEECH');
  }

  const anchor = getVoiceAnchor(sessionId);
  const voice = voiceName?.trim() || anchor.voiceName;

  const model = env.geminiTtsModel;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(env.geminiApiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${ablaDirector(anchor)}\n${cleaned}` }],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    }),
  });

  const body = (await res.json()) as GeminiTtsResponse;
  if (!res.ok) {
    throw new AppError(
      502,
      body.error?.message ?? `Gemini TTS HTTP ${res.status}`,
      'GEMINI_TTS_HTTP',
    );
  }

  const part = body.candidates?.[0]?.content?.parts?.[0];
  const inline = part?.inlineData ?? part?.inline_data;
  const data = inline?.data;
  const inlineAny = inline as
    | { mimeType?: string; mime_type?: string }
    | undefined;
  const rawMime = inlineAny?.mimeType ?? inlineAny?.mime_type ?? 'audio/L16';

  if (!data) {
    throw new AppError(502, 'Empty Gemini TTS audio', 'GEMINI_TTS_EMPTY');
  }

  const isPcm =
    /L16|pcm|linear/i.test(rawMime) || !/wav|mpeg|mp3|ogg/i.test(rawMime);
  if (isPcm) {
    return {
      mimeType: 'audio/wav',
      audioBase64: pcmToWavBase64(data, extractSampleRate(rawMime)),
      voiceName: voice,
      seed: anchor.seed,
    };
  }

  return {
    mimeType: rawMime,
    audioBase64: data,
    voiceName: voice,
    seed: anchor.seed,
  };
}

/** Cümle cümle TTS — istemci sırayla çalar */
export async function generateWarmSpeechSentences(
  text: string,
  opts?: { voice?: string; sessionId?: string | null },
): Promise<SpeechChunk[]> {
  const sentences = splitIntoSentences(text);
  const chunks: SpeechChunk[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]!;
    const speech = await generateWarmSpeech(s, opts?.voice, opts?.sessionId);
    chunks.push({
      ...speech,
      index: i,
      text: s,
      done: i === sentences.length - 1,
    });
  }
  if (chunks.length === 0) {
    throw new AppError(400, 'Empty speech text', 'EMPTY_SPEECH');
  }
  return chunks;
}
