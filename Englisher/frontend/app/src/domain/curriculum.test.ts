import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_DEFAULT,
  ensureCards,
  isFinalStage,
  isLastLessonOfStage,
  makeCard,
  normaliseCurriculum,
  pickByIdOrPosition,
  plainText,
  repairUnlocks,
  syncLessonFromCards,
} from './curriculum';
import type { Curriculum, Lesson, Stage } from './types';

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

describe('plainText', () => {
  it('strips markup and collapses lines to a single space', () => {
    expect(plainText('**Which** form?\nSecond line')).toBe('Which form? Second line');
  });

  it('strips links, images and list markers', () => {
    expect(plainText('- [a link](http://x) and ![an image](http://y)')).toBe('a link and an image');
  });
});

describe('ensureCards / syncLessonFromCards', () => {
  it('migrates a pre-cards lesson into a single full-width text card', () => {
    const lesson = { id: 'l1', order: 1, kind: 'teach', title: { en: '', si: '' }, explanation: { en: 'Hello world', si: '' }, exercises: [] } as unknown as Lesson;
    ensureCards(lesson);
    expect(lesson.cards).toHaveLength(1);
    expect(lesson.cards[0]).toMatchObject({ type: 'text', column: 'full' });
  });

  it('is idempotent — running twice does not duplicate cards', () => {
    const lesson = clone(CURRICULUM_DEFAULT.stages[0].lessons[0]);
    ensureCards(lesson);
    const first = lesson.cards.length;
    ensureCards(lesson);
    expect(lesson.cards.length).toBe(first);
  });

  it('re-derives lesson.explanation from text cards', () => {
    const lesson = makeLessonWithCards();
    syncLessonFromCards(lesson);
    expect(lesson.explanation.en).toBe('First\n\nSecond');
  });
});

function makeLessonWithCards(): Lesson {
  const c1 = makeCard('c1', 'text');
  const c2 = makeCard('c2', 'text');
  if (c1.type === 'text') c1.body.en = 'First';
  if (c2.type === 'text') c2.body.en = 'Second';
  return {
    id: 'l1', order: 1, kind: 'teach', title: { en: '', si: '' }, explanation: { en: '', si: '' },
    cards: [c1, c2],
    exercises: [],
  } as unknown as Lesson;
}

describe('normaliseCurriculum', () => {
  it('is idempotent across the seed content', () => {
    const c1 = normaliseCurriculum(clone(CURRICULUM_DEFAULT));
    const c2 = normaliseCurriculum(clone(c1));
    expect(c2).toEqual(c1);
  });
});

describe('repairUnlocks', () => {
  it('re-points an afterStage rule that now points forward, at the immediately preceding stage', () => {
    const c: Curriculum = clone(CURRICULUM_DEFAULT);
    // Simulate a reorder that leaves stage 0's rule pointing at a later stage.
    c.stages[0].unlock = { kind: 'afterStage', stageId: c.stages[2].id };
    repairUnlocks(c);
    expect(c.stages[0].unlock).toEqual({ kind: 'always' });
  });

  it('leaves "always" stages alone', () => {
    const c: Curriculum = clone(CURRICULUM_DEFAULT);
    repairUnlocks(c);
    expect(c.stages[0].unlock).toEqual({ kind: 'always' });
  });
});

describe('pickByIdOrPosition', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('resolves by slug id', () => {
    expect(pickByIdOrPosition(list, 'b')?.id).toBe('b');
  });
  it('resolves by 1-based position', () => {
    expect(pickByIdOrPosition(list, '2')?.id).toBe('b');
  });
  it('clamps an out-of-range position to the last item', () => {
    expect(pickByIdOrPosition(list, '99')?.id).toBe('c');
  });
  it('falls back to the first item when nothing is given', () => {
    expect(pickByIdOrPosition(list, null)?.id).toBe('a');
  });
});

describe('isLastLessonOfStage', () => {
  const stage = (id: string, lessonIds: string[]): Stage => ({
    id, order: 1, title: { en: id, si: '' }, theme: { from: '', to: '' }, unlock: { kind: 'always' },
    lessons: lessonIds.map((lid, i) => ({
      id: lid, order: i + 1, kind: 'practice', title: { en: lid, si: '' },
      explanation: { en: '', si: '' }, exercises: [], cards: [],
    })),
  });

  it('is true only for the stage\'s final lesson', () => {
    const tenses = stage('tenses', ['l1', 'l2', 'l3']);
    expect(isLastLessonOfStage(tenses, 'l3')).toBe(true);
    expect(isLastLessonOfStage(tenses, 'l2')).toBe(false);
    expect(isLastLessonOfStage(tenses, 'l1')).toBe(false);
  });

  it('holds for every stage, not just the last one in the curriculum', () => {
    // A course is a stage here, so each stage ends in its own completion screen.
    expect(isLastLessonOfStage(stage('translation', ['only']), 'only')).toBe(true);
  });

  it('is false for a lesson the stage does not have', () => {
    expect(isLastLessonOfStage(stage('tenses', ['l1']), 'somewhere-else')).toBe(false);
  });

  it('is false for a placeholder stage — there is no lesson to finish', () => {
    expect(isLastLessonOfStage(stage('formal-letters', []), 'l1')).toBe(false);
  });

  describe('isFinalStage', () => {
    // The seeded shape: content up front, empty placeholder stages trailing it.
    const curriculum: Curriculum = {
      version: 1,
      stages: [stage('tenses', ['l1']), stage('translation', ['l2']), stage('letters', []), stage('essays', [])],
    };

    it('is the last stage that has lessons, not the last in the array', () => {
      expect(isFinalStage(curriculum, 'translation')).toBe(true);
      expect(isFinalStage(curriculum, 'essays')).toBe(false);
    });

    it('is false for an earlier stage, an unknown one, and no stage at all', () => {
      expect(isFinalStage(curriculum, 'tenses')).toBe(false);
      expect(isFinalStage(curriculum, 'nope')).toBe(false);
      expect(isFinalStage(curriculum, undefined)).toBe(false);
    });

    it('is false when nothing has content yet', () => {
      expect(isFinalStage({ version: 1, stages: [stage('empty', [])] }, 'empty')).toBe(false);
    });
  });
});
