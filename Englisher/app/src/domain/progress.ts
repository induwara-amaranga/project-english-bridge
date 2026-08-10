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
// In production this is `GET/PUT /api/progress`, keyed by the signed-in
// learner. Here it is one `localStorage` key, seeded once from the demo
// figures so screenshots stay consistent with the original prototype.
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

const KEY = 'englisher.progress';

const PROGRESS_DEFAULT: Progress = {
  xp: 240,
  streakDays: 7,
  lastActiveISO: new Date().toISOString(),
  completedLessonIds: { tenses: ['word-order'] },
  currentStageId: 'complex-sentences',
  currentStagePct: 60,
};

export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch {
    /* storage blocked */
  }
  return JSON.parse(JSON.stringify(PROGRESS_DEFAULT)) as Progress;
}

export function saveProgress(p: Progress): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
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
  const completed = completedStageCount(p, curriculum);
  const total = curriculum.stages.length;
  return Math.round(((completed + p.currentStagePct / 100) / total) * 100);
}

export function isLessonComplete(p: Progress, stageId: string, lessonId: string): boolean {
  return (p.completedLessonIds[stageId] || []).includes(lessonId);
}

export function markLessonComplete(p: Progress, stageId: string, lessonId: string): Progress {
  const list = p.completedLessonIds[stageId] || [];
  if (list.includes(lessonId)) return p;
  return {
    ...p,
    xp: p.xp + 10,
    completedLessonIds: { ...p.completedLessonIds, [stageId]: [...list, lessonId] },
    lastActiveISO: new Date().toISOString(),
  };
}

/** Advance to a given stage — used once a placement test decides a starting point. */
export function setCurrentStage(p: Progress, stageId: string): Progress {
  return { ...p, currentStageId: stageId, currentStagePct: 0 };
}
