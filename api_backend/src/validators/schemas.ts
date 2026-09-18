import { z } from 'zod';

export const startSessionSchema = z.object({
  mode: z
    .enum(['evening_review', 'socratic', 'spaced_repetition', 'gap_fill'])
    .optional(),
  hadNewSchoolTopic: z.boolean().nullable().optional(),
  topicsCovered: z.array(z.string().min(1)).max(30).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const endSessionSchema = z.object({
  topicsCovered: z.array(z.string().min(1)).max(30).optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
  successRate: z.number().min(0).max(100).nullable().optional(),
  pointsEarned: z.number().int().nonnegative().optional(),
});

export const createMistakeSchema = z.object({
  questionData: z.object({
    prompt: z.string().min(1),
    student_answer: z.string().optional(),
    correct_answer_latex: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    source: z.string().optional(),
    latex: z.string().optional(),
  }),
  sessionId: z.string().uuid().nullable().optional(),
  curriculumId: z.string().uuid().nullable().optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  struggleScore: z.number().int().min(1).max(5).optional(),
});

export const reviewMistakeSchema = z.object({
  mastered: z.boolean(),
  markResolved: z.boolean().optional(),
});

export const socraticTurnSchema = z.object({
  /** Late-binding: ders/konu zorunlu değil — model tespit eder */
  subject: z.string().optional(),
  questionText: z.string().min(1),
  studentAnswer: z.string().optional(),
  topic: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  /** If true and student struggled, also log to user_mistakes */
  logAsMistake: z.boolean().optional(),
  struggleScore: z.number().int().min(1).max(5).optional(),
  /** Explicit wrong-answer signal → increments wrong_answer_count */
  answerWrong: z.boolean().optional(),
  imageBase64: z.string().min(20).optional(),
  imageMimeType: z.string().optional(),
});
