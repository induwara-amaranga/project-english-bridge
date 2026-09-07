import { apiGet, apiPut } from '../lib/apiClient';
import type { Answer } from './grading';

// ---------------------------------------------------------------------------
// ANSWER-LEVEL RESULTS
//
// `POST /api/progress/lessons/{id}/complete` decides whether a lesson passed
// and awards its XP, but keeps nothing about the individual questions. The
// review screens need exactly that, so it is stored twice, on purpose:
//
//   - **localStorage**, written synchronously, so the completion screen can
//     show a score without waiting for a round-trip and review still works
//     with no connection.
//   - **`/api/progress/results`**, written straight after, so review survives
//     a cleared browser and follows the learner to another device.
//
// The server re-grades `correct` from the submitted answers rather than
// trusting the client's, so its copy wins wherever the two disagree: a write
// replaces the local copy with what came back, and a read merges the server's
// lessons over the cache.
// ---------------------------------------------------------------------------

const KEY = 'englisher.results.v1';

export interface ExerciseOutcome {
  /** Stable slug, so a re-ordered curriculum still resolves the right exercise. */
  exerciseId: string;
  /** Position at the time it was answered — the fallback when an id no longer exists. */
  index: number;
  correct: boolean;
  skipped: boolean;
  /** The learner's answer per card id, replayed into the card views on review. */
  answers: Record<string, Answer>;
}

export interface LessonResult {
  stageId: string;
  lessonId: string;
  finishedISO: string;
  outcomes: ExerciseOutcome[];
}

export interface Score {
  correct: number;
  total: number;
  skipped: number;
  pct: number;
}

type Store = Record<string, LessonResult>;

const keyOf = (stageId: string, lessonId: string) => `${stageId}/${lessonId}`;
const byFinished = (a: LessonResult, b: LessonResult) => a.finishedISO.localeCompare(b.finishedISO);

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    // Unreadable or private-mode storage — the server copy still answers.
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Out of quota or blocked: the lesson still completes and still syncs.
  }
}

function cache(result: LessonResult): void {
  const store = readStore();
  store[keyOf(result.stageId, result.lessonId)] = result;
  writeStore(store);
}

/**
 * Records the attempt: cached locally at once, then sent to the server, whose
 * re-graded copy replaces the cached one. Never rejects — a lesson must finish
 * whether or not the network cooperates.
 */
export async function saveLessonResult(result: LessonResult): Promise<void> {
  cache(result);
  try {
    const stored = await apiPut<LessonResult>(`/api/progress/results/${encodeURIComponent(result.lessonId)}`, {
      stageId: result.stageId,
      // `correct` is deliberately not sent: the server grades it.
      outcomes: result.outcomes.map((o) => ({
        exerciseId: o.exerciseId,
        index: o.index,
        skipped: o.skipped,
        answers: o.answers,
      })),
    });
    if (stored?.outcomes) cache(stored);
  } catch {
    // Offline, or the session expired mid-lesson. The cached copy keeps the
    // review screens working here; this lesson reaches the server the next
    // time it is taken.
  }
}

/** The cached copy only — what the completion screen can show immediately. */
export function getLessonResult(stageId: string, lessonId: string): LessonResult | null {
  return readStore()[keyOf(stageId, lessonId)] || null;
}

/** Every cached lesson, oldest first. */
export function getAllResults(): LessonResult[] {
  return Object.values(readStore()).sort(byFinished);
}

/**
 * Server first, cache as the fallback. The server's version of a lesson wins,
 * lessons only ever stored locally are kept, and the merged set is written back
 * so the next load starts from it.
 */
export async function fetchAllResults(): Promise<LessonResult[]> {
  let server: LessonResult[];
  try {
    server = await apiGet<LessonResult[]>('/api/progress/results');
  } catch {
    return getAllResults();
  }

  const merged: Store = { ...readStore() };
  for (const result of server) {
    merged[keyOf(result.stageId, result.lessonId)] = result;
  }
  writeStore(merged);
  return Object.values(merged).sort(byFinished);
}

export function scoreOf(outcomes: ExerciseOutcome[]): Score {
  const total = outcomes.length;
  const correct = outcomes.filter((o) => o.correct).length;
  const skipped = outcomes.filter((o) => o.skipped).length;
  return { correct, total, skipped, pct: total === 0 ? 0 : Math.round((correct / total) * 100) };
}

/** Every question the learner has attempted across the course, as one score. */
export function courseScore(results: LessonResult[]): Score {
  return scoreOf(results.flatMap((r) => r.outcomes));
}
