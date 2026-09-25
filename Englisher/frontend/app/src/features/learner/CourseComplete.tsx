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
import { LangToggle } from '../../components/Primitives';
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
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';

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
  // The same >=75%-correct gate the backend checks before advancing the stage
  // (ProgressService.evaluateStageCompletion) — computed the same way, from
  // every question answered in the course, so this reads true exactly when
  // the learner is stuck below it. (Index-vs-currentStageId would misfire on
  // the last stage, which never advances past itself even once cleared.)
  const stuck = score.total > 0 && score.pct < 75;

  if (!loading && !stage) {
    return (
      <div className="app-shell" style={{ background: 'var(--c-bg)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <div className="card" style={{ color: 'var(--c-ink-faint)', fontWeight: 600 }}>
            {isSi ? 'මෙහි පාඨමාලාවක් නැත.' : 'No course here.'}
            <div style={{ marginTop: 14 }}><Link to="/learn">{isSi ? 'මාවතට ආපසු' : 'Back to the roadmap'}</Link></div>
          </div>
        </div>
      </div>
    );
  }

  const title = isSi ? (stage?.title.si || stage?.title.en || 'පාඨමාලාව') : (stage?.title.en || 'Course');

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      {/* A full-width band rather than the usual header bar: this screen is
          the destination, not a step on the way to one. */}
      <div style={{ background: 'linear-gradient(160deg, var(--c-primary) 0%, var(--c-primary-hover) 60%, #3A2F8F 100%)', padding: '56px 24px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}><LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} /></div>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <LottieBox name={celebration} size={220} loop fallback={<CelebrationBadge size={140} />} />
          <div className="pop-in" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: '#FFD976' }}>
            {isSi
              ? (stageNo > 0 ? `අදියර ${stageNo} · පාඨමාලාව සම්පූර්ණයි` : 'පාඨමාලාව සම්පූර්ණයි')
              : (stageNo > 0 ? `STAGE ${stageNo} · COURSE COMPLETE` : 'COURSE COMPLETE')}
          </div>
          <h1 className="rise-in" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, lineHeight: 1.2, margin: 0, color: 'white' }}>
            {title}
          </h1>
          <p className="rise-in" style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', fontWeight: 600, maxWidth: 460 }}>
            {isSi
              ? (lessonCount > 0 ? `පාඩම් ${lessonCount}ම, ආරම්භයේ සිට අවසානය දක්වා. පාඨමාලාව ගියේ මෙසේය.` : 'ආරම්භයේ සිට අවසානය දක්වා. පාඨමාලාව ගියේ මෙසේය.')
              : (lessonCount > 0 ? `All ${lessonCount} lesson${lessonCount === 1 ? '' : 's'}, start to finish. Here is how the course went.` : 'Start to finish. Here is how the course went.')}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 72px', display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
        <div className="card screen-in" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <ScoreDial pct={score.pct} label={isSi ? 'නිවැරදියි' : 'CORRECT'} />
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{isSi ? `${score.total}න් ${score.correct} නිවැරදියි` : `${score.correct} of ${score.total} correct`}</div>
            <div style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 6, lineHeight: 1.7 }}>
              {isSi
                ? `මෙම පාඨමාලාවේ පාඩම් ${stageResults.length}ක් හරහා${score.skipped > 0 ? ` · ${score.skipped}ක් මඟහැරී ඇත` : ''}`
                : `Across ${stageResults.length} lesson${stageResults.length === 1 ? '' : 's'} in this course${score.skipped > 0 ? ` · ${score.skipped} skipped` : ''}`}
              <br />
              {isSi ? `XP ${progress.xp} උපයන ලදී · දින ${progress.streakDays} අඛණ්ඩතාව` : `${progress.xp} XP earned · ${progress.streakDays}-day streak`}
            </div>
          </div>
        </div>

        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Stat value={String(lessonCount)} label={isSi ? (lessonCount === 1 ? 'පාඩම නිමයි' : 'පාඩම් නිමයි') : (lessonCount === 1 ? 'Lesson finished' : 'Lessons finished')} />
          <Stat value={String(wrongCount)} label={isSi ? (wrongCount === 1 ? 'ප්‍රශ්නයක් නැවත බැලීමට' : 'ප්‍රශ්න නැවත බැලීමට') : (wrongCount === 1 ? 'Question to revisit' : 'Questions to revisit')} />
        </div>

        {stuck && (
          <div className="card screen-in" style={{ background: 'var(--c-warning-bg)', border: '1px solid var(--c-warning)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--c-warning-ink)' }}>
              {isSi ? 'තවම 75% ට එළඹී නැත' : 'Not quite 75% yet'}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--c-warning-ink)', fontWeight: 600 }}>
              {isSi
                ? 'ඊළඟ එක අගුළු හැරීමට මෙම පාඨමාලාවේ ප්‍රශ්නවලින් අවම වශයෙන් 75%ක් නිවැරදි විය යුතුය. පහත ඔබේ වැරදි පිළිතුරු නැවත උත්සාහ කිරීමට කාසි වියදම් කරන්න — එම රේඛාව ඉක්මවූ විගස ඊළඟ අදියර ස්වයංක්‍රීයව අගුළු හැරේ.'
                : 'This course needs at least 75% of its questions right to unlock the next one. Spend coins to retry your wrong answers below — the next stage unlocks automatically once you cross that line.'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
          {/* Finishing the last course on the roadmap finishes the roadmap, so
              that one hands the learner on to the congratulations screen. */}
          {isFinal && (
            <LinkButton to="/congratulations" variant="primary" size="lg" style={{ width: '100%' }}>
              {isSi ? 'ඔබ සෑම පාඨමාලාවක්ම නිම කළා — ඔබ කළේ කෙසේදැයි බලන්න' : 'You finished every course — see how you did'}
            </LinkButton>
          )}
          <LinkButton to={`/learn/${stageId}/review-wrong`} variant={isFinal ? 'secondary' : 'primary'} size="lg" style={{ width: '100%' }}>
            {isSi
              ? (wrongCount > 0 ? `වැරදි පිළිතුරු ${wrongCount}ක් සමාලෝචනය කරන්න` : 'ඔබේ පිළිතුරු සමාලෝචනය කරන්න')
              : (wrongCount > 0 ? `Review ${wrongCount} wrong answer${wrongCount === 1 ? '' : 's'}` : 'Review your answers')}
          </LinkButton>
          <LinkButton to="/learn" variant="secondary" size="lg" style={{ width: '100%' }}>{isSi ? 'මාවතට ආපසු' : 'Back to the roadmap'}</LinkButton>
        </div>

        {stageResults.length === 0 && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--c-ink-faint)', fontWeight: 600, textAlign: 'center' }}>
            {isSi
              ? 'මෙම පාඨමාලාව සඳහා තවම ප්‍රශ්න-මට්ටමේ ප්‍රතිඵල සුරැකී නැත, එබැවින් පෙන්වීමට විස්තරයක් නැත.'
              : 'No question-level results are saved for this course yet, so there is no breakdown to show.'}
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
