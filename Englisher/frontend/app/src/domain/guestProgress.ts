import type { Answer } from './grading';
import type { ExerciseOutcome } from './lessonResults';
import { EMPTY_PROGRESS, type CompleteLessonResult, type GradedCard, type Progress } from './progress';

// ---------------------------------------------------------------------------
// GUEST PREVIEW
//
// Guest mode has no backend account at all — nothing is sent to the server
// until the guest signs up. This module is the local stand-in for what
// domain/progress.ts normally gets from GET/POST /api/progress: a Progress
// object kept in localStorage, and (since a guest only ever gets to play one
// lesson before GuestSavePrompt forces a signup) the one lesson's raw answers,
// held onto so they can be replayed through the *real* completeLesson() once
// there is a real, signed-in account to award it to.
//
// previewGuestLessonAward mirrors ProgressService.award()'s formula closely
// enough that the numbers shown here match what the same lesson would earn
// for real — but it is a preview, not the source of truth: the actual award
// happens server-side, re-graded from the stored answers, the moment signup
// completes (see SignUp.tsx). This keeps the "XP can't be forged from
// devtools" guarantee intact — a guest can edit their local preview all they
// want, and it changes nothing, because the account that matters computes its
// own numbers from the original answers, independently.
// ---------------------------------------------------------------------------

const PROGRESS_KEY = 'englisher.guestPreview.v1';
const PENDING_KEY = 'englisher.guestPendingLesson.v1';

export function loadGuestPreview(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? { ...EMPTY_PROGRESS, ...parsed } : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

function saveGuestPreview(p: Progress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // Out of quota or blocked — the preview just won't survive a reload.
  }
}

/** The placement test's recommendation, before any lesson exists to attach it to. */
export function setGuestStage(stageId: string): void {
  saveGuestPreview({ ...loadGuestPreview(), currentStageId: stageId });
}

export interface PendingGuestLesson {
  stageId: string;
  lessonId: string;
  answers: Record<string, Answer>;
}

function savePendingGuestLesson(pending: PendingGuestLesson): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // If this fails, signup simply won't have anything to replay — no worse
    // than a guest who never played a lesson.
  }
}

/** Reads and clears the pending lesson in one step — it is only ever replayed once. */
export function takePendingGuestLesson(): PendingGuestLesson | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingGuestLesson) : null;
  } catch {
    return null;
  }
}

/**
 * Wipes every trace of the local preview — called once conversion succeeds.
 * Does not touch the guest-mode flag itself: call useAuth's exitGuestMode()
 * for that, so the React state updates immediately instead of only on the
 * next reload (this module has no hook to trigger a re-render with).
 */
export function clearGuestSession(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing left to clean up if storage is already unavailable.
  }
}

// Mirrors ProgressService's award constants for the one-lesson case a guest
// can ever reach — no stage/streak-freeze/milestone logic, because a guest's
// first-ever lesson is definitionally the *only* lesson they'll complete
// before GuestSavePrompt takes over.
const BASE_XP_TEACH = 8;
const BASE_XP_PRACTICE = 14;
const LESSON_PERFECT_BONUS_XP = 10;
const LESSON_PERFECT_BONUS_COINS = 5;
const COINS_PER_LESSON = 3;
const COINS_PER_CORRECT_EXERCISE = 1;
const COINS_PER_STREAK_DAY = 2;

function levelCost(level: number): number {
  return level <= 3 ? 50 : 50 + (level - 3) * 25;
}

function levelInfo(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let level = 1;
  let remaining = xp;
  let cost = levelCost(level);
  while (remaining >= cost) {
    remaining -= cost;
    level++;
    cost = levelCost(level);
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: cost };
}

/**
 * Computes and persists the local preview for a guest's lesson completion,
 * and stashes the raw answers as the pending lesson to replay at signup.
 * Shaped exactly like completeLesson()'s real result so Exercise.tsx does
 * not need to know which one it got.
 */
export function previewGuestLessonAward(
  stageId: string,
  lessonId: string,
  lessonKind: string,
  outcomes: ExerciseOutcome[],
  answers: Record<string, Answer>,
  stagePct: number,
): CompleteLessonResult {
  const current = loadGuestPreview();
  const correctExercises = outcomes.filter((o) => o.correct).length;
  const totalExercises = outcomes.length;
  const allCorrect = totalExercises > 0 && correctExercises === totalExercises;

  // A guest's first-ever activity: nextStreak's same-day floor always lands on 1.
  const xp = (lessonKind === 'practice' ? BASE_XP_PRACTICE : BASE_XP_TEACH) + 1;
  const coins = COINS_PER_LESSON + correctExercises * COINS_PER_CORRECT_EXERCISE + COINS_PER_STREAK_DAY;
  const bonusXp = allCorrect ? LESSON_PERFECT_BONUS_XP : 0;
  const bonusCoins = allCorrect ? LESSON_PERFECT_BONUS_COINS : 0;

  const completedLessonIds = {
    ...current.completedLessonIds,
    [stageId]: [...(current.completedLessonIds[stageId] || []), lessonId],
  };
  const totalXp = xp + bonusXp;
  const level = levelInfo(totalXp);

  const progress: Progress = {
    ...current,
    xp: totalXp,
    coins: coins + bonusCoins,
    streakDays: 1,
    lastActiveISO: new Date().toISOString(),
    completedLessonIds,
    currentStageId: stageId,
    currentStagePct: stagePct,
    level: level.level,
    xpIntoLevel: level.xpIntoLevel,
    xpForNextLevel: level.xpForNextLevel,
  };
  saveGuestPreview(progress);
  savePendingGuestLesson({ stageId, lessonId, answers });

  const cards: GradedCard[] = [];
  return {
    passed: allCorrect, xpAwarded: xp, coinsAwarded: coins, bonusXp, bonusCoins,
    streakMilestoneDays: 0, streakMilestoneBonusXp: 0, streakMilestoneBonusCoins: 0,
    cards, progress, stageOutcome: null,
  };
}
