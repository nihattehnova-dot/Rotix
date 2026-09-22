/**
 * Tutor FSM — Sokratik durum makinesi.
 * INITIAL → HINT_1 → HINT_2 → HINT_3 → EXPLANATION → REINFORCEMENT
 */

export type TutorFsmState =
  | 'INITIAL'
  | 'HINT_1'
  | 'HINT_2'
  | 'HINT_3'
  | 'EXPLANATION'
  | 'REINFORCEMENT';

export type TutorSessionState = {
  sessionId: string;
  userId: string;
  fsmState: TutorFsmState;
  wrongAnswerCount: number;
  questionStage: number;
  interactionTurnCount: number;
  detectedSubject: string | null;
  detectedTopic: string | null;
  forceReveal: boolean;
  originalQuestion: string | null;
  turnHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  recentStudentAnswers: string[];
  updatedAt: number;
};

const store = new Map<string, TutorSessionState>();
const TTL_MS = 1000 * 60 * 60 * 6;

/** Max yanlış / tur → EXPLANATION */
export const MAX_WRONG_PER_STAGE = 3;
export const MAX_SOCRATIC_TURNS = 4;
export const LOOP_SIMILARITY = 0.8;

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
    fsmState: 'INITIAL',
    wrongAnswerCount: 0,
    questionStage: 1,
    interactionTurnCount: 0,
    detectedSubject: null,
    detectedTopic: null,
    forceReveal: false,
    originalQuestion: null,
    turnHistory: [],
    recentStudentAnswers: [],
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

export function setOriginalQuestion(
  sessionId: string,
  userId: string,
  question: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  if (!s.originalQuestion) {
    s.originalQuestion = question.slice(0, 800);
  }
  s.updatedAt = Date.now();
  return s;
}

function hintFromTurn(turn: number): TutorFsmState {
  if (turn <= 1) return 'HINT_1';
  if (turn === 2) return 'HINT_2';
  if (turn === 3) return 'HINT_3';
  return 'EXPLANATION';
}

function enterExplanation(s: TutorSessionState) {
  s.fsmState = 'EXPLANATION';
  s.forceReveal = true;
}

export function recordInteractionTurn(
  sessionId: string,
  userId: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.interactionTurnCount += 1;
  if (s.fsmState === 'INITIAL') {
    s.fsmState = 'HINT_1';
  } else if (
    s.fsmState === 'HINT_1' ||
    s.fsmState === 'HINT_2' ||
    s.fsmState === 'HINT_3'
  ) {
    s.fsmState = hintFromTurn(s.interactionTurnCount);
  }
  if (
    s.interactionTurnCount >= MAX_SOCRATIC_TURNS ||
    s.wrongAnswerCount >= MAX_WRONG_PER_STAGE
  ) {
    enterExplanation(s);
  }
  s.updatedAt = Date.now();
  return s;
}

export function recordWrongAnswer(
  sessionId: string,
  userId: string,
  answer?: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.wrongAnswerCount += 1;
  if (answer?.trim()) {
    s.recentStudentAnswers.push(answer.trim().slice(0, 200));
    if (s.recentStudentAnswers.length > 4) {
      s.recentStudentAnswers = s.recentStudentAnswers.slice(-4);
    }
  }
  if (s.wrongAnswerCount >= MAX_WRONG_PER_STAGE) {
    enterExplanation(s);
  } else if (s.fsmState === 'HINT_1') s.fsmState = 'HINT_2';
  else if (s.fsmState === 'HINT_2') s.fsmState = 'HINT_3';
  else if (s.fsmState === 'HINT_3') enterExplanation(s);
  s.updatedAt = Date.now();
  return s;
}

/** Jaccard benzerlik — döngü tespiti */
export function tokenJaccard(a: string, b: string): number {
  const tok = (s: string) =>
    new Set(
      s
        .toLocaleLowerCase('tr-TR')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean),
    );
  const A = tok(a);
  const B = tok(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function detectAnswerLoop(sessionId: string, userId: string): boolean {
  const s = getTutorSession(sessionId, userId);
  const ans = s.recentStudentAnswers;
  if (ans.length < 2) return false;
  const last = ans[ans.length - 1]!;
  const prev = ans[ans.length - 2]!;
  if (tokenJaccard(last, prev) >= LOOP_SIMILARITY) return true;
  if (ans.length >= 3) {
    const older = ans[ans.length - 3]!;
    if (tokenJaccard(last, older) >= LOOP_SIMILARITY) return true;
  }
  return false;
}

/** Döngü → farklı ipucu veya EXPLANATION */
export function applyLoopGuard(
  sessionId: string,
  userId: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  if (!detectAnswerLoop(sessionId, userId)) return s;
  if (s.fsmState === 'HINT_1' || s.fsmState === 'HINT_2') {
    s.fsmState = 'HINT_3';
  } else {
    enterExplanation(s);
  }
  s.updatedAt = Date.now();
  return s;
}

export function advanceQuestionStage(
  sessionId: string,
  userId: string,
): TutorSessionState {
  const s = getTutorSession(sessionId, userId);
  s.questionStage += 1;
  s.wrongAnswerCount = 0;
  s.forceReveal = false;
  s.fsmState = 'HINT_1';
  s.interactionTurnCount = 0;
  s.recentStudentAnswers = [];
  s.updatedAt = Date.now();
  return s;
}

export function recordCorrectOrReset(
  sessionId: string,
  userId: string,
): TutorSessionState {
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
  // Son 2 tur = 4 mesaj
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
