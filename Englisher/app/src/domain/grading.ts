import type { Card, DragOrderPayload, FreeTextPayload, GapFillPayload, MatchPayload, McqPayload, MultiSelectPayload } from './types';

// Extracted from Exercise.dc.html's inline grader so it is unit-testable and
// shared by the exercise player.

export type McqAnswer = number | null;
export type DragOrderAnswer = number[];
export type MatchAnswer = { pending: number | null; pairs: Record<number, number> };
export type TextAnswer = string;
export type MultiSelectAnswer = number[];
/** Rubric checklist state, keyed `${sectionIndex}-${itemIndex}`. */
export type RubricAnswer = Record<string, boolean>;
export type Answer = McqAnswer | DragOrderAnswer | MatchAnswer | TextAnswer | MultiSelectAnswer | RubricAnswer;

/** Free-text and typed gap answers are compared under author-chosen normalisation. */
export function norm(s: string | null | undefined, rules?: { lowercase?: boolean; stripPunctuation?: boolean } | null): string {
  let out = String(s == null ? '' : s).trim();
  if (!rules || rules.lowercase !== false) out = out.toLowerCase();
  if (!rules || rules.stripPunctuation !== false) out = out.replace(/[.,!?;:'"()]/g, '');
  return out.replace(/\s+/g, ' ');
}

export function gradeCard(card: Card, answer: Answer): boolean {
  if (card.type === 'text') return true;
  const q = card.payload;
  if (card.type === 'mcq') {
    const p = q as McqPayload;
    return answer !== null && answer === p.correctIndex;
  }
  if (card.type === 'gap_fill') {
    const p = q as GapFillPayload;
    return (p.accept || []).some((x) => norm(x, null) === norm(answer as string, null));
  }
  if (card.type === 'drag_order') {
    const p = q as DragOrderPayload;
    const a = answer as DragOrderAnswer;
    return a.length === p.tokens.length && a.every((v, i) => v === i);
  }
  if (card.type === 'match') {
    const p = q as MatchPayload;
    const a = answer as MatchAnswer;
    return p.pairs.length > 0 && p.pairs.every((_, i) => a.pairs[i] === i);
  }
  if (card.type === 'free_text') {
    const p = q as FreeTextPayload;
    return (p.accept || []).some((x) => norm(x, p.normalize) === norm(answer as string, p.normalize));
  }
  if (card.type === 'multi_select') {
    const p = q as MultiSelectPayload;
    const a = (answer as MultiSelectAnswer) || [];
    const want = new Set(p.correctIndexes);
    return a.length === want.size && a.every((i) => want.has(i));
  }
  // Essays and rubrics are self-assessed, not auto-graded — answering them
  // always "passes" so the exercise flow can move on.
  if (card.type === 'essay' || card.type === 'rubric') return true;
  return true;
}

export function defaultAnswerFor(card: Card): Answer {
  if (card.type === 'drag_order') return [];
  if (card.type === 'match') return { pending: null, pairs: {} };
  if (card.type === 'mcq') return null;
  if (card.type === 'multi_select') return [];
  if (card.type === 'rubric') return {};
  return '';
}

export function isAnswered(card: Card, a: Answer): boolean {
  if (card.type === 'drag_order') return (a as DragOrderAnswer).length > 0;
  if (card.type === 'match') return Object.keys((a as MatchAnswer).pairs).length > 0;
  if (card.type === 'free_text' || card.type === 'gap_fill' || card.type === 'essay') return !!(a && String(a).trim());
  if (card.type === 'mcq') return a !== null && a !== undefined;
  if (card.type === 'multi_select') return ((a as MultiSelectAnswer) || []).length > 0;
  // A rubric is a self-check, not a gate — it never blocks moving on.
  if (card.type === 'rubric') return true;
  return true;
}

/** Deterministic shuffle so a token/pair pool is stable across re-renders. */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
