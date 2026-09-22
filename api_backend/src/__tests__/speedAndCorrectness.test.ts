/**
 * Hız + doğruluk regression testleri (Gemini/network yok).
 * Çalıştır: npx tsx src/__tests__/speedAndCorrectness.test.ts
 */
import assert from 'node:assert/strict';
import {
  lookupSemanticCache,
  normalizeQuestion,
  semanticSimilarity,
  storeSemanticCache,
} from '../services/semanticCache.js';
import {
  advanceQuestionStage,
  getRecentHistory,
  getTutorSession,
  MAX_WRONG_PER_STAGE,
  pushTurnHistory,
  recordInteractionTurn,
  recordWrongAnswer,
  recordCorrectOrReset,
  clearTutorSession,
} from '../services/tutorSessionState.js';
import { suggestVideoCard } from '../services/videoCatalog.js';
import { optimizeQuestionImage } from '../services/imageOptimize.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      passed += 1;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${name}`);
      console.error(err);
    }
  })();
}

function looksLikeShortAnswer(trimmed: string, hasActive: boolean): boolean {
  const lower = trimmed.toLowerCase();
  const isQuestion =
    lower.includes('?') ||
    lower.includes('nasıl') ||
    lower.includes('nedir') ||
    lower.includes('anlamad') ||
    lower.includes('çöz') ||
    lower.includes('yardım');
  const looksLikeAnswer =
    /^[\d\s.,+\-*/=xXyYa-zA-ZçğıöşüÇĞİÖŞÜ]+$/.test(trimmed) &&
    trimmed.length <= 40;
  return (
    hasActive && (looksLikeAnswer || trimmed.length <= 24) && !isQuestion
  );
}

/** Backend sendImage kuralı — takip turunda foto yok */
function shouldSendImage(input: {
  imageBase64?: string;
  interactionTurnCount: number;
  studentAnswer?: string;
}): boolean {
  return (
    Boolean(input.imageBase64) &&
    input.interactionTurnCount <= 1 &&
    !input.studentAnswer
  );
}

function parseCanvasTypes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) =>
      c && typeof c === 'object'
        ? String((c as { type?: string }).type ?? '')
        : '',
    )
    .filter(Boolean);
}

function ensurePhotoHasGeometry(cmds: Array<{ type: string }>): Array<{ type: string }> {
  const hasGeom = cmds.some((c) =>
    ['shape', 'line', 'arrow', 'rect'].includes(c.type),
  );
  if (hasGeom) return cmds;
  return [
    { type: 'clear' },
    { type: 'shape' },
    ...cmds.filter((c) => c.type !== 'clear'),
    { type: 'text' },
  ];
}

