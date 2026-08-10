import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseEditor, type CourseEditorApi } from './courseEditorState';
import { CARD_COLUMNS, TYPE_META } from '../../domain/types';
import type {
  Card, CardType, Column, DragOrderPayload, Exercise, ExerciseType,
  GapFillPayload, Lesson, MatchPayload, McqPayload, Stage,
} from '../../domain/types';
import { cardGridColumn, emptyPayload, parseRich, plainText } from '../../domain/curriculum';
import { seededShuffle } from '../../domain/grading';
import { useAuth } from '../../hooks/useAuth';
import { applyMarkup, MARKUP_HINT, TOOLS, type ToolKey } from './richMarkup';
import './editor.css';

const CARD_TYPES: CardType[] = ['text', 'mcq', 'gap_fill', 'drag_order', 'match', 'free_text'];
const TYPE_COLOR: Record<CardType, string> = { mcq: '#6C4FF6', gap_fill: '#0FA593', drag_order: '#B37E00', match: '#FF4D5E', free_text: '#2FAE63', text: '#4A4560' };
const CARD_SHORT = (t: CardType) => (t === 'text' ? 'TEXT' : TYPE_META[t as ExerciseType].short);
const UNLOCK_LABEL: Record<string, string> = { always: 'Open to everyone', afterStage: 'After the previous course', minXp: 'At an XP threshold' };
const MOVE_ON = '#6B6580', MOVE_OFF = '#DED7F8';

const stageName = (s: Stage) => s.title.en || '(untitled course)';
const lessonNameOf = (l: Lesson) => l.title.en || '(untitled lesson)';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const csvIn = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

function delStyle(armed: boolean, takesWith?: string) {
  return {
    label: !armed ? 'Delete' : takesWith ? `Click again — also deletes ${takesWith}` : 'Click again to delete',
    background: armed ? '#FF4D5E' : 'white',
    color: armed ? 'white' : '#C2354A',
    borderColor: armed ? '#FF4D5E' : '#F2C9D0',
  };
}

function TreeMove({ onUp, onDown, upOk, downOk }: { onUp: (e: React.MouseEvent) => void; onDown: (e: React.MouseEvent) => void; upOk: boolean; downOk: boolean }) {
  return (
    <div className="moves">
      <button className="movebtn" onClick={onUp} style={{ color: upOk ? MOVE_ON : MOVE_OFF }}>↑</button>
      <button className="movebtn" onClick={onDown} style={{ color: downOk ? MOVE_ON : MOVE_OFF }}>↓</button>
    </div>
  );
}

