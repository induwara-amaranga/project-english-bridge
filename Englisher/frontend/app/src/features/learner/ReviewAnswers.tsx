import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useLessonResults } from '../../hooks/useLessonResults';
import { courseScore, scoreOf, type ExerciseOutcome, type LessonResult } from '../../domain/lessonResults';
import { LangToggle } from '../../components/Primitives';
import { LinkButton } from '../../components/Button';
import { ScoreDial } from '../../components/ScoreDial';
import { ExerciseCardView } from './ExerciseCardView';
import { bubble } from '../../lib/bubble';
import type { Card, Curriculum, Exercise, Lesson, Stage } from '../../domain/types';
import { defaultAnswerFor, type Answer } from '../../domain/grading';

// The review screens. Two scopes over the same renderer:
//   'lesson'      — everything from one lesson, filterable to just the misses
//   'stage-wrong' — every question missed across a stage, i.e. across a whole
//                   course in the learner's vocabulary
//
// Both replay the learner's stored answers through ExerciseCardView with
// `checked`, so a reviewed answer is coloured exactly as it was when it was
// graded — no second grading implementation to drift out of step.

type Scope = 'lesson' | 'stage-wrong';

interface ResolvedQuestion {
  key: string;
  stage: Stage;
  lesson: Lesson;
  exercise: Exercise;
  outcome: ExerciseOutcome;
}

/** Content is addressed by slug and can be re-ordered by an admin, so id first, position second. */
function resolveQuestions(curriculum: Curriculum, result: LessonResult): ResolvedQuestion[] {
  const stage = curriculum.stages.find((s) => s.id === result.stageId);
  const lesson = stage?.lessons.find((l) => l.id === result.lessonId);
  if (!stage || !lesson) return [];
  return result.outcomes.flatMap((outcome) => {
    const exercise = lesson.exercises.find((e) => e.id === outcome.exerciseId) || lesson.exercises[outcome.index];
    if (!exercise) return []; // The question was deleted from the curriculum since.
    return [{ key: `${result.stageId}/${result.lessonId}/${outcome.index}`, stage, lesson, exercise, outcome }];
  });
}

