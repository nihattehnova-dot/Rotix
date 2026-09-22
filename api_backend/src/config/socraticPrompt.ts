import type { PedagogicalBand } from '../config/tiers.js';
import type { TutorFsmState } from '../services/tutorSessionState.js';
import { MAX_SOCRATIC_TURNS, MAX_WRONG_PER_STAGE } from '../services/tutorSessionState.js';

const BAND_VOICE: Record<PedagogicalBand, string> = {
  primary: 'İlkokul: somut, neşeli, kısa cümle.',
  middle: 'Ortaokul: keşfettirici, kısa ipucu.',
  exam_lgs: 'LGS: enerjik, yöntem odaklı.',
  high: 'Lise: analitik, sakin.',
  exam_yks: 'YKS: profesyonel, pratik.',
};

export function buildMasterSystemPrompt(input: {
  gradeLevel: number;
  band: PedagogicalBand;
  wrongAnswerCount?: number;
  questionStage?: number;
  interactionTurnCount?: number;
  forceReveal?: boolean;
  hasImage?: boolean;
  fsmState?: TutorFsmState;
  avoidRepeatHint?: boolean;
}): string {
  const wrongs = input.wrongAnswerCount ?? 0;
  const stage = input.questionStage ?? 1;
  const fsm = input.fsmState ?? 'HINT_1';
  const exitMode =
    input.forceReveal === true ||
    fsm === 'EXPLANATION' ||
    wrongs >= MAX_WRONG_PER_STAGE;

  const lines = [
    'Sen Rotix’sin: K-12 Sokratik öğretmen. Türkçe, şefkatli, net.',
    `Sınıf ${input.gradeLevel}. ${BAND_VOICE[input.band]}`,
    `FSM=${fsm}. Tur ${input.interactionTurnCount ?? 0}/${MAX_SOCRATIC_TURNS}.`,
    'Önce konu tespit et. Alakasızsa offTopic=true.',
    'JSON: guidingQuestion, spokenNarration, detectedSubject, detectedTopic, offTopic, sessionComplete, stageComplete, encouragement, neverRevealAnswer, canvasCommands[].',
    'Tahta type: clear|text|formula|highlight|line|arrow|rect|shape|draw_geometry. Koordinat 0–1000.',
    'Cevap/sonuç içeren text/formula için spoiler:true (ipucu turlarında). EXPLANATION’da spoiler:false.',
    'LaTeX: $...$ veya formula.latex; derece için ° kullan (circ yazma).',
    'draw_geometry: {type:"draw_geometry",shape:"triangle",labels:{"A":[x,y],"B":[x,y],"C":[x,y]},highlightAngle:"C"}.',
  ];

  if (input.hasImage) {
    lines.push(
      'FOTO: Şekli draw_geometry veya shape/line/arrow ile çiz; yalnız rakam yasak.',
    );
  }

  if (input.avoidRepeatHint) {
    lines.push(
      'ÖĞRENCİ AYNI CEVABI TEKRARLIYOR — önceki ipucunu TEKRARLAMA; tamamen farklı bir yaklaşım kullan.',
    );
  }

  if (exitMode) {
    lines.push(
      '',
      `EXPLANATION (kademe ${stage}, yanlış ${wrongs}):`,
      'Sokratik soru SORMA. Doğru cevabı ver. spoiler kullanma (hepsi görünür).',
      'spokenNarration: 3–6 cümle SESLİ ANLATIM. guidingQuestion: kısa özet.',
      'canvasCommands: çözümü adım adım yaz/çiz. stageComplete=true.',
      'Tek adımlıysa sessionComplete=true.',
      'Ton: "Harika denedin! Burada takıldık, birlikte netleştirelim..."',
    );
  } else {
    const hintTone =
      fsm === 'HINT_3'
        ? 'Daha açık yönlendirme; hâlâ cevabı verme.'
        : 'Tek kısa ipucu + tek soru; cevabı verme.';
    lines.push(
      `Durum ${fsm}, yanlış ${wrongs}/${MAX_WRONG_PER_STAGE}. ${hintTone}`,
      'spokenNarration: 1–2 kısa cümle. Sonuç değerlerini spoiler:true yap.',
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
  fsmState?: TutorFsmState;
}): string {
  return buildMasterSystemPrompt(input);
}
