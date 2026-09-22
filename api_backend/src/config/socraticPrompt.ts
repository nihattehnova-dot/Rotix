import type { PedagogicalBand } from '../config/tiers.js';
import { MAX_WRONG_PER_STAGE } from '../services/tutorSessionState.js';

const BAND_VOICE: Record<PedagogicalBand, string> = {
  primary: 'İlkokul: somut, neşeli, kısa cümle.',
  middle: 'Ortaokul: keşfettirici, kısa ipucu.',
  exam_lgs: 'LGS: enerjik, yöntem odaklı.',
  high: 'Lise: analitik, sakin.',
  exam_yks: 'YKS: profesyonel, pratik.',
};

/**
 * Kısa master prompt — hız + kademeli yanlış hakkı.
 */
export function buildMasterSystemPrompt(input: {
  gradeLevel: number;
  band: PedagogicalBand;
  wrongAnswerCount?: number;
  questionStage?: number;
  interactionTurnCount?: number;
  forceReveal?: boolean;
  hasImage?: boolean;
}): string {
  const wrongs = input.wrongAnswerCount ?? 0;
  const stage = input.questionStage ?? 1;
  const exitMode =
    input.forceReveal === true || wrongs >= MAX_WRONG_PER_STAGE;

  const lines = [
    'Sen Rotix’sin: K-12 Sokratik öğretmen. Türkçe, şefkatli, net.',
    `Sınıf ${input.gradeLevel}. ${BAND_VOICE[input.band]}`,
    'Önce konu tespit et. Alakasızsa kibarca reddet (offTopic=true).',
    'JSON: guidingQuestion, spokenNarration, detectedSubject, detectedTopic, offTopic, sessionComplete, stageComplete, encouragement, neverRevealAnswer, canvasCommands[].',
    'Tahta type: clear|text|formula|highlight|line|arrow|rect|shape. Koordinat 0–1000.',
  ];

  if (input.hasImage) {
    lines.push(
      'FOTO: Şekli shape/line/arrow ile çiz; yalnız rakam yasak. Sonra kısa ipucu.',
    );
  }

  if (exitMode) {
    lines.push(
      '',
      `KADEME AÇIKLA (kademe ${stage}, ${wrongs} yanlış / max ${MAX_WRONG_PER_STAGE}):`,
      'Sokratik soru SORMA. Doğru cevabı ver.',
      'spokenNarration: 3–6 cümle SESLİ ANLATIM (neden+nasıl+sonuç). Bu alan TTS ile okunur — boş bırakma!',
      'guidingQuestion: kısa özet + "şimdi bir sonraki adıma geçelim" (çok kademeliyse).',
      'canvasCommands: çözümü tahtaya adım adım yaz/çiz.',
      'stageComplete=true. Tek adımlı soruda sessionComplete=true; devamı varsa sessionComplete=false.',
      'Ton: "Harika denedin! Burada takıldık, birlikte netleştirelim..."',
    );
  } else {
    lines.push(
      `Kademe ${stage}, yanlış ${wrongs}/${MAX_WRONG_PER_STAGE}. Cevabı verme; tek kısa ipucu + tek soru.`,
      'spokenNarration: ipucunu sesli söyleyecek 1–2 kısa cümle.',
    );
  }

  return lines.join('\n');
}

/** @deprecated */
export function buildSocraticSystemPrompt(input: {
  gradeLevel: number;
  band: PedagogicalBand;
  wrongAnswerCount?: number;
  forceReveal?: boolean;
  interactionTurnCount?: number;
  questionStage?: number;
}): string {
  return buildMasterSystemPrompt({
    gradeLevel: input.gradeLevel,
    band: input.band,
    wrongAnswerCount: input.wrongAnswerCount,
    forceReveal: input.forceReveal,
    interactionTurnCount: input.interactionTurnCount,
    questionStage: input.questionStage,
  });
}
