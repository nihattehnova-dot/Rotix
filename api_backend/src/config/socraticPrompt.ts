import type { PedagogicalBand } from '../config/tiers.js';
import { MAX_SOCRATIC_TURNS } from '../services/tutorSessionState.js';

const BAND_VOICE: Record<PedagogicalBand, string> = {
  primary: 'İlkokul: somut, neşeli, kısa cümle.',
  middle: 'Ortaokul: keşfettirici, kısa ipucu.',
  exam_lgs: 'LGS: enerjik, yöntem odaklı.',
  high: 'Lise: analitik, sakin.',
  exam_yks: 'YKS: profesyonel, pratik.',
};

/**
 * Sadeleştirilmiş master prompt — Late binding, kısa context.
 */
export function buildMasterSystemPrompt(input: {
  gradeLevel: number;
  band: PedagogicalBand;
  wrongAnswerCount?: number;
  interactionTurnCount?: number;
  forceReveal?: boolean;
  hasImage?: boolean;
}): string {
  const turn = input.interactionTurnCount ?? 0;
  const exitMode =
    input.forceReveal === true || turn >= MAX_SOCRATIC_TURNS;

  const lines = [
    'Sen Rotix’sin: K-12 Sokratik özel öğretmen. Türkçe, şefkatli, kısa.',
    `Sınıf: ${input.gradeLevel}. Bant: ${input.band}. ${BAND_VOICE[input.band]}`,
    'Kurallar: (1) Önce ders/konuyu tespit et, varsayma. (2) Alakasız soruyu kibarca reddet (offTopic). (3) Sokratikte tek ipucu + tek soru; cevabı verme.',
    'Araçlar: tutor_reply + draw_on_board. Yarım JSON yazma.',
    'Tahta action_type: clear|text|formula|highlight|line|rect|arrow|shape|coords|write_text_at_coords|highlight_area|draw_shape|draw_coordinate_system.',
    'Koordinatlar 0–1000. Adım adım çiz (delayMs).',
  ];

  if (input.hasImage) {
    lines.push(
      'FOTOĞRAF VAR: Görseldeki şekli/problemi analiz et; tahtaya vektörel yeniden çiz (şekil+ok+etiket); çözümü şekil üzerinde işle — tahta başına geçen öğretmen gibi.',
    );
  }

  if (exitMode) {
    lines.push(
      '',
      `EXIT & EXPLAIN (${MAX_SOCRATIC_TURNS}+ tur / takılma): Sokratik soru SORMA.`,
      'Ton: "Harika bir deneme yaptın! Ancak burada takıldık, şimdi adımları birlikte netleştirelim..."',
      'Doğru çözümü şefkatle adım adım açıkla, tahtaya çiz, Unutma Defteri’ne eklediğini söyle, sessionComplete=true.',
    );
  } else {
    lines.push(
      `Tur ${turn}/${MAX_SOCRATIC_TURNS}. Doğrudan cevap verme; draw_on_board ile ipucu çiz.`,
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
}): string {
  return buildMasterSystemPrompt({
    gradeLevel: input.gradeLevel,
    band: input.band,
    wrongAnswerCount: input.wrongAnswerCount,
    forceReveal: input.forceReveal,
    interactionTurnCount: input.interactionTurnCount,
  });
}
