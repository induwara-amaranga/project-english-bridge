import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { markLessonComplete } from '../../domain/progress';
import { RichText } from '../../components/RichText';
import { LangToggle } from '../../components/Primitives';
import { LinkButton } from '../../components/Button';
import { gradeCard, isAnswered, seededShuffle, type Answer, type DragOrderAnswer, type MatchAnswer, type MultiSelectAnswer, type RubricAnswer } from '../../domain/grading';
import type { Card, DragOrderPayload, EssayPayload, GapFillPayload, MatchPayload, McqPayload, MultiSelectPayload, RubricPayload } from '../../domain/types';
import { CheckboxRow } from '../../components/Primitives';

const COL_CLASS: Record<string, string> = { left: 'cardcell col-left', right: 'cardcell col-right', full: 'cardcell col-full' };
type InteractiveCard = Extract<Card, { type: 'mcq' | 'gap_fill' | 'drag_order' | 'match' | 'free_text' | 'multi_select' | 'essay' | 'rubric' }>;
const isInteractive = (c: Card): c is InteractiveCard => c.type !== 'text';

function defaultAnswer(card: Card): Answer {
  if (card.type === 'drag_order') return [];
  if (card.type === 'match') return { pending: null, pairs: {} };
  if (card.type === 'mcq') return null;
  if (card.type === 'multi_select') return [];
  if (card.type === 'rubric') return {};
  return '';
}

