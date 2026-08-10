import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { emptyPayload, loadCurriculum, makeCard, normaliseCurriculum, repairUnlocks, saveCurriculum, syncLessonFromCards } from '../../domain/curriculum';
import type { Card, CardType, Column, Curriculum, Exercise, Lesson, Payload, Stage } from '../../domain/types';

// Ported from Course Editor.dc.html's Component class (its `edit`/`structuralEdit`/
// `requestDelete` pattern). The prototype defers every write to an in-memory
// draft until "Save draft" is pressed — this hook keeps that behaviour rather
// than autosaving on every keystroke, which is what made the original safe to
// abandon a half-typed course without polluting storage.

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
export const slug = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uniqueId = (base: string, taken: string[]) => {
  let id = base, n = 2;
  while (taken.includes(id)) { id = `${base}-${n}`; n++; }
  return id;
};
const allExerciseIds = (c: Curriculum) => c.stages.flatMap((s) => s.lessons.flatMap((l) => l.exercises.map((e) => e.id)));

export interface Selection { stageId: string | null; lessonId: string | null; exerciseId: string | null; cardId: string | null }

const makeStage = (c: Curriculum): Stage => {
  const prev = c.stages[c.stages.length - 1];
  return {
    id: uniqueId('new-course', c.stages.map((s) => s.id)),
    order: c.stages.length + 1,
    title: { en: '', si: '' },
    theme: { from: '#A78BFA', to: '#6C4FF6' },
    unlock: prev ? { kind: 'afterStage', stageId: prev.id } : { kind: 'always' },
    lessons: [],
  };
};
const makeLesson = (st: Stage): Lesson => ({
  id: uniqueId(`${slug(st.title.en) || 'course'}-lesson`, st.lessons.map((l) => l.id)),
  order: st.lessons.length + 1, kind: 'teach',
  title: { en: '', si: '' }, explanation: { en: '', si: '' }, exercises: [], cards: [],
});
const makeExercise = (c: Curriculum, ls: Lesson): Exercise => ({
  id: uniqueId(`${slug(ls.title.en) || 'lesson'}-ex`, allExerciseIds(c)),
  type: 'mcq', prompt: { en: '', si: '' },
  feedback: { correct: { en: '', si: '' }, incorrect: { en: '', si: '' } },
  payload: emptyPayload.mcq(), cards: [],
});
const makeCardIn = (holder: { id: string; cards: Card[] }, type: CardType, column: Column) =>
  makeCard(uniqueId(`${holder.id || 'card'}-c`, (holder.cards || []).map((x) => x.id)), type, column);

interface Draft { kind: 'course' | 'lesson'; stageId: string; lessonId: string | null }

function finaliseDraft(c: Curriculum, draft: Draft | null): Selection | null {
  if (!draft) return null;
  const st = c.stages.find((s) => s.id === draft.stageId);
  if (!st) return null;
  if (draft.kind === 'lesson') {
    const ls = st.lessons.find((l) => l.id === draft.lessonId);
    if (!ls) return null;
    const others = st.lessons.filter((l) => l.id !== ls.id).map((l) => l.id);
    ls.id = uniqueId(slug(ls.title.en) || 'lesson', others);
    return { stageId: st.id, lessonId: ls.id, exerciseId: null, cardId: null };
  }
  const others = c.stages.filter((s) => s.id !== st.id).map((s) => s.id);
  const oldId = st.id;
  st.id = uniqueId(slug(st.title.en) || 'new-course', others);
  c.stages.forEach((s) => { if (s.unlock.kind === 'afterStage' && s.unlock.stageId === oldId) s.unlock.stageId = st.id; });
  return { stageId: st.id, lessonId: null, exerciseId: null, cardId: null };
}

