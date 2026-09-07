import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { useLessonResults } from '../../hooks/useLessonResults';
import { courseScore } from '../../domain/lessonResults';
import { isFinalStage } from '../../domain/curriculum';
import { LinkButton } from '../../components/Button';
import { LottieBox } from '../../components/LottieBox';
import { ScoreDial } from '../../components/ScoreDial';
import { CelebrationBadge } from '../../components/CelebrationBadge';
import { randomCelebration } from '../../lib/animations';
import { playSound } from '../../lib/sounds';

// The end of a course — which here means a stage, one subject start to finish.
// Reached from the lesson-complete screen after a stage's last lesson, so a
// learner sees this several times over the roadmap rather than once ever.
//
// The score covers every question answered in this stage (domain/lessonResults),
// which is the same arithmetic the lesson screen does over a wider window.

export function CourseComplete() {
  const { stageId } = useParams();
  const { curriculum, loading } = useCurriculum();
  const { progress } = useProgress();
  const { results } = useLessonResults();
  const [celebration] = useState(randomCelebration);

  // "At the entry of this page" — once per mount, never on a re-render.
  useEffect(() => {
    playSound('courseComplete');
  }, []);

  const stage = curriculum.stages.find((s) => s.id === stageId);
  const stageNo = stage ? curriculum.stages.indexOf(stage) + 1 : 0;

  const stageResults = useMemo(
    () => results.filter((r) => r.stageId === stageId),
    [results, stageId],
  );
  const score = courseScore(stageResults);
  const wrongCount = score.total - score.correct;
  const lessonCount = stage?.lessons.length ?? 0;
  const isFinal = isFinalStage(curriculum, stageId);

  if (!loading && !stage) {
    return (
      <div className="app-shell" style={{ background: 'var(--c-bg)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <div className="card" style={{ color: 'var(--c-ink-faint)', fontWeight: 600 }}>
            No course here.
            <div style={{ marginTop: 14 }}><Link to="/learn">Back to the roadmap</Link></div>
          </div>
        </div>
      </div>
    );
  }

  const title = stage?.title.en || 'Course';

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      {/* A full-width band rather than the usual header bar: this screen is
          the destination, not a step on the way to one. */}
      <div style={{ background: 'linear-gradient(160deg, var(--c-primary) 0%, var(--c-primary-hover) 60%, #3A2F8F 100%)', padding: '56px 24px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <LottieBox name={celebration} size={220} loop fallback={<CelebrationBadge size={140} />} />
          <div className="pop-in" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: '#FFD976' }}>
            {stageNo > 0 ? `STAGE ${stageNo} · COURSE COMPLETE` : 'COURSE COMPLETE'}
          </div>
          <h1 className="rise-in" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, lineHeight: 1.2, margin: 0, color: 'white' }}>
            {title}
          </h1>
          <p className="rise-in" style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', fontWeight: 600, maxWidth: 460 }}>
            {lessonCount > 0
              ? `All ${lessonCount} lesson${lessonCount === 1 ? '' : 's'}, start to finish. Here is how the course went.`
              : 'Start to finish. Here is how the course went.'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 72px', display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
        <div className="card screen-in" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <ScoreDial pct={score.pct} label="CORRECT" />
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{score.correct} of {score.total} correct</div>
            <div style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 6, lineHeight: 1.7 }}>
              Across {stageResults.length} lesson{stageResults.length === 1 ? '' : 's'} in this course
              {score.skipped > 0 ? ` · ${score.skipped} skipped` : ''}
              <br />
              {progress.xp} XP earned · {progress.streakDays}-day streak
            </div>
          </div>
        </div>

        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Stat value={String(lessonCount)} label={lessonCount === 1 ? 'Lesson finished' : 'Lessons finished'} />
          <Stat value={String(wrongCount)} label={wrongCount === 1 ? 'Question to revisit' : 'Questions to revisit'} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
          {/* Finishing the last course on the roadmap finishes the roadmap, so
              that one hands the learner on to the congratulations screen. */}
          {isFinal && (
            <LinkButton to="/congratulations" variant="primary" size="lg" style={{ width: '100%' }}>
              You finished every course — see how you did
            </LinkButton>
          )}
          <LinkButton to={`/learn/${stageId}/review-wrong`} variant={isFinal ? 'secondary' : 'primary'} size="lg" style={{ width: '100%' }}>
            {wrongCount > 0 ? `Review ${wrongCount} wrong answer${wrongCount === 1 ? '' : 's'}` : 'Review your answers'}
          </LinkButton>
          <LinkButton to="/learn" variant="secondary" size="lg" style={{ width: '100%' }}>Back to the roadmap</LinkButton>
        </div>

        {stageResults.length === 0 && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--c-ink-faint)', fontWeight: 600, textAlign: 'center' }}>
            No question-level results are saved for this course yet, so there is no breakdown to show.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat-tile" style={{ textAlign: 'center' }}>
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__sub">{label}</div>
    </div>
  );
}
