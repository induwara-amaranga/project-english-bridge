import { apiGet, apiPost } from '../lib/apiClient';
import type { Answer } from './grading';
import type { Curriculum, Stage } from './types';

// ---------------------------------------------------------------------------
// LEARNER PROGRESS
//
// This model did not exist in the prototype. Four pages (Course Roadmap,
// Progress, Stage Lessons, Parent Dashboard) each hardcoded their own demo
// constants (DEMO_XP, DEMO_STREAK, CURRENT_STAGE, CURRENT_PCT / TOTAL_XP,
// STREAK...) and they had already drifted — the same learner had a 7-day
// streak on Progress and a 5-day streak on the Parent Dashboard
// (ARCHITECTURE.md, Weakness 2). This is the one source now; every screen
// that shows XP, streak, or stage completion reads it.
//
// `GET /api/progress` is scoped to the signed-in learner; the two writes
// below go through the server so XP cannot be forged from devtools — see
// SPRINGBOOT-MIGRATION.md section 5.
// ---------------------------------------------------------------------------

export interface Progress {
  xp: number;
  streakDays: number;
  lastActiveISO: string;
  /** Lesson ids completed, per stage id. Stable slugs, never indices. */
  completedLessonIds: Record<string, string[]>;
  /** The stage the learner is actively working through. */
  currentStageId: string;
  /** Percent through the current stage's lessons (0-100). */
  currentStagePct: number;
}

/** The empty state a hook renders before its first fetch resolves — never persisted. */
export const EMPTY_PROGRESS: Progress = {
  xp: 0,
  streakDays: 0,
  lastActiveISO: new Date(0).toISOString(),
  completedLessonIds: {},
  currentStageId: '',
  currentStagePct: 0,
};

export function loadProgress(): Promise<Progress> {
  return apiGet<Progress>('/api/progress');
}

export interface GradedCard {
  cardId: string;
  type: string;
  answered: boolean;
  correct: boolean;
}

export interface CompleteLessonResult {
  passed: boolean;
  xpAwarded: number;
  cards: GradedCard[];
  progress: Progress;
}

/**
 * Sends the learner's answers for every interactive card in the lesson so
 * the server can re-grade them independently (with `domain/grading.ts`'s own
 * ported rules) and award XP only on a pass — see ProgressService on the
 * backend for why this cannot just persist a client-computed result.
 */
export function completeLesson(stageId: string, lessonId: string, answers: Record<string, Answer>): Promise<CompleteLessonResult> {
  return apiPost<CompleteLessonResult>(`/api/progress/lessons/${encodeURIComponent(lessonId)}/complete`, { stageId, answers });
}

/** The placement test's result — where it drops the learner. */
export function submitPlacement(stageId: string): Promise<Progress> {
  return apiPost<Progress>('/api/progress/placement', { stageId });
}

export function stageStatus(p: Progress, stage: Stage, curriculum: Curriculum): 'completed' | 'current' | 'locked' {
  const idx = curriculum.stages.findIndex((s) => s.id === stage.id);
  const curIdx = curriculum.stages.findIndex((s) => s.id === p.currentStageId);
  if (idx < curIdx) return 'completed';
  if (idx === curIdx) return 'current';
  return 'locked';
}

export function stagePercent(p: Progress, stage: Stage): number {
  return stage.id === p.currentStageId ? p.currentStagePct : 0;
}

export function isStageUnlocked(p: Progress, stage: Stage, curriculum: Curriculum): boolean {
  return stageStatus(p, stage, curriculum) !== 'locked';
}

export function completedStageCount(p: Progress, curriculum: Curriculum): number {
  return curriculum.stages.findIndex((s) => s.id === p.currentStageId);
}

export function overallPercent(p: Progress, curriculum: Curriculum): number {
  const total = curriculum.stages.length;
  if (total === 0) return 0; // curriculum still loading — nothing to divide by yet
  const completed = completedStageCount(p, curriculum);
  return Math.round(((completed + p.currentStagePct / 100) / total) * 100);
}

export function isLessonComplete(p: Progress, stageId: string, lessonId: string): boolean {
  return (p.completedLessonIds[stageId] || []).includes(lessonId);
}
