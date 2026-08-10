import { describe, expect, it } from 'vitest';
import { gradeCard, isAnswered, norm } from './grading';
import { makeCard } from './curriculum';
import type { Card, DragOrderPayload, McqPayload } from './types';

describe('norm', () => {
  it('lowercases and strips punctuation by default', () => {
    expect(norm('I go to school.')).toBe('i go to school');
  });
  it('respects normalize rules', () => {
    expect(norm('Hello!', { lowercase: false, stripPunctuation: false })).toBe('Hello!');
  });
  it('collapses whitespace', () => {
    expect(norm('a   b\n c')).toBe('a b c');
  });
});

describe('gradeCard', () => {
  it('grades mcq by correctIndex', () => {
    const card = makeCard('c', 'mcq') as Card;
    (card as unknown as { payload: McqPayload }).payload = { options: [{ en: 'a', si: '' }, { en: 'b', si: '' }], correctIndex: 1 };
    expect(gradeCard(card, 1)).toBe(true);
    expect(gradeCard(card, 0)).toBe(false);
  });

  it('grades gap_fill against any accepted answer, normalised', () => {
    const card = makeCard('c', 'gap_fill') as Card;
    (card as unknown as { payload: { template: unknown; accept: string[]; choices: string[] } }).payload = { template: { en: '', si: '' }, accept: ['watch'], choices: [] };
    expect(gradeCard(card, 'Watch')).toBe(true);
    expect(gradeCard(card, 'watches')).toBe(false);
  });

  it('grades drag_order only when every token is in its original position', () => {
    const card = makeCard('c', 'drag_order') as Card;
    (card as unknown as { payload: DragOrderPayload }).payload = { tokens: [{ en: 'a', si: '' }, { en: 'b', si: '' }, { en: 'c', si: '' }] };
    expect(gradeCard(card, [0, 1, 2])).toBe(true);
    expect(gradeCard(card, [1, 0, 2])).toBe(false);
    expect(gradeCard(card, [0, 1])).toBe(false);
  });

  it('grades match only when every pair index matches', () => {
    const card = makeCard('c', 'match') as Card;
    (card as unknown as { payload: { pairs: { left: string; right: string }[] } }).payload = { pairs: [{ left: 'x', right: 'y' }, { left: 'p', right: 'q' }] };
    expect(gradeCard(card, { pending: null, pairs: { 0: 0, 1: 1 } })).toBe(true);
    expect(gradeCard(card, { pending: null, pairs: { 0: 1, 1: 0 } })).toBe(false);
  });

  it('always passes a text card', () => {
    const card = makeCard('c', 'text') as Card;
    expect(gradeCard(card, null)).toBe(true);
  });
});

describe('isAnswered', () => {
  it('drag_order needs at least one token placed', () => {
    const card = makeCard('c', 'drag_order') as Card;
    expect(isAnswered(card, [])).toBe(false);
    expect(isAnswered(card, [0])).toBe(true);
  });
  it('match needs at least one pair', () => {
    const card = makeCard('c', 'match') as Card;
    expect(isAnswered(card, { pending: null, pairs: {} })).toBe(false);
    expect(isAnswered(card, { pending: null, pairs: { 0: 0 } })).toBe(true);
  });
  it('free_text needs non-whitespace content', () => {
    const card = makeCard('c', 'free_text') as Card;
    expect(isAnswered(card, '   ')).toBe(false);
    expect(isAnswered(card, 'hi')).toBe(true);
  });
});
