import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { useAuth } from '../../hooks/useAuth';
import { isLastLessonOfStage } from '../../domain/curriculum';
import { completeLesson, type CompleteLessonResult } from '../../domain/progress';
import { previewGuestLessonAward } from '../../domain/guestProgress';
import { saveLessonResult, scoreOf, type ExerciseOutcome } from '../../domain/lessonResults';
import { LangToggle } from '../../components/Primitives';
import { LinkButton } from '../../components/Button';
import { LottieBox } from '../../components/LottieBox';
import { ScoreDial } from '../../components/ScoreDial';
import { CelebrationBadge } from '../../components/CelebrationBadge';
import { CheckingTransition } from '../../components/CheckingTransition';
import { defaultAnswerFor, gradeCard, isAnswered, type Answer } from '../../domain/grading';
import type { Card } from '../../domain/types';
import { ExerciseCardView } from './ExerciseCardView';
import { playSound } from '../../lib/sounds';
import { bubble } from '../../lib/bubble';
import { CORRECT, WRONG, randomCelebration } from '../../lib/animations';

type InteractiveCard = Extract<Card, { type: 'mcq' | 'gap_fill' | 'drag_order' | 'match' | 'free_text' | 'multi_select' | 'essay' | 'rubric' | 'translate_si_en' }>;
const isInteractive = (c: Card): c is InteractiveCard => c.type !== 'text';

/** Skip and Check are the same control at opposite ends of the row, so they share their metrics. */
const ACTION_BUTTON = {
  minWidth: 168,
  borderRadius: 14,
  padding: '15px 32px',
  fontWeight: 800,
  fontSize: 17,
  fontFamily: 'var(--font-display)',
} as const;