async function main() {
  console.log('\n=== Rotix speed & correctness ===\n');

  await test('normalizeQuestion collapses Turkish whitespace', () => {
    const n = normalizeQuestion('  2X + 6 = 14!!!  ');
    assert.ok(n.includes('2x') || n.includes('2x + 6'));
    assert.equal(n.includes('!'), false);
  });

  await test('semanticSimilarity identical ≈ 1', () => {
    assert.ok(semanticSimilarity('ebob ekok nedir', 'ebob ekok nedir') >= 0.99);
  });

  await test('semantic cache hit at ≥0.95', () => {
    storeSemanticCache({
      questionText: 'bir dik üçgende hipotenüs nasıl bulunur',
      gradeLevel: 8,
      response: { ok: true, guidingQuestion: 'cached' },
      tokensSavedEstimate: 100,
    });
    const hit = lookupSemanticCache({
      questionText: 'bir dik üçgende hipotenüs nasıl bulunur',
      gradeLevel: 8,
    });
    assert.equal(hit.hit, true);
    if (hit.hit) assert.equal((hit.entry.response as { ok: boolean }).ok, true);
  });

  await test('semantic cache miss different grade', () => {
    const hit = lookupSemanticCache({
      questionText: 'bir dik üçgende hipotenüs nasıl bulunur',
      gradeLevel: 5,
    });
    assert.equal(hit.hit, false);
  });

  clearTutorSession('t1');
  await test('3 wrongs per stage force reveal', () => {
    let s = getTutorSession('t1', 'u1');
    assert.equal(s.forceReveal, false);
    assert.equal(MAX_WRONG_PER_STAGE, 3);
    s = recordWrongAnswer('t1', 'u1');
    s = recordWrongAnswer('t1', 'u1');
    assert.equal(s.wrongAnswerCount, 2);
    assert.equal(s.forceReveal, false);
    s = recordWrongAnswer('t1', 'u1');
    assert.equal(s.wrongAnswerCount, 3);
    assert.equal(s.forceReveal, true);
  });

  await test('advanceQuestionStage resets wrongs, keeps progressing', () => {
    clearTutorSession('t2');
    recordWrongAnswer('t2', 'u1');
    recordWrongAnswer('t2', 'u1');
    recordWrongAnswer('t2', 'u1');
    let s = advanceQuestionStage('t2', 'u1');
    assert.equal(s.questionStage, 2);
    assert.equal(s.wrongAnswerCount, 0);
    assert.equal(s.forceReveal, false);
  });

  await test('interaction turns alone do NOT force reveal', () => {
    clearTutorSession('t2b');
    let s = getTutorSession('t2b', 'u1');
    for (let i = 0; i < 5; i++) {
      s = recordInteractionTurn('t2b', 'u1');
    }
    assert.equal(s.interactionTurnCount, 5);
    assert.equal(s.forceReveal, false);
  });

  await test('wrong answer increments without early reveal at 2', () => {
    clearTutorSession('t2c');
    let s = getTutorSession('t2c', 'u1');
    s = recordWrongAnswer('t2c', 'u1');
    s = recordWrongAnswer('t2c', 'u1');
    assert.equal(s.wrongAnswerCount, 2);
    assert.equal(s.forceReveal, false);
  });

  await test('reset clears turns and history', () => {
    clearTutorSession('t3');
    recordInteractionTurn('t3', 'u1');
    pushTurnHistory('t3', 'u1', 'user', 'soru');
    pushTurnHistory('t3', 'u1', 'assistant', 'ipucu');
    const s = recordCorrectOrReset('t3', 'u1');
    assert.equal(s.interactionTurnCount, 0);
    assert.equal(s.forceReveal, false);
    assert.equal(s.questionStage, 1);
    assert.equal(getRecentHistory('t3', 'u1').length, 0);
  });

  await test('history keeps last 3 turns (6 messages)', () => {
    clearTutorSession('t4');
    for (let i = 0; i < 5; i++) {
      pushTurnHistory('t4', 'u1', 'user', `u${i}`);
      pushTurnHistory('t4', 'u1', 'assistant', `a${i}`);
    }
    const h = getRecentHistory('t4', 'u1', 3);
    assert.ok(h.length <= 6);
  });

  await test('short answers accepted when session active', () => {
    assert.equal(looksLikeShortAnswer('5', true), true);
    assert.equal(looksLikeShortAnswer('12', true), true);
    assert.equal(looksLikeShortAnswer('x=3', true), true);
    assert.equal(looksLikeShortAnswer('pi', true), true);
  });

  await test('short answers ignored without active question', () => {
    assert.equal(looksLikeShortAnswer('5', false), false);
  });

  await test('questions still classified as questions', () => {
    assert.equal(looksLikeShortAnswer('bu nasıl çözülür', true), false);
    assert.equal(looksLikeShortAnswer('anlamadım', true), false);
  });

  await test('follow-up does NOT re-send image', () => {
    assert.equal(
      shouldSendImage({
        imageBase64: 'abc',
        interactionTurnCount: 2,
        studentAnswer: '5',
      }),
      false,
    );
    assert.equal(
      shouldSendImage({
        imageBase64: 'abc',
        interactionTurnCount: 1,
        studentAnswer: undefined,
      }),
      true,
    );
  });

  await test('photo canvas without geometry gets shape injected', () => {
    const onlyText = [{ type: 'text' as const }, { type: 'formula' as const }];
    const fixed = ensurePhotoHasGeometry(onlyText);
    assert.ok(fixed.some((c) => c.type === 'shape'));
    const types = parseCanvasTypes(fixed);
    assert.ok(types.includes('shape'));
  });

  await test('photo canvas with line keeps geometry', () => {
    const withLine = [{ type: 'line' as const }, { type: 'text' as const }];
    const fixed = ensurePhotoHasGeometry(withLine);
    assert.equal(fixed.filter((c) => c.type === 'shape').length, 0);
    assert.ok(fixed.some((c) => c.type === 'line'));
  });

  await test('video suggested after struggle ≥ 2', () => {
    const v = suggestVideoCard({
      topic: 'EBOB ve EKOK',
      subject: 'Matematik',
      struggleCount: 2,
    });
    assert.ok(v);
    assert.ok(v!.headline.includes('nokta atışı'));
    assert.ok(v!.embedUrl.includes('start='));
  });

  await test('video not suggested on first struggle', () => {
    const v = suggestVideoCard({
      topic: 'EBOB',
      struggleCount: 1,
    });
    assert.equal(v, null);
  });

  await test('imageOptimize skips tiny payloads', async () => {
    const tiny = Buffer.from('not-an-image').toString('base64');
    const opt = await optimizeQuestionImage({
      imageBase64: tiny,
      mimeType: 'image/jpeg',
    });
    assert.equal(opt.optimized, false);
    assert.equal(opt.bytesBefore, opt.bytesAfter);
  });

  await test('voice unlock finally pattern (simulation)', () => {
    let locked = false;
    const run = () => {
      if (locked) throw new Error('frozen');
      locked = true;
      try {
        // simulate work
      } finally {
        locked = false;
      }
    };
    run();
    run(); // second turn must work
    assert.equal(locked, false);
  });

  await test('parseGeminiJson repairs truncated object', async () => {
    const { parseGeminiJsonObject } = await import(
      '../services/ai/parseGeminiJson.js'
    );
    const broken = '{"guidingQuestion":"Merhaba","spokenNarration":"selam","canvasCommands":[{"type":"clear"}';
    const p = parseGeminiJsonObject(broken);
    assert.ok(p);
    assert.equal(p!.guidingQuestion, 'Merhaba');
  });

  await test('parseGeminiJson strips fences and noise', async () => {
    const { parseGeminiJsonObject } = await import(
      '../services/ai/parseGeminiJson.js'
    );
    const noisy =
      'İşte yanıt:\n```json\n{"guidingQuestion":"x?","spokenNarration":"x"}\n```\n';
    const p = parseGeminiJsonObject(noisy);
    assert.ok(p);
    assert.equal(p!.guidingQuestion, 'x?');
  });

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

void main();
