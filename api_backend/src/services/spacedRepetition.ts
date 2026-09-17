/**
 * Rotix unutma eğrisi (PRD): 3. gün → 10. gün → 30. gün.
 */
export const REPETITION_INTERVALS_DAYS = [3, 10, 30] as const;

export function nextReviewDate(stage: number, from: Date = new Date()): Date {
  const index = Math.min(
    Math.max(stage, 0),
    REPETITION_INTERVALS_DAYS.length - 1,
  );
  const days = REPETITION_INTERVALS_DAYS[index];
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function advanceStage(currentStage: number, mastered: boolean): number {
  if (!mastered) return 0;
  return Math.min(currentStage + 1, REPETITION_INTERVALS_DAYS.length - 1);
}
