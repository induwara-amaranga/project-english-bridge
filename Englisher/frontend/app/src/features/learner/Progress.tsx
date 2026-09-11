import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { buyStreakFreeze, completedStageCount, overallPercent, stagePercent, stageStatus, STREAK_FREEZE_COST_COINS } from '../../domain/progress';
import { BottomNav } from '../../components/BottomNav';
import { errorMessage } from '../../lib/apiClient';

export function ProgressPage() {
  const { curriculum } = useCurriculum();
  const { progress, setProgress } = useProgress();
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const completed = completedStageCount(progress, curriculum);
  const overallPct = overallPercent(progress, curriculum);
  const stagesToGo = curriculum.stages.length - completed;
  const levelPct = progress.xpForNextLevel > 0 ? Math.min(100, Math.round((progress.xpIntoLevel / progress.xpForNextLevel) * 100)) : 100;

  const purchaseStreakFreeze = async () => {
    if (buying || progress.coins < STREAK_FREEZE_COST_COINS) return;
    setBuying(true);
    setBuyError(null);
    try {
      setProgress(await buyStreakFreeze());
    } catch (err) {
      setBuyError(errorMessage(err));
    } finally {
      setBuying(false);
    }
  };

  const stageRows = curriculum.stages.map((stage, i) => {
    const status = stageStatus(progress, stage, curriculum);
    const pct = stagePercent(progress, stage) || (status === 'completed' ? 100 : 0);
    let label: string, labelColor: string, barColor: string, badgeBg: string;
    if (status === 'completed') { label = '100% complete'; labelColor = '#3E8E5B'; barColor = 'var(--c-success)'; badgeBg = 'var(--c-success)'; }
    else if (status === 'current') { label = `${pct}% complete`; labelColor = 'var(--c-primary)'; barColor = 'var(--c-primary)'; badgeBg = 'var(--c-primary)'; }
    else { label = 'Locked'; labelColor = 'var(--c-ink-disabled)'; barColor = 'var(--c-primary-tint)'; badgeBg = '#D8D2F0'; }
    return { stage, n: i + 1, pct, label, labelColor, barColor, badgeBg };
  });

  return (
    <div className="app-shell app-shell--nav-pad" style={{ background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      <div style={{ background: 'var(--c-primary)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/learn" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'white', fontFamily: 'var(--font-display)' }}>Your Progress</div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div style={{ marginBottom: 10 }}>
              <img src="/assets/icons/xp.svg" alt="" width={30} height={30} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>{progress.xp.toLocaleString()} XP total</div>
            <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>Earned across {completed + 1} stages</div>
          </div>
          <div className="card">
            <div style={{ marginBottom: 10 }}><img src="/assets/icons/streak.svg" alt="" width={30} height={30} /></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>{progress.streakDays}-day streak</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700, color: 'var(--c-ink-soft)' }}>
                <img src="/assets/icons/streak_freeze.svg" alt="" width={16} height={16} />
                ×{progress.streakFreezes}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>Keep it going — come back tomorrow</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div style={{ marginBottom: 10 }}>
              <img src="/assets/icons/coins.svg" alt="" width={28} height={28} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>{progress.coins.toLocaleString()} coins</div>
            <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>Spend on streak freezes or question retries</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13 }}>{progress.level}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>Level {progress.level}</div>
            <div style={{ width: '100%', height: 8, borderRadius: 999, background: 'var(--c-primary-tint)', overflow: 'hidden', margin: '8px 0 4px' }}>
              <div style={{ height: '100%', borderRadius: 999, background: 'var(--c-primary)', width: `${levelPct}%` }} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600 }}>{progress.xpIntoLevel} / {progress.xpForNextLevel} XP to next level</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
              <img src="/assets/icons/streak_freeze.svg" alt="" width={18} height={18} />
              Streak freeze ×{progress.streakFreezes}
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 2 }}>Protects your streak the next time you miss a day</div>
            {buyError && <div style={{ fontSize: 12, color: 'var(--c-danger)', fontWeight: 600, marginTop: 4 }}>{buyError}</div>}
          </div>
          <button
            onClick={purchaseStreakFreeze}
            disabled={buying || progress.coins < STREAK_FREEZE_COST_COINS}
            className="btn btn--primary"
            style={{ padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14, flexShrink: 0, opacity: buying || progress.coins < STREAK_FREEZE_COST_COINS ? 0.5 : 1, cursor: buying || progress.coins < STREAK_FREEZE_COST_COINS ? 'not-allowed' : 'pointer' }}
          >
            {buying ? 'Buying…' : `Buy for ${STREAK_FREEZE_COST_COINS} coins`}
          </button>
        </div>

        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{completed} of {curriculum.stages.length} stages complete — {overallPct}% of the course</div>
          <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'var(--c-primary-tint)', overflow: 'hidden', margin: '10px 0' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'var(--c-primary)', width: `${overallPct}%` }} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600 }}>{stagesToGo} stages to go until your certificate</div>
        </div>

        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 16 }}>STAGE BREAKDOWN</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {stageRows.map((row) => (
              <div key={row.stage.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: row.badgeBg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{row.n}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{row.stage.title.en}</div>
                  <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'var(--c-primary-tint)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: row.barColor, width: `${row.pct}%` }} />
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: row.labelColor, width: 90, textAlign: 'right', flexShrink: 0 }}>{row.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
