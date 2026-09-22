/**
 * Session-locked voice identity — aynı oturumda aynı ses.
 */

export type VoiceAnchor = {
  voiceName: string;
  speakingRateHint: string;
  seed: number;
};

const DEFAULT_VOICE = 'Callirrhoe';
const anchors = new Map<string, VoiceAnchor>();
const TTL_MS = 1000 * 60 * 60 * 6;

function prune() {
  // Map has no timestamps — rely on session clear; size cap
  if (anchors.size > 2000) {
    const keys = [...anchors.keys()].slice(0, 500);
    for (const k of keys) anchors.delete(k);
  }
}

export function getVoiceAnchor(sessionId?: string | null): VoiceAnchor {
  prune();
  const key = sessionId?.trim() || '_default';
  let a = anchors.get(key);
  if (!a) {
    a = {
      voiceName: DEFAULT_VOICE,
      speakingRateHint: 'calm-clear-medium',
      seed: hashSeed(key),
    };
    anchors.set(key, a);
  }
  return a;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 1_000_000;
}

/** Cümle sınırına göre böl — TTS kesilmesini azaltır */
export function splitIntoSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const parts = cleaned
    .split(/(?<=[.!?…])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  // Lookbehind desteklenmezse fallback
  const raw =
    parts.length > 0
      ? parts
      : cleaned.split(/[.!?…]+\s*/).map((p) => p.trim()).filter(Boolean);
  if (raw.length === 0) return [cleaned];
  const out: string[] = [];
  let buf = '';
  for (const p of raw) {
    if (!buf) {
      buf = p;
      continue;
    }
    if (buf.length < 40) {
      buf = `${buf} ${p}`;
    } else {
      out.push(buf);
      buf = p;
    }
  }
  if (buf) out.push(buf);
  return out.length > 0 ? out : [cleaned];
}
