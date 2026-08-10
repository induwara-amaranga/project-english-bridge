import { useNavigate } from 'react-router-dom';
import { useParentLink } from '../../hooks/useParentLink';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { useAuth } from '../../hooks/useAuth';
import { completedStageCount, overallPercent } from '../../domain/progress';

const CHILD_NAME = 'Nimal';
const WEEK_XP = 180;

// The invitation itself is sent and accepted from the child's account (see
// /parent/access, gated to the `student` role) — a parent account has no
// self-service action here, only a status to wait on.
const LOCKED_COPY = {
  none: {
    title: 'No parent connected yet',
    body: CHILD_NAME + ' has not invited a parent. Ask them to open their Profile and send an invitation to this email address — the dashboard unlocks as soon as they do.',
  },
  invited: {
    title: 'Invitation not accepted yet',
    body: 'An invitation has been sent, but nobody has accepted it. Check your email or messages for the invitation link. The dashboard opens as soon as it is accepted.',
  },
};

export function ParentDashboard() {
  const { link } = useParentLink();
  const { curriculum } = useCurriculum();
  const { progress } = useProgress();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unlocked = link.status === 'accepted';
  const locked = (link.status === 'invited' ? LOCKED_COPY.invited : LOCKED_COPY.none);
  const logout = () => { signOut(); navigate('/signin'); };

  const completed = completedStageCount(progress, curriculum);
  const overallPct = overallPercent(progress, curriculum);
  const currentStage = curriculum.stages.find((s) => s.id === progress.currentStageId);
  const currentStageNo = currentStage ? curriculum.stages.indexOf(currentStage) + 1 : 1;

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--c-primary)', padding: 24 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="white"><circle cx="11" cy="7" r="4" /><path d="M3 20c0-4 3.5-7 8-7s8 3 8 7" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'white' }}>How {CHILD_NAME} is doing</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 4 }}>A quick look at their learning — not a report card.</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {user && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 6 }}>{user.email}</div>}
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.18)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Sign out</button>
          </div>
        </div>
      </div>

      {!unlocked && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 64px' }}>
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--c-primary-tint)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><rect x="4" y="9" width="12" height="9" rx="2.5" fill="#9B94BE" /><path d="M6.5 9V6.5C6.5 4.6 8 3 10 3C12 3 13.5 4.6 13.5 6.5V9" stroke="#9B94BE" strokeWidth="1.9" fill="none" /></svg>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{locked.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--c-ink-soft)', fontWeight: 500, maxWidth: 420, margin: '0 auto' }}>{locked.body}</div>
          </div>
        </div>
      )}

      {unlocked && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <div style={{ width: 30, height: 30, background: 'var(--c-warning)', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', marginBottom: 10 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>{WEEK_XP} XP earned this week</div>
              <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>{progress.xp.toLocaleString()} XP total</div>
            </div>
            <div className="card">
              <svg width="30" height="30" viewBox="0 0 16 16" fill="#FF6B4A" style={{ marginBottom: 10, display: 'block' }}><path d="M8 1C8 1 5 5 5 9C5 11.5 6.5 13.5 8 13.5C9.5 13.5 11 11.5 11 9C11 7.5 10.3 6.5 9.7 6.5C9.7 8 9 9 8.3 9C9 6.5 8 4.5 8 1Z" /></svg>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>{progress.streakDays}-day streak</div>
              <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>Active this week</div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 12 }}>STAGE PROGRESS</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Currently on: Stage {currentStageNo} — {currentStage?.title.en}</div>
            <div style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, marginBottom: 14 }}>{completed} of {curriculum.stages.length} stages complete</div>
            <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'var(--c-primary-tint)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: 'var(--c-primary)', width: `${overallPct}%` }} />
            </div>
          </div>

          <div style={{ background: 'var(--c-primary-tint)', borderRadius: 20, padding: 22 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, fontWeight: 700, color: '#3D3468' }}>The best way to help: ask what they learned today, not how much they scored.</p>
          </div>

          <div className="card" style={{ border: '1px solid var(--c-line)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="10" cy="10" r="8.5" stroke="var(--c-primary)" strokeWidth="1.6" /><path d="M10 6.5v4.5M10 13.5h.01" stroke="var(--c-primary)" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--c-ink-soft)', fontWeight: 500 }}>This view only shows progress, not individual answers or mistakes. {CHILD_NAME}&apos;s practice stays private.</p>
          </div>
        </div>
      )}
    </div>
  );
}
