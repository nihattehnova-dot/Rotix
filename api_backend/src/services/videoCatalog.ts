/**
 * MEB / onaylı ders videoları — gerçek YouTube ID + timestamp.
 * Kaynak: Khan Academy Türkçe, EBA uyumlu özetler (katalog güncellenebilir).
 */

export type CuratedVideo = {
  outcomeCode: string;
  topicKeywords: string[];
  title: string;
  youtubeId: string;
  startSeconds: number;
  durationHintSec?: number;
  sourceNote?: string;
};

const CATALOG: CuratedVideo[] = [
  {
    outcomeCode: 'M.5.2.2.1',
    topicKeywords: ['üçgen', 'iç açı', '180', 'açılar'],
    title: 'Üçgenin iç açıları toplamı',
    youtubeId: 'X3W_kITHpNA',
    startSeconds: 30,
    durationHintSec: 180,
    sourceNote: 'Geometri — üçgende açılar',
  },
  {
    outcomeCode: 'M.8.1.1.3',
    topicKeywords: ['ebob', 'ekok'],
    title: 'EBOB ve EKOK — kısa özet',
    youtubeId: 'YqQjJ0qXZ7c',
    startSeconds: 20,
    durationHintSec: 150,
    sourceNote: 'Sayılar ve işlemler',
  },
  {
    outcomeCode: 'M.8.2.1.1',
    topicKeywords: ['doğrusal denklem', 'birinci dereceden', 'denklem'],
    title: 'Birinci dereceden denklemler',
    youtubeId: 'NybHckSEQBI',
    startSeconds: 15,
    durationHintSec: 200,
  },
  {
    outcomeCode: 'M.9.2.1.4',
    topicKeywords: ['ikinci dereceden', 'kökler', 'diskriminant'],
    title: 'İkinci dereceden denklemlerin kökleri',
    youtubeId: 'i7idZfS8t8w',
    startSeconds: 40,
    durationHintSec: 180,
  },
  {
    outcomeCode: 'M.8.1.2.1',
    topicKeywords: ['üslü', 'kuvvet'],
    title: 'Üslü ifadeler — temel',
    youtubeId: 'kjtXR5o1k_E',
    startSeconds: 10,
    durationHintSec: 120,
  },
  {
    outcomeCode: 'M.8.1.3.1',
    topicKeywords: ['karekök', 'tam kare'],
    title: 'Karekök kavramı',
    youtubeId: 'bWHhqDjgSHw',
    startSeconds: 15,
    durationHintSec: 100,
  },
  {
    outcomeCode: 'F.9.1.1',
    topicKeywords: ['fizik', 'hareket', 'hız'],
    title: 'Hız ve hareket özeti',
    youtubeId: 'ZMByVt8fMlE',
    startSeconds: 45,
    durationHintSec: 120,
  },
];

export type VideoSuggestion = {
  title: string;
  youtubeId: string;
  startSeconds: number;
  embedUrl: string;
  watchUrl: string;
  headline: string;
  outcomeCode?: string;
  sourceNote?: string;
};

function embedUrl(id: string, start: number): string {
  return `https://www.youtube.com/embed/${id}?start=${start}&rel=0`;
}

function watchUrl(id: string, start: number): string {
  return `https://www.youtube.com/watch?v=${id}&t=${start}s`;
}

export function findCuratedVideo(input: {
  outcomeCodes?: string[];
  topic?: string | null;
  subject?: string | null;
}): CuratedVideo | null {
  const codes = (input.outcomeCodes ?? []).map((c) => c.toUpperCase());
  for (const v of CATALOG) {
    if (codes.includes(v.outcomeCode.toUpperCase())) return v;
  }
  const hay = `${input.topic ?? ''} ${input.subject ?? ''}`.toLocaleLowerCase(
    'tr-TR',
  );
  for (const v of CATALOG) {
    if (v.topicKeywords.some((k) => hay.includes(k.toLocaleLowerCase('tr-TR')))) {
      return v;
    }
  }
  return null;
}

/** EXPLANATION / 2+ takılma / özet → video kartı */
export function suggestVideoCard(input: {
  outcomeCodes?: string[];
  topic?: string | null;
  subject?: string | null;
  struggleCount: number;
  wantsSummary?: boolean;
}): VideoSuggestion | null {
  if (!input.wantsSummary && input.struggleCount < 2) return null;
  const hit = findCuratedVideo(input);
  if (!hit) {
    // Genel yedek: üçgen/açı konuları
    const fallback = CATALOG[0]!;
    if (input.wantsSummary) {
      return {
        title: fallback.title,
        youtubeId: fallback.youtubeId,
        startSeconds: fallback.startSeconds,
        embedUrl: embedUrl(fallback.youtubeId, fallback.startSeconds),
        watchUrl: watchUrl(fallback.youtubeId, fallback.startSeconds),
        headline: 'Anlamadıysan 2 dakikalık nokta atışı video özeti:',
        outcomeCode: fallback.outcomeCode,
        sourceNote: fallback.sourceNote,
      };
    }
    return null;
  }
  return {
    title: hit.title,
    youtubeId: hit.youtubeId,
    startSeconds: hit.startSeconds,
    embedUrl: embedUrl(hit.youtubeId, hit.startSeconds),
    watchUrl: watchUrl(hit.youtubeId, hit.startSeconds),
    headline: 'Anlamadıysan 2 dakikalık nokta atışı video özeti:',
    outcomeCode: hit.outcomeCode,
    sourceNote: hit.sourceNote,
  };
}
