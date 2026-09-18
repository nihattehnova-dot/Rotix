import WebSocket from 'ws';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateWarmSpeech } from './geminiTts.js';

const LIVE_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export type AudioChunkEvent = {
  mimeType: string;
  audioBase64: string;
  index: number;
  done: boolean;
};

/**
 * Gemini Live native-audio → chunk callback (TTFT).
 * Live başarısızsa cümle cümle REST TTS ile yedekler.
 */
export async function streamTutorSpeech(
  text: string,
  onChunk: (ev: AudioChunkEvent) => void,
  options?: { voice?: string },
): Promise<{ engine: 'live' | 'tts-chunked' }> {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new AppError(400, 'Empty speech text', 'EMPTY_SPEECH');
  }
  if (!env.geminiApiKey) {
    throw new AppError(503, 'Gemini not configured', 'GEMINI_NOT_CONFIGURED');
  }

  try {
    await streamViaLive(cleaned, onChunk, options?.voice ?? 'Aoede');
    return { engine: 'live' };
  } catch (err) {
    console.warn(
      '[live-speech] fallback to chunked TTS:',
      err instanceof Error ? err.message : err,
    );
    await streamViaChunkedTts(cleaned, onChunk, options?.voice ?? 'Callirrhoe');
    return { engine: 'tts-chunked' };
  }
}

function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?…])\s+|(?<=[.!?])(?=[A-ZÇĞİÖŞÜÂÊÎÔÛ])/u)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

/** PCM base64 → küçük parçalar (≈100ms @24kHz mono 16-bit). */
function slicePcmBase64(pcmB64: string, bytesPerChunk = 4800): string[] {
  const buf = Buffer.from(pcmB64, 'base64');
  const out: string[] = [];
  for (let i = 0; i < buf.length; i += bytesPerChunk) {
    out.push(buf.subarray(i, i + bytesPerChunk).toString('base64'));
  }
  return out.length ? out : [pcmB64];
}

async function streamViaChunkedTts(
  text: string,
  onChunk: (ev: AudioChunkEvent) => void,
  voice: string,
): Promise<void> {
  const sentences = splitSentences(text);
  let index = 0;
  for (let s = 0; s < sentences.length; s++) {
    const speech = await generateWarmSpeech(sentences[s]!, voice);
    const mime = speech.mimeType.includes('pcm')
      ? speech.mimeType
      : 'audio/wav';
    // WAV ise tamamını tek paket; PCM ise dilimle
    if (mime.includes('wav') || !mime.includes('pcm')) {
      onChunk({
        mimeType: mime,
        audioBase64: speech.audioBase64,
        index: index++,
        done: false,
      });
    } else {
      const raw = speech.audioBase64.includes(',')
        ? speech.audioBase64.split(',').pop()!
        : speech.audioBase64;
      for (const piece of slicePcmBase64(raw)) {
        onChunk({
          mimeType: mime,
          audioBase64: piece,
          index: index++,
          done: false,
        });
      }
    }
  }
  onChunk({
    mimeType: 'audio/pcm;rate=24000',
    audioBase64: '',
    index,
    done: true,
  });
}

async function streamViaLive(
  text: string,
  onChunk: (ev: AudioChunkEvent) => void,
  voice: string,
): Promise<void> {
  const model = env.geminiLiveModel;
  const url = `${LIVE_URL}?key=${encodeURIComponent(env.geminiApiKey!)}`;

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url);
    let index = 0;
    let setupDone = false;
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          ws.close();
        } catch {
          /* */
        }
        reject(new Error('Live speech timeout'));
      }
    }, 45_000);

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {
        /* */
      }
      if (err) reject(err);
      else resolve();
    };

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
            systemInstruction: {
              parts: [
                {
                  text:
                    'Sen Rotix’sin. Kısa, sıcak Türkçe konuş. Yalnızca verilen metni seslendir; ekstra açıklama ekleme.',
                },
              ],
            },
          },
        }),
      );
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          setupComplete?: unknown;
          serverContent?: {
            modelTurn?: {
              parts?: Array<{
                inlineData?: { mimeType?: string; data?: string };
                inline_data?: { mime_type?: string; data?: string };
              }>;
            };
            turnComplete?: boolean;
          };
          error?: { message?: string };
        };

        if (msg.error?.message) {
          finish(new Error(msg.error.message));
          return;
        }

        if (msg.setupComplete != null && !setupDone) {
          setupDone = true;
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `Şunu Türkçe, doğal abla tonunda seslendir:\n${text}`,
                      },
                    ],
                  },
                ],
                turnComplete: true,
              },
            }),
          );
          return;
        }

        const parts = msg.serverContent?.modelTurn?.parts ?? [];
        for (const p of parts) {
          const inline = p.inlineData ?? p.inline_data;
          const b64 = inline?.data;
          const mime =
            ('mimeType' in (inline ?? {})
              ? (inline as { mimeType?: string }).mimeType
              : undefined) ??
            (inline as { mime_type?: string } | undefined)?.mime_type ??
            'audio/pcm;rate=24000';
          if (b64) {
            onChunk({
              mimeType: mime,
              audioBase64: b64,
              index: index++,
              done: false,
            });
          }
        }

        if (msg.serverContent?.turnComplete) {
          onChunk({
            mimeType: 'audio/pcm;rate=24000',
            audioBase64: '',
            index,
            done: true,
          });
          finish();
        }
      } catch (e) {
        finish(e instanceof Error ? e : new Error(String(e)));
      }
    });

    ws.on('error', (e) => finish(e instanceof Error ? e : new Error(String(e))));
    ws.on('close', () => {
      if (!settled) {
        if (index > 0) {
          onChunk({
            mimeType: 'audio/pcm;rate=24000',
            audioBase64: '',
            index,
            done: true,
          });
          finish();
        } else {
          finish(new Error('Live WS closed without audio'));
        }
      }
    });
  });
}
