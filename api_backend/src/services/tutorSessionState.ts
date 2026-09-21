/**
 * Per-session tutor state machine.
 * In-memory — single Render instance.
 */

export type TutorSessionState = {
  sessionId: string;
  userId: string;
  /** Yanlış cevap sayacı (video önerisi için) */
  wrongAnswerCount: number;
  /** Sokratik etkileşim turu (max 4 yönlendirme) */
  interactionTurnCount: number;
  detectedSubject: string | null;
  detectedTopic: string | null;
  /** Exit & Explain modu */
  forceReveal: boolean;
  turnHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  updatedAt: number;
};

const store = new Map<string, TutorSessionState>();
const TTL_MS = 1000 * 60 * 60 * 6; // 6h
/** Maksimum Sokratik yönlendirme turu */
export const MAX_SOCRATIC_TURNS = 4;

function prune() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now - v.updatedAt > TTL_MS) store.delete(k);
  }
}

export function getTutorSession(
  sessionId: string,
  userId: string,
): TutorSessionState {
  prune();
  let s = store.get(sessionId);
  if (!s || s.userId !== userId) {
    s = {
      sessionId,
      userId,
      wrongAnswerCount: 0,
      interactionTurnCount: 0,
      detectedSubject: null,
      detectedTopic: null,
      forceReveal: false,
      turnHistory: [],
      updatedAt: Date.now(),
    };
    store.set(sessionId, s);
  }
  return s;
}

/** Her Sokratik istekte çağır — 4. turdan sonra Exit & Explain */
export function recordInteractionTurn(
  sessionId: string,
  userId: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.interactionTurnCount += 1;
  if (s.interactionTurnCount >= MAX_SOCRATIC_TURNS) {
    s.forceReveal = true;
  }
  s.updatedAt = Date.now();
  return s;
}

export function recordWrongAnswer(sessionId: string, userId: string): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.wrongAnswerCount += 1;
  s.updatedAt = Date.now();
  return s;
}

export function recordCorrectOrReset(sessionId: string, userId: string): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.wrongAnswerCount = 0;
  s.interactionTurnCount = 0;
  s.forceReveal = false;
  s.turnHistory = [];
  s.updatedAt = Date.now();
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

/** Son 3 tur — context window sadeleştirme */
export function pushTurnHistory(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  text: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.turnHistory.push({ role, text: text.slice(0, 800) });
  if (s.turnHistory.length > 6) {
    s.turnHistory = s.turnHistory.slice(-6); // 3 user + 3 assistant
  }
  s.updatedAt = Date.now();
  return s;
}

export function getRecentHistory(
  sessionId: string,
  userId: string,
  maxTurns = 3,
): Array<{ role: 'user' | 'assistant'; text: string }> {
  const s = getTutorSession(sessionId, userId);
  // Son N etkileşim çifti ≈ 2*N mesaj
  return s.turnHistory.slice(-(maxTurns * 2));
}

export function clearTutorSession(sessionId: string) {
  store.delete(sessionId);
}
