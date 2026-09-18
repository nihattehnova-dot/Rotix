import type { PedagogicalBand, SessionMode, SubscriptionTier, UserRole } from '../config/tiers.js';

export type DbUser = {
  id: string;
  auth_id: string | null;
  full_name: string | null;
  phone: string | null;
  grade_level: number | null;
  role: UserRole;
  tier: SubscriptionTier;
  streak_count: number;
  total_points: number;
  parent_user_id: string | null;
  locale: string;
  subscription_status?:
    | 'trialing'
    | 'active'
    | 'expired'
    | 'cancelled'
    | 'past_due';
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  exam_track?: string;
  target_exam_date?: string | null;
};

export type DbSession = {
  id: string;
  user_id: string;
  mode: SessionMode;
  start_time: string;
  end_time: string | null;
  topics_covered: string[];
  tokens_used: number;
  duration_seconds: number | null;
  had_new_school_topic: boolean | null;
  success_rate: number | null;
  points_earned: number;
  metadata: Record<string, unknown>;
};

export type QuestionData = {
  prompt: string;
  student_answer?: string;
  correct_answer_latex?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: string;
  latex?: string;
  matched_curriculum_id?: string;
  matched_confidence?: string;
  outcome_codes?: string[];
  variants?: string[];
  merge_count?: number;
  last_prompt?: string;
  wrong_answer_count?: number;
  force_reveal?: boolean;
};

export type DbMistake = {
  id: string;
  user_id: string;
  session_id: string | null;
  curriculum_id: string | null;
  subject: string | null;
  topic: string | null;
  question_data: QuestionData;
  next_review_date: string;
  repetition_stage: number;
  resolved: boolean;
  struggle_score: number;
  times_reviewed: number;
  last_reviewed_at: string | null;
};

export type DbUsageQuota = {
  id: string;
  user_id: string;
  period_year: number;
  period_month: number;
  questions_used: number;
  minutes_used: number;
  daily_date: string;
  daily_minutes_used: number;
  daily_questions_used: number;
};

export type CanvasCommand =
  | { type: 'clear'; delayMs?: number }
  | {
      type: 'text';
      x: number;
      y: number;
      content: string;
      latex?: boolean;
      delayMs?: number;
    }
  | {
      type: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      delayMs?: number;
    }
  | {
      type: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      delayMs?: number;
    }
  | {
      type: 'highlight';
      x: number;
      y: number;
      w: number;
      h: number;
      delayMs?: number;
    }
  | {
      type: 'formula';
      x: number;
      y: number;
      latex: string;
      delayMs?: number;
    }
  | {
      type: 'image';
      x: number;
      y: number;
      w: number;
      h: number;
      dataUrl: string;
      delayMs?: number;
    };

export type SocraticAiResult = {
  guidingQuestion: string;
  latexHints: string[];
  canvasCommands: CanvasCommand[];
  pedagogicalBand: PedagogicalBand;
  tokensUsed: number;
  neverRevealAnswer: boolean;
};
