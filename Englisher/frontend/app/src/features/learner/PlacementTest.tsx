import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loadPlacement, type Placement } from '../../domain/placement';
import { setGuestStage } from '../../domain/guestProgress';
import { errorMessage } from '../../lib/apiClient';
import { LangToggle } from '../../components/Primitives';

type Screen = 'loading' | 'error' | 'intro' | 'question' | 'feedback' | 'summary' | 'result';

/** mm:ss, dropping the minutes when under a minute — a placement test is short enough that "0:42" reads better than "00:42". */
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function PlacementTest() {
  const { enterGuestMode } = useAuth();
  const navigate = useNavigate();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [loadErr, setLoadErr] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [correctStages, setCorrectStages] = useState<number[]>([]);
  const [translateInput, setTranslateInput] = useState('');
  const [pending, setPending] = useState<{ isCorrect: boolean; correctLabel: string } | null>(null);
  // Wall-clock, not a running stopwatch: only the total at the end matters,
  // so one timestamp captured at Start and one at the last question is
  // enough — no interval to tick and clean up.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';

  useEffect(() => {
    let alive = true;
    loadPlacement()
      .then((p) => { if (alive) { setPlacement(p); setScreen('intro'); } })
      .catch((err) => { if (alive) { setLoadErr(errorMessage(err)); setScreen('error'); } });
    return () => { alive = false; };
  }, []);

  if (screen === 'loading' || !placement) {
    return <CenteredShell>{isSi ? 'පූරණය වෙමින්…' : 'Loading…'}</CenteredShell>;
  }
  if (screen === 'error') {
    return <CenteredShell>{isSi ? `ස්ථානගත පරීක්ෂණය පූරණය කළ නොහැකි විය: ${loadErr}` : `Could not load the placement test: ${loadErr}`}</CenteredShell>;
  }

  const QUESTIONS = placement.questions;
  const q = QUESTIONS[qIndex];
  const resultStage = correctStages.length ? Math.max(...correctStages) : 1;
  const resultCopy = placement.stages.find((s) => s.stage === resultStage);
  const resultStageId = resultCopy?.stageId ?? null;
  const progressPct = Math.round((qIndex / QUESTIONS.length) * 100);
  // correctStages has one entry per correct *answer*, not per stage — a
  // question's stage number is just what it pushes on a correct answer.
  const scorePct = QUESTIONS.length ? Math.round((correctStages.length / QUESTIONS.length) * 100) : 0;

  const selectAnswer = (isCorrect: boolean, correctLabel: string) => { setPending({ isCorrect, correctLabel }); setScreen('feedback'); };

  const advance = (isCorrect: boolean) => {
    const next = isCorrect ? [...correctStages, q.stage] : correctStages;
    const nextIndex = qIndex + 1;
    if (nextIndex >= QUESTIONS.length) {
      setCorrectStages(next);
      setElapsedMs(Date.now() - (startedAt ?? Date.now()));
      setScreen('summary');
    } else {
      setCorrectStages(next);
      setQIndex(nextIndex);
      setTranslateInput('');
      setPending(null);
      setScreen('question');
    }
  };

  // "Try a lesson first" is the no-account path the intro screen promises
  // ("No account needed") — purely local guest mode, same as Sign Up's
  // "Continue without an account": no backend call at all until a real
  // signup replays whatever lesson gets played (see domain/guestProgress.ts).
  const tryLessonFirst = () => {
    enterGuestMode();
    if (resultStageId) setGuestStage(resultStageId);
    navigate('/learn');
  };

  const submitTranslate = () => {
    if (q.type !== 'translate') return;
    const val = translateInput.toLowerCase();
    const isCorrect = val.includes('school') && (val.includes('go') || val.includes('going'));
    selectAnswer(isCorrect, 'I go to school');
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="site-nav">
        <Link to="/" className="site-nav__brand"><div className="site-nav__mark"><div className="site-nav__mark-dot" /></div><span className="site-nav__wordmark">Englisher</span></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
          <Link to="/" style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-ink-soft)' }}>{isSi ? 'පරීක්ෂණයෙන් පිටවන්න' : 'Exit test'}</Link>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 64px' }}>
        {screen === 'intro' && (
          <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--c-primary-tint)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--c-primary)', position: 'relative' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-primary)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
              </div>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, margin: '0 0 16px', lineHeight: 1.3 }}>{isSi ? 'ඔබේ ආරම්භක ලක්ෂ්‍යය සොයමු.' : "Let's find your starting point."}</h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--c-ink-2)', margin: '0 0 36px' }}>
              {isSi
                ? `ඉක්මන් ප්‍රශ්න ${QUESTIONS.length}ක්, විනාඩි 2ක් පමණ. ගිණුමක් අවශ්‍ය නැත — අවංකව පිළිතුරු දෙන්න, මෙය කිරීමට වැරදි ක්‍රමයක් නැත.`
                : `${QUESTIONS.length} quick questions, about 2 minutes. No account needed — just answer honestly, there's no wrong way to do this.`}
            </p>
            <button onClick={() => { setStartedAt(Date.now()); setScreen('question'); }} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '18px 48px', fontWeight: 800, fontSize: 17, fontFamily: 'var(--font-display)', cursor: 'pointer', boxShadow: '0 6px 0 var(--c-primary-shadow)' }}>{isSi ? 'ආරම්භ කරන්න' : 'Start'}</button>
          </div>
        )}

        {screen === 'question' && (
          <div style={{ maxWidth: 560, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{isSi ? `ප්‍රශ්නය ${qIndex + 1} න් ${QUESTIONS.length}` : `Question ${qIndex + 1} of ${QUESTIONS.length}`}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-ink-soft)' }}>{progressPct}%</span>
            </div>
            <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'var(--c-primary-tint)', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: 'var(--c-primary)', width: `${progressPct}%`, transition: 'width 0.3s' }} />
            </div>
            <button onClick={() => advance(false)} style={{ width: '100%', background: 'white', border: '2px solid var(--c-primary)', color: 'var(--c-primary)', borderRadius: 999, padding: '12px 20px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: 'pointer', marginBottom: 20 }}>{isSi ? 'විශ්වාස නැත — මඟහරින්න' : 'Not sure — skip'}</button>
            <div className="card" style={{ padding: 36, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, margin: 0, lineHeight: 1.4 }}>{q.prompt}</h2>
              {q.type === 'translate' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="si" style={{ fontSize: 22, fontWeight: 600, background: 'var(--c-bg)', borderRadius: 12, padding: '16px 18px' }}>{q.sinhala}</div>
                  <input value={translateInput} onChange={(e) => setTranslateInput(e.target.value)} placeholder={isSi ? 'ඔබේ පිළිතුර ටයිප් කරන්න...' : 'Type your answer...'} style={{ fontSize: 16, padding: '16px 20px', borderRadius: 999, border: '2px solid var(--c-primary-line)', outline: 'none' }} />
                  <button onClick={submitTranslate} style={{ alignSelf: 'flex-end', background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '12px 32px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: 'pointer', marginTop: 6, boxShadow: '0 4px 0 var(--c-primary-shadow)' }}>{isSi ? 'ඉදිරිපත් කරන්න' : 'Submit'}</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {q.options.map((label) => (
                    <button key={label} onClick={() => selectAnswer(label === q.correct, q.correct)} style={{ textAlign: 'left', background: 'white', border: '2px solid var(--c-primary-tint)', borderRadius: 16, padding: '16px 20px', fontSize: 16, fontWeight: 600, cursor: 'pointer', color: 'var(--c-ink)' }}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {screen === 'feedback' && pending && (
          <div style={{ maxWidth: 560, width: '100%' }}>
            {pending.isCorrect ? (
              <div style={{ background: '#DEF7E3', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#34C759', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10.5L8 14.5L16 5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#1B5E33' }}>{isSi ? 'නිවැරදියි!' : 'Correct!'}</div><div style={{ fontSize: 14, color: '#1B5E33', opacity: 0.85 }}>{isSi ? '+10 XP උපයන ලදී' : '+10 XP earned'}</div></div>
              </div>
            ) : (
              <div style={{ background: '#FDE2E1', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FF4D5E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4L14 14M14 4L4 14" stroke="white" strokeWidth="2.4" strokeLinecap="round" /></svg>
                </div>
                <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#8C1D1D' }}>{isSi ? 'නිවැරදි නැත' : 'Not quite'}</div><div style={{ fontSize: 14, color: '#8C1D1D', opacity: 0.85 }}>{isSi ? `නිවැරදි පිළිතුර: "${pending.correctLabel}"` : `Correct answer: "${pending.correctLabel}"`}</div></div>
              </div>
            )}
            <div className="card" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => advance(pending.isCorrect)} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '14px 32px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: 'pointer', boxShadow: '0 4px 0 var(--c-primary-shadow)' }}>{isSi ? 'ඉදිරියට' : 'Continue'}</button>
            </div>
          </div>
        )}

        {screen === 'summary' && (
          <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--c-primary-tint)', margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 20 20" fill="none"><path d="M4 10.5L8 14.5L16 5" stroke="var(--c-primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>{isSi ? 'පරීක්ෂණය සම්පූර්ණයි!' : 'Test complete!'}</h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--c-ink-2)', margin: '0 0 28px' }}>{isSi ? 'ඔබ කළේ මෙයයි.' : "Here's how you did."}</p>
            <div className="card" style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 24 }}>
              <SummaryStat value={`${scorePct}%`} label={isSi ? 'ලකුණු' : 'Score'} />
              <SummaryStat value={formatDuration(elapsedMs)} label={isSi ? 'ගත වූ කාලය' : 'Time taken'} />
              <SummaryStat value={isSi ? `අදියර ${resultStage}` : `Stage ${resultStage}`} label={isSi ? 'ගැලපෙන මට්ටම' : 'Suitable level'} />
            </div>
            <button onClick={() => setScreen('result')} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '18px 48px', fontWeight: 800, fontSize: 17, fontFamily: 'var(--font-display)', cursor: 'pointer', boxShadow: '0 6px 0 var(--c-primary-shadow)' }}>{isSi ? 'ඉදිරියට' : 'Continue'}</button>
          </div>
        )}

        {screen === 'result' && (
          <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--c-warning-bg)', margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/assets/icons/xp.svg" alt="" width={48} height={48} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>{isSi ? `අදියර ${resultStage}` : `Stage ${resultStage}`} — {resultCopy?.name ?? ''}</h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--c-ink-2)', margin: '0 0 36px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>{resultCopy?.message ?? ''}</p>
            <div className="card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontWeight: 600 }}>
                {isSi
                  ? `මෙය අහිමි නොවී තබා ගැනීමට. නොමිලේ ගිණුමක් සාදා අදියර ${resultStage} ආරම්භ කර ඔබේ ප්‍රගතිය, XP, සහ අඛණ්ඩතාව තබා ගන්න.`
                  : `Save this so you don't lose it. Create a free account to start Stage ${resultStage} and keep your progress, XP, and streak as you go.`}
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <Link to={resultStageId ? `/signup?placementStage=${encodeURIComponent(resultStageId)}` : '/signup'} style={{ background: 'var(--c-primary)', color: 'white', borderRadius: 999, padding: '14px 30px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', boxShadow: '0 4px 0 var(--c-primary-shadow)', display: 'inline-block' }}>{isSi ? 'ගිණුමක් සාදන්න' : 'Create account'}</Link>
                <button type="button" onClick={tryLessonFirst} style={{ background: 'white', color: 'var(--c-primary)', border: '2px solid var(--c-primary)', borderRadius: 999, padding: '14px 30px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: 'pointer' }}>{isSi ? 'මුලින්ම පාඩමක් උත්සාහ කරන්න →' : 'Try a lesson first →'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
      {children}
    </div>
  );
}
