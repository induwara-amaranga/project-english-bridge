// Content model. Ported from curriculum.js — see that file's header comment
// for the production API seams (GET /api/curriculum, PUT /api/admin/curriculum).

export type Lang = 'en' | 'si';
export type Bilingual = { en: string; si: string };

export type ExerciseType = 'mcq' | 'gap_fill' | 'drag_order' | 'match' | 'free_text';
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
export type Payload = McqPayload | GapFillPayload | DragOrderPayload | MatchPayload | FreeTextPayload | Record<string, never>;

export interface Feedback {
  correct: Bilingual;
  incorrect: Bilingual;
}

export interface TextCard {
  id: string;
  type: 'text';
  column: Column;
  body: Bilingual;
}
export interface ExerciseCard {
  id: string;
  type: ExerciseType;
  column: Column;
  prompt: Bilingual;
  payload: Payload;
  feedback: Feedback;
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
  /** Stages 6-8: the checkpoint opens a writing task instead of another lesson. */
  taskHref?: string;
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
};

export const CARD_COLUMNS: { key: Column; label: string }[] = [
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'full', label: 'Full width' },
];
