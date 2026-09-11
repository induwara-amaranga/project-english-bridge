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
  /** Spendable currency — cosmetics, streak freezes, question retries. Never buys curriculum access. */
  coins: number;
  /** Unspent streak-freeze tokens. */
  streakFreezes: number;
  /** Derived from xp (ProgressService.levelInfo on the backend) — never stored independently. */
  level: number;
  /** XP earned since the last level-up. */
  xpIntoLevel: number;
  /** XP needed, from xpIntoLevel, to reach the next level. */
  xpForNextLevel: number;
  /** The streak length lost to an unfrozen gap; 0 when there is nothing to repair. */
  lastBrokenStreak: number;
  streakBrokenAtISO: string | null;
  /** The instant a gap starts costing a freeze — when the client should start warning it's at risk. Null with no active streak. */
  streakExpiresAtISO: string | null;
}

/** The empty state a hook renders before its first fetch resolves — never persisted. */
export const EMPTY_PROGRESS: Progress = {
  xp: 0,
  streakDays: 0,
  lastActiveISO: new Date(0).toISOString(),
  completedLessonIds: {},
  currentStageId: '',
  currentStagePct: 0,
  coins: 0,
  streakFreezes: 0,
  level: 1,
  xpIntoLevel: 0,
  xpForNextLevel: 50,
  lastBrokenStreak: 0,
  streakBrokenAtISO: null,
  streakExpiresAtISO: null,
};

export function loadProgress(): Promise<Progress> {
  return apiGet<Progress>('/api/progress');
}

/** Mirrors ProgressService's constants — display-only; the server enforces the real cost. */
export const STREAK_FREEZE_COST_COINS = 50;
export const RETRY_QUESTION_COST_COINS = 5;
export const STREAK_REPAIR_COST_COINS = 50;
/** How long before a streak's grace period ends that the "at risk" warning should start showing. */
export const STREAK_AT_RISK_WINDOW_MS = 6 * 60 * 60 * 1000;

export interface GradedCard {
  cardId: string;
  type: string;
  answered: boolean;
  correct: boolean;
}

/** Present only when this completion finished the stage (every lesson now done). */
export interface StageOutcome {
  accuracyPct: number;
  /** Met the >=75% accuracy gate and moved on to the next stage. */
  cleared: boolean;
  /** Every question in the stage was correct — the stage-perfect bonus landed. */
  perfect: boolean;
  /** Below the accuracy gate — point the learner at the stage's review-wrong screen. */
  needsReview: boolean;
  /** Non-zero only when perfect — already folded into progress, broken out so it can be shown as its own line. */
  bonusXp: number;
  bonusCoins: number;
}

export interface CompleteLessonResult {
  /** Every question in this lesson was correct on this attempt. */
  passed: boolean;
  xpAwarded: number;
  coinsAwarded: number;
  /** On top of xpAwarded/coinsAwarded — the "flawless lesson" bonus. */
  bonusXp: number;
  bonusCoins: number;
  /** Non-zero only the day the streak reaches a milestone (7, 30, 100...) — shown as its own "🔥 N-day streak!" callout. */
  streakMilestoneDays: number;
  streakMilestoneBonusXp: number;
  streakMilestoneBonusCoins: number;
  cards: GradedCard[];
  progress: Progress;
  stageOutcome: StageOutcome | null;
}

/**
 * Sends the learner's answers for every interactive card in the lesson so
 * the server can re-grade them independently (with `domain/grading.ts`'s own
 * ported rules). The lesson completes on this call regardless of score — see
 * ProgressService on the backend — with correctness driving bonuses and the
 * stage-advance gate instead of blocking completion outright.
 */
export function completeLesson(stageId: string, lessonId: string, answers: Record<string, Answer>): Promise<CompleteLessonResult> {
  return apiPost<CompleteLessonResult>(`/api/progress/lessons/${encodeURIComponent(lessonId)}/complete`, { stageId, answers });
}

/** The placement test's result — where it drops the learner. */
export function submitPlacement(stageId: string): Promise<Progress> {
  return apiPost<Progress>('/api/progress/placement', { stageId });
}

export interface RetryQuestionResult {
  correct: boolean;
  stageOutcome: StageOutcome;
  progress: Progress;
}

/** Spends RETRY_QUESTION_COST_COINS to re-grade one wrong question from the stage's review screen. */
export function retryQuestion(stageId: string, lessonId: string, exerciseId: string, index: number, answers: Record<string, Answer>): Promise<RetryQuestionResult> {
  return apiPost<RetryQuestionResult>('/api/progress/retry', { stageId, lessonId, exerciseId, index, answers });
}

/** Spends coins for one streak-freeze token. */
export function buyStreakFreeze(): Promise<Progress> {
  return apiPost<Progress>('/api/progress/streak-freeze/buy');
}

/** Spends coins to restore the streak lost to the most recent unfrozen gap. */
export function repairStreak(): Promise<Progress> {
  return apiPost<Progress>('/api/progress/streak/repair');
}

/** Waves off the repair offer for the most recent broken streak without paying for it. */
export function dismissBrokenStreak(): Promise<Progress> {
  return apiPost<Progress>('/api/progress/streak/dismiss-broken');
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
