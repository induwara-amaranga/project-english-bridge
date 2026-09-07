import { apiGet, apiPut } from '../lib/apiClient';
import type { Card, Curriculum, Exercise, ExerciseType, Lesson, Payload, Stage } from './types';

// ---------------------------------------------------------------------------
// THE CURRICULUM DATA
//
// Ported from curriculum.js, which is the single most portable file in the
// prototype (see ARCHITECTURE.md §3). Two changes from the original:
//
// 1. Extended from 3 authored stages to the full 8-stage roadmap. The
//    prototype had five independent copies of an 8-stage list (Course
//    Roadmap, Progress, Stage Lessons, Parent Dashboard) that all disagreed
//    with the 3-stage curriculum.js and with each other — see
//    ARCHITECTURE.md "Weakness 1". This is now the one list; every page
//    reads it. The five stages that had no authored lesson content yet
//    (`placeholder: true`) render a "no content yet" state rather than fake
//    lessons — they are not invented content, just a slot for it.
// 2. Per-stage theme colours unified to the 8-colour set the roadmap's map
//    view already used, since that was the more complete of the two
//    conflicting palettes.
// ---------------------------------------------------------------------------

export const CURRICULUM_DEFAULT: Curriculum = {
  version: 7,
  stages: [
    {
      id: 'tenses', order: 1, title: { en: 'Tenses', si: 'කාල වචන' },
      theme: { from: '#6EE7A8', to: '#2FAE63' },
      unlock: { kind: 'always' },
      lessons: [
        {
          id: 'word-order', order: 1, kind: 'teach',
          title: { en: 'Word order', si: 'වචන අනුපිළිවෙල' },
          explanation: { en: 'English almost always follows Subject → Verb → Object. Sinhala puts the verb last, which is why direct translation feels wrong.', si: '' },
          cards: [],
          exercises: [
            {
              id: 'wo-1', type: 'mcq',
              prompt: { en: 'Which sentence has the correct word order?', si: 'නිවැරදි වචන අනුපිළිවෙල ඇති වාක්‍යය කුමක්ද?' },
              feedback: { correct: { en: "Correct! Subject → Verb → Object — that's the English pattern.", si: '' }, incorrect: { en: 'Not quite. In English, the verb comes right after the subject: I eat rice.', si: '' } },
              payload: { options: [{ en: 'I rice eat', si: '' }, { en: 'I eat rice', si: '' }, { en: 'Rice I eat', si: '' }], correctIndex: 1, shuffle: true },
              cards: [],
            },
            {
              id: 'wo-2', type: 'drag_order',
              prompt: { en: 'Put the words in the correct order.', si: 'වචන නිවැරදි අනුපිළිවෙලට සකසන්න.' },
              feedback: { correct: { en: 'Exactly — subject, verb, then object.', si: '' }, incorrect: { en: 'Close. Start with who is doing the action.', si: '' } },
              payload: { tokens: [{ en: 'She', si: '' }, { en: 'reads', si: '' }, { en: 'a book', si: '' }] },
              cards: [],
            },
          ],
        },
        {
          id: 'present-simple', order: 2, kind: 'practice',
          title: { en: 'Present simple', si: 'වර්තමාන කාලය' },
          explanation: { en: 'Use the base verb with I / you / we / they, and add -s for he / she / it.', si: '' },
          cards: [],
          exercises: [
            {
              id: 'ps-1', type: 'gap_fill',
              prompt: { en: 'Complete the sentence.', si: 'වාක්‍යය සම්පූර්ණ කරන්න.' },
              feedback: { correct: { en: "Correct! 'We' takes the base form of the verb.", si: '' }, incorrect: { en: "Almost — with 'we', use the base verb form.", si: '' } },
              payload: { template: { en: 'We ___ English every day.', si: '' }, accept: ['watch'], choices: ['watch', 'watches', 'watching'] },
              cards: [],
            },
          ],
        },
      ],
    },
    {
      id: 'complex-sentences', order: 2, title: { en: 'Complex Sentences', si: 'සංකීර්ණ වාක්‍ය' },
      theme: { from: '#6EF2E4', to: '#0FA593' },
      unlock: { kind: 'afterStage', stageId: 'tenses' },
      lessons: [
        {
          id: 'because-although', order: 1, kind: 'teach',
          title: { en: 'Because & although', si: 'නිසා සහ නමුත්' },
          explanation: { en: 'Joining words let you give a reason or show contrast inside one sentence.', si: '' },
          cards: [],
          exercises: [
            {
              id: 'ba-1', type: 'match',
              prompt: { en: 'Match each Sinhala phrase to its English joining word.', si: 'සිංහල වාක්‍ය ඛණ්ඩය ගැළපෙන ඉංග්‍රීසි වචනයට ගළපන්න.' },
              feedback: { correct: { en: 'All matched.', si: '' }, incorrect: { en: 'Some pairs are not matched yet.', si: '' } },
              payload: { pairs: [{ left: 'නිසා', right: 'because' }, { left: 'නමුත්', right: 'although' }, { left: 'නම්', right: 'if' }] },
              cards: [],
            },
            {
              id: 'ba-2', type: 'mcq',
              prompt: { en: 'Which sentence uses "because" correctly?', si: '' },
              feedback: { correct: { en: 'Right — "because" needs a full clause after it.', si: '' }, incorrect: { en: '"Because" must be followed by subject + verb.', si: '' } },
              payload: { options: [{ en: 'I was late because traffic.', si: '' }, { en: 'I was late because the traffic was heavy.', si: '' }], correctIndex: 1, shuffle: true },
              cards: [],
            },
          ],
        },
      ],
    },
    {
      id: 'adjectives-adverbs-prepositions', order: 3,
      title: { en: 'Adjectives, Adverbs & Prepositions', si: 'විශේෂණ, ක්‍රියා විශේෂණ සහ නිපාත' },
      theme: { from: '#A78BFA', to: '#6C4FF6' },
      unlock: { kind: 'afterStage', stageId: 'complex-sentences' },
      lessons: [], placeholder: true,
    },
    {
      id: 'passive-voice', order: 4, title: { en: 'Passive Voice', si: 'කර්ම කාරකය' },
      theme: { from: '#FF9B7E', to: '#FF6B4A' },
      unlock: { kind: 'afterStage', stageId: 'adjectives-adverbs-prepositions' },
      lessons: [], placeholder: true,
    },
    {
      id: 'translation', order: 5, title: { en: 'Sinhala–English Translation', si: 'සිංහල–ඉංග්‍රීසි පරිවර්තනය' },
      theme: { from: '#FFD976', to: '#FFB800' },
      unlock: { kind: 'afterStage', stageId: 'passive-voice' },
      lessons: [
        {
          id: 'everyday', order: 1, kind: 'practice',
          title: { en: 'Everyday sentences', si: 'දෛනික වාක්‍ය' },
          explanation: { en: 'Translate meaning, not word by word.', si: '' },
          cards: [],
          exercises: [
            {
              id: 'ev-1', type: 'free_text',
              prompt: { en: 'Translate into English: මම පාසැලට යනවා', si: '' },
              feedback: { correct: { en: 'Correct.', si: '' }, incorrect: { en: 'Check your verb form.', si: '' } },
              payload: { accept: ['I go to school', 'I am going to school'], normalize: { lowercase: true, stripPunctuation: true } },
              cards: [],
            },
          ],
        },
      ],
    },
    {
      id: 'guided-essays', order: 6, title: { en: 'Guided Essays', si: 'මඟපෙන්වූ රචනා' },
      theme: { from: '#FF8B98', to: '#FF4D5E' },
      unlock: { kind: 'afterStage', stageId: 'translation' },
      lessons: [], placeholder: true,
    },
    {
      id: 'solo-essays', order: 7, title: { en: 'Solo Essays', si: 'ස්වාධීන රචනා' },
      theme: { from: '#8C7BF0', to: '#5539E0' },
      unlock: { kind: 'afterStage', stageId: 'guided-essays' },
      lessons: [], placeholder: true,
    },
    {
      id: 'formal-letters', order: 8, title: { en: 'Formal Letters', si: 'විධිමත් ලිපි' },
      theme: { from: '#8A84A8', to: '#3A3550' },
      unlock: { kind: 'afterStage', stageId: 'solo-essays' },
      lessons: [], placeholder: true,
    },
  ],
};

