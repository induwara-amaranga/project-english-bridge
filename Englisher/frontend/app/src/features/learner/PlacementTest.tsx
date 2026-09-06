import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loadPlacement, type Placement } from '../../domain/placement';
import { submitPlacement } from '../../domain/progress';
import { errorMessage } from '../../lib/apiClient';

type Screen = 'loading' | 'error' | 'intro' | 'question' | 'feedback' | 'result';

export function PlacementTest() {
  const { continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [loadErr, setLoadErr] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [correctStages, setCorrectStages] = useState<number[]>([]);
  const [translateInput, setTranslateInput] = useState('');
  const [pending, setPending] = useState<{ isCorrect: boolean; correctLabel: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPlacement()
      .then((p) => { if (alive) { setPlacement(p); setScreen('intro'); } })
      .catch((err) => { if (alive) { setLoadErr(errorMessage(err)); setScreen('error'); } });
    return () => { alive = false; };
  }, []);

  if (screen === 'loading' || !placement) {
    return <CenteredShell>Loading…</CenteredShell>;
  }
  if (screen === 'error') {
    return <CenteredShell>Could not load the placement test: {loadErr}</CenteredShell>;
  }

  const QUESTIONS = placement.questions;
  const q = QUESTIONS[qIndex];
  const resultStage = correctStages.length ? Math.max(...correctStages) : 1;
  const resultCopy = placement.stages.find((s) => s.stage === resultStage);
  const resultStageId = resultCopy?.stageId ?? null;
  const progressPct = Math.round((qIndex / QUESTIONS.length) * 100);

  const selectAnswer = (isCorrect: boolean, correctLabel: string) => { setPending({ isCorrect, correctLabel }); setScreen('feedback'); };

  const advance = (isCorrect: boolean) => {
    const next = isCorrect ? [...correctStages, q.stage] : correctStages;
    const nextIndex = qIndex + 1;
    if (nextIndex >= QUESTIONS.length) {
      setCorrectStages(next);
      setScreen('result');
    } else {
      setCorrectStages(next);
      setQIndex(nextIndex);
      setTranslateInput('');
      setPending(null);
      setScreen('question');
    }
  };

  // "Try a lesson first" is the no-account path the intro screen promises
  // ("No account needed") — /learn is gated to signed-in students, so this
  // signs into (or creates) the shared guest account, same as Sign Up's
  // "Continue without an account", then posts the result the same way a real
  // signup would.
  const tryLessonFirst = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await continueAsGuest();
      if (resultStageId) { try { await submitPlacement(resultStageId); } catch { /* best-effort */ } }
      navigate('/learn');
    } finally {
      setBusy(false);
    }
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
        <Link to="/" style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-ink-soft)' }}>Exit test</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 64px' }}>
        {screen === 'intro' && (
          <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--c-primary-tint)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--c-primary)', position: 'relative' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-primary)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
              </div>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, margin: '0 0 16px', lineHeight: 1.3 }}>Let&apos;s find your starting point.</h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--c-ink-2)', margin: '0 0 36px' }}>{QUESTIONS.length} quick questions, about 2 minutes. No account needed — just answer honestly, there&apos;s no wrong way to do this.</p>
            <button onClick={() => setScreen('question')} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '18px 48px', fontWeight: 800, fontSize: 17, fontFamily: 'var(--font-display)', cursor: 'pointer', boxShadow: '0 6px 0 var(--c-primary-shadow)' }}>Start</button>
          </div>
        )}

        {screen === 'question' && (
          <div style={{ maxWidth: 560, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Question {qIndex + 1} of {QUESTIONS.length}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-ink-soft)' }}>{progressPct}%</span>
            </div>
            <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'var(--c-primary-tint)', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: 'var(--c-primary)', width: `${progressPct}%`, transition: 'width 0.3s' }} />
            </div>
            <button onClick={() => advance(false)} style={{ width: '100%', background: 'white', border: '2px solid var(--c-primary)', color: 'var(--c-primary)', borderRadius: 999, padding: '12px 20px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: 'pointer', marginBottom: 20 }}>Not sure — skip</button>
            <div className="card" style={{ padding: 36, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, margin: 0, lineHeight: 1.4 }}>{q.prompt}</h2>
              {q.type === 'translate' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="si" style={{ fontSize: 22, fontWeight: 600, background: 'var(--c-bg)', borderRadius: 12, padding: '16px 18px' }}>{q.sinhala}</div>
                  <input value={translateInput} onChange={(e) => setTranslateInput(e.target.value)} placeholder="Type your answer..." style={{ fontSize: 16, padding: '16px 20px', borderRadius: 999, border: '2px solid var(--c-primary-line)', outline: 'none' }} />
                  <button onClick={submitTranslate} style={{ alignSelf: 'flex-end', background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '12px 32px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: 'pointer', marginTop: 6, boxShadow: '0 4px 0 var(--c-primary-shadow)' }}>Submit</button>
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
                <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#1B5E33' }}>Correct!</div><div style={{ fontSize: 14, color: '#1B5E33', opacity: 0.85 }}>+10 XP earned</div></div>
              </div>
            ) : (
              <div style={{ background: '#FDE2E1', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FF4D5E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4L14 14M14 4L4 14" stroke="white" strokeWidth="2.4" strokeLinecap="round" /></svg>
                </div>
                <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#8C1D1D' }}>Not quite</div><div style={{ fontSize: 14, color: '#8C1D1D', opacity: 0.85 }}>Correct answer: &quot;{pending.correctLabel}&quot;</div></div>
              </div>
            )}
            <div className="card" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => advance(pending.isCorrect)} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '14px 32px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: 'pointer', boxShadow: '0 4px 0 var(--c-primary-shadow)' }}>Continue</button>
            </div>
          </div>
        )}

        {screen === 'result' && (
          <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--c-warning-bg)', margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 36, background: 'var(--c-warning)', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>Stage {resultStage} — {resultCopy?.name ?? ''}</h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--c-ink-2)', margin: '0 0 36px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>{resultCopy?.message ?? ''}</p>
            <div className="card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontWeight: 600 }}>Save this so you don&apos;t lose it. Create a free account to start Stage {resultStage} and keep your progress, XP, and streak as you go.</p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <Link to={resultStageId ? `/signup?placementStage=${encodeURIComponent(resultStageId)}` : '/signup'} style={{ background: 'var(--c-primary)', color: 'white', borderRadius: 999, padding: '14px 30px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', boxShadow: '0 4px 0 var(--c-primary-shadow)', display: 'inline-block' }}>Create account</Link>
                <button type="button" disabled={busy} onClick={tryLessonFirst} style={{ background: 'white', color: 'var(--c-primary)', border: '2px solid var(--c-primary)', borderRadius: 999, padding: '14px 30px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>Try a lesson first →</button>
              </div>
            </div>
          </div>
        )}
      </div>
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
