// Content model. Ported from curriculum.js — see that file's header comment
// for the production API seams (GET /api/curriculum, PUT /api/admin/curriculum).

export type Lang = 'en' | 'si';
export type Bilingual = { en: string; si: string };

export type ExerciseType = 'mcq' | 'gap_fill' | 'drag_order' | 'match' | 'free_text' | 'multi_select' | 'essay' | 'rubric';
export type CardType = 'text' | ExerciseType;
export type Column = 'left' | 'right' | 'full';

export interface McqPayload {
  options: Bilingual[];
  correctIndex: number;
  shuffle?: boolean;
}
export interface GapFillPayload {
  template: Bilingual;
  accept: string[];
  choices: string[];
}
export interface DragOrderPayload {
  tokens: Bilingual[];
}
export interface MatchPayload {
  pairs: { left: string; right: string }[];
}
export interface FreeTextPayload {
  accept: string[];
  normalize: { lowercase: boolean; stripPunctuation: boolean };
}
/** Like MCQ, but any number of options can be correct — graded as an exact set match. */
export interface MultiSelectPayload {
  options: Bilingual[];
  correctIndexes: number[];
  shuffle?: boolean;
}
/** A long-form writing prompt (essay / letter paragraph) — never auto-graded, just answered. */
export interface EssayPayload {
  /** Starter phrases/facts the learner can draw on, grouped loosely like the old hardcoded "idea bank". */
  ideaBank: Bilingual[];
  /** Suggested structure steps, shown as a numbered list above the writing box. */
  outline: Bilingual[];
  minWords?: number;
}
export interface RubricSection {
  title: Bilingual;
  items: Bilingual[];
}
/** A self-evaluation checklist the learner ticks after writing — never auto-graded. */
export interface RubricPayload {
  sections: RubricSection[];
}
export type Payload =
  | McqPayload | GapFillPayload | DragOrderPayload | MatchPayload | FreeTextPayload
  | MultiSelectPayload | EssayPayload | RubricPayload | Record<string, never>;

export interface Feedback {
  correct: Bilingual;
  incorrect: Bilingual;
}

export interface TextCard {
  id: string;
  type: 'text';
  column: Column;
  body: Bilingual;
  /** Whether the card renders as a distinct boxed card. Absent means true — existing content keeps its current look. */
  border?: boolean;
}
export interface ExerciseCard {
  id: string;
  type: ExerciseType;
  column: Column;
  prompt: Bilingual;
  payload: Payload;
  feedback: Feedback;
  /** Whether the card renders as a distinct boxed card. Absent means true — existing content keeps its current look. */
  border?: boolean;
}
export type Card = TextCard | ExerciseCard;

export interface Exercise {
  id: string;
  type: ExerciseType;
  prompt: Bilingual;
  payload: Payload;
  feedback: Feedback;
  cards: Card[];
}

export interface Lesson {
  id: string;
  order: number;
  kind: 'teach' | 'practice';
  title: Bilingual;
  explanation: Bilingual;
  exercises: Exercise[];
  cards: Card[];
}

export type Unlock = { kind: 'always' } | { kind: 'afterStage'; stageId: string };

export interface Stage {
  id: string;
  order: number;
  title: Bilingual;
  theme: { from: string; to: string };
  unlock: Unlock;
  lessons: Lesson[];
  /** Stages authored only as roadmap placeholders (no lesson content yet). */
  placeholder?: boolean;
}

export interface Curriculum {
  version: number;
  stages: Stage[];
}

export const TYPE_META: Record<ExerciseType, { short: string; label: string }> = {
  mcq: { short: 'MCQ', label: 'Multiple choice' },
  gap_fill: { short: 'GAP', label: 'Fill in the blank' },
  drag_order: { short: 'DRAG', label: 'Drag to order' },
  match: { short: 'MATCH', label: 'Match pairs' },
  free_text: { short: 'TEXT', label: 'Free text' },
  multi_select: { short: 'MULTI', label: 'Select multiple answers' },
  essay: { short: 'ESSAY', label: 'Essay / letter paragraph' },
  rubric: { short: 'RUBRIC', label: 'Self-evaluation rubric' },
};

export const CARD_COLUMNS: { key: Column; label: string }[] = [
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'full', label: 'Full width' },
];