function RichField({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const applyTool = (key: ToolKey) => {
    const el = ref.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const next = applyMarkup(key, value, start, end);
    onChange(next.text);
    requestAnimationFrame(() => {
      try { el?.focus(); el?.setSelectionRange(next.from, next.to); } catch { /* detached */ }
    });
  };
  return (
    <div>
      <label className="lbl">{label}</label>
      <div className="fmtbar">
        {TOOLS.map((t) => (
          <button key={t.key} type="button" className="fmtbtn" style={{ fontWeight: t.weight, fontStyle: t.fontStyle }} onClick={() => applyTool(t.key)}>{t.label}</button>
        ))}
      </div>
      <textarea ref={ref} className="fld" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <div className="hint">{MARKUP_HINT}</div>
    </div>
  );
}

export function CourseEditor() {
  const api = useCourseEditor();
  const { curriculum, sel, expanded, dirty, saved, pendingDelete, draft, stage, lesson, exercise, card } = api;
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const logout = () => { signOut(); navigate('/signin'); };

  const holder: Lesson | Exercise | null = exercise || lesson;
  const editingCard = !!sel.cardId;
  const type = card.type;
  const stageExCount = stage ? stage.lessons.reduce((n, l) => n + l.exercises.length, 0) : 0;
  const breadcrumb = [stage && stageName(stage), lesson && lessonNameOf(lesson)].filter(Boolean).join(' › ') || '—';
  const dirtyLabel = dirty === 0 ? (saved ? 'Draft saved' : 'No changes') : `${dirty} unsaved change${dirty === 1 ? '' : 's'}`;
  const dirtyColor = dirty === 0 ? (saved ? '#3E8E5B' : '#6B6580') : '#B37E00';

  const stDel = delStyle(pendingDelete === 'course', stage && stage.lessons.length ? plural(stage.lessons.length, 'lesson') : undefined);
  const lsDel = delStyle(pendingDelete === 'lesson', lesson && lesson.exercises.length ? plural(lesson.exercises.length, 'exercise') : undefined);
  const exDel = delStyle(pendingDelete === 'exercise', exercise && exercise.cards.length ? plural(exercise.cards.length, 'card') : undefined);
  const cardDel = delStyle(pendingDelete === `card:${sel.cardId}`);

  const addCourse = () => { window.location.href = '/admin/editor?new=course'; };

  return (
    <div className="ed-shell">
      {/* ================= TOP BAR ================= */}
      <div style={{ background: 'white', borderBottom: '1px solid #E3DEF5', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/admin" onClick={(e) => { e.preventDefault(); navigate('/admin'); }} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#ECE8FB', borderRadius: 999, padding: '7px 15px', fontSize: 13, fontWeight: 700 }}>← Dashboard</a>
          <div style={{ width: 1, height: 22, background: '#E3DEF5' }} />
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 16 }}>Content Editor</span>
          <span style={{ fontSize: 13, color: '#B5AFD4' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#6B6580' }}>{breadcrumb}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: dirtyColor }}>{dirtyLabel}</span>
          <button className="savebtn" onClick={api.save}>Save draft</button>
          <button onClick={logout} style={{ background: 'none', border: '1px solid #E3DEF5', borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#4A4560', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* ================= PANE 1 — CURRICULUM TREE ================= */}
        <div style={{ width: 288, flexShrink: 0, background: 'white', borderRight: '1px solid #E3DEF5', overflowY: 'auto', padding: '16px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6580', letterSpacing: '0.06em', padding: '0 8px 12px' }}>CURRICULUM</div>

          {curriculum.stages.map((st, si) => {
            const stSelected = sel.stageId === st.id && !sel.lessonId;
            return (
              <div key={st.id}>
                <div className="treerow" role="button" tabIndex={0} onClick={() => api.selectStage(st.id)} style={{ padding: '9px 8px', background: stSelected ? '#ECE8FB' : 'transparent' }}>
                  <span style={{ fontSize: 10, color: '#B5AFD4', width: 10 }}>{expanded[st.id] ? '▾' : '▸'}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.theme.to, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: stSelected ? '#6C4FF6' : '#1E1B2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{stageName(st)}</span>
                  <TreeMove
                    upOk={si > 0} downOk={si < curriculum.stages.length - 1}
                    onUp={(e) => { e.stopPropagation(); api.moveStage(st.id, -1); }}
                    onDown={(e) => { e.stopPropagation(); api.moveStage(st.id, 1); }}
                  />
                </div>

                {expanded[st.id] && (
                  <>
                    {st.lessons.map((ls, li) => {
                      const lsSelected = sel.lessonId === ls.id && !sel.exerciseId;
                      return (
                        <div key={ls.id}>
                          <div className="treerow" role="button" tabIndex={0} onClick={() => api.selectLesson(st.id, ls.id)} style={{ padding: '7px 8px 7px 30px', background: lsSelected ? '#ECE8FB' : 'transparent' }}>
                            <span style={{ fontSize: 10 }}>◻</span>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: lsSelected ? '#6C4FF6' : '#4A4560', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{lessonNameOf(ls)}</span>
                            <TreeMove
                              upOk={li > 0} downOk={li < st.lessons.length - 1}
                              onUp={(e) => { e.stopPropagation(); api.moveLesson(st.id, ls.id, -1); }}
                              onDown={(e) => { e.stopPropagation(); api.moveLesson(st.id, ls.id, 1); }}
                            />
                          </div>
                          {ls.exercises.map((x, xi) => {
                            const xSelected = sel.exerciseId === x.id;
                            return (
                              <div key={x.id} className="treerow" role="button" tabIndex={0} onClick={() => api.selectExercise(st.id, ls.id, x.id)} style={{ padding: '6px 8px 6px 52px', background: xSelected ? '#ECE8FB' : 'transparent' }}>
                                <span className="cardbadge" style={{ background: TYPE_COLOR[x.type] }}>{TYPE_META[x.type].short}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: xSelected ? '#6C4FF6' : '#6B6580', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{plainText(x.prompt.en) || '(untitled)'}</span>
                                <TreeMove
                                  upOk={xi > 0} downOk={xi < ls.exercises.length - 1}
                                  onUp={(e) => { e.stopPropagation(); api.moveExercise(st.id, ls.id, x.id, -1); }}
                                  onDown={(e) => { e.stopPropagation(); api.moveExercise(st.id, ls.id, x.id, 1); }}
                                />
                              </div>
                            );
                          })}
                          <button className="treeadd" onClick={() => api.addExercise(st.id, ls.id)} style={{ padding: '6px 8px 6px 52px' }}>+ Add exercise</button>
                        </div>
                      );
                    })}
                    <button className="treeadd" onClick={() => api.addLesson(st.id)} style={{ padding: '7px 8px 7px 30px' }}>+ Add lesson</button>
                  </>
                )}
              </div>
            );
          })}

          <button className="addbtn" style={{ marginTop: 10, width: '100%' }} onClick={addCourse}>+ Add course</button>
        </div>

        {/* ================= PANE 2 — INSPECTOR ================= */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 28px' }}>
          {stage && !lesson && (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6580', letterSpacing: '0.06em' }}>EDITING COURSE</div>
                  <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22, margin: '6px 0 0' }}>{stageName(stage)}</h2>
                </div>
                <button className="delbtn" onClick={api.deleteStage} style={{ background: stDel.background, color: stDel.color, borderColor: stDel.borderColor }}>{stDel.label}</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
                <div>
                  <label className="lbl">Course title — English</label>
                  <input className="fld" value={stage.title.en} onChange={(e) => { const v = e.target.value; api.edit((c) => { const st = c.stages.find((s) => s.id === sel.stageId); if (st) st.title.en = v; }); }} placeholder="e.g. Prepositions" />
                </div>
                <div>
                  <label className="lbl">Course title — Sinhala</label>
                  <input className="fld si" value={stage.title.si} onChange={(e) => { const v = e.target.value; api.edit((c) => { const st = c.stages.find((s) => s.id === sel.stageId); if (st) st.title.si = v; }); }} />
                </div>
                <div>
                  <label className="lbl">{draft && draft.kind === 'course' ? 'Course ID — generated from the title when you save' : 'Course ID — referenced by progress records, not editable'}</label>
                  <input className="fld" readOnly value={draft && draft.kind === 'course' ? '' : stage.id} style={{ background: '#F7F5FF', color: '#9B94BE' }} />
                </div>
                <div style={{ background: '#ECE8FB', borderRadius: 12, padding: '14px 16px', fontSize: 12.5, color: '#4A4560' }}>
                  Holds <b>{stage.lessons.length}</b> lessons and <b>{stageExCount}</b> exercises. Unlock rule: <b>{UNLOCK_LABEL[stage.unlock.kind] || stage.unlock.kind}</b>.
                </div>
                <button className="addbtn" onClick={() => api.addLesson(stage.id)}>+ Add lesson</button>
              </div>
            </>
          )}

          {lesson && !exercise && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6580', letterSpacing: '0.06em' }}>EDITING LESSON</div>
                  <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22, margin: '6px 0 0' }}>{lessonNameOf(lesson)}</h2>
                </div>
                <button className="delbtn" onClick={api.deleteLesson} style={{ background: lsDel.background, color: lsDel.color, borderColor: lsDel.borderColor }}>{lsDel.label}</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 620 }}>
                <div>
                  <label className="lbl">Lesson title — English</label>
                  <input className="fld" value={lesson.title.en} onChange={(e) => { const v = e.target.value; api.edit((c) => { const ls = c.stages.find((s) => s.id === sel.stageId)?.lessons.find((l) => l.id === sel.lessonId); if (ls) ls.title.en = v; }); }} placeholder="e.g. Word order" />
                </div>
                <div>
                  <label className="lbl">Lesson title — Sinhala</label>
                  <input className="fld si" value={lesson.title.si} onChange={(e) => { const v = e.target.value; api.edit((c) => { const ls = c.stages.find((s) => s.id === sel.stageId)?.lessons.find((l) => l.id === sel.lessonId); if (ls) ls.title.si = v; }); }} />
                </div>
                <div style={{ background: '#ECE8FB', borderRadius: 12, padding: '14px 16px', fontSize: 12.5, color: '#4A4560' }}>
                  The cards below are what a learner reads when the lesson opens. It then runs its <b>{lesson.exercises.length}</b> exercises.
                </div>
                <button className="addbtn" onClick={() => stage && api.addExercise(stage.id, lesson.id)}>+ Add exercise</button>
              </div>
            </div>
          )}

          {!stage && (
            <div style={{ maxWidth: 460, marginTop: 60, textAlign: 'center', color: '#6B6580' }}>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 20, color: '#1E1B2E', marginBottom: 8 }}>No courses left</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>The curriculum is empty. Save this draft to keep it that way, or add a new course from the tree.</div>
            </div>
          )}

          {exercise && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6580', letterSpacing: '0.06em' }}>EDITING EXERCISE</div>
                  <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22, margin: '6px 0 0' }}>{plainText(exercise.prompt.en) || '(untitled exercise)'}</h2>
                </div>
                <button className="delbtn" onClick={api.deleteExercise} style={{ background: exDel.background, color: exDel.color, borderColor: exDel.borderColor }}>{exDel.label}</button>
              </div>
              <div style={{ background: '#ECE8FB', borderRadius: 12, padding: '14px 16px', fontSize: 12.5, color: '#4A4560', maxWidth: 620 }}>
                This exercise is made of <b>{exercise.cards.length}</b> cards. They lay out in two columns on the right.
              </div>
            </div>
          )}

          {/* ================= CARD COMPOSER ================= */}
          {holder && (
            <>
              <div style={{ height: 1, background: '#E3DEF5', margin: '26px 0 20px', maxWidth: 620 }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <h3 style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17, margin: 0 }}>{editingCard ? 'Edit card' : 'Add a card'}</h3>
                <span style={{ fontSize: 11.5, color: '#9B94BE' }}>{editingCard ? 'Changes apply to this card straight away.' : 'Fill this in, choose a column, then add it to the preview.'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 620, marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label className="lbl">Card type</label>
                    <select className="fld" style={{ cursor: 'pointer' }} value={type} onChange={(e) => onTypeChange(api, e.target.value as CardType)}>
                      {CARD_TYPES.map((t) => <option key={t} value={t}>{t === 'text' ? 'Text' : TYPE_META[t as ExerciseType].label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label className="lbl">Column in the preview</label>
                    <div className="colsel">
                      {CARD_COLUMNS.map((col) => {
                        const active = card.column === col.key;
                        return (
                          <button key={col.key} className="colbtn" onClick={() => api.editCard((c) => { c.column = col.key as Column; })} style={{ background: active ? '#6C4FF6' : 'white', color: active ? 'white' : '#4A4560', borderColor: active ? '#6C4FF6' : '#E3DEF5' }}>{col.label}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {card.type === 'text' ? (
                  <RichField label="Text shown to the learner" rows={7} placeholder="Explain the rule in plain language, then show what it looks like." value={card.body.en} onChange={(v) => api.editCard((c) => { if (c.type === 'text') c.body.en = v; })} />
                ) : (
                  <>
                    <RichField label="Prompt — English" rows={3} placeholder="What the learner is asked to do" value={card.prompt.en} onChange={(v) => api.editCard((c) => { if (c.type !== 'text') c.prompt.en = v; })} />
                    <div>
                      <label className="lbl">Prompt — Sinhala</label>
                      <input className="fld si" value={card.prompt.si} onChange={(e) => { const v = e.target.value; api.editCard((c) => { if (c.type !== 'text') c.prompt.si = v; }); }} />
                    </div>

                    <PayloadEditor api={api} card={card} />

                    <div style={{ height: 1, background: '#E3DEF5' }} />
                    <div>
                      <label className="lbl">Feedback when correct</label>
                      <input className="fld" value={card.feedback.correct.en} onChange={(e) => { const v = e.target.value; api.editCard((c) => { if (c.type !== 'text') c.feedback.correct.en = v; }); }} placeholder="Correct! Subject → Verb → Object." />
                    </div>
                    <div>
                      <label className="lbl">Feedback when wrong</label>
                      <input className="fld" value={card.feedback.incorrect.en} onChange={(e) => { const v = e.target.value; api.editCard((c) => { if (c.type !== 'text') c.feedback.incorrect.en = v; }); }} placeholder="Not quite — try again." />
                    </div>
                  </>
                )}

                {!editingCard ? (
                  <button className="savebtn" onClick={api.addComposedCard} style={{ alignSelf: 'flex-start', marginTop: 4 }}>+ Add as card</button>
                ) : (
                  <div className="ed-row" style={{ gap: 10, marginTop: 4 }}>
                    <button className="savebtn" onClick={api.newCard}>+ New card</button>
                    <button className="delbtn" onClick={() => sel.cardId && api.deleteCard(sel.cardId)} style={{ background: cardDel.background, color: cardDel.color, borderColor: cardDel.borderColor }}>{cardDel.label}</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ================= PANE 3 — LEARNER PREVIEW ================= */}
        <PreviewPane api={api} holder={holder} stage={stage} lesson={lesson} exercise={exercise} />
      </div>
    </div>
  );
}

function onTypeChange(api: CourseEditorApi, t: CardType) {
  api.editCard((c) => {
    if (c.type === t) return;
    const raw = c as unknown as Record<string, unknown>;
    if (t === 'text') {
      if (!raw.body) raw.body = { en: (raw.prompt as { en: string } | undefined)?.en || '', si: '' };
      raw.type = 'text';
      delete raw.prompt; delete raw.payload; delete raw.feedback;
    } else {
      if (!raw.prompt) raw.prompt = { en: (raw.body as { en: string } | undefined)?.en || '', si: '' };
      if (!raw.feedback) raw.feedback = { correct: { en: '', si: '' }, incorrect: { en: '', si: '' } };
      raw.type = t;
      raw.payload = emptyPayload[t]();
      delete raw.body;
    }
  });
}

function PayloadEditor({ api, card }: { api: CourseEditorApi; card: Card }) {
  if (card.type === 'mcq') {
    const p = card.payload as McqPayload;
    return (
      <div>
        <label className="lbl">Options — click the circle to mark the correct answer</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.options.map((o, i) => {
            const correct = p.correctIndex === i;
            return (
              <div key={i} className="ed-row">
                <div onClick={() => api.editExercisePayload((pl) => { (pl as McqPayload).correctIndex = i; })} style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${correct ? '#3ECF6E' : '#D8D3EE'}`, background: correct ? '#3ECF6E' : 'white', cursor: 'pointer', flexShrink: 0 }} />
                <input className="fld" style={{ flex: 1 }} value={o.en} onChange={(e) => { const v = e.target.value; api.editExercisePayload((pl) => { (pl as McqPayload).options[i].en = v; }); }} placeholder="Option (English)" />
                <input className="fld si" style={{ flex: 1 }} value={o.si} onChange={(e) => { const v = e.target.value; api.editExercisePayload((pl) => { (pl as McqPayload).options[i].si = v; }); }} placeholder="Sinhala" />
                <button className="iconbtn" onClick={() => api.editExercisePayload((pl) => { const mp = pl as McqPayload; if (mp.options.length > 2) { mp.options.splice(i, 1); if (mp.correctIndex >= mp.options.length) mp.correctIndex = Math.max(0, mp.options.length - 1); } })}>✕</button>
              </div>
            );
          })}
          <button className="addbtn" onClick={() => api.editExercisePayload((pl) => { (pl as McqPayload).options.push({ en: '', si: '' }); })}>+ Add option</button>
        </div>
      </div>
    );
  }

  if (card.type === 'gap_fill') {
    const p = card.payload as GapFillPayload;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="lbl">Sentence — type ___ (three underscores) where the blank goes</label>
          <input className="fld" value={p.template.en} onChange={(e) => { const v = e.target.value; api.editExercisePayload((pl) => { (pl as GapFillPayload).template.en = v; }); }} placeholder="We ___ English every day." />
        </div>
        <div>
          <label className="lbl">Accepted answers — comma separated</label>
          <input className="fld" defaultValue={p.accept.join(', ')} onBlur={(e) => { const v = csvIn(e.target.value); api.editExercisePayload((pl) => { (pl as GapFillPayload).accept = v; }); }} placeholder="watch, watches" />
        </div>
        <div>
          <label className="lbl">Choice chips shown to the learner — comma separated, leave blank for free typing</label>
          <input className="fld" defaultValue={p.choices.join(', ')} onBlur={(e) => { const v = csvIn(e.target.value); api.editExercisePayload((pl) => { (pl as GapFillPayload).choices = v; }); }} placeholder="watch, watches, watching" />
        </div>
      </div>
    );
  }

  if (card.type === 'drag_order') {
    const p = card.payload as DragOrderPayload;
    return (
      <div>
        <label className="lbl">Tokens in their correct order — the learner sees them shuffled</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.tokens.map((t, i) => (
            <div key={i} className="ed-row">
              <div style={{ width: 22, fontSize: 12, fontWeight: 700, color: '#B5AFD4', textAlign: 'center', flexShrink: 0 }}>{i + 1}</div>
              <input className="fld" style={{ flex: 1 }} value={t.en} onChange={(e) => { const v = e.target.value; api.editExercisePayload((pl) => { (pl as DragOrderPayload).tokens[i].en = v; }); }} placeholder="Word or phrase" />
              <button className="iconbtn" onClick={() => api.editExercisePayload((pl) => { const dp = pl as DragOrderPayload; const j = i - 1; if (j >= 0) [dp.tokens[i], dp.tokens[j]] = [dp.tokens[j], dp.tokens[i]]; })}>↑</button>
              <button className="iconbtn" onClick={() => api.editExercisePayload((pl) => { const dp = pl as DragOrderPayload; const j = i + 1; if (j < dp.tokens.length) [dp.tokens[i], dp.tokens[j]] = [dp.tokens[j], dp.tokens[i]]; })}>↓</button>
              <button className="iconbtn" onClick={() => api.editExercisePayload((pl) => { const dp = pl as DragOrderPayload; if (dp.tokens.length > 2) dp.tokens.splice(i, 1); })}>✕</button>
            </div>
          ))}
          <button className="addbtn" onClick={() => api.editExercisePayload((pl) => { (pl as DragOrderPayload).tokens.push({ en: '', si: '' }); })}>+ Add token</button>
        </div>
      </div>
    );
  }

  if (card.type === 'match') {
    const p = card.payload as MatchPayload;
    return (
      <div>
        <label className="lbl">Pairs — the learner drags the right column onto the left</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.pairs.map((pr, i) => (
            <div key={i} className="ed-row">
              <input className="fld si" style={{ flex: 1 }} value={pr.left} onChange={(e) => { const v = e.target.value; api.editExercisePayload((pl) => { (pl as MatchPayload).pairs[i].left = v; }); }} placeholder="Left (e.g. Sinhala)" />
              <span style={{ color: '#B5AFD4', fontSize: 14, flexShrink: 0 }}>↔</span>
              <input className="fld" style={{ flex: 1 }} value={pr.right} onChange={(e) => { const v = e.target.value; api.editExercisePayload((pl) => { (pl as MatchPayload).pairs[i].right = v; }); }} placeholder="Right (e.g. English)" />
              <button className="iconbtn" onClick={() => api.editExercisePayload((pl) => { const mp = pl as MatchPayload; if (mp.pairs.length > 2) mp.pairs.splice(i, 1); })}>✕</button>
            </div>
          ))}
          <button className="addbtn" onClick={() => api.editExercisePayload((pl) => { (pl as MatchPayload).pairs.push({ left: '', right: '' }); })}>+ Add pair</button>
        </div>
      </div>
    );
  }

  if (card.type !== 'free_text') return null;
  const p = card.payload as { accept: string[]; normalize: { lowercase: boolean; stripPunctuation: boolean } };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="lbl">Accepted answers — one per line</label>
        <textarea className="fld" rows={4} defaultValue={p.accept.join('\n')} onBlur={(e) => { const v = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); api.editExercisePayload((pl) => { (pl as { accept: string[] }).accept = v; }); }} placeholder="I go to school" />
      </div>
      <div className="ed-row" style={{ gap: 20 }}>
        <div className="ed-row" onClick={() => api.editExercisePayload((pl) => { (pl as { normalize: { lowercase: boolean } }).normalize.lowercase = !p.normalize.lowercase; })} style={{ cursor: 'pointer' }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${p.normalize.lowercase ? '#6C4FF6' : '#D8D3EE'}`, background: p.normalize.lowercase ? '#6C4FF6' : 'white' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Ignore capitalisation</span>
        </div>
        <div className="ed-row" onClick={() => api.editExercisePayload((pl) => { (pl as { normalize: { stripPunctuation: boolean } }).normalize.stripPunctuation = !p.normalize.stripPunctuation; })} style={{ cursor: 'pointer' }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${p.normalize.stripPunctuation ? '#6C4FF6' : '#D8D3EE'}`, background: p.normalize.stripPunctuation ? '#6C4FF6' : 'white' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Ignore punctuation</span>
        </div>
      </div>
    </div>
  );
}

function PreviewPane({ api, holder, stage, lesson, exercise }: {
  api: CourseEditorApi; holder: Lesson | Exercise | null; stage: Stage | null; lesson: Lesson | null; exercise: Exercise | null;
}) {
  const { sel, showKey, pendingDelete } = api;
  const holderCards: Card[] = holder ? holder.cards || [] : [];
  const previewExercises = lesson ? lesson.exercises : [];
  const previewCta = exercise ? 'Check' : previewExercises.length ? 'Go to exercise' : 'Nothing to practise yet';
  const showLessonHead = !!lesson && !exercise;
  const previewIdle = !lesson;

  return (
    <div style={{ width: 520, flexShrink: 0, background: 'white', borderLeft: '1px solid #E3DEF5', overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6580', letterSpacing: '0.06em' }}>LEARNER PREVIEW</span>
        <div className="ed-row" onClick={() => api.setShowKey((v) => !v)} style={{ cursor: 'pointer' }}>
          <div style={{ width: 30, height: 18, borderRadius: 999, background: showKey ? '#6C4FF6' : '#D8D3EE', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 2, left: showKey ? 14 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.15s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6580' }}>Answer key</span>
        </div>
      </div>

      {holder ? (
        <div style={{ background: '#F7F5FF', borderRadius: 18, padding: 18, minHeight: 340 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6C4FF6', letterSpacing: '0.05em', marginBottom: 12 }}>{stage ? `COURSE ${stage.order} · ${stageName(stage).toUpperCase()}` : ''}</div>

          {showLessonHead && lesson && (
            <>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 19, lineHeight: 1.3 }}>{lessonNameOf(lesson)}</div>
              {!!lesson.title.si && <div className="si" style={{ fontSize: 14, fontWeight: 600, color: '#6B6580', marginTop: 3, marginBottom: 14 }}>{lesson.title.si}</div>}
            </>
          )}

          <div className="pvgrid">
            {holderCards.map((cd, ci) => (
              <PreviewCard
                key={cd.id} card={cd} index={ci} total={holderCards.length}
                isSelected={sel.cardId === cd.id} showKey={showKey}
                pendingDelete={pendingDelete}
                onSelect={() => api.selectCard(cd.id)}
                onPrev={(e) => { e.stopPropagation(); api.moveCard(cd.id, -1); }}
                onNext={(e) => { e.stopPropagation(); api.moveCard(cd.id, 1); }}
                onDelete={(e) => { e.stopPropagation(); api.deleteCard(cd.id); }}
              />
            ))}
          </div>

          {holderCards.length === 0 && (
            <div style={{ border: '2px dashed #D8D3EE', borderRadius: 14, padding: '28px 18px', textAlign: 'center', color: '#9B94BE', fontSize: 12.5, fontWeight: 600, lineHeight: 1.6 }}>
              {exercise ? 'This exercise has no cards yet. Build one on the left and add it.' : 'This lesson has no cards yet. Build one on the left and add it.'}
            </div>
          )}

          {showLessonHead && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6580', letterSpacing: '0.05em', margin: '18px 0 10px' }}>
                {previewExercises.length ? `THEN ${plural(previewExercises.length, 'EXERCISE').toUpperCase()}` : 'NO EXERCISES YET'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {previewExercises.map((x, i) => (
                  <div key={x.id} onClick={() => stage && lesson && api.selectExercise(stage.id, lesson.id, x.id)} style={{ background: 'white', border: '1.5px solid #E3DEF5', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#B5AFD4', flexShrink: 0 }}>{i + 1}</span>
                    <span className="cardbadge" style={{ background: TYPE_COLOR[x.type] }}>{TYPE_META[x.type].short}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: x.prompt.en ? '#1E1B2E' : '#B5AFD4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plainText(x.prompt.en) || '(no cards yet)'}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 18, background: '#6C4FF6', color: 'white', borderRadius: 999, padding: 12, textAlign: 'center', fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 15, boxShadow: '0 4px 0 #4B3AC7' }}>{previewCta}</div>
        </div>
      ) : previewIdle ? (
        <div style={{ background: '#F7F5FF', borderRadius: 18, padding: '28px 20px', textAlign: 'center', color: '#9B94BE', fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>Select a lesson or an exercise in the tree to preview it as a learner sees it.</div>
      ) : null}
    </div>
  );
}

function PreviewCard({ card, index, total, isSelected, showKey, pendingDelete, onSelect, onPrev, onNext, onDelete }: {
  card: Card; index: number; total: number; isSelected: boolean; showKey: boolean; pendingDelete: string | null;
  onSelect: () => void; onPrev: (e: React.MouseEvent) => void; onNext: (e: React.MouseEvent) => void; onDelete: (e: React.MouseEvent) => void;
}) {
  const isText = card.type === 'text';
  const src = isText ? card.body.en : card.prompt.en;
  const blocks = src ? parseRich(src) : [];
  const armed = pendingDelete === `card:${card.id}`;
  const columnLabel = card.column === 'full' ? 'Full width' : card.column === 'right' ? 'Right' : 'Left';

  return (
    <div style={{ gridColumn: cardGridColumn(card), minWidth: 0 }}>
      <div onClick={onSelect} style={{ background: isSelected ? '#F7F5FF' : 'white', border: `2px solid ${isSelected ? '#6C4FF6' : '#E3DEF5'}`, borderRadius: 14, padding: 13, cursor: 'pointer' }}>
        <div className="pvhead">
          <span className="cardbadge" style={{ background: TYPE_COLOR[card.type] }}>{CARD_SHORT(card.type)}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#B5AFD4' }}>{columnLabel}</span>
          <div className="moves">
            <button className="movebtn" onClick={onPrev} style={{ color: index > 0 ? MOVE_ON : MOVE_OFF }}>←</button>
            <button className="movebtn" onClick={onNext} style={{ color: index < total - 1 ? MOVE_ON : MOVE_OFF }}>→</button>
            <button className="movebtn delcard" onClick={onDelete} title={armed ? 'Click again to delete this card' : 'Delete this card'} style={{ color: armed ? 'white' : '#C2354A', background: armed ? '#FF4D5E' : 'transparent' }}>✕</button>
          </div>
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          {blocks.map((b, i) =>
            b.isImage ? (
              <img key={i} src={b.src} alt={b.alt} style={{ display: 'block', maxWidth: '100%', borderRadius: 10, margin: '0 0 8px' }} />
            ) : (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                {b.hasMarker && <span style={{ lineHeight: 1.5, color: '#6C4FF6', fontWeight: 700, flexShrink: 0 }}>{b.marker}</span>}
                <div style={{ lineHeight: 1.5, minWidth: 0 }}>
                  {b.runs.map((r, j) => r.isLink
                    ? <a key={j} href={r.href} target="_blank" rel="noopener" style={{ fontWeight: r.weight, fontStyle: r.italic, textDecoration: 'underline' }}>{r.text}</a>
                    : <span key={j} style={{ fontWeight: r.weight, fontStyle: r.italic }}>{r.text}</span>)}
                </div>
              </div>
            )
          )}
          {!src && <span style={{ color: '#B5AFD4', fontWeight: 700 }}>{isText ? '(empty text card)' : '(no prompt yet)'}</span>}
        </div>

        {card.type === 'mcq' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
            {(card.payload as McqPayload).options.map((o, i) => {
              const correct = showKey && (card.payload as McqPayload).correctIndex === i;
              return <div key={i} style={{ background: correct ? '#E3F9EB' : 'white', border: `2px solid ${correct ? '#3ECF6E' : '#D8D3EE'}`, borderRadius: 11, padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{o.en || '(empty option)'}</div>;
            })}
          </div>
        )}

        {card.type === 'gap_fill' && (() => {
          const p = card.payload as GapFillPayload;
          const t = p.template.en || '';
          const at = t.indexOf('___');
          const before = at >= 0 ? t.slice(0, at) : t;
          const after = at >= 0 ? t.slice(at + 3) : '';
          const shown = showKey ? (p.accept[0] || '') : '';
          return (
            <>
              <div style={{ background: 'white', borderRadius: 11, padding: 12, fontSize: 14, lineHeight: 1.9, marginTop: 10 }}>
                {before}<span style={{ display: 'inline-block', minWidth: 62, borderBottom: `2.5px solid ${showKey ? '#3ECF6E' : '#B5AFD4'}`, textAlign: 'center', color: '#6C4FF6', fontWeight: 700 }}>{shown}</span>{after}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                {p.choices.map((c, i) => <div key={i} style={{ background: 'white', border: `2px solid ${showKey && p.accept.includes(c) ? '#3ECF6E' : '#D8D3EE'}`, borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 600 }}>{c}</div>)}
              </div>
            </>
          );
        })()}

        {card.type === 'drag_order' && (() => {
          const p = card.payload as DragOrderPayload;
          const shuffled = seededShuffle(p.tokens.map((x) => ({ text: x.en || '…' })), p.tokens.length * 17 + 3);
          return (
            <>
              <div style={{ border: '2px dashed #D8D3EE', borderRadius: 11, minHeight: 44, margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, color: '#B5AFD4', fontWeight: 600 }}>Drop the words here in order</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {shuffled.map((tok, i) => <div key={i} style={{ background: 'white', border: '2px solid #D8D3EE', borderRadius: 10, padding: '7px 11px', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 0 #E3DEF5' }}>{tok.text}</div>)}
              </div>
              {showKey && <div style={{ marginTop: 10, fontSize: 11.5, color: '#3E8E5B', fontWeight: 700 }}>Answer: {p.tokens.map((x) => x.en).join(' ')}</div>}
            </>
          );
        })()}

        {card.type === 'match' && (() => {
          const p = card.payload as MatchPayload;
          const rights = seededShuffle(p.pairs.map((x) => ({ text: x.right || '…' })), p.pairs.length * 23 + 5);
          return (
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.pairs.map((pr, i) => <div key={i} className="si" style={{ background: 'white', border: '2px solid #D8D3EE', borderRadius: 10, padding: '8px 10px', fontSize: 12.5, fontWeight: 600 }}>{pr.left || '…'}</div>)}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rights.map((r, i) => <div key={i} style={{ background: '#ECE8FB', border: '2px solid #D8D3EE', borderRadius: 10, padding: '8px 10px', fontSize: 12.5, fontWeight: 600 }}>{r.text}</div>)}
              </div>
            </div>
          );
        })()}

        {card.type === 'free_text' && (() => {
          const p = card.payload as { accept: string[] };
          return (
            <>
              <div style={{ background: 'white', border: '2px solid #D8D3EE', borderRadius: 11, padding: 12, minHeight: 70, fontSize: 13, color: '#B5AFD4', marginTop: 10 }}>Type your answer…</div>
              {showKey && <div style={{ marginTop: 9, fontSize: 11.5, color: '#3E8E5B', fontWeight: 700, lineHeight: 1.6 }}>Accepts: {p.accept.join(' · ')}</div>}
            </>
          );
        })()}
      </div>
    </div>
  );
}

