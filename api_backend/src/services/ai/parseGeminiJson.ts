/**
 * Gemini JSON yanıtlarını güvenli parse et — fence, kesik JSON, ekstra metin.
 */

export function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/** İlk { … } bloğunu çıkar (ön/son metin varsa). */
export function extractJsonObject(raw: string): string | null {
  const s = stripCodeFences(raw);
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  // Kesik JSON — kapatmayı dene
  return repairTruncatedJson(s.slice(start));
}

function repairTruncatedJson(fragment: string): string | null {
  let s = fragment.trim();
  if (!s.startsWith('{')) return null;

  // Açık string'i kapat
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
  }
  if (inString) s += '"';

  // Trailing virgül temizle
  s = s.replace(/,\s*$/, '');

  let braces = 0;
  let brackets = 0;
  inString = false;
  escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') braces += 1;
    else if (ch === '}') braces -= 1;
    else if (ch === '[') brackets += 1;
    else if (ch === ']') brackets -= 1;
  }
  while (brackets > 0) {
    s += ']';
    brackets -= 1;
  }
  while (braces > 0) {
    s += '}';
    braces -= 1;
  }
  return s;
}

export function parseGeminiJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  const candidates = [stripCodeFences(raw), extractJsonObject(raw)].filter(
    (c): c is string => Boolean(c),
  );
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}