export function ExercisePage() {
  const { stageId, lessonId } = useParams();
  const { curriculum } = useCurriculum();
  const { progress, update } = useProgress();

  const stage = curriculum.stages.find((s) => s.id === stageId);
  const lesson = stage?.lessons.find((l) => l.id === lessonId);
  const stageIndex = stage ? curriculum.stages.indexOf(stage) + 1 : 1;
  const exercises = useMemo(() => lesson?.exercises || [], [lesson]);
  const backHref = `/learn/${stageId}`;

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [complete, setComplete] = useState(false);
  const [lang, setLang] = useState<'en' | 'si'>('en');

  if (!stage || !lesson || exercises.length === 0) {
    return (
      <div className="app-shell" style={{ background: 'var(--c-bg)' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <div className="card" style={{ color: 'var(--c-ink-faint)', fontSize: 15, fontWeight: 600, lineHeight: 1.7 }}>
            This lesson has no exercises yet.
            <div style={{ marginTop: 14 }}><Link to={backHref}>Back to lessons</Link></div>
          </div>
        </div>
      </div>
    );
  }

  const ex = exercises[qIndex];
  const interactiveCards = (ex.cards || []).filter(isInteractive);
  const answerFor = (card: Card): Answer => (card.id in answers ? answers[card.id] : defaultAnswer(card));
  const setAnswer = (cardId: string, value: Answer) => {
    if (checked) return;
    setAnswers((a) => ({ ...a, [cardId]: value }));
  };

  const answered = interactiveCards.length === 0 || interactiveCards.every((c) => isAnswered(c, answerFor(c)));
  const allRight = checked && interactiveCards.every((c) => gradeCard(c, answerFor(c)));

  const check = () => {
    if (checked || !answered) return;
    const right = interactiveCards.every((c) => gradeCard(c, answerFor(c)));
    setChecked(true);
    setCorrectCount((n) => n + (right ? 1 : 0));
  };

  const next = () => {
    const nextIndex = qIndex + 1;
    if (nextIndex >= exercises.length) {
      update(markLessonComplete(progress, stage.id, lesson.id));
      setComplete(true);
      return;
    }
    setQIndex(nextIndex);
    setAnswers({});
    setChecked(false);
  };

  const primary = interactiveCards[0] || null;
  const fb = primary?.feedback;
  const progressPct = Math.round(((qIndex + (checked ? 1 : 0)) / exercises.length) * 100);

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      <div style={{ background: 'var(--c-primary)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to={backHref} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>STAGE {stageIndex} · EXERCISE</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>Question {qIndex + 1} of {exercises.length}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
            <Link to={backHref} style={{ background: 'rgba(255,255,255,0.18)', color: 'white', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>Go to lessons</Link>
          </div>
        </div>
        <div style={{ maxWidth: 940, margin: '14px auto 0', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, background: '#FFD976', width: `${progressPct}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {!complete && (
          <>
            <div className="cardgrid">
              {(ex.cards || []).map((card) => (
                <ExerciseCardView key={card.id} card={card} answer={answerFor(card)} setAnswer={(v) => setAnswer(card.id, v)} checked={checked} lang={lang} />
              ))}
            </div>

            {checked && (
              <div style={{ background: allRight ? 'var(--c-success-bg)' : 'var(--c-danger-bg)', border: `1px solid ${allRight ? 'var(--c-success)' : 'var(--c-danger)'}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p className={lang === 'si' ? 'si' : undefined} style={{ margin: 0, fontSize: 15, lineHeight: 1.6, fontWeight: 700, color: allRight ? 'var(--c-success-ink)' : 'var(--c-danger-ink)' }}>
                  {!fb
                    ? (allRight ? 'Correct.' : 'Not quite.')
                    : allRight
                      ? (lang === 'si' ? fb.correct.si || fb.correct.en : fb.correct.en) || 'Correct.'
                      : (lang === 'si' ? fb.incorrect.si || fb.incorrect.en : fb.incorrect.en) || 'Not quite — have another look.'}
                </p>
                <button onClick={next} style={{ alignSelf: 'flex-end', background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: 'pointer' }}>
                  {qIndex + 1 >= exercises.length ? 'Finish' : 'Next question'}
                </button>
              </div>
            )}

            {!checked && (
              <button onClick={check} disabled={!answered} style={{
                alignSelf: 'center', background: answered ? 'var(--c-primary)' : 'var(--c-disabled)', color: 'white', border: 'none', borderRadius: 14,
                padding: '15px 44px', fontWeight: 800, fontSize: 17, fontFamily: 'var(--font-display)', cursor: answered ? 'pointer' : 'not-allowed',
                boxShadow: `0 6px 0 ${answered ? 'var(--c-primary-hover)' : 'var(--c-disabled-shadow)'}`,
              }}>Check</button>
            )}
          </>
        )}

        {complete && (
          <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF3D6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="30" height="30" viewBox="0 0 22 22" fill="none"><path d="M5 11.5L9.5 16L17 6" stroke="#FFB800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, margin: 0 }}>Exercise complete!</h2>
            <div style={{ fontSize: 15, color: 'var(--c-ink-soft)', fontWeight: 600 }}>{correctCount} of {exercises.length} right</div>
            <LinkButton to={backHref} variant="primary" size="lg">Back to lessons</LinkButton>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseCardView({ card, answer, setAnswer, checked, lang }: { card: Card; answer: Answer; setAnswer: (v: Answer) => void; checked: boolean; lang: 'en' | 'si' }) {
  const isText = card.type === 'text';
  const si = lang === 'si';
  // Only the prompt and feedback (above) switch language here — answer
  // options/tokens/pairs stay in English regardless of the toggle.
  const src = isText ? (si ? card.body.si || card.body.en : card.body.en) : (si ? card.prompt.si || card.prompt.en : card.prompt.en);

  return (
    <div className={COL_CLASS[card.column] || COL_CLASS.full}>
      <div className="card" style={card.border === false ? { background: 'var(--c-bg)' } : undefined}>
        {src ? <RichText src={src} /> : <div style={{ fontSize: 15, color: 'var(--c-ink-faint)', fontWeight: 600 }}>{isText ? '(empty card)' : '(no prompt yet)'}</div>}

        {card.type === 'mcq' && (() => {
          const p = card.payload as McqPayload;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {p.options.map((o, i) => {
                let bg = '#F7F5FF', border = 'transparent';
                if (checked) {
                  if (i === p.correctIndex) { bg = 'var(--c-success-bg)'; border = 'var(--c-success)'; }
                  else if (i === answer) { bg = 'var(--c-danger-bg)'; border = 'var(--c-danger)'; }
                } else if (i === answer) { bg = 'var(--c-primary-tint)'; border = 'var(--c-primary)'; }
                return (
                  <button key={i} onClick={() => setAnswer(i)} style={{ textAlign: 'left', width: '100%', borderRadius: 14, padding: '14px 18px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', background: bg, border: `2px solid ${border}`, color: 'var(--c-ink)' }}>{o.en || '…'}</button>
                );
              })}
            </div>
          );
        })()}

        {card.type === 'gap_fill' && (() => {
          const p = card.payload as GapFillPayload;
          const t = p.template.en || '';
          const at = t.indexOf('___');
          const before = at >= 0 ? t.slice(0, at) : t;
          const after = at >= 0 ? t.slice(at + 3) : '';
          const gradeOk = checked && gradeCard(card, answer);
          const hasChips = p.choices.length > 0;
          return (
            <>
              <div style={{ background: '#F7F5FF', borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 1.9, marginTop: 14 }}>
                {before}<span style={{ display: 'inline-block', minWidth: 74, textAlign: 'center', borderBottom: `2.5px solid ${!checked ? '#B5AFD4' : gradeOk ? 'var(--c-success)' : 'var(--c-danger)'}`, color: 'var(--c-primary)', fontWeight: 700 }}>{(answer as string) || ''}</span>{after}
              </div>
              {hasChips ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {p.choices.map((text, i) => {
                    let bg = 'white', border = 'var(--c-primary-line)';
                    if (checked && p.accept.includes(text)) { bg = 'var(--c-success-bg)'; border = 'var(--c-success)'; }
                    else if (text === answer) { bg = 'var(--c-primary-tint)'; border = 'var(--c-primary)'; }
                    return <button key={i} onClick={() => setAnswer(text)} style={{ borderRadius: 999, padding: '8px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: bg, border: `2px solid ${border}` }}>{text}</button>;
                  })}
                </div>
              ) : (
                <input value={(answer as string) || ''} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the missing word" style={{ width: '100%', border: '2px solid var(--c-primary-line)', borderRadius: 12, padding: 12, fontSize: 15, marginTop: 12, outline: 'none' }} />
              )}
            </>
          );
        })()}

        {card.type === 'drag_order' && (() => {
          const p = card.payload as DragOrderPayload;
          const picked = answer as DragOrderAnswer;
          const order = seededShuffle(p.tokens.map((_, i) => i), p.tokens.length * 17 + 3);
          return (
            <>
              <div style={{ border: '2px dashed var(--c-primary-line)', borderRadius: 12, minHeight: 52, padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '14px 0 12px' }}>
                {picked.map((i) => (
                  <button key={i} onClick={() => setAnswer(picked.filter((x) => x !== i))} style={{ borderRadius: 12, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'var(--c-primary-tint)', border: '2px solid var(--c-primary)' }}>{p.tokens[i].en || '…'}</button>
                ))}
                {picked.length === 0 && <span style={{ fontSize: 12, color: 'var(--c-ink-disabled)', fontWeight: 600, padding: '0 6px' }}>Tap the words in the right order</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {order.filter((i) => !picked.includes(i)).map((i) => (
                  <button key={i} onClick={() => setAnswer(picked.includes(i) ? picked : [...picked, i])} style={{ borderRadius: 12, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'white', border: '2px solid var(--c-primary-line)', boxShadow: '0 2px 0 #E3DEF5' }}>{p.tokens[i].en || '…'}</button>
                ))}
              </div>
            </>
          );
        })()}

        {card.type === 'match' && (() => {
          const p = card.payload as MatchPayload;
          const a = answer as MatchAnswer;
          const rightOrder = seededShuffle(p.pairs.map((_, i) => i), p.pairs.length * 23 + 5);
          const labelFor = (li: number) => String.fromCharCode(65 + li);
          const pickLeft = (li: number) => {
            const pairs = { ...a.pairs };
            if (pairs[li] !== undefined) { delete pairs[li]; setAnswer({ pending: null, pairs }); return; }
            setAnswer({ pending: li, pairs });
          };
          const pickRight = (ri: number) => {
            const pairs = { ...a.pairs };
            Object.keys(pairs).forEach((k) => { if (pairs[Number(k)] === ri) delete pairs[Number(k)]; });
            if (a.pending === null || a.pending === undefined) return;
            pairs[a.pending] = ri;
            setAnswer({ pending: null, pairs });
          };
          return (
            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {p.pairs.map((pr, li) => {
                  const done = a.pairs[li] !== undefined;
                  let bg = 'white', border = 'var(--c-primary-line)';
                  if (checked) { bg = a.pairs[li] === li ? 'var(--c-success-bg)' : 'var(--c-danger-bg)'; border = a.pairs[li] === li ? 'var(--c-success)' : 'var(--c-danger)'; }
                  else if (a.pending === li) { bg = 'var(--c-primary-tint)'; border = 'var(--c-primary)'; }
                  else if (done) { bg = '#F7F5FF'; border = '#B7A6FF'; }
                  return <button key={li} onClick={() => pickLeft(li)} className="si" style={{ textAlign: 'left', background: bg, border: `2px solid ${border}`, borderRadius: 12, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{pr.left || '…'}<span style={{ float: 'right', color: 'var(--c-primary)' }}>{done ? labelFor(li) : ''}</span></button>;
                })}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {rightOrder.map((ri) => {
                  const ownerKey = Object.keys(a.pairs).find((k) => a.pairs[Number(k)] === ri);
                  let bg = 'var(--c-primary-tint)', border = 'var(--c-primary-line)';
                  if (checked && ownerKey !== undefined) {
                    const ok = Number(ownerKey) === ri;
                    bg = ok ? 'var(--c-success-bg)' : 'var(--c-danger-bg)'; border = ok ? 'var(--c-success)' : 'var(--c-danger)';
                  } else if (ownerKey !== undefined) { bg = '#F7F5FF'; border = '#B7A6FF'; }
                  return <button key={ri} onClick={() => pickRight(ri)} style={{ textAlign: 'left', background: bg, border: `2px solid ${border}`, borderRadius: 12, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{p.pairs[ri].right || '…'}<span style={{ float: 'right', color: 'var(--c-primary)' }}>{ownerKey !== undefined ? labelFor(Number(ownerKey)) : ''}</span></button>;
                })}
              </div>
            </div>
          );
        })()}

        {card.type === 'free_text' && (
          <textarea value={(answer as string) || ''} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer…" style={{ width: '100%', border: '2px solid var(--c-primary-line)', borderRadius: 12, padding: 12, fontSize: 15, minHeight: 84, marginTop: 14, outline: 'none', fontFamily: 'var(--font-body)' }} />
        )}

        {card.type === 'multi_select' && (() => {
          const p = card.payload as MultiSelectPayload;
          const picked = (answer as MultiSelectAnswer) || [];
          const toggle = (i: number) => setAnswer(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {p.options.map((o, i) => {
                const isCorrect = p.correctIndexes.includes(i);
                const isPicked = picked.includes(i);
                let bg = '#F7F5FF', border = 'transparent';
                if (checked) {
                  if (isCorrect) { bg = 'var(--c-success-bg)'; border = 'var(--c-success)'; }
                  else if (isPicked) { bg = 'var(--c-danger-bg)'; border = 'var(--c-danger)'; }
                } else if (isPicked) { bg = 'var(--c-primary-tint)'; border = 'var(--c-primary)'; }
                return (
                  <button key={i} onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%', borderRadius: 14, padding: '14px 18px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', background: bg, border: `2px solid ${border}`, color: 'var(--c-ink)' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isPicked ? 'var(--c-primary)' : 'var(--c-primary-line)'}`, background: isPicked ? 'var(--c-primary)' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isPicked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    {o.en || '…'}
                  </button>
                );
              })}
              <span style={{ fontSize: 12, color: 'var(--c-ink-faint)', fontWeight: 600 }}>Select all that apply.</span>
            </div>
          );
        })()}

        {card.type === 'essay' && (() => {
          const p = card.payload as EssayPayload;
          return (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {p.outline.length > 0 && (
                <div style={{ background: '#F7F5FF', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary)', letterSpacing: '0.05em', marginBottom: 8 }}>OUTLINE</div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
                    {p.outline.map((o, i) => <li key={i}>{(si ? o.si || o.en : o.en) || '…'}</li>)}
                  </ol>
                </div>
              )}
              {p.ideaBank.length > 0 && (
                <div style={{ background: '#F7F5FF', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary)', letterSpacing: '0.05em', marginBottom: 8 }}>IDEA BANK</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
                    {p.ideaBank.map((o, i) => <li key={i}>{(si ? o.si || o.en : o.en) || '…'}</li>)}
                  </ul>
                </div>
              )}
              <textarea
                value={(answer as string) || ''} onChange={(e) => setAnswer(e.target.value)}
                placeholder={si ? 'ඔබේ රචනය මෙහි ලියන්න…' : 'Write your response here…'}
                style={{ width: '100%', border: '2px solid var(--c-primary-line)', borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 1.7, minHeight: 220, outline: 'none', fontFamily: 'var(--font-body)' }}
              />
              {!!p.minWords && (
                <span style={{ fontSize: 12, color: 'var(--c-ink-faint)', fontWeight: 600 }}>
                  {((answer as string) || '').trim().split(/\s+/).filter(Boolean).length} / {p.minWords} words
                </span>
              )}
            </div>
          );
        })()}

        {card.type === 'rubric' && (() => {
          const p = card.payload as RubricPayload;
          const a = (answer as RubricAnswer) || {};
          return (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {p.sections.map((section, si2) => (
                <div key={si2}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{(si ? section.title.si || section.title.en : section.title.en) || '…'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {section.items.map((item, ii) => {
                      const key = `${si2}-${ii}`;
                      return (
                        <CheckboxRow key={key} checked={!!a[key]} onToggle={() => setAnswer({ ...a, [key]: !a[key] })}>
                          {(si ? item.si || item.en : item.en) || '…'}
                        </CheckboxRow>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