function initialSelection(cur: Curriculum, stageIdQ: string | null, lessonIdQ: string | null, exerciseIdQ: string | null): Selection {
  const matchedStage = stageIdQ ? cur.stages.find((s) => s.id === stageIdQ) : null;
  const stage = matchedStage || cur.stages[0];
  if (!stage) return { stageId: null, lessonId: null, exerciseId: null, cardId: null };
  if (matchedStage && !lessonIdQ) return { stageId: stage.id, lessonId: null, exerciseId: null, cardId: null };

  const matchedLesson = lessonIdQ ? stage.lessons.find((l) => l.id === lessonIdQ) : null;
  const lesson = matchedLesson || stage.lessons[0];
  if (!lesson) return { stageId: stage.id, lessonId: null, exerciseId: null, cardId: null };
  if (matchedLesson && !exerciseIdQ) return { stageId: stage.id, lessonId: lesson.id, exerciseId: null, cardId: null };

  const matchedEx = exerciseIdQ ? lesson.exercises.find((e) => e.id === exerciseIdQ) : null;
  const ex = matchedEx || lesson.exercises[0];
  return { stageId: stage.id, lessonId: lesson.id, exerciseId: ex ? ex.id : null, cardId: null };
}

export function useCourseEditor() {
  const [params] = useSearchParams();

  const [init] = useState(() => {
    const cur = normaliseCurriculum(loadCurriculum());
    const isNew = params.get('new');
    const stageIdQ = params.get('stage');
    const lessonIdQ = params.get('lesson');
    let draft: Draft | null = null;
    let sel: Selection;
    if (isNew === 'course') {
      const st = makeStage(cur);
      cur.stages.push(st);
      draft = { kind: 'course', stageId: st.id, lessonId: null };
      sel = { stageId: st.id, lessonId: null, exerciseId: null, cardId: null };
    } else if (isNew === 'lesson') {
      const st = stageIdQ ? cur.stages.find((s) => s.id === stageIdQ) : cur.stages[0];
      if (st) {
        const ls = makeLesson(st);
        st.lessons.push(ls);
        draft = { kind: 'lesson', stageId: st.id, lessonId: ls.id };
        sel = { stageId: st.id, lessonId: ls.id, exerciseId: null, cardId: null };
      } else {
        sel = initialSelection(cur, stageIdQ, lessonIdQ, params.get('exercise'));
      }
    } else {
      sel = initialSelection(cur, stageIdQ, lessonIdQ, params.get('exercise'));
    }
    const expanded: Record<string, boolean> = {};
    cur.stages.forEach((s) => { expanded[s.id] = s.id === sel.stageId; });
    return { curriculum: cur, sel, expanded, draft, dirty: draft ? 1 : 0 };
  });

  const [curriculum, setCurriculum_] = useState(init.curriculum);
  const [sel, setSel] = useState<Selection>(init.sel);
  const [expanded, setExpanded] = useState(init.expanded);
  const [draft, setDraft] = useState<Draft | null>(init.draft);
  const [dirty, setDirty] = useState(init.dirty);
  const [saved, setSaved] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const freshCompose = (): Card => makeCard('compose', 'text', 'full');
  const [compose, setCompose] = useState<Card>(freshCompose());

  useEffect(() => { setPendingDelete(null); }, [sel.stageId, sel.lessonId, sel.exerciseId]);

  // ---- lookups ----
  const curStage = (c: Curriculum = curriculum) => c.stages.find((s) => s.id === sel.stageId) || null;
  const curLesson = (c: Curriculum = curriculum) => { const st = curStage(c); return st ? st.lessons.find((l) => l.id === sel.lessonId) || null : null; };
  const curExercise = (c: Curriculum = curriculum) => { const l = curLesson(c); return l ? l.exercises.find((e) => e.id === sel.exerciseId) || null : null; };
  const curHolder = (c: Curriculum = curriculum): (Lesson | Exercise) | null => curExercise(c) || curLesson(c);
  const curCard = (c: Curriculum = curriculum): Card | null => {
    const h = curHolder(c);
    return h ? (h.cards || []).find((x) => x.id === sel.cardId) || null : null;
  };

  // ---- generic edit ----
  const edit = (mutator: (c: Curriculum) => void) => {
    const c = clone(curriculum);
    mutator(c);
    const ls = curLesson(c);
    if (ls) syncLessonFromCards(ls);
    setCurriculum_(c);
    setDirty((d) => d + 1);
    setSaved(false);
  };

  const activeCard = (): Card => (sel.cardId ? curCard() || freshCompose() : compose);
  const editCard = (mutator: (card: Card) => void) => {
    if (!sel.cardId) {
      const next = clone(compose);
      mutator(next);
      setCompose(next);
      return;
    }
    edit((c) => { const card = curCard(c); if (card) mutator(card); });
  };
  const editExercisePayload = (mutator: (p: Payload) => void) => editCard((card) => { if (card.type !== 'text') mutator(card.payload); });

  const structuralEdit = (mutator: (c: Curriculum) => Selection | null, expand = true) => {
    const c = clone(curriculum);
    const nextSel = mutator(c);
    if (!nextSel) return;
    if (nextSel.lessonId) {
      const st = c.stages.find((s) => s.id === nextSel.stageId);
      const ls = st && st.lessons.find((l) => l.id === nextSel.lessonId);
      if (ls) syncLessonFromCards(ls);
    }
    setCurriculum_(c);
    setSel(nextSel);
    if (expand && nextSel.stageId) setExpanded((e) => ({ ...e, [nextSel.stageId as string]: true }));
    setDirty((d) => d + 1);
    setSaved(false);
    setPendingDelete(null);
  };

  // ---- selection ----
  const selectStage = (stageId: string) => {
    setSel({ stageId, lessonId: null, exerciseId: null, cardId: null });
    setExpanded((e) => ({ ...e, [stageId]: !e[stageId] }));
    setPendingDelete(null);
    setCompose(freshCompose());
  };
  const selectLesson = (stageId: string, lessonId: string) => {
    setSel({ stageId, lessonId, exerciseId: null, cardId: null });
    setPendingDelete(null);
    setCompose(freshCompose());
  };
  const selectExercise = (stageId: string, lessonId: string, exerciseId: string) => {
    setSel({ stageId, lessonId, exerciseId, cardId: null });
    setPendingDelete(null);
    setCompose(freshCompose());
  };
  const selectCard = (cardId: string | null) => { setSel((s) => ({ ...s, cardId })); setPendingDelete(null); };
  const newCard = () => { setSel((s) => ({ ...s, cardId: null })); setPendingDelete(null); setCompose(freshCompose()); };

  const save = () => {
    const c = clone(curriculum);
    const finalSel = finaliseDraft(c, draft);
    saveCurriculum(c);
    setCurriculum_(c);
    if (finalSel) { setSel(finalSel); setExpanded((e) => ({ ...e, [finalSel.stageId as string]: true })); }
    setDraft(null);
    setDirty(0);
    setSaved(true);
  };

  // ---- structure: lessons / exercises ----
  const addLesson = (stageId: string) => structuralEdit((c) => {
    const st = c.stages.find((s) => s.id === stageId);
    if (!st) return null;
    const lesson = makeLesson(st);
    st.lessons.push(lesson);
    return { stageId, lessonId: lesson.id, exerciseId: null, cardId: null };
  });
  const addExercise = (stageId: string, lessonId: string) => structuralEdit((c) => {
    const st = c.stages.find((s) => s.id === stageId);
    const ls = st && st.lessons.find((l) => l.id === lessonId);
    if (!ls) return null;
    const ex = makeExercise(c, ls);
    ls.exercises.push(ex);
    return { stageId, lessonId, exerciseId: ex.id, cardId: null };
  });

  // ---- structure: cards ----
  const addComposedCard = () => {
    const { stageId, lessonId, exerciseId } = sel;
    const c = clone(curriculum);
    const st = c.stages.find((s) => s.id === stageId);
    const ls = st && st.lessons.find((l) => l.id === lessonId);
    if (!ls) return;
    const holder: Lesson | Exercise | undefined = exerciseId ? ls.exercises.find((e) => e.id === exerciseId) : ls;
    if (!holder) return;
    if (!Array.isArray(holder.cards)) holder.cards = [];
    const card = clone(compose);
    card.id = uniqueId(`${holder.id || 'card'}-c`, holder.cards.map((x) => x.id));
    holder.cards.push(card);
    syncLessonFromCards(ls);
    setCurriculum_(c);
    setDirty((d) => d + 1);
    setSaved(false);
    setPendingDelete(null);
    setCompose(freshCompose());
    setSel((s) => ({ ...s, cardId: null }));
  };

  const requestDelete = (what: string, run: () => void) => {
    if (pendingDelete !== what) { setPendingDelete(what); return; }
    run();
  };

  const deleteCard = (cardId: string) => requestDelete(`card:${cardId}`, () => structuralEdit((c) => {
    const { stageId, lessonId, exerciseId } = sel;
    const holder = curHolder(c);
    if (!holder) return null;
    holder.cards = (holder.cards || []).filter((x) => x.id !== cardId);
    const stillOpen = sel.cardId === cardId ? null : sel.cardId;
    return { stageId, lessonId, exerciseId, cardId: stillOpen };
  }, false));

  const swap = <T,>(list: T[], i: number, d: number): boolean => {
    const j = i + d;
    if (i < 0 || j < 0 || j >= list.length) return false;
    const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    return true;
  };

  const moveCard = (cardId: string, d: number) => structuralEdit((c) => {
    const holder = curHolder(c);
    if (!holder) return null;
    const i = (holder.cards || []).findIndex((x) => x.id === cardId);
    if (!swap(holder.cards, i, d)) return null;
    return sel;
  }, false);

  const moveStage = (stageId: string, d: number) => structuralEdit((c) => {
    const i = c.stages.findIndex((s) => s.id === stageId);
    if (!swap(c.stages, i, d)) return null;
    c.stages.forEach((s, k) => { s.order = k + 1; });
    repairUnlocks(c);
    return sel;
  }, false);
  const moveLesson = (stageId: string, lessonId: string, d: number) => structuralEdit((c) => {
    const st = c.stages.find((s) => s.id === stageId);
    if (!st) return null;
    const i = st.lessons.findIndex((l) => l.id === lessonId);
    if (!swap(st.lessons, i, d)) return null;
    st.lessons.forEach((l, k) => { l.order = k + 1; });
    return sel;
  }, false);
  const moveExercise = (stageId: string, lessonId: string, exerciseId: string, d: number) => structuralEdit((c) => {
    const st = c.stages.find((s) => s.id === stageId);
    const ls = st && st.lessons.find((l) => l.id === lessonId);
    if (!ls) return null;
    const i = ls.exercises.findIndex((e) => e.id === exerciseId);
    if (!swap(ls.exercises, i, d)) return null;
    return sel;
  }, false);

  const deleteStage = () => requestDelete('course', () => structuralEdit((c) => {
    const { stageId } = sel;
    const i = c.stages.findIndex((s) => s.id === stageId);
    if (i < 0) return null;
    c.stages.splice(i, 1);
    c.stages.forEach((s, k) => { s.order = k + 1; });
    repairUnlocks(c);
    const next = c.stages[Math.min(i, c.stages.length - 1)];
    return { stageId: next ? next.id : null, lessonId: null, exerciseId: null, cardId: null };
  }));
  const deleteLesson = () => requestDelete('lesson', () => structuralEdit((c) => {
    const { stageId, lessonId } = sel;
    const st = c.stages.find((s) => s.id === stageId);
    if (!st) return null;
    st.lessons = st.lessons.filter((l) => l.id !== lessonId);
    st.lessons.forEach((l, i) => { l.order = i + 1; });
    return { stageId, lessonId: null, exerciseId: null, cardId: null };
  }));
  const deleteExercise = () => requestDelete('exercise', () => structuralEdit((c) => {
    const { stageId, lessonId, exerciseId } = sel;
    const st = c.stages.find((s) => s.id === stageId);
    const ls = st && st.lessons.find((l) => l.id === lessonId);
    if (!ls) return null;
    ls.exercises = ls.exercises.filter((e) => e.id !== exerciseId);
    return { stageId, lessonId, exerciseId: null, cardId: null };
  }));

  const stage = curStage();
  const lesson = curLesson();
  const exercise = curExercise();
  const card = activeCard();

  return useMemo(() => ({
    curriculum, sel, expanded, dirty, saved, showKey, pendingDelete, compose, draft,
    stage, lesson, exercise, card, isComposing: !sel.cardId,
    setShowKey, selectStage, selectLesson, selectExercise, selectCard, newCard,
    save, edit, editCard, editExercisePayload,
    addLesson, addExercise, addComposedCard, deleteCard, moveCard,
    moveStage, moveLesson, moveExercise, deleteStage, deleteLesson, deleteExercise,
    requestDelete, makeCardIn,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [curriculum, sel, expanded, dirty, saved, showKey, pendingDelete, compose, draft, stage, lesson, exercise, card]);
}

export type CourseEditorApi = ReturnType<typeof useCourseEditor>;
