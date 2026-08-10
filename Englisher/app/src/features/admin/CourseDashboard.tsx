import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useAuth } from '../../hooks/useAuth';
import { ANALYTICS } from '../../domain/curriculum';
import { TYPE_META } from '../../domain/types';
import type { ExerciseType } from '../../domain/types';
import { repairUnlocks } from '../../domain/curriculum';

const TYPE_COLOR: Record<ExerciseType, string> = { mcq: '#6C4FF6', gap_fill: '#0FA593', drag_order: '#B37E00', match: '#FF4D5E', free_text: '#2FAE63' };
const TYPE_ORDER: ExerciseType[] = ['mcq', 'gap_fill', 'drag_order', 'match', 'free_text'];

export function CourseDashboard() {
  const { curriculum, mutate } = useCurriculum();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const logout = () => { signOut(); navigate('/signin'); };
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const e: Record<string, boolean> = {};
    curriculum.stages.forEach((s, i) => { e[s.id] = i === 0; });
    return e;
  });
  const [note, setNote] = useState('');

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const moveCourse = (stageId: string, d: number) => {
    mutate((c) => {
      const i = c.stages.findIndex((s) => s.id === stageId);
      const j = i + d;
      if (i < 0 || j < 0 || j >= c.stages.length) return;
      const tmp = c.stages[i]; c.stages[i] = c.stages[j]; c.stages[j] = tmp;
      c.stages.forEach((s, k) => { s.order = k + 1; });
      repairUnlocks(c);
    });
    setNote('Order saved');
  };

  const stages = curriculum.stages;
  const allLessons = stages.flatMap((s) => s.lessons);
  const allExercises = allLessons.flatMap((l) => l.exercises);
  const totalExercises = allExercises.length;

  const counts: Record<ExerciseType, number> = { mcq: 0, gap_fill: 0, drag_order: 0, match: 0, free_text: 0 };
  allExercises.forEach((e) => { counts[e.type]++; });
  const maxCount = Math.max(1, ...TYPE_ORDER.map((t) => counts[t]));

  const typeBars = TYPE_ORDER.map((t) => {
    const n = counts[t];
    const share = totalExercises ? Math.round((n / totalExercises) * 100) : 0;
    return { label: TYPE_META[t].label, countLabel: n === 1 ? '1 exercise' : `${n} exercises`, pct: Math.round((n / maxCount) * 100), tip: `${n} of ${totalExercises} exercises (${share}%)` };
  });

  const noSinhala = allExercises.filter((e) => !e.prompt.si).length;
  const noFeedback = allExercises.filter((e) => !e.feedback.correct.en || !e.feedback.incorrect.en).length;
  const emptyLessons = allLessons.filter((l) => l.exercises.length === 0).length;
  const emptyCourses = stages.filter((s) => s.lessons.length === 0).length;
  const mk = (bad: number, badText: string, goodText: string, detail: string) => bad > 0
    ? { icon: '!', bg: 'var(--c-warning-bg)', fg: 'var(--c-warning-ink)', headline: badText, detail }
    : { icon: '✓', bg: 'var(--c-success-bg)', fg: 'var(--c-success-ink-2)', headline: goodText, detail };

  const checks = [
    mk(noSinhala, `${noSinhala} prompts missing Sinhala`, 'All prompts translated', 'Learners on the SI toggle fall back to English.'),
    mk(noFeedback, `${noFeedback} exercises missing feedback`, 'All exercises give feedback', 'Both the correct and incorrect message should be set.'),
    mk(emptyLessons, `${emptyLessons} lessons have no exercises`, 'Every lesson has exercises', 'Empty lessons are skipped in the learner roadmap.'),
    mk(emptyCourses, `${emptyCourses} courses have no lessons`, 'Every course has lessons', 'Empty courses cannot be unlocked.'),
  ];

  const tiles = [
    { label: 'COURSES', value: stages.length, sub: stages.length === 1 ? '1 stage on the roadmap' : `${stages.length} stages on the roadmap` },
    { label: 'LESSONS', value: allLessons.length, sub: 'across all courses' },
    { label: 'EXERCISES', value: totalExercises, sub: `${TYPE_ORDER.filter((t) => counts[t] > 0).length} of 5 types in use` },
    { label: 'ACTIVE LEARNERS', value: ANALYTICS.activeLearners, sub: `${ANALYTICS.weeklyActive} active this week` },
  ];

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--c-ink)', minHeight: '100vh' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--c-line)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" className="site-nav__brand" style={{ padding: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--c-bg)' }} /></div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>Englisher</span>
          </Link>
          <div style={{ width: 1, height: 22, background: 'var(--c-line)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Course Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-ink-soft)' }}>{note}</span>
          <div style={{ background: 'var(--c-primary-tint)', color: 'var(--c-primary)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 700 }}>Draft · v{curriculum.version + 1}</div>
          {user && <span style={{ fontSize: 12, color: 'var(--c-ink-soft)' }}>{user.email}</span>}
          <button onClick={logout} style={{ background: 'none', border: '1px solid var(--c-line)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: 'var(--c-ink-2)', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 24px 64px' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {tiles.map((t) => (
            <div key={t.label} className="card" style={{ flex: 1, padding: '18px 20px', border: '1px solid var(--c-line)', borderRadius: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ink-soft)', letterSpacing: '0.06em' }}>{t.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, lineHeight: 1.1, margin: '6px 0 2px' }}>{t.value}</div>
              <div style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 600 }}>{t.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'stretch' }}>
          <div className="card" style={{ flex: 1.3, padding: '20px 22px', border: '1px solid var(--c-line)', borderRadius: 18 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, margin: 0 }}>Exercise mix</h3>
            <div style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 600, margin: '3px 0 18px' }}>{totalExercises} exercises across all courses</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {typeBars.map((b) => (
                <div key={b.label}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{b.label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c-ink-soft)' }}>{b.countLabel}</span>
                  </div>
                  <div title={b.tip} style={{ height: 10, background: 'var(--c-primary-tint)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: 10, width: `${b.pct}%`, background: 'var(--c-primary)', borderRadius: '2px 5px 5px 2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ flex: 1, padding: '20px 22px', border: '1px solid var(--c-line)', borderRadius: 18 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, margin: 0 }}>Content checks</h3>
            <div style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 600, margin: '3px 0 18px' }}>Run against the current draft</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {checks.map((ck, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: ck.bg, color: ck.fg, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ck.icon}</div>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: ck.fg }}>{ck.headline}</div><div style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 500, lineHeight: 1.5 }}>{ck.detail}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, margin: 0 }}>Courses</h2>
          <button onClick={() => navigate('/admin/editor?new=course')} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 3px 0 var(--c-primary-shadow)' }}>+ Add course</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stages.map((st, si) => {
            const a = ANALYTICS.byStage[st.id] || { completionPct: 0, learners: 0 };
            const exCount = st.lessons.reduce((n, l) => n + l.exercises.length, 0);
            const isExpanded = !!expanded[st.id];
            return (
              <div key={st.id} className="card" style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--c-line)', borderRadius: 18 }}>
                <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div onClick={() => toggle(st.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--c-ink-disabled)', width: 10 }}>{isExpanded ? '▾' : '▸'}</span>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: st.theme.to, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{st.order}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{st.title.en || '(untitled course)'}</div>
                      <div className="si" style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 600 }}>{st.title.si || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--c-ink-soft)', fontWeight: 700 }}>LESSONS</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{st.lessons.length}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'var(--c-ink-soft)', fontWeight: 700 }}>EXERCISES</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{exCount}</div></div>
                    <div style={{ width: 132 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, color: 'var(--c-ink-soft)', fontWeight: 700 }}>COMPLETED</span><span style={{ fontSize: 12, fontWeight: 700 }}>{a.completionPct}%</span></div>
                      <div title={`${a.learners} learners reached this course · ${a.completionPct}% finished it`} style={{ height: 8, background: 'var(--c-primary-tint)', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: 8, width: `${a.completionPct}%`, background: 'var(--c-primary)', borderRadius: '2px 4px 4px 2px' }} /></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div onClick={() => moveCourse(st.id, -1)} style={{ width: 20, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, fontSize: 11, cursor: 'pointer', color: si > 0 ? 'var(--c-ink-soft)' : '#DED7F8' }}>↑</div>
                      <div onClick={() => moveCourse(st.id, 1)} style={{ width: 20, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, fontSize: 11, cursor: 'pointer', color: si < stages.length - 1 ? 'var(--c-ink-soft)' : '#DED7F8' }}>↓</div>
                    </div>
                    <button onClick={() => navigate(`/admin/editor?stage=${encodeURIComponent(st.id)}`)} style={{ background: 'var(--c-primary-tint)', color: 'var(--c-primary)', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Edit course</button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--c-line)', background: '#FBFAFF', padding: '8px 22px 16px' }}>
                    {st.lessons.map((l) => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #EFECFA' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--c-primary-tint)', color: 'var(--c-primary)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{l.order}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{l.title.en || '(untitled lesson)'}</div>
                          <div style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 500, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.explanation.en || 'No explanation set'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          {TYPE_ORDER.filter((t) => l.exercises.some((e) => e.type === t)).map((t) => (
                            <span key={t} style={{ fontSize: 9.5, fontWeight: 700, color: 'white', background: TYPE_COLOR[t], borderRadius: 5, padding: '3px 6px' }}>{TYPE_META[t].short}</span>
                          ))}
                        </div>
                        <div style={{ width: 88, textAlign: 'right', flexShrink: 0 }}><span style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 600 }}>{l.exercises.length === 1 ? '1 exercise' : `${l.exercises.length} exercises`}</span></div>
                        <button onClick={() => navigate(`/admin/editor?stage=${encodeURIComponent(st.id)}&lesson=${encodeURIComponent(l.id)}`)} style={{ background: 'var(--c-primary-tint)', color: 'var(--c-primary)', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                      </div>
                    ))}
                    {st.lessons.length === 0 && <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--c-ink-faint)', fontWeight: 600 }}>No lessons yet — add the first one.</div>}
                    <button onClick={() => navigate(`/admin/editor?new=lesson&stage=${encodeURIComponent(st.id)}`)} style={{ marginTop: 12, background: 'var(--c-primary-tint)', color: 'var(--c-primary)', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Add lesson to this course</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