export function ExercisePage() {
  const { stageId, lessonId } = useParams();
  const { curriculum } = useCurriculum();
  const { setProgress } = useProgress();
  const { isGuest } = useAuth();
  const navigate = useNavigate();

  const stage = curriculum.stages.find((s) => s.id === stageId);
  const lesson = stage?.lessons.find((l) => l.id === lessonId);
  const stageIndex = stage ? curriculum.stages.indexOf(stage) + 1 : 1;
  const exercises = useMemo(() => lesson?.exercises || [], [lesson]);
  const backHref = `/learn/${stageId}`;

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [allAnswers, setAllAnswers] = useState<Record<string, Answer>>({});
  const [checked, setChecked] = useState(false);
  const [complete, setComplete] = useState(false);
  const [finishing, setFinishing] = useState(false);
  /** Covers the screen while the lesson is graded, so the swap to the
   *  completion card is a cross-fade instead of a mid-request pop. */
  const [revealing, setRevealing] = useState(false);
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';
  /** One record per question, kept for the review screen — see domain/lessonResults.ts. */
  const [outcomes, setOutcomes] = useState<ExerciseOutcome[]>([]);
  /** The server's award breakdown for the completion screen — null while still answering. */
  const [award, setAward] = useState<CompleteLessonResult | null>(null);
  /** Picked once per lesson so the completion screen keeps the same animation while it is open. */
  const [celebration] = useState(randomCelebration);

  if (!stage || !lesson || exercises.length === 0) {
    return (
      <div className="app-shell" style={{ background: 'var(--c-bg)' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <div className="card" style={{ color: 'var(--c-ink-faint)', fontSize: 15, fontWeight: 600, lineHeight: 1.7 }}>
            {isSi ? 'මෙම පාඩමට තවම අභ්‍යාස නැත.' : 'This lesson has no exercises yet.'}
            <div style={{ marginTop: 14 }}><Link to={backHref}>{isSi ? 'පාඩම් වෙත' : 'Back to lessons'}</Link></div>
          </div>
        </div>
      </div>
    );
  }

  const ex = exercises[qIndex];
  const interactiveCards = (ex.cards || []).filter(isInteractive);
  const answerFor = (card: Card): Answer => (card.id in answers ? answers[card.id] : defaultAnswerFor(card));
  const setAnswer = (cardId: string, value: Answer) => {
    if (checked) return;
    setAnswers((a) => ({ ...a, [cardId]: value }));
  };

  const answered = interactiveCards.length === 0 || interactiveCards.every((c) => isAnswered(c, answerFor(c)));
  const allRight = checked && interactiveCards.every((c) => gradeCard(c, answerFor(c)));

  /** This question's answers, defaults included, as review needs to replay all of them. */
  const currentAnswers = (): Record<string, Answer> =>
    Object.fromEntries(interactiveCards.map((c) => [c.id, answerFor(c)]));

  // A stage is what a learner calls a course, so every stage ends in the
  // course-complete screen — not just the last stage in the curriculum.
  const isCourseComplete = isLastLessonOfStage(stage, lesson.id);
  const score = scoreOf(outcomes);
  // A guest is always funneled to the save prompt right after their one
  // lesson — there is no "keep going as a guest" path past it.
  const showGuestPrompt = isGuest && !!award;

  const check = () => {
    if (checked || !answered) return;
    const right = interactiveCards.every((c) => gradeCard(c, answerFor(c)));
    setChecked(true);
    playSound(right ? 'correct' : 'wrong');
    // Accumulated across the whole lesson — sent once, at the end, so the
    // server can re-grade independently rather than trust this per-question
    // local check (see ProgressService.completeLesson on the backend).
    setAllAnswers((prev) => ({ ...prev, ...answers }));
    setOutcomes((prev) => [...prev, { exerciseId: ex.id, index: qIndex, correct: right, skipped: false, answers: currentAnswers() }]);
  };

  /** Advances, or ends the lesson. Both lists are passed in rather than read
   *  from state because a skip has to finish on the same tick it records itself. */
  const advance = async (finalOutcomes: ExerciseOutcome[], submitted: Record<string, Answer>) => {
    const nextIndex = qIndex + 1;
    if (nextIndex < exercises.length) {
      setQIndex(nextIndex);
      setAnswers({});
      setChecked(false);
      return;
    }

    setRevealing(true);
    setFinishing(true);
    // A floor under the transition, not a substitute for the real request —
    // held concurrently with it so a fast reply still reads as deliberate
    // instead of flashing the overlay for a single frame.
    const minHold = new Promise<void>((resolve) => setTimeout(resolve, 700));
    if (isGuest) {
      // No backend account yet — computed and stored locally, and the raw
      // answers are kept aside to replay for real once signup creates one
      // (see domain/guestProgress.ts and SignUp.tsx).
      // This lesson is always a guest's first-ever completion.
      const stagePct = Math.round((1 / Math.max(stage.lessons.length, 1)) * 100);
      const result = previewGuestLessonAward(stage.id, lesson.id, lesson.kind, finalOutcomes, submitted, stagePct);
      setProgress(result.progress);
      setAward(result);
      await minHold;
      setFinishing(false);
    } else {
      try {
        const result = await completeLesson(stage.id, lesson.id, submitted);
        setProgress(result.progress);
        setAward(result);
      } catch {
        // Best-effort — the completion screen still shows; the server is the
        // source of truth for XP, so a failed save here costs nothing to
        // pretend it succeeded locally.
      } finally {
        await minHold;
        setFinishing(false);
      }
    }
    // Caches locally and syncs in the background — deliberately not awaited, so
    // the completion screen does not wait on a round-trip it does not need.
    void saveLessonResult({ stageId: stage.id, lessonId: lesson.id, finishedISO: new Date().toISOString(), outcomes: finalOutcomes });
    // This panel is always titled "Lesson complete!" — the course-complete
    // sound belongs to the stage-complete page itself, reached via Continue.
    playSound('lessonComplete');
    // Both flip together: the completion card mounts in the same commit that
    // starts the overlay's fade-out, so revealing it is a cross-fade.
    setComplete(true);
    setRevealing(false);
  };

  const next = () => advance(outcomes, { ...allAnswers, ...answers });

  /** Gives up on this question: recorded as wrong-and-skipped, no feedback, no
   *  sound. Anything typed here is deliberately left out of the submission —
   *  a half-finished answer must not be graded as an attempt at it. */
  const skip = () => {
    if (checked || finishing) return;
    const withSkip = [...outcomes, { exerciseId: ex.id, index: qIndex, correct: false, skipped: true, answers: currentAnswers() }];
    setOutcomes(withSkip);
    advance(withSkip, allAnswers);
  };

  const fb = interactiveCards[0]?.feedback;
  const progressPct = Math.round(((qIndex + (checked ? 1 : 0)) / exercises.length) * 100);

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      <div style={{ background: 'var(--c-primary)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to={backHref} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>{isSi ? `අදියර ${stageIndex} · අභ්‍යාසය` : `STAGE ${stageIndex} · EXERCISE`}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>
              {complete
                ? (isSi ? (lesson.title.si || lesson.title.en || 'පාඩම') : (lesson.title.en || 'Lesson'))
                : (isSi ? `ප්‍රශ්නය ${qIndex + 1} න් ${exercises.length}` : `Question ${qIndex + 1} of ${exercises.length}`)}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
            <Link to={backHref} style={{ background: 'rgba(255,255,255,0.18)', color: 'white', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{isSi ? 'පාඩම් වෙත' : 'Go to lessons'}</Link>
          </div>
        </div>
        <div style={{ maxWidth: 940, margin: '14px auto 0', height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, background: '#FFD976', width: `${complete ? 100 : progressPct}%`, transition: 'width 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)' }} />
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {!complete && (
          <>
            {/* Keyed on the question so each one animates in as it arrives. */}
            <div className="cardgrid screen-in" key={`q-${qIndex}`}>
              {(ex.cards || []).map((card) => (
                <ExerciseCardView key={card.id} card={card} answer={answerFor(card)} setAnswer={(v) => setAnswer(card.id, v)} checked={checked} lang={lang} />
              ))}
            </div>

            {checked && (
              <div
                key={`fb-${qIndex}`}
                className={allRight ? 'pop-in' : 'shake-in'}
                style={{ background: allRight ? 'var(--c-success-bg)' : 'var(--c-danger-bg)', border: `1px solid ${allRight ? 'var(--c-success)' : 'var(--c-danger)'}`, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
              >
                <LottieBox name={allRight ? CORRECT : WRONG} size={56} fallback={<OutcomeBadge ok={allRight} />} />
                <p className={lang === 'si' ? 'si' : undefined} style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.6, fontWeight: 700, color: allRight ? 'var(--c-success-ink)' : 'var(--c-danger-ink)' }}>
                  {!fb
                    ? (allRight ? (isSi ? 'නිවැරදියි.' : 'Correct.') : (isSi ? 'නිවැරදි නැත.' : 'Not quite.'))
                    : allRight
                      ? (lang === 'si' ? fb.correct.si || fb.correct.en : fb.correct.en) || (isSi ? 'නිවැරදියි.' : 'Correct.')
                      : (lang === 'si' ? fb.incorrect.si || fb.incorrect.en : fb.incorrect.en) || (isSi ? 'නිවැරදි නැත — නැවත බලන්න.' : 'Not quite — have another look.')}
                </p>
                <button onClick={next} onPointerDown={bubble} disabled={finishing} className="bubble-host press" style={{ alignSelf: 'flex-end', background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: finishing ? 'default' : 'pointer', opacity: finishing ? 0.7 : 1, flexShrink: 0 }}>
                  {finishing ? (isSi ? 'සුරකිමින්…' : 'Saving…') : qIndex + 1 >= exercises.length ? (isSi ? 'අවසන් කරන්න' : 'Finish') : (isSi ? 'ඊළඟ ප්‍රශ්නය' : 'Next question')}
                </button>
              </div>
            )}

            {!checked && (
              /* Skip left, Check right, matched in size — `ACTION_BUTTON` is
                 the shared metrics so the pair reads as one control. */
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <button
                  onClick={skip} onPointerDown={bubble} disabled={finishing} className="bubble-host press"
                  style={{ ...ACTION_BUTTON, background: 'transparent', color: 'var(--c-ink-soft)', border: '2px solid var(--c-primary-line)', cursor: 'pointer' }}
                >
                  {isSi ? 'මඟහරින්න' : 'Skip'}
                </button>
                <button onClick={check} onPointerDown={answered ? bubble : undefined} disabled={!answered} className="bubble-host press" style={{
                  ...ACTION_BUTTON,
                  background: answered ? 'var(--c-primary)' : 'var(--c-disabled)', color: 'white', border: '2px solid transparent',
                  cursor: answered ? 'pointer' : 'not-allowed',
                  boxShadow: `0 6px 0 ${answered ? 'var(--c-primary-hover)' : 'var(--c-disabled-shadow)'}`,
                }}>{isSi ? 'පරීක්ෂා කරන්න' : 'Check'}</button>
              </div>
            )}
          </>
        )}

        {complete && (
          <div className="card screen-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '36px 32px 32px' }}>
            <LottieBox name={celebration} size={200} loop fallback={<CelebrationBadge />} />
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, margin: 0 }}>{isSi ? 'පාඩම සම්පූර්ණයි!' : 'Lesson complete!'}</h2>
              <div style={{ fontSize: 15, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 6 }}>{isSi ? (lesson.title.si || lesson.title.en || 'පාඩම') : (lesson.title.en || 'Lesson')}</div>
            </div>

            <ScoreDial pct={score.pct} label={isSi ? 'නිවැරදියි' : 'CORRECT'} />

            <div style={{ fontSize: 15, color: 'var(--c-ink-soft)', fontWeight: 600 }}>
              {isSi
                ? `${score.total}න් ${score.correct} නිවැරදියි${score.skipped > 0 ? ` · ${score.skipped}ක් මඟහැරිණි` : ''}`
                : `${score.correct} of ${score.total} right${score.skipped > 0 ? ` · ${score.skipped} skipped` : ''}`}
            </div>

            {award && award.streakMilestoneDays > 0 && (
              <div style={{ background: 'var(--c-warning-bg)', border: '1px solid var(--c-warning-ink)', borderRadius: 16, padding: '14px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--c-warning-ink)' }}>
                  🔥 {isSi ? `දින ${award.streakMilestoneDays} අඛණ්ඩතාවක්!` : `${award.streakMilestoneDays}-day streak!`}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-warning-ink)' }}>
                  {isSi
                    ? `+${award.streakMilestoneBonusXp} අමතර XP · +${award.streakMilestoneBonusCoins} අමතර කාසි`
                    : `+${award.streakMilestoneBonusXp} bonus XP · +${award.streakMilestoneBonusCoins} bonus coins`}
                </div>
              </div>
            )}

            {award && (award.xpAwarded > 0 || award.coinsAwarded > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                <AwardChip label={`+${award.xpAwarded} XP`} bg="var(--c-warning-bg)" fg="var(--c-warning-ink)" />
                <AwardChip label={isSi ? `+${award.coinsAwarded} කාසි` : `+${award.coinsAwarded} coins`} bg="#FFF3D6" fg="#8C5A08" />
                {award.bonusXp > 0 && <AwardChip label={isSi ? `+${award.bonusXp} XP නිර්දෝෂී අමතරයක්!` : `+${award.bonusXp} XP flawless bonus!`} bg="var(--c-success-bg)" fg="var(--c-success-ink)" />}
                {award.bonusCoins > 0 && <AwardChip label={isSi ? `+${award.bonusCoins} අමතර කාසි` : `+${award.bonusCoins} bonus coins`} bg="var(--c-success-bg)" fg="var(--c-success-ink)" />}
              </div>
            )}

            {award?.stageOutcome && (
              award.stageOutcome.cleared ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-success-ink)' }}>
                    {isSi
                      ? `අදියර නිමයි — නිරවද්‍යතාව ${award.stageOutcome.accuracyPct}%${award.stageOutcome.perfect ? ', නිර්දෝෂී ධාවනයක්!' : ''}`
                      : `Stage cleared — ${award.stageOutcome.accuracyPct}% accuracy${award.stageOutcome.perfect ? ', a perfect run!' : ''}`}
                  </div>
                  {award.stageOutcome.perfect && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                      <AwardChip label={isSi ? `+${award.stageOutcome.bonusXp} XP අදියර-නිර්දෝෂී අමතරයක්!` : `+${award.stageOutcome.bonusXp} XP stage-perfect bonus!`} bg="var(--c-success-bg)" fg="var(--c-success-ink)" />
                      <AwardChip label={isSi ? `+${award.stageOutcome.bonusCoins} අමතර කාසි` : `+${award.stageOutcome.bonusCoins} bonus coins`} bg="var(--c-success-bg)" fg="var(--c-success-ink)" />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-warning-ink)', maxWidth: 380 }}>
                  {isSi
                    ? `නිරවද්‍යතාව ${award.stageOutcome.accuracyPct}% — ඊළඟ අදියර අගුළු හැරීමට 75%ට එළඹෙන්න. නැවත උත්සාහ කිරීමට ඔබේ වැරදි පිළිතුරු සමාලෝචනය කරන්න.`
                    : `${award.stageOutcome.accuracyPct}% accuracy — get to 75% to unlock the next stage. Review your wrong answers to retry them.`}
                </div>
              )
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 4 }}>
              <LinkButton to={`/learn/${stage.id}/${lesson.id}/review`} variant="secondary" size="lg">{isSi ? 'පිළිතුරු සමාලෝචනය' : 'Review answers'}</LinkButton>
              {showGuestPrompt ? (
                <button onClick={() => navigate('/guest-save')} onPointerDown={bubble} className="btn btn--lg btn--primary bubble-host">{isSi ? 'ඉදිරියට' : 'Continue'}</button>
              ) : isCourseComplete ? (
                <button onClick={() => navigate(`/learn/${stage.id}/complete`)} onPointerDown={bubble} className="btn btn--lg btn--primary bubble-host">{isSi ? 'ඉදිරියට' : 'Continue'}</button>
              ) : (
                <LinkButton to={backHref} variant="primary" size="lg">{isSi ? 'පාඩම් වෙත' : 'Back to lessons'}</LinkButton>
              )}
            </div>
          </div>
        )}
      </div>
      <CheckingTransition visible={revealing} label={isSi ? 'ඔබේ පිළිතුරු පරීක්ෂා කරමින්…' : 'Checking your answers…'} />
    </div>
  );
}

function AwardChip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{ background: bg, color: fg, borderRadius: 999, padding: '5px 12px', fontSize: 13, fontWeight: 700 }}>{label}</span>
  );
}

/** Stands in for correct.json / wrong.json until those files are added. */
function OutcomeBadge({ ok }: { ok: boolean }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: ok ? 'var(--c-success)' : 'var(--c-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {ok
        ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11.5L9.5 16L17 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>}
    </div>
  );
}
