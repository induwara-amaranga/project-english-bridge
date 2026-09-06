import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { isLessonComplete } from '../../domain/progress';
import { LangToggle } from '../../components/Primitives';

const PLANET_GRADIENTS = [
  'radial-gradient(circle at 35% 30%, #6EE7A8, #2FAE63 70%)',
  'radial-gradient(circle at 35% 30%, #6EF2E4, #0FA593 70%)',
  'radial-gradient(circle at 35% 30%, #A78BFA, #6C4FF6 70%)',
  'radial-gradient(circle at 35% 30%, #FF9B7E, #FF6B4A 70%)',
  'radial-gradient(circle at 35% 30%, #FFD976, #FFB800 70%)',
  'radial-gradient(circle at 35% 30%, #FF8B98, #FF4D5E 70%)',
  'radial-gradient(circle at 35% 30%, #8C7BF0, #5539E0 70%)',
  'radial-gradient(circle at 35% 30%, #8A84A8, #3A3550 70%)',
];
const GLOW_COLORS = ['#3ECF6E', '#14D8C4', '#6C4FF6', '#FF6B4A', '#FFB800', '#FF4D5E', '#5539E0', '#3A3550'];
const OFFSETS_BY_COUNT = (n: number) => {
  const base = [0, 80, -70, 90, -50, 70, -80, 60];
  return base.slice(0, Math.max(n, 1));
};
const V_STEP = 108;
const V_GAP = 42;

const CheckIcon = () => <svg width="30" height="30" viewBox="0 0 22 22" fill="none"><path d="M5 11.5L9.5 16L17 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const LockIcon = () => <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><rect x="5" y="9" width="10" height="8" rx="2" fill="white" opacity="0.85" /><path d="M7 9V6.5C7 4.5 8.3 3 10 3C11.7 3 13 4.5 13 6.5V9" stroke="white" strokeWidth="1.8" fill="none" opacity="0.85" /></svg>;
const PlayIcon = () => <svg width="28" height="28" viewBox="0 0 26 26" fill="white"><path d="M8 5L20 13L8 21Z" /></svg>;

