import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  generateWarmSpeech,
  generateWarmSpeechSentences,
} from './geminiTts.js';

export type AudioChunkEvent = {
  mimeType: string;
  audioBase64: string;
  index: number;
  done: boolean;
  text?: string;
};

/**
 * Tutor speech for WS — cümle cümle WAV (Voice Anchor).
 * Live: GEMINI_LIVE_SPEECH=true (Faz 4 stub → TTS fallback).
 */
export async function streamTutorSpeech(
  text: string,
  onChunk: (ev: AudioChunkEvent) => void,
  options?: { voice?: string; sessionId?: string },
): Promise<{ engine: 'live' | 'tts' }> {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new AppError(400, 'Empty speech text', 'EMPTY_SPEECH');
  }
  if (!env.geminiApiKey) {
    throw new AppError(503, 'Gemini not configured', 'GEMINI_NOT_CONFIGURED');
  }

  if (env.geminiLiveSpeech) {
    // Faz 4: Live henüz native stream yok — aynı sentence TTS (flag hazır)
    console.info('[live] GEMINI_LIVE_SPEECH on — using sentence TTS bridge');
  }

  const chunks = await generateWarmSpeechSentences(cleaned, {
    voice: options?.voice,
    sessionId: options?.sessionId,
  });
  for (const c of chunks) {
    onChunk({
      mimeType: c.mimeType,
      audioBase64: c.audioBase64,
      index: c.index,
      done: false,
      text: c.text,
    });
  }
  onChunk({
    mimeType: 'audio/wav',
    audioBase64: '',
    index: chunks.length,
    done: true,
  });
  return { engine: 'tts' };
}

/** @deprecated single-shot helper */
export async function oneShotTutorSpeech(
  text: string,
  voice?: string,
  sessionId?: string,
) {
  return generateWarmSpeech(text, voice, sessionId);
}
