/**
 * In-memory semantic cache for Socratic Q&A.
 * Jaccard similarity ≥ threshold → cache hit (LLM skip).
 * Single-instance Render; multi-instance için Redis gerekir.
 */

export type CachedSocraticPayload = {
  questionNorm: string;
  gradeLevel: number;
  response: unknown;
  tokensSavedEstimate: number;
  hitCount: number;
  createdAt: number;
  updatedAt: number;
};

const store = new Map<string, CachedSocraticPayload>();
const TTL_MS = 1000 * 60 * 60 * 12; // 12h
const MAX_ENTRIES = 500;
const DEFAULT_THRESHOLD = 0.95;

function prune() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now - v.updatedAt > TTL_MS) store.delete(k);
  }
  if (store.size <= MAX_ENTRIES) return;
  const sorted = [...store.entries()].sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt,
  );
  for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) {
    store.delete(sorted[i]![0]);
  }
}

/** Türkçe normalize: lowercase, noktalama/boşluk sadeleştir */
export function normalizeQuestion(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\s=+\-*/^().,]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text: string): Set<string> {
  const tokens = normalizeQuestion(text)
    .split(' ')
    .filter((t) => t.length > 1);
  return new Set(tokens.length ? tokens : [normalizeQuestion(text)]);
}

/** Jaccard similarity on word tokens */
export function semanticSimilarity(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function cacheKey(gradeLevel: number, norm: string): string {
  return `${gradeLevel}::${norm.slice(0, 240)}`;
}

export function lookupSemanticCache(input: {
  questionText: string;
  gradeLevel: number;
  threshold?: number;
}): { hit: true; entry: CachedSocraticPayload; similarity: number } | { hit: false } {
  prune();
  const norm = normalizeQuestion(input.questionText);
  if (norm.length < 8) return { hit: false };
  const threshold = input.threshold ?? DEFAULT_THRESHOLD;

  // Exact key first
  const exact = store.get(cacheKey(input.gradeLevel, norm));
  if (exact) {
    exact.hitCount += 1;
    exact.updatedAt = Date.now();
    return { hit: true, entry: exact, similarity: 1 };
  }

  let best: { entry: CachedSocraticPayload; similarity: number } | null = null;
  for (const entry of store.values()) {
    if (entry.gradeLevel !== input.gradeLevel) continue;
    const sim = semanticSimilarity(norm, entry.questionNorm);
    if (sim >= threshold && (!best || sim > best.similarity)) {
      best = { entry, similarity: sim };
    }
  }
  if (!best) return { hit: false };
  best.entry.hitCount += 1;
  best.entry.updatedAt = Date.now();
  return { hit: true, entry: best.entry, similarity: best.similarity };
}

export function storeSemanticCache(input: {
  questionText: string;
  gradeLevel: number;
  response: unknown;
  tokensSavedEstimate?: number;
}): void {
  prune();
  const norm = normalizeQuestion(input.questionText);
  if (norm.length < 8) return;
  const key = cacheKey(input.gradeLevel, norm);
  store.set(key, {
    questionNorm: norm,
    gradeLevel: input.gradeLevel,
    response: input.response,
    tokensSavedEstimate: input.tokensSavedEstimate ?? 0,
    hitCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export function semanticCacheStats() {
  return { size: store.size, max: MAX_ENTRIES, ttlMs: TTL_MS };
}
