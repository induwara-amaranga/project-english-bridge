import { Link } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { completedStageCount, overallPercent, stagePercent, stageStatus } from '../../domain/progress';
import { BottomNav } from '../../components/BottomNav';

export function ProgressPage() {
  const { curriculum } = useCurriculum();
  const { progress } = useProgress();
  const completed = completedStageCount(progress, curriculum);
  const overallPct = overallPercent(progress, curriculum);
  const stagesToGo = curriculum.stages.length - completed;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, background: 'var(--c-warning)', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>{progress.xp.toLocaleString()} XP total</div>
            <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>Earned across {completed + 1} stages</div>
          </div>
          <div className="card">
            <div style={{ marginBottom: 10 }}><svg width="30" height="30" viewBox="0 0 16 16" fill="#FF6B4A"><path d="M8 1C8 1 5 5 5 9C5 11.5 6.5 13.5 8 13.5C9.5 13.5 11 11.5 11 9C11 7.5 10.3 6.5 9.7 6.5C9.7 8 9 9 8.3 9C9 6.5 8 4.5 8 1Z" /></svg></div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>{progress.streakDays}-day streak</div>
            <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>Keep it going — come back tomorrow</div>
          </div>
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
