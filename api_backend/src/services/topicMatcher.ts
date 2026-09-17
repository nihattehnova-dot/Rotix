import type { CurriculumCatalogItem } from './curriculumCatalog.js';
import { listCurriculumTopics } from './curriculumCatalog.js';

export type TopicMatch = {
  curriculumId: string;
  grade: number | string;
  subject: string;
  topic: string;
  unitName: string | null;
  outcomeCodes: string[];
  keywords: string[];
  score: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'keyword' | 'hint' | 'fallback' | 'gemini';
};

const TR_NORM: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  I: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
};

function normalizeTr(text: string): string {
  return text
    .split('')
    .map((ch) => TR_NORM[ch] ?? ch)
    .join('')
    .toLocaleLowerCase('tr')
    .replace(/[^a-z0-9+\-/=.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text: string): string[] {
  return normalizeTr(text)
    .split(' ')
    .filter((t) => t.length >= 2);
}

function confidenceFromScore(score: number): TopicMatch['confidence'] {
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

const TOPIC_SIGNAL_WORDS: Array<{ topicIncludes: string[]; signals: string[]; boost: number }> = [
  {
    topicIncludes: ['denklem', 'esitlik'],
    signals: ['denklem', 'esitlik', '=', 'bilinmeyen', 'cozum kumesi'],
    boost: 14,
  },
  {
    topicIncludes: ['esitsizlik'],
    signals: ['esitsizlik', '<', '>', 'kucuktur', 'buyuktur'],
    boost: 12,
  },
  {
    topicIncludes: ['oran', 'oranti', 'yuzde'],
    signals: ['oran', 'oranti', 'yuzde', '%', 'carpan'],
    boost: 10,
  },
  {
    topicIncludes: ['uslu', 'koklu', 'karekok'],
    signals: ['uslu', 'kok', 'karekok', '^'],
    boost: 10,
  },
  {
    topicIncludes: ['ucgen', 'benzerlik', 'eslik'],
    signals: ['ucgen', 'benzerlik', 'aci', 'kenar'],
    boost: 10,
  },
  {
    topicIncludes: ['fonksiyon'],
    signals: ['fonksiyon', 'f(x)', 'tanım'],
    boost: 10,
  },
  {
    topicIncludes: ['turev', 'integral', 'limit'],
    signals: ['turev', 'integral', 'limit'],
    boost: 12,
  },
  {
    topicIncludes: ['mevsim', 'iklim'],
    signals: ['mevsim', 'eksen', 'egiklik', 'iklim'],
    boost: 12,
  },
  {
    topicIncludes: ['inkilap', 'ataturk'],
    signals: ['inkilap', 'ataturk', 'cumhuriyet', 'halifelik'],
    boost: 12,
  },
];

function signalBoost(item: CurriculumCatalogItem, questionNorm: string): number {
  const topicNorm = normalizeTr(item.topic);
  let boost = 0;
  for (const rule of TOPIC_SIGNAL_WORDS) {
    if (!rule.topicIncludes.some((t) => topicNorm.includes(t))) continue;
    for (const signal of rule.signals) {
      if (questionNorm.includes(normalizeTr(signal))) {
        boost += rule.boost;
        break;
      }
    }
  }
  // Equation-like pattern strongly prefers denklem topics
  if (/=/.test(questionNorm) && /[a-z]\s*[+\-]/.test(questionNorm)) {
    if (topicNorm.includes('denklem') || topicNorm.includes('esitlik')) boost += 16;
    if (topicNorm.includes('tam sayi')) boost -= 6;
  }
  return boost;
}

function scoreItem(
  item: CurriculumCatalogItem,
  questionNorm: string,
  questionTokens: Set<string>,
  subjectHintNorm?: string,
): number {
  let score = 0;
  const topicNorm = normalizeTr(item.topic);
  const unitNorm = item.unit_name ? normalizeTr(item.unit_name) : '';
  const subjectNorm = normalizeTr(item.subject);

  if (subjectHintNorm) {
    if (subjectNorm === subjectHintNorm) score += 4;
    else if (
      subjectNorm.includes(subjectHintNorm) ||
      subjectHintNorm.includes(subjectNorm)
    ) {
      score += 2;
    } else if (subjectHintNorm !== 'genel') {
      score -= 3;
    }
  }

  if (topicNorm && questionNorm.includes(topicNorm)) score += 10;
  if (unitNorm && questionNorm.includes(unitNorm)) score += 4;

  for (const part of topicNorm.split(' ')) {
    if (part.length >= 3 && questionTokens.has(part)) score += 3;
  }

  for (const kw of item.keywords) {
    const k = normalizeTr(kw);
    if (!k) continue;
    if (questionNorm.includes(k)) score += k.length >= 6 ? 5 : 3;
    else {
      for (const part of k.split(' ')) {
        if (part.length >= 3 && questionTokens.has(part)) score += 1;
      }
    }
  }

  for (const code of item.outcome_codes) {
    const c = normalizeTr(code.replace(/\./g, ' '));
    if (c && questionNorm.includes(c)) score += 2;
  }

  if (item.description) {
    const descTokens = tokens(item.description).slice(0, 12);
    let hits = 0;
    for (const t of descTokens) {
      if (t.length >= 4 && questionTokens.has(t)) hits += 1;
    }
    score += Math.min(4, hits);
  }

  score += signalBoost(item, questionNorm);
  return score;
}

function toMatch(
  item: CurriculumCatalogItem,
  score: number,
  method: TopicMatch['method'],
): TopicMatch {
  return {
    curriculumId: item.id,
    grade: item.grade,
    subject: item.subject,
    topic: item.topic,
    unitName: item.unit_name,
    outcomeCodes: item.outcome_codes,
    keywords: item.keywords,
    score,
    confidence: method === 'hint' ? 'high' : confidenceFromScore(score),
    method,
  };
}

function loadCandidates(input: {
  gradeLevel: number;
  exam?: string;
}): CurriculumCatalogItem[] {
  let candidates = listCurriculumTopics({
    grade: input.exam ? undefined : input.gradeLevel,
    exam: input.exam,
    limit: 500,
  });

  if (candidates.length === 0 && !input.exam) {
    if (input.gradeLevel === 8) {
      candidates = listCurriculumTopics({ exam: 'LGS', limit: 500 });
    } else if (input.gradeLevel >= 11) {
      candidates = [
        ...listCurriculumTopics({ exam: 'TYT', limit: 300 }),
        ...listCurriculumTopics({ exam: 'AYT', limit: 300 }),
      ];
    }
  }
  return candidates;
}

export function rankTopicCandidates(input: {
  questionText: string;
  gradeLevel: number;
  subjectHint?: string | null;
  topicHint?: string | null;
  exam?: string;
  topK?: number;
}): { best: TopicMatch | null; ranked: Array<{ item: CurriculumCatalogItem; score: number }> } {
  const questionNorm = normalizeTr(input.questionText);
  if (!questionNorm) return { best: null, ranked: [] };

  const questionTokens = new Set(tokens(input.questionText));
  const subjectHintNorm = input.subjectHint
    ? normalizeTr(input.subjectHint)
    : undefined;

  const weakHints = new Set([
    'genel',
    'odev sorusu',
    'soru cozumu',
    'soru',
    'konu',
  ]);
  const topicHintNorm =
    input.topicHint && !weakHints.has(normalizeTr(input.topicHint))
      ? normalizeTr(input.topicHint)
      : undefined;

  const candidates = loadCandidates({
    gradeLevel: input.gradeLevel,
    exam: input.exam,
  });

  if (topicHintNorm) {
    const hinted = candidates.find(
      (c) =>
        normalizeTr(c.topic) === topicHintNorm ||
        normalizeTr(c.topic).includes(topicHintNorm),
    );
    if (hinted) {
      return {
        best: toMatch(hinted, 100, 'hint'),
        ranked: [{ item: hinted, score: 100 }],
      };
    }
  }

  const ranked = candidates
    .map((item) => ({
      item,
      score: scoreItem(item, questionNorm, questionTokens, subjectHintNorm),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.topK ?? 12);

  const bestRow = ranked[0];
  if (!bestRow || bestRow.score < 3) {
    return { best: null, ranked };
  }

  return {
    best: toMatch(bestRow.item, bestRow.score, 'keyword'),
    ranked,
  };
}

/**
 * Match a free-text question to the closest MEB/ÖSYM curriculum topic.
 * Prefer keyword overlap; optional subject/topic hints boost ranking.
 */
export function matchQuestionToTopic(input: {
  questionText: string;
  gradeLevel: number;
  subjectHint?: string | null;
  topicHint?: string | null;
  exam?: string;
  limit?: number;
}): TopicMatch | null {
  return rankTopicCandidates({ ...input, topK: input.limit ?? 12 }).best;
}

/**
 * Keyword match first; if confidence is not high, ask Gemini to pick among top candidates.
 * Falls back to keyword result (or null) if Gemini unavailable / fails.
 */
export async function resolveQuestionTopic(input: {
  questionText: string;
  gradeLevel: number;
  subjectHint?: string | null;
  topicHint?: string | null;
  exam?: string;
  useGemini?: boolean;
}): Promise<TopicMatch | null> {
  const { best, ranked } = rankTopicCandidates({
    ...input,
    topK: 12,
  });

  const needGemini =
    input.useGemini !== false &&
    (!best || best.confidence !== 'high' || best.method === 'keyword');

  // Skip Gemini when already high-confidence keyword/hint
  if (best?.confidence === 'high' && best.method !== 'keyword') {
    return best;
  }
  if (best?.confidence === 'high' && best.score >= 18) {
    return best;
  }

  if (!needGemini || ranked.length === 0) return best;

  try {
    const { env } = await import('../config/env.js');
    if (!env.geminiApiKey) return best;

    const { generateGeminiContent } = await import('./ai/geminiClient.js');
    const options = ranked.slice(0, 10).map((r, i) => ({
      i: i + 1,
      id: r.item.id,
      subject: r.item.subject,
      topic: r.item.topic,
      unit: r.item.unit_name,
      keywords: r.item.keywords.slice(0, 6),
    }));

    const { text } = await generateGeminiContent({
      temperature: 0.1,
      systemInstruction: [
        'Türkiye MEB/ÖSYM müfredat konu sınıflandırıcısısın.',
        `Öğrenci sınıfı: ${input.gradeLevel}.`,
        'Verilen aday listesinden soruya EN UYGUN tek konuyu seç.',
        'SADECE JSON: {"index": number, "id": string, "reason": string}',
        'index 1-based aday numarası. Listede yoksa {"index":0,"id":null,"reason":"..."}.',
      ].join(' '),
      userMessage: [
        `Soru: ${input.questionText}`,
        input.subjectHint ? `Ders ipucu: ${input.subjectHint}` : null,
        'Adaylar:',
        JSON.stringify(options, null, 0),
      ]
        .filter(Boolean)
        .join('\n'),
    });

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as {
      index?: number;
      id?: string | null;
    };

    let picked: CurriculumCatalogItem | undefined;
    if (parsed.id) {
      picked = ranked.find((r) => r.item.id === parsed.id)?.item;
    }
    if (!picked && parsed.index && parsed.index >= 1 && parsed.index <= ranked.length) {
      picked = ranked[parsed.index - 1]?.item;
    }
    if (!picked) return best;

    const keywordScore =
      ranked.find((r) => r.item.id === picked!.id)?.score ?? best?.score ?? 10;

    return {
      ...toMatch(picked, Math.max(keywordScore, 16), 'gemini'),
      confidence: 'high',
    };
  } catch (err) {
    console.warn('[topicMatcher] gemini refine failed', err);
    return best;
  }
}

export function topicKey(subject: string | null | undefined, topic: string | null | undefined): string {
  return `${normalizeTr(subject ?? 'genel')}|${normalizeTr(topic ?? 'belirsiz')}`;
}
