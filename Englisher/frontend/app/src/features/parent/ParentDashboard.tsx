import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loadParentDashboard, type ParentDashboardData } from '../../domain/parentLink';
import { ApiRequestError } from '../../lib/apiClient';

const NOT_LINKED_COPY = {
  title: 'No child connected yet',
  body: "Ask your child to open their Profile and send an invitation to this account's email address — this dashboard unlocks automatically once they do, and once you accept their invite from that email.",
};

export function ParentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);

  useEffect(() => {
    let alive = true;
    loadParentDashboard()
      .then((d) => { if (alive) setData(d); })
      .catch((err) => {
        if (!alive) return;
        if (err instanceof ApiRequestError && err.status === 404) setNotLinked(true);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const logout = () => { signOut(); navigate('/signin'); };

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--c-primary)', padding: 24 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="white"><circle cx="11" cy="7" r="4" /><path d="M3 20c0-4 3.5-7 8-7s8 3 8 7" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'white' }}>{data ? `How ${data.childName} is doing` : 'Parent dashboard'}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 4 }}>A quick look at their learning — not a report card.</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {user && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 6 }}>{user.email}</div>}
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.18)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Sign out</button>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', textAlign: 'center', color: 'var(--c-ink-soft)', fontWeight: 600 }}>Loading…</div>
      )}

      {!loading && (notLinked || !data) && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 64px' }}>
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--c-primary-tint)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><rect x="4" y="9" width="12" height="9" rx="2.5" fill="#9B94BE" /><path d="M6.5 9V6.5C6.5 4.6 8 3 10 3C12 3 13.5 4.6 13.5 6.5V9" stroke="#9B94BE" strokeWidth="1.9" fill="none" /></svg>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{NOT_LINKED_COPY.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--c-ink-soft)', fontWeight: 500, maxWidth: 420, margin: '0 auto' }}>{NOT_LINKED_COPY.body}</div>
          </div>
        </div>
      )}

      {!loading && data && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <img src="/assets/icons/xp.svg" alt="" width={30} height={30} style={{ display: 'block', marginBottom: 10 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>{data.progress.xp.toLocaleString()} XP total</div>
              <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>Earned so far</div>
            </div>
            <div className="card">
              <img src="/assets/icons/streak.svg" alt="" width={30} height={30} style={{ display: 'block', marginBottom: 10 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21 }}>{data.progress.streakDays}-day streak</div>
              <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4 }}>Keep it going</div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 12 }}>STAGE PROGRESS</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Currently on: Stage {data.completedStages + 1}{data.stageName ? ` — ${data.stageName}` : ''}</div>
            <div style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, marginBottom: 14 }}>{data.completedStages} of {data.totalStages} stages complete</div>
            <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'var(--c-primary-tint)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: 'var(--c-primary)', width: `${data.overallPercent}%` }} />
            </div>
          </div>

          {data.recentWriting.length > 0 && (
            <div className="card">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)', marginBottom: 12 }}>RECENT WRITING</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.recentWriting.map((w, i) => (
                  <div key={i} style={{ borderBottom: i === data.recentWriting.length - 1 ? 'none' : '1px solid var(--c-line)', paddingBottom: i === data.recentWriting.length - 1 ? 0 : 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-ink-soft)', marginBottom: 4 }}>{w.lessonId} · {w.status === 'submitted' ? 'Submitted' : 'Draft'}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--c-ink-2)', lineHeight: 1.5 }}>{w.excerpt || '(nothing written yet)'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--c-primary-tint)', borderRadius: 20, padding: 22 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, fontWeight: 700, color: '#3D3468' }}>The best way to help: ask what they learned today, not how much they scored.</p>
          </div>

          <div className="card" style={{ border: '1px solid var(--c-line)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="10" cy="10" r="8.5" stroke="var(--c-primary)" strokeWidth="1.6" /><path d="M10 6.5v4.5M10 13.5h.01" stroke="var(--c-primary)" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--c-ink-soft)', fontWeight: 500 }}>This view only shows progress, not individual answers or mistakes. {data.childName}&apos;s practice stays private beyond a short excerpt of their writing.</p>
          </div>
        </div>
      )}
    </div>
  );
}
