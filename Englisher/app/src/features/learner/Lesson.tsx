import { Link, useParams } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { TYPE_META } from '../../domain/types';
import type { Card, DragOrderPayload, GapFillPayload, MatchPayload, McqPayload } from '../../domain/types';
import { RichText } from '../../components/RichText';
import { Tile, Chip } from '../../components/Primitives';
import { LinkButton } from '../../components/Button';

const COL_CLASS: Record<string, string> = { left: 'cardcell col-left', right: 'cardcell col-right', full: 'cardcell col-full' };

function LessonCard({ card }: { card: Card }) {
  const isText = card.type === 'text';
  const src = isText ? card.body.en : card.prompt.en;
  return (
    <div className={COL_CLASS[card.column] || COL_CLASS.full}>
      <div className="card">
        {!isText && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--c-primary)', letterSpacing: '0.05em', marginBottom: 10 }}>{TYPE_META[card.type].label.toUpperCase()}</div>}
        {src ? <RichText src={src} /> : <div style={{ fontSize: 15, color: 'var(--c-ink-faint)', fontWeight: 600 }}>{isText ? '(empty card)' : '(no prompt yet)'}</div>}

        {card.type === 'mcq' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
            {(card.payload as McqPayload).options.map((o, i) => <Tile key={i}>{o.en || '…'}</Tile>)}
          </div>
        )}
        {card.type === 'gap_fill' && (() => {
          const p = card.payload as GapFillPayload;
          const t = p.template.en || '';
          const at = t.indexOf('___');
          const before = at >= 0 ? t.slice(0, at) : t;
          const after = at >= 0 ? t.slice(at + 3) : '';
          return (
            <>
              <div style={{ background: 'var(--c-primary-tint-2)', borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 1.9, marginTop: 12 }}>
                {before}<span style={{ display: 'inline-block', minWidth: 70, borderBottom: '2.5px solid #B5AFD4' }}>&nbsp;</span>{after}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {p.choices.map((c, i) => <Chip key={i}>{c}</Chip>)}
              </div>
            </>
          );
        })()}
        {card.type === 'drag_order' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {(card.payload as DragOrderPayload).tokens.map((t, i) => <Tile key={i}>{t.en || '…'}</Tile>)}
          </div>
        )}
        {card.type === 'match' && (
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(card.payload as MatchPayload).pairs.map((p, i) => <Tile key={i}><span className="si">{p.left || '…'}</span></Tile>)}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(card.payload as MatchPayload).pairs.map((p, i) => <Tile key={i} style={{ background: '#ECE8FB' }}>{p.right || '…'}</Tile>)}
            </div>
          </div>
        )}
        {card.type === 'free_text' && (
          <div style={{ background: 'var(--c-primary-tint-2)', border: '2px solid var(--c-primary-line)', borderRadius: 12, padding: 14, minHeight: 64, fontSize: 14, color: 'var(--c-ink-disabled)', marginTop: 12 }}>Answered on the exercise screen</div>
        )}
      </div>
    </div>
  );
}

export function LessonPage() {
  const { stageId, lessonId } = useParams();
  const { curriculum } = useCurriculum();
  const stage = curriculum.stages.find((s) => s.id === stageId);
  const lesson = stage?.lessons.find((l) => l.id === lessonId);
  const stageIndex = stage ? curriculum.stages.indexOf(stage) + 1 : 1;

  if (!stage || !lesson) {
    return (
      <div className="app-shell" style={{ background: 'var(--c-bg)' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <div className="card">Nothing here yet.</div>
          <LinkButton to="/learn" variant="primary" size="lg" style={{ marginTop: 20 }}>Back to the roadmap</LinkButton>
        </div>
      </div>
    );
  }

  const cards = lesson.cards || [];
  const hasExercises = (lesson.exercises || []).length > 0;

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      <div style={{ background: 'var(--c-primary)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to={`/learn/${stage.id}`} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>STAGE {stageIndex} — {stage.title.en}</div>
            <div className="si" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>අදියර {stageIndex} — {stage.title.si}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, margin: 0 }}>{lesson.title.en || '(untitled lesson)'}</h1>
          {!!lesson.title.si && <div className="si" style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink-soft)', marginTop: 4 }}>{lesson.title.si}</div>}
        </div>

        <div className="cardgrid">
          {cards.map((c) => <LessonCard key={c.id} card={c} />)}
        </div>

        {cards.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--c-ink-faint)', fontSize: 15, fontWeight: 600, lineHeight: 1.7 }}>
            This lesson has no content cards yet.
          </div>
        )}

        <LinkButton
          to={hasExercises ? `/learn/${stage.id}/${lesson.id}/practice` : `/learn/${stage.id}`}
          variant="primary" size="lg"
          style={{ alignSelf: 'center', marginTop: 8, ...(hasExercises ? {} : { background: 'var(--c-disabled)', boxShadow: '0 6px 0 var(--c-disabled-shadow)' }) }}
        >
          {hasExercises ? 'Go to exercise' : 'Nothing to practise yet'}
        </LinkButton>
      </div>
    </div>
  );
}