export function ReviewAnswers({ scope = 'lesson' }: { scope?: Scope }) {
  const { stageId, lessonId } = useParams();
  const { curriculum, loading: curriculumLoading } = useCurriculum();
  const { results: allResults, loading: resultsLoading } = useLessonResults();
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [wrongOnly, setWrongOnly] = useState(scope === 'stage-wrong');
  const loading = curriculumLoading || resultsLoading;
  const isCourse = scope === 'stage-wrong';

  const results = useMemo<LessonResult[]>(() => {
    if (isCourse) return allResults.filter((r) => r.stageId === stageId);
    return allResults.filter((r) => r.stageId === stageId && r.lessonId === lessonId);
  }, [isCourse, allResults, stageId, lessonId]);

  const questions = useMemo(
    () => results.flatMap((r) => resolveQuestions(curriculum, r)),
    [results, curriculum],
  );

  const shown = wrongOnly ? questions.filter((q) => !q.outcome.correct) : questions;
  const score = isCourse ? courseScore(results) : scoreOf(results[0]?.outcomes || []);

  const backHref = isCourse ? `/learn/${stageId}/complete` : `/learn/${stageId}`;
  const stageTitle = curriculum.stages.find((s) => s.id === stageId)?.title.en;
  const title = isCourse
    ? stageTitle || 'Every question you missed'
    : questions[0]?.lesson.title.en || 'Lesson review';

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      <div style={{ background: 'var(--c-primary)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to={backHref} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>{isCourse ? 'COURSE REVIEW · WHAT YOU MISSED' : 'LESSON REVIEW'}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>{title}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}><LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} /></div>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: '0 auto', padding: '28px 24px 72px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {loading && <div className="card" style={{ textAlign: 'center', color: 'var(--c-ink-soft)', fontWeight: 600 }}>Loading…</div>}

        {!loading && questions.length === 0 && (
          <div className="card screen-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 36 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>Nothing to review yet</div>
            <p style={{ margin: 0, maxWidth: 420, fontSize: 15, lineHeight: 1.7, color: 'var(--c-ink-soft)', fontWeight: 600 }}>
              Finish a lesson and every question from it shows up here, right and wrong, with the answer you gave.
            </p>
            <LinkButton to="/learn" variant="primary" size="lg">Back to the roadmap</LinkButton>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <>
            <div className="card screen-in" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <ScoreDial pct={score.pct} size={112} label="CORRECT" />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
                  {score.correct} of {score.total} correct
                </div>
                <div style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>
                  {score.total - score.correct} to look at{score.skipped > 0 ? `, ${score.skipped} of them skipped` : ''}
                  {isCourse ? ` · across ${results.length} lesson${results.length === 1 ? '' : 's'}` : ''}
                </div>
                {!isCourse && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <FilterTab active={!wrongOnly} onClick={() => setWrongOnly(false)}>All {questions.length}</FilterTab>
                    <FilterTab active={wrongOnly} onClick={() => setWrongOnly(true)}>Wrong {questions.filter((q) => !q.outcome.correct).length}</FilterTab>
                  </div>
                )}
              </div>
            </div>

            {shown.length === 0 && (
              <div className="card screen-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--c-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 22 22" fill="none"><path d="M5 11.5L9.5 16L17 6" stroke="var(--c-success-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19 }}>Not a single one wrong</div>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--c-ink-soft)', fontWeight: 600 }}>There is nothing to review here.</p>
              </div>
            )}

            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              {shown.map((q, i) => (
                <QuestionBlock key={q.key} q={q} number={i + 1} lang={lang} showLesson={isCourse} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick} onPointerDown={bubble} className="bubble-host press"
      style={{
        border: `2px solid ${active ? 'var(--c-primary)' : 'var(--c-primary-line)'}`,
        background: active ? 'var(--c-primary-tint)' : 'white',
        color: active ? 'var(--c-primary)' : 'var(--c-ink-soft)',
        borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}
    >{children}</button>
  );
}

function QuestionBlock({ q, number, lang, showLesson }: { q: ResolvedQuestion; number: number; lang: 'en' | 'si'; showLesson: boolean }) {
  const { outcome, exercise } = q;
  const status = outcome.skipped ? 'Skipped' : outcome.correct ? 'Correct' : 'Wrong';
  const tone = outcome.correct
    ? { bg: 'var(--c-success-bg)', ink: 'var(--c-success-ink)', line: 'var(--c-success)' }
    : outcome.skipped
      ? { bg: 'var(--c-warning-bg)', ink: 'var(--c-warning-ink)', line: 'var(--c-warning)' }
      : { bg: 'var(--c-danger-bg)', ink: 'var(--c-danger-ink)', line: 'var(--c-danger)' };
  // A card added to the exercise after this attempt has no stored answer, and
  // the empty string is not a valid answer for every card type — an array-shaped
  // one would throw on render. Fall back to the card's own empty answer.
  const answerFor = (card: Card): Answer => (card.id in outcome.answers ? outcome.answers[card.id] : defaultAnswerFor(card));
  const fb = outcome.correct ? exercise.feedback?.correct : exercise.feedback?.incorrect;
  const fbText = fb ? (lang === 'si' ? fb.si || fb.en : fb.en) : '';

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>Question {number}</span>
        <span style={{ background: tone.bg, color: tone.ink, border: `1px solid ${tone.line}`, borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>{status}</span>
        {/* Which lesson it came from — the stage is already in the header, so it
            is not repeated on every question. */}
        {showLesson && (
          <span style={{ fontSize: 13, color: 'var(--c-ink-faint)', fontWeight: 600 }}>{q.lesson.title.en}</span>
        )}
      </header>

      <div className="cardgrid">
        {(exercise.cards || []).map((card) => (
          <ExerciseCardView key={card.id} card={card} answer={answerFor(card)} setAnswer={() => {}} checked lang={lang} readOnly />
        ))}
      </div>

      {!!fbText && (
        <p style={{ margin: 0, background: tone.bg, borderLeft: `3px solid ${tone.line}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, lineHeight: 1.6, fontWeight: 600, color: tone.ink }} className={lang === 'si' ? 'si' : undefined}>
          {fbText}
        </p>
      )}
    </section>
  );
}
