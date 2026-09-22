/**
 * Per-session tutor state — kademeli soru + yanlış hakkı.
 * In-memory — single Render instance.
 */

export type TutorSessionState = {
  sessionId: string;
  userId: string;
  /** Bu kademedeki yanlış sayısı */
  wrongAnswerCount: number;
  /** Soru kademesi (1 = ilk adım) */
  questionStage: number;
  interactionTurnCount: number;
  detectedSubject: string | null;
  detectedTopic: string | null;
  /** Bu kademeyi açıkla */
  forceReveal: boolean;
  turnHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  updatedAt: number;
};

const store = new Map<string, TutorSessionState>();
const TTL_MS = 1000 * 60 * 60 * 6;

/** Aynı kademede max yanlış — sonra doğru + anlatım + sonraki kademe */
export const MAX_WRONG_PER_STAGE = 3;
/** Eski export — uyumluluk */
export const MAX_SOCRATIC_TURNS = MAX_WRONG_PER_STAGE;

function prune() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now - v.updatedAt > TTL_MS) store.delete(k);
  }
}

function fresh(sessionId: string, userId: string): TutorSessionState {
  return {
    sessionId,
    userId,
    wrongAnswerCount: 0,
    questionStage: 1,
    interactionTurnCount: 0,
    detectedSubject: null,
    detectedTopic: null,
    forceReveal: false,
    turnHistory: [],
    updatedAt: Date.now(),
  };
}

export function getTutorSession(
  sessionId: string,
  userId: string,
): TutorSessionState {
  prune();
  let s = store.get(sessionId);
  if (!s || s.userId !== userId) {
    s = fresh(sessionId, userId);
    store.set(sessionId, s);
  }
  return s;
}

export function recordInteractionTurn(
  sessionId: string,
  userId: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.interactionTurnCount += 1;
  s.updatedAt = Date.now();
  return s;
}

export function recordWrongAnswer(sessionId: string, userId: string): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.wrongAnswerCount += 1;
  if (s.wrongAnswerCount >= MAX_WRONG_PER_STAGE) {
    s.forceReveal = true;
  }
  s.updatedAt = Date.now();
  return s;
}

/** Bu kademe açıklandı → sonraki kademeye geç (yanlış hakkı sıfır) */
export function advanceQuestionStage(
  sessionId: string,
  userId: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.questionStage += 1;
  s.wrongAnswerCount = 0;
  s.forceReveal = false;
  s.updatedAt = Date.now();
  return s;
}

export function recordCorrectOrReset(sessionId: string, userId: string): TutorSessionState {
  const s = fresh(sessionId, userId);
  store.set(sessionId, s);
  return s;
}

export function lockDetectedTopic(
  sessionId: string,
  userId: string,
  subject: string | null,
  topic: string | null,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  if (subject) s.detectedSubject = subject;
  if (topic) s.detectedTopic = topic;
  s.updatedAt = Date.now();
  return s;
}

export function pushTurnHistory(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  text: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.turnHistory.push({ role, text: text.slice(0, 600) });
  if (s.turnHistory.length > 4) {
    s.turnHistory = s.turnHistory.slice(-4);
  }
  s.updatedAt = Date.now();
  return s;
}

export function getRecentHistory(
  sessionId: string,
  userId: string,
  maxTurns = 2,
): Array<{ role: 'user' | 'assistant'; text: string }> {
  const s = getTutorSession(sessionId, userId);
  return s.turnHistory.slice(-(maxTurns * 2));
}

export function clearTutorSession(sessionId: string) {
  store.delete(sessionId);
}