/** The empty document a hook renders before its first fetch resolves — never persisted. */
export const EMPTY_CURRICULUM: Curriculum = { version: 0, stages: [] };

// ---------------------------------------------------------------------------
// MARKUP — real CommonMark now (rendered by markdown-it, edited via Tiptap +
// tiptap-markdown; see RichText.tsx and components/RichTextEditor.tsx). Cards
// just store the markdown string in `body`/`prompt`.en/.si, unchanged.
// ---------------------------------------------------------------------------

/** A short, single-line, markup-free preview — for tree rows and list
 * summaries, not for actually rendering a card (see RichText for that). */
export function plainText(src: string): string {
  return String(src == null ? '' : src)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// CARDS
// ---------------------------------------------------------------------------
export const emptyPayload: Record<CardTypeKey, () => Payload> = {
  mcq: () => ({ options: [{ en: '', si: '' }, { en: '', si: '' }], correctIndex: 0, shuffle: true }),
  gap_fill: () => ({ template: { en: '', si: '' }, accept: [], choices: [] }),
  drag_order: () => ({ tokens: [{ en: '', si: '' }, { en: '', si: '' }] }),
  match: () => ({ pairs: [{ left: '', right: '' }, { left: '', right: '' }] }),
  free_text: () => ({ accept: [], normalize: { lowercase: true, stripPunctuation: true } }),
  multi_select: () => ({ options: [{ en: '', si: '' }, { en: '', si: '' }], correctIndexes: [0], shuffle: true }),
  essay: () => ({ ideaBank: [], outline: [] }),
  rubric: () => ({ sections: [{ title: { en: '', si: '' }, items: [{ en: '', si: '' }] }] }),
  text: () => ({}),
};
type CardTypeKey = ExerciseType | 'text';

export function makeCard(id: string, type: CardTypeKey, column: Card['column'] = 'full'): Card {
  if (type === 'text') {
    return { id, type: 'text', column, body: { en: '', si: '' }, border: true };
  }
  return {
    id, type, column,
    prompt: { en: '', si: '' },
    payload: emptyPayload[type](),
    feedback: { correct: { en: '', si: '' }, incorrect: { en: '', si: '' } },
    border: true,
  };
}

export function ensureCards(lesson: Lesson): Lesson {
  if (!Array.isArray(lesson.cards)) lesson.cards = [];
  if (lesson.cards.length === 0 && lesson.explanation && lesson.explanation.en) {
    lesson.cards = [{ id: lesson.id + '-c1', type: 'text', column: 'full', body: { en: lesson.explanation.en, si: lesson.explanation.si || '' } }];
  }
  (lesson.exercises || []).forEach((ex) => {
    if (!Array.isArray(ex.cards) || ex.cards.length === 0) {
      ex.cards = [{
        id: ex.id + '-c1', type: ex.type || 'mcq', column: 'full',
        prompt: ex.prompt || { en: '', si: '' },
        payload: ex.payload || emptyPayload[ex.type || 'mcq'](),
        feedback: ex.feedback || { correct: { en: '', si: '' }, incorrect: { en: '', si: '' } },
      }];
    }
  });
  return lesson;
}

export function syncExerciseFromCards(ex: Exercise): Exercise {
  const cards = ex.cards || [];
  const primary = cards.find((c) => c.type !== 'text') as Extract<Card, { type: ExerciseType }> | undefined;
  if (primary) {
    ex.type = primary.type;
    ex.prompt = primary.prompt;
    ex.payload = primary.payload;
    ex.feedback = primary.feedback;
  }
  return ex;
}

export function syncLessonFromCards(lesson: Lesson): Lesson {
  const texts = (lesson.cards || [])
    .filter((c): c is Extract<Card, { type: 'text' }> => c.type === 'text')
    .map((c) => c.body.en || '')
    .filter(Boolean);
  if (!lesson.explanation) lesson.explanation = { en: '', si: '' };
  lesson.explanation.en = texts.join('\n\n');
  (lesson.exercises || []).forEach(syncExerciseFromCards);
  return lesson;
}

export function normaliseCurriculum(c: Curriculum): Curriculum {
  c.stages.forEach((st) => {
    st.lessons.forEach((ls) => {
      ensureCards(ls);
      syncLessonFromCards(ls);
    });
  });
  return c;
}

export function cardGridColumn(card: Card): string {
  if (card.column === 'full') return '1 / -1';
  return card.column === 'right' ? '2' : '1';
}

export function repairUnlocks(c: Curriculum): void {
  c.stages.forEach((st, i) => {
    const unlock = st.unlock;
    if (!unlock || unlock.kind !== 'afterStage') return;
    const refIdx = c.stages.findIndex((s) => s.id === unlock.stageId);
    if (refIdx >= 0 && refIdx < i) return;
    st.unlock = i === 0 ? { kind: 'always' } : { kind: 'afterStage', stageId: c.stages[i - 1].id };
  });
}

// ---------------------------------------------------------------------------
// Persistence — GET /api/curriculum, PUT /api/admin/curriculum (see
// SPRINGBOOT-MIGRATION.md section 3). Reading works for any signed-in role;
// writing is admin-only and enforced server-side, not just by RequireRole.
// ---------------------------------------------------------------------------

export function loadCurriculum(): Promise<Curriculum> {
  return apiGet<Curriculum>('/api/curriculum');
}

/** Whole-document replace. Returns what the server actually stored — its own
 * repairUnlocks/card-sync pass may have adjusted what was sent. */
export function saveCurriculum(c: Curriculum): Promise<Curriculum> {
  return apiPut<Curriculum>('/api/admin/curriculum', c);
}

// ---------------------------------------------------------------------------
// Lookup helpers — `?stage=`/`?lesson=` accept either a 1-based position or a
// slug id (ported from Lesson.dc.html / Exercise.dc.html's `pick()`).
// ---------------------------------------------------------------------------
export function pickByIdOrPosition<T extends { id: string }>(list: T[], raw: string | null | undefined): T | null {
  if (!list.length) return null;
  if (raw) {
    const found = list.find((x) => x.id === raw);
    if (found) return found;
    const n = parseInt(raw, 10);
    if (n >= 1) return list[Math.min(n, list.length) - 1];
  }
  return list[0];
}

export function stageIndexOf(c: Curriculum, stage: Stage): number {
  return c.stages.indexOf(stage) + 1;
}

/**
 * Whether this is the lesson that finishes its stage.
 *
 * <p>A stage is what a learner calls a course — one subject, start to finish —
 * so finishing a stage's last lesson is what earns the course-complete screen.
 * There is no whole-curriculum equivalent: the roadmap's later stages are
 * placeholders holding no lessons yet, and a stage with none cannot be
 * finished at all, which is why an empty one is never the final lesson of
 * anything.
 */
export function isLastLessonOfStage(stage: Stage, lessonId: string): boolean {
  const lessons = stage.lessons || [];
  return lessons.length > 0 && lessons[lessons.length - 1].id === lessonId;
}

/**
 * The stages a learner can actually finish.
 *
 * <p>The roadmap deliberately shows stages holding no lessons yet — they are
 * the shape of the course to come, and several of the seeded eight are marked
 * `placeholder` for exactly that. Emptiness is the test rather than that flag:
 * a stage with no lessons cannot be finished however it is labelled.
 */
export function playableStages(c: Curriculum): Stage[] {
  return c.stages.filter((s) => (s.lessons || []).length > 0);
}

/**
 * Whether this is the last stage with anything in it — finishing it is the end
 * of the whole curriculum, which is what earns the congratulations screen.
 *
 * <p>Deliberately not "the last stage in the array": that is a placeholder with
 * no lessons, so the end of the road would be somewhere nobody can reach.
 */
export function isFinalStage(c: Curriculum, stageId: string | undefined): boolean {
  const playable = playableStages(c);
  return playable.length > 0 && !!stageId && playable[playable.length - 1].id === stageId;
}
