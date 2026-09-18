/**
 * Per-session tutor state (wrong answers, topic lock after first detect).
 * In-memory — single Render instance. Multi-instance için Redis gerekir.
 */

export type TutorSessionState = {
  sessionId: string;
  userId: string;
  wrongAnswerCount: number;
  detectedSubject: string | null;
  detectedTopic: string | null;
  forceReveal: boolean;
  updatedAt: number;
};

const store = new Map<string, TutorSessionState>();

const TTL_MS = 1000 * 60 * 60 * 6; // 6h

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
      detectedSubject: null,
      detectedTopic: null,
      forceReveal: false,
      updatedAt: Date.now(),
    };
    store.set(sessionId, s);
  }
  return s;
}

export function recordWrongAnswer(sessionId: string, userId: string): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.wrongAnswerCount += 1;
  if (s.wrongAnswerCount >= 2) s.forceReveal = true;
  s.updatedAt = Date.now();
  return s;
}

export function recordCorrectOrReset(sessionId: string, userId: string): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.wrongAnswerCount = 0;
  s.forceReveal = false;
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

export function clearTutorSession(sessionId: string) {
  store.delete(sessionId);
}