export function StageLessons() {
  const { stageId } = useParams();
  const { curriculum, loading } = useCurriculum();
  const { progress } = useProgress();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';

  if (loading || curriculum.stages.length === 0) {
    return <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6580', fontWeight: 600 }}>{loading ? 'Loading…' : 'No courses yet.'}</div>;
  }

  const idx = curriculum.stages.findIndex((s) => s.id === stageId);
  const stage = curriculum.stages[idx] ?? curriculum.stages[0];
  const stageNo = idx + 1;
  const titleFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  if (stage.lessons.length === 0) {
    return (
      <div className="app-shell" style={{ background: '#FFFFFF' }}>
        <StageHeader stage={stage} stageNo={stageNo} lang={lang} onToggleLang={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} titleFont={titleFont} idx={idx} />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <div className="card" style={{ color: '#9B94BE', fontWeight: 600 }}>{isSi ? 'මෙම අදියර සඳහා පාඩම් තවම නොමැත.' : 'This stage has no lessons yet.'}</div>
        </div>
      </div>
    );
  }

  const offsets = OFFSETS_BY_COUNT(stage.lessons.length);
  const lessons = stage.lessons.map((lesson, i) => {
    const isDone = isLessonComplete(progress, stage.id, lesson.id);
    const doneCount = stage.lessons.filter((l) => isLessonComplete(progress, stage.id, l.id)).length;
    const isNext = !isDone && i === doneCount;
    const isLocked = !isDone && !isNext;
    let bg: string, border: string, shadow: string, labelColor: string;
    if (isDone) { bg = 'radial-gradient(circle at 35% 30%, #6EE7A8, #2FAE63 70%)'; border = 'rgba(255,255,255,0.5)'; shadow = '0 6px 0 rgba(0,0,0,0.2), 0 0 20px rgba(62,207,110,0.4)'; labelColor = '#D8FFE8'; }
    else if (isNext) { bg = 'radial-gradient(circle at 35% 30%, #A78BFA, #6C4FF6 70%)'; border = '#FFD976'; shadow = '0 6px 0 rgba(0,0,0,0.25), 0 0 26px rgba(108,79,246,0.6)'; labelColor = 'white'; }
    else { bg = 'radial-gradient(circle at 35% 30%, #6B6480, #3A3550 70%)'; border = 'rgba(255,255,255,0.15)'; shadow = '0 4px 0 rgba(0,0,0,0.2)'; labelColor = 'rgba(255,255,255,0.5)'; }
    return {
      lesson, offset: offsets[i], isDone, isNext, isLocked, bg, border, shadow, labelColor,
      floatAnim: isNext ? `float-node ${2.6 + i * 0.3}s ease-in-out infinite` : 'none',
      label: isSi ? lesson.title.si || lesson.title.en : lesson.title.en,
    };
  });

  const pathHeight = (offsets.length - 1) * (V_STEP + V_GAP) + 78;
  const pts = offsets.map((o, i) => ({ x: 120 + o, y: i * (V_STEP + V_GAP) + 39 }));
  let d = pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const midY = (p.y + c.y) / 2;
    d += ` C ${p.x} ${midY}, ${c.x} ${midY}, ${c.x} ${c.y}`;
  }

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', color: 'white', position: 'relative', overflow: 'hidden', background: '#FFFFFF', paddingBottom: 60 }}>
      <StageHeader stage={stage} stageNo={stageNo} lang={lang} onToggleLang={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} titleFont={titleFont} idx={idx} />

      <div style={{ position: 'absolute', left: 0, right: 0, top: 100, bottom: 0, zIndex: 0, overflow: 'hidden' }}>
        <img src="/assets/stage_bg_planets.png" alt="" style={{ width: '100%', height: '100%', minHeight: 1006, objectFit: 'cover', objectPosition: 'center top', opacity: 0.7 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 42, paddingBottom: 40, position: 'relative' }}>
          <svg style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 0 }} width="240" height={pathHeight} viewBox={`0 0 240 ${pathHeight}`}>
            <path d={d} stroke="#3F3A55" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" fill="none" />
          </svg>
          {lessons.map((l, i) => (
            <div key={l.lesson.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `translateX(${l.offset}px)`, position: 'relative', zIndex: 1 }}>
              <div style={{ position: 'relative' }}>
                {l.isNext && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', animation: 'pulse-ring 1.8s ease-out infinite' }} />}
                <button onClick={() => navigate(`/learn/${stage.id}/${l.lesson.id}`)} style={{ width: 78, height: 78, borderRadius: '50%', background: l.bg, border: `4px solid ${l.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: l.shadow, animation: l.floatAnim, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 10, left: 14, width: 20, height: 11, borderRadius: '50%', background: 'rgba(255,255,255,0.28)' }} />
                  {l.isLocked && <LockIcon />}
                  {l.isDone && <CheckIcon />}
                  {l.isNext && <PlayIcon />}
                </button>
              </div>
              <span style={{ height: 20, lineHeight: '20px', fontSize: 13, fontWeight: 700, textAlign: 'center', color: l.labelColor, textShadow: '0 1px 6px rgba(0,0,0,0.5)', maxWidth: 140 }}>{l.label || `Lesson ${i + 1}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StageHeader({ stage, stageNo, lang, onToggleLang, titleFont, idx }: {
  stage: ReturnType<typeof useCurriculum>['curriculum']['stages'][number]; stageNo: number; lang: 'en' | 'si'; onToggleLang: () => void; titleFont: string; idx: number;
}) {
  const isSi = lang === 'si';
  return (
    <div style={{ position: 'relative', zIndex: 2, background: '#6C4FF6', padding: '24px 24px 32px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 640, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/profile" style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="white"><circle cx="11" cy="7" r="4" /><path d="M3 20c0-4 3.5-7 8-7s8 3 8 7" /></svg>
          </Link>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '8px 14px' }}>
              <div style={{ width: 16, height: 16, background: '#FFB800', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>240 XP</span>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', right: 0, top: 0 }}><LangToggle lang={lang} onToggle={onToggleLang} /></div>
      </div>
      <div style={{ maxWidth: 640, margin: '20px auto 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/learn" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>STAGE {stageNo} · WORLD</div>
          <h1 style={{ fontFamily: titleFont, fontWeight: 800, fontSize: 24, lineHeight: 1.3, margin: '2px 0 0', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>{isSi ? stage.title.si || stage.title.en : stage.title.en}</h1>
        </div>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: PLANET_GRADIENTS[idx % PLANET_GRADIENTS.length], marginLeft: 'auto', flexShrink: 0, position: 'relative', boxShadow: `0 0 24px 4px ${GLOW_COLORS[idx % GLOW_COLORS.length]}66` }}>
          <div style={{ position: 'absolute', top: 9, left: 11, width: 18, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
        </div>
      </div>
    </div>
  );
}
