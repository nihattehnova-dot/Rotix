import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateWarmSpeech } from './geminiTts.js';

export type AudioChunkEvent = {
  mimeType: string;
  audioBase64: string;
  index: number;
  done: boolean;
};

/**
 * Tutor speech for WS clients.
 * Varsayılan: tek seferlik Gemini TTS (WAV) — net ve anlaşılır.
 * Live native-audio parçalı oynatma tarayıcıda takılma/anlaşılmazlık
 * ürettiği için kapalı tutulur (GEMINI_LIVE_SPEECH=true ile açılır).
 */
export async function streamTutorSpeech(
  text: string,
  onChunk: (ev: AudioChunkEvent) => void,
  options?: { voice?: string },
): Promise<{ engine: 'live' | 'tts' }> {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new AppError(400, 'Empty speech text', 'EMPTY_SPEECH');
  }
  if (!env.geminiApiKey) {
    throw new AppError(503, 'Gemini not configured', 'GEMINI_NOT_CONFIGURED');
  }

  const voice = options?.voice ?? 'Callirrhoe';

  // Kalite öncelikli: tek WAV
  const speech = await generateWarmSpeech(cleaned, voice);
  onChunk({
    mimeType: speech.mimeType,
    audioBase64: speech.audioBase64,
    index: 0,
    done: false,
  });
  onChunk({
    mimeType: speech.mimeType,
    audioBase64: '',
    index: 1,
    done: true,
  });
  return { engine: 'tts' };
}
