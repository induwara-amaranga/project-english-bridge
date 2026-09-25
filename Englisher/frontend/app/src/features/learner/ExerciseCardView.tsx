import { RichText } from '../../components/RichText';
import { CheckboxRow } from '../../components/Primitives';
import { gradeCard, norm, seededShuffle, splitGapFillTemplate, type Answer, type DragOrderAnswer, type GapFillAnswer, type MatchAnswer, type MultiSelectAnswer, type RubricAnswer } from '../../domain/grading';
import type { Card, DragOrderPayload, EssayPayload, GapFillPayload, MatchPayload, McqPayload, MultiSelectPayload, RubricPayload, TranslateSiEnPayload } from '../../domain/types';
import { bubble } from '../../lib/bubble';

// One card, rendered for answering *and* for review. The review screens pass
// `readOnly` with the stored answer and `checked`, which is why this lives in
// its own file rather than inside Exercise.tsx: both screens must colour a
// past answer identically, and one component is the only way to guarantee it.

const COL_CLASS: Record<string, string> = { left: 'cardcell col-left', right: 'cardcell col-right', full: 'cardcell col-full' };

/** Every tappable option shares the press feedback; `bubble` needs `bubble-host` to clip it. */
const OPTION_CLASS = 'bubble-host press';

export function ExerciseCardView({ card, answer, setAnswer, checked, lang, readOnly = false }: {
  card: Card;
  answer: Answer;
  setAnswer: (v: Answer) => void;
  checked: boolean;
  lang: 'en' | 'si';
  readOnly?: boolean;
}) {
  const isText = card.type === 'text';
  const si = lang === 'si';
  // Only the prompt and feedback (above) switch language here — answer
  // options/tokens/pairs stay in English regardless of the toggle.
  const src = isText ? (si ? card.body.si || card.body.en : card.body.en) : (si ? card.prompt.si || card.prompt.en : card.prompt.en);

  const set = readOnly ? () => {} : setAnswer;
  const cursor = readOnly ? 'default' : 'pointer';
  const press = readOnly ? undefined : bubble;
  const optionClass = readOnly ? undefined : OPTION_CLASS;

  return (
    <div className={COL_CLASS[card.column] || COL_CLASS.full}>
      <div className="card" style={card.border === false ? { background: 'var(--c-bg)' } : undefined}>
        {src ? <RichText src={src} /> : <div style={{ fontSize: 15, color: 'var(--c-ink-faint)', fontWeight: 600 }}>{isText ? (si ? '(හිස් කාඩ්පතක්)' : '(empty card)') : (si ? '(තවම ප්‍රශ්නයක් නැත)' : '(no prompt yet)')}</div>}

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
                  <button key={i} className={optionClass} onPointerDown={press} onClick={() => set(i)} style={{ textAlign: 'left', width: '100%', borderRadius: 14, padding: '14px 18px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', cursor, background: bg, border: `2px solid ${border}`, color: 'var(--c-ink)' }}>{o.en || '…'}</button>
                );
              })}
            </div>
          );
        })()}

        {card.type === 'gap_fill' && (() => {
          const p = card.payload as GapFillPayload;
          const a = (answer as GapFillAnswer) || { pending: null, blanks: {} };
          const segments = splitGapFillTemplate(si ? (p.template.si || p.template.en) : p.template.en);
          const blankCount = p.blanks.length;
          const hasChips = p.choices.length > 0;
          const blankOk = (i: number, text: string) => (p.blanks[i]?.accept || []).some((x) => norm(x, null) === norm(text, null));

          /** Tapping a blank makes it the target of the next chip tap. */
          const selectBlank = (i: number) => set({ ...a, pending: i });

          const firstEmpty = (blanks: Record<number, string>) => {
            for (let i = 0; i < blankCount; i++) if (!blanks[i] || !blanks[i].trim()) return i;
            return null;
          };

          /** Fills whichever blank is selected (or the first empty one, if none is) and auto-advances to the next empty blank. */
          const fillPending = (text: string) => {
            const target = a.pending ?? firstEmpty(a.blanks);
            if (target === null) return;
            const blanks = { ...a.blanks, [target]: text };
            set({ pending: firstEmpty(blanks), blanks });
          };

          return (
            <>
              <div style={{ background: '#F7F5FF', borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 1.9, marginTop: 14 }}>
                {segments.map((seg, i) => (
                  <span key={i}>
                    {seg}
                    {i < blankCount && (() => {
                      const filled = a.blanks[i] || '';
                      const ok = checked && blankOk(i, filled);
                      const borderColor = checked ? (ok ? 'var(--c-success)' : 'var(--c-danger)') : a.pending === i ? 'var(--c-primary)' : '#B5AFD4';
                      return (
                        <button
                          onClick={() => selectBlank(i)} className={optionClass} onPointerDown={press}
                          style={{ display: 'inline-block', minWidth: 74, textAlign: 'center', background: 'none', border: 'none', borderBottom: `2.5px solid ${borderColor}`, color: 'var(--c-primary)', fontWeight: 700, fontSize: 15, fontFamily: 'inherit', cursor, padding: '0 4px' }}
                        >
                          {filled || ' '}
                        </button>
                      );
                    })()}
                  </span>
                ))}
              </div>
              {hasChips ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {p.choices.map((text, i) => {
                    const placedAt = Object.entries(a.blanks).filter(([, v]) => v === text).map(([k]) => Number(k));
                    let bg = 'white', border = 'var(--c-primary-line)';
                    if (checked && placedAt.length > 0) {
                      const allCorrect = placedAt.every((bi) => blankOk(bi, text));
                      bg = allCorrect ? 'var(--c-success-bg)' : 'var(--c-danger-bg)'; border = allCorrect ? 'var(--c-success)' : 'var(--c-danger)';
                    } else if (placedAt.length > 0) { bg = 'var(--c-primary-tint)'; border = 'var(--c-primary)'; }
                    return <button key={i} className={optionClass} onPointerDown={press} onClick={() => fillPending(text)} style={{ borderRadius: 999, padding: '8px 15px', fontSize: 13, fontWeight: 600, cursor, background: bg, border: `2px solid ${border}` }}>{text}</button>;
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {p.blanks.map((_, i) => {
                    const filled = a.blanks[i] || '';
                    const ok = checked && blankOk(i, filled);
                    return (
                      <input
                        key={i} value={filled} readOnly={readOnly}
                        onChange={(e) => set({ ...a, blanks: { ...a.blanks, [i]: e.target.value } })}
                        placeholder={si ? `හිස්තැන ${i + 1}` : `Blank ${i + 1}`}
                        style={{ width: '100%', border: `2px solid ${checked ? (ok ? 'var(--c-success)' : 'var(--c-danger)') : 'var(--c-primary-line)'}`, borderRadius: 12, padding: 12, fontSize: 15, outline: 'none' }}
                      />
                    );
                  })}
                </div>
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
                {picked.map((i, slot) => {
                  // On review, a token sitting in the position it belongs in is right.
                  let bg = 'var(--c-primary-tint)', border = 'var(--c-primary)';
                  if (checked) {
                    const ok = i === slot;
                    bg = ok ? 'var(--c-success-bg)' : 'var(--c-danger-bg)';
                    border = ok ? 'var(--c-success)' : 'var(--c-danger)';
                  }
                  return <button key={i} className={optionClass} onPointerDown={press} onClick={() => set(picked.filter((x) => x !== i))} style={{ borderRadius: 12, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor, background: bg, border: `2px solid ${border}` }}>{p.tokens[i].en || '…'}</button>;
                })}
                {picked.length === 0 && <span style={{ fontSize: 12, color: 'var(--c-ink-disabled)', fontWeight: 600, padding: '0 6px' }}>{readOnly ? (si ? 'පිළිතුරු දී නැත' : 'Not answered') : (si ? 'නිවැරදි අනුපිළිවෙලට වචන ස්පර්ශ කරන්න' : 'Tap the words in the right order')}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {order.filter((i) => !picked.includes(i)).map((i) => (
                  <button key={i} className={optionClass} onPointerDown={press} onClick={() => set(picked.includes(i) ? picked : [...picked, i])} style={{ borderRadius: 12, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor, background: 'white', border: '2px solid var(--c-primary-line)', boxShadow: '0 2px 0 #E3DEF5' }}>{p.tokens[i].en || '…'}</button>
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
            if (pairs[li] !== undefined) { delete pairs[li]; set({ pending: null, pairs }); return; }
            set({ pending: li, pairs });
          };
          const pickRight = (ri: number) => {
            const pairs = { ...a.pairs };
            Object.keys(pairs).forEach((k) => { if (pairs[Number(k)] === ri) delete pairs[Number(k)]; });
            if (a.pending === null || a.pending === undefined) return;
            pairs[a.pending] = ri;
            set({ pending: null, pairs });
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
                  return <button key={li} className={`si ${optionClass || ''}`.trim()} onPointerDown={press} onClick={() => pickLeft(li)} style={{ textAlign: 'left', background: bg, border: `2px solid ${border}`, borderRadius: 12, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor }}>{pr.left || '…'}<span style={{ float: 'right', color: 'var(--c-primary)' }}>{done ? labelFor(li) : ''}</span></button>;
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
                  return <button key={ri} className={optionClass} onPointerDown={press} onClick={() => pickRight(ri)} style={{ textAlign: 'left', background: bg, border: `2px solid ${border}`, borderRadius: 12, padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor }}>{p.pairs[ri].right || '…'}<span style={{ float: 'right', color: 'var(--c-primary)' }}>{ownerKey !== undefined ? labelFor(Number(ownerKey)) : ''}</span></button>;
                })}
              </div>
            </div>
          );
        })()}

        {card.type === 'free_text' && (
          <textarea value={(answer as string) || ''} readOnly={readOnly} onChange={(e) => set(e.target.value)} placeholder={readOnly ? (si ? 'පිළිතුරු දී නැත' : 'Not answered') : (si ? 'ඔබේ පිළිතුර ටයිප් කරන්න…' : 'Type your answer…')} style={{ width: '100%', border: `2px solid ${checked ? (gradeCard(card, answer) ? 'var(--c-success)' : 'var(--c-danger)') : 'var(--c-primary-line)'}`, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 84, marginTop: 14, outline: 'none', fontFamily: 'var(--font-body)' }} />
        )}

        {card.type === 'translate_si_en' && (() => {
          const p = card.payload as TranslateSiEnPayload;
          return (
            <>
              {/* Always Sinhala, regardless of the `lang` toggle — this is the
                  sentence being translated, not chrome that switches with it. */}
              <div className="si" style={{ fontSize: 20, fontWeight: 600, background: '#F7F5FF', borderRadius: 12, padding: '14px 16px', marginTop: 14 }}>{p.sentenceSi}</div>
              <input
                value={(answer as string) || ''} readOnly={readOnly} onChange={(e) => set(e.target.value)}
                placeholder={readOnly ? (si ? 'පිළිතුරු දී නැත' : 'Not answered') : (si ? 'ඉංග්‍රීසි පරිවර්තනය ටයිප් කරන්න…' : 'Type the English translation…')}
                style={{ width: '100%', border: `2px solid ${checked ? (gradeCard(card, answer) ? 'var(--c-success)' : 'var(--c-danger)') : 'var(--c-primary-line)'}`, borderRadius: 999, padding: '14px 18px', fontSize: 16, marginTop: 10, outline: 'none', fontFamily: 'var(--font-body)' }}
              />
            </>
          );
        })()}

        {card.type === 'multi_select' && (() => {
          const p = card.payload as MultiSelectPayload;
          const picked = (answer as MultiSelectAnswer) || [];
          const toggle = (i: number) => set(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]);
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
                  <button key={i} className={optionClass} onPointerDown={press} onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%', borderRadius: 14, padding: '14px 18px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', cursor, background: bg, border: `2px solid ${border}`, color: 'var(--c-ink)' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isPicked ? 'var(--c-primary)' : 'var(--c-primary-line)'}`, background: isPicked ? 'var(--c-primary)' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isPicked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    {o.en || '…'}
                  </button>
                );
              })}
              <span style={{ fontSize: 12, color: 'var(--c-ink-faint)', fontWeight: 600 }}>{si ? 'අදාළ සියල්ල තෝරන්න.' : 'Select all that apply.'}</span>
            </div>
          );
        })()}

        {card.type === 'essay' && (() => {
          const p = card.payload as EssayPayload;
          return (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {p.outline.length > 0 && (
                <div style={{ background: '#F7F5FF', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary)', letterSpacing: '0.05em', marginBottom: 8 }}>{si ? 'රූපරේඛාව' : 'OUTLINE'}</div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
                    {p.outline.map((o, i) => <li key={i}>{(si ? o.si || o.en : o.en) || '…'}</li>)}
                  </ol>
                </div>
              )}
              {p.ideaBank.length > 0 && (
                <div style={{ background: '#F7F5FF', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary)', letterSpacing: '0.05em', marginBottom: 8 }}>{si ? 'අදහස් බැංකුව' : 'IDEA BANK'}</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
                    {p.ideaBank.map((o, i) => <li key={i}>{(si ? o.si || o.en : o.en) || '…'}</li>)}
                  </ul>
                </div>
              )}
              <textarea
                value={(answer as string) || ''} readOnly={readOnly} onChange={(e) => set(e.target.value)}
                placeholder={readOnly ? (si ? 'පිළිතුරු දී නැත' : 'Not answered') : si ? 'ඔබේ රචනය මෙහි ලියන්න…' : 'Write your response here…'}
                style={{ width: '100%', border: '2px solid var(--c-primary-line)', borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 1.7, minHeight: readOnly ? 120 : 220, outline: 'none', fontFamily: 'var(--font-body)' }}
              />
              {!!p.minWords && (
                <span style={{ fontSize: 12, color: 'var(--c-ink-faint)', fontWeight: 600 }}>
                  {si
                    ? `වචන ${((answer as string) || '').trim().split(/\s+/).filter(Boolean).length} / ${p.minWords}`
                    : `${((answer as string) || '').trim().split(/\s+/).filter(Boolean).length} / ${p.minWords} words`}
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
                        <CheckboxRow key={key} checked={!!a[key]} onToggle={() => set({ ...a, [key]: !a[key] })}>
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
