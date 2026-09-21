/**
 * MEB outcome code → curated YouTube timestamp links.
 * STEM alt konularında 2+ takılmada veya özet isteğinde önerilir.
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

/** Nitelikli / ders kanalı örnekleri — MEB koduna göre eşlenir */
const CATALOG: CuratedVideo[] = [
  {
    outcomeCode: 'M.8.1.1.3',
    topicKeywords: ['ebob', 'ekok'],
    title: 'EBOB ve EKOK — kısa özet',
    youtubeId: 'dQw4w9WgXcQ', // placeholder — prod’da gerçek ders ID
    startSeconds: 45,
    durationHintSec: 120,
    sourceNote: 'MEB uyumlu özet (katalog güncelle)',
  },
  {
    outcomeCode: 'M.8.2.1.1',
    topicKeywords: ['doğrusal denklem', 'birinci dereceden'],
    title: 'Birinci dereceden denklemler',
    youtubeId: 'dQw4w9WgXcQ',
    startSeconds: 30,
    durationHintSec: 150,
  },
  {
    outcomeCode: 'M.9.2.1.4',
    topicKeywords: ['ikinci dereceden', 'kökler', 'diskriminant'],
    title: 'İkinci dereceden denklemlerin kökleri',
    youtubeId: 'dQw4w9WgXcQ',
    startSeconds: 120,
    durationHintSec: 180,
    sourceNote: 'Nokta atışı kök özeti',
  },
  {
    outcomeCode: 'M.8.1.2.1',
    topicKeywords: ['üslü', 'kuvvet'],
    title: 'Üslü ifadeler — temel',
    youtubeId: 'dQw4w9WgXcQ',
    startSeconds: 20,
    durationHintSec: 120,
  },
  {
    outcomeCode: 'M.8.1.3.1',
    topicKeywords: ['karekök', 'tam kare'],
    title: 'Karekök kavramı',
    youtubeId: 'dQw4w9WgXcQ',
    startSeconds: 15,
    durationHintSec: 100,
  },
  {
    outcomeCode: 'F.9.1.1',
    topicKeywords: ['fizik', 'hareket', 'hız'],
    title: 'Hız ve hareket özeti',
    youtubeId: 'dQw4w9WgXcQ',
    startSeconds: 60,
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

/** 2+ takılma veya özet isteği → video kartı */
export function suggestVideoCard(input: {
  outcomeCodes?: string[];
  topic?: string | null;
  subject?: string | null;
  struggleCount: number;
  wantsSummary?: boolean;
}): VideoSuggestion | null {
  if (!input.wantsSummary && input.struggleCount < 2) return null;
  const hit = findCuratedVideo(input);
  if (!hit) return null;
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

export function listVideoCatalog(): CuratedVideo[] {
  return [...CATALOG];
}
