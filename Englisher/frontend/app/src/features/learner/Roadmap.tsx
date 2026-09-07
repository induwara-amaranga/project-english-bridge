import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { playableStages } from '../../domain/curriculum';
import { stageStatus } from '../../domain/progress';
import { BottomNav } from '../../components/BottomNav';
import { LangToggle } from '../../components/Primitives';
import { TravelTransition } from '../../components/TravelTransition';
import { LottieBox } from '../../components/LottieBox';
import { ROCKET } from '../../lib/animations';
import { bubble } from '../../lib/bubble';

const SECTORS = [
  { from: 1, to: 2, label: 'SECTOR I · FOUNDATIONS' },
  { from: 3, to: 4, label: 'SECTOR II · STRUCTURE' },
  { from: 5, to: 6, label: 'SECTOR III · TRANSLATION & WRITING' },
  { from: 7, to: 8, label: 'SECTOR IV · MASTERY' },
];
const PLANET_GRADIENTS = {
  completed: 'radial-gradient(circle at 35% 30%, #6EE7A8, #2FAE63 70%)',
  current: 'radial-gradient(circle at 35% 30%, #A78BFA, #6C4FF6 70%)',
  // Warmed up from a flat charcoal — a "not yet" should read as dormant, not bleak.
  locked: 'radial-gradient(circle at 35% 30%, #5B5570, #332F47 70%)',
};
const X_OFFSETS = [50, 66, 50, 34, 50, 66, 50, 34];
const V_GAP = 170;

const STARS = Array.from({ length: 20 }, (_, i) => ({
  top: (i * 37) % 100, left: (i * 53) % 100, size: 1 + (i % 3), opacity: 0.35 + (i % 4) * 0.15, dur: 2 + (i % 5) * 0.4,
}));
/**
 * Shooting stars. Each travels the same fixed (dx, dy) — 160px right, 220px
 * down — so one streak angle, matched to that vector below, is correct for
 * all of them; only position, speed and delay vary per star.
 */
const METEOR_DX = 160;
const METEOR_DY = 220;
/** The angle a streak needs to lie along (METEOR_DX, METEOR_DY) — see the note by its markup for why this can't just be a static `rotate` next to the animated one. */
const METEOR_ANGLE = -(Math.atan2(METEOR_DX, METEOR_DY) * 180) / Math.PI;
const METEORS = [
  { top: 20, left: 15, dur: 4.2, delay: 0 }, { top: 60, left: 70, dur: 5.1, delay: 1.4 },
  { top: 10, left: 45, dur: 3.6, delay: 2.6 }, { top: 90, left: 85, dur: 4.8, delay: 0.8 },
  { top: 140, left: 25, dur: 5.6, delay: 3.3 },
];

const LockIcon = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="5" y="9" width="10" height="8" rx="2" fill="#9B94BE" /><path d="M7 9V6.5C7 4.5 8.3 3 10 3C11.7 3 13 4.5 13 6.5V9" stroke="#9B94BE" strokeWidth="1.8" fill="none" /></svg>;
const CheckIcon = ({ size = 22 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 22 22" fill="none"><path d="M5 11.5L9.5 16L17 6" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function Roadmap() {
  const { curriculum, loading } = useCurriculum();
  const { progress } = useProgress();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [travelTo, setTravelTo] = useState<{ id: string; label: string } | null>(null);

  if (loading || curriculum.stages.length === 0) {
    return <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6580', fontWeight: 600 }}>{loading ? 'Loading your roadmap…' : 'No courses yet.'}</div>;
  }

  const isSi = lang === 'si';
  const bodyFont = isSi ? 'var(--font-si-body)' : 'var(--font-body)';
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  /**
   * Shows the travel overlay, then navigates a beat later while it is still
   * fully opaque — the route swap underneath is never actually seen. Used
   * everywhere a click lands directly on a course, in either view.
   */
  const goToStage = (stageId: string, title: string) => {
    if (travelTo) return;
    const label = isSi ? `${title} වෙත යනවා…` : `Entering ${title}…`;
    setTravelTo({ id: stageId, label });
    setTimeout(() => navigate(`/learn/${stageId}`), 620);
  };

  const totalCourses = playableStages(curriculum).length;

  const stages = curriculum.stages.map((stage, i) => {
    const n = i + 1;
    const status = stageStatus(progress, stage, curriculum);
    let statusLabel: string, statusColor: string, bg: string, border: string, badgeBg: string, titleColor: string;
    if (status === 'completed') {
      statusLabel = isSi ? 'සම්පූර්ණයි · තට්ටු කර සමාලෝචනය කරන්න' : 'Completed · Tap to review';
      statusColor = '#3E8E5B'; bg = '#F1EFE3'; border = 'none'; badgeBg = '#3ECF6E'; titleColor = '#1E1B2E';
    } else if (status === 'current') {
      statusLabel = isSi ? `ක්‍රියාත්මකයි — ${progress.currentStagePct}% සම්පූර්ණයි` : `In progress — ${progress.currentStagePct}% complete`;
      statusColor = '#6C4FF6'; bg = 'white'; border = '2px solid #6C4FF6'; badgeBg = '#6C4FF6'; titleColor = '#1E1B2E';
    } else {
      statusLabel = isSi ? `අගුළු දමා ඇත — අවසන් කරන්න අදියර ${n - 1}` : `Locked · Complete Stage ${n - 1} to unlock`;
      statusColor = '#9B94BE'; bg = '#ECE9F5'; border = 'none'; badgeBg = '#D8D3EE'; titleColor = '#9B94BE';
    }
    return { n, stage, status, title: isSi ? stage.title.si : stage.title.en, statusLabel, statusColor, bg, border, badgeBg, titleColor };
  });

  const mapStages = curriculum.stages.map((stage, i) => {
    const n = i + 1;
    const status = stageStatus(progress, stage, curriculum);
    const sector = SECTORS.find((sec) => sec.from === n);
    let mapStatus: string, statusColor: string, planetGradient: string, glow: string;
    if (status === 'completed') { mapStatus = isSi ? 'සම්පූර්ණයි' : 'Completed'; statusColor = '#6EE7A8'; planetGradient = PLANET_GRADIENTS.completed; glow = '0 0 30px 4px rgba(62,207,110,0.35)'; }
    else if (status === 'current') { mapStatus = isSi ? `${progress.currentStagePct}%` : `${progress.currentStagePct}% complete`; statusColor = '#B7A6FF'; planetGradient = PLANET_GRADIENTS.current; glow = '0 0 40px 8px rgba(108,79,246,0.55)'; }
    else { mapStatus = isSi ? 'අගුළු දමා ඇත' : 'Locked'; statusColor = '#6B6580'; planetGradient = PLANET_GRADIENTS.locked; glow = 'none'; }
    return {
      n, stage, status, title: isSi ? stage.title.si : stage.title.en,
      mapStatus, statusColor, planetGradient, glow,
      sectorLabel: sector ? sector.label : null,
      top: i * V_GAP + (sector ? 56 : 0), left: X_OFFSETS[i],
    };
  });
  const mapHeight = (mapStages.length - 1) * V_GAP + 200;
  const pts = mapStages.map((s) => ({ x: s.left * 4, y: s.top + 44 }));
  let pathD = pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i];
    const midY = (prev.y + cur.y) / 2;
    pathD += ` C ${prev.x} ${midY}, ${cur.x} ${midY}, ${cur.x} ${cur.y}`;
  }
  return (
    <div className="app-shell app-shell--nav-pad" style={{ fontFamily: bodyFont, background: '#F7F5FF', color: '#1E1B2E' }}>
      <div style={{ background: '#6C4FF6', padding: '24px 24px 32px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/profile" style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="white"><circle cx="11" cy="7" r="4" /><path d="M3 20c0-4 3.5-7 8-7s8 3 8 7" /></svg>
          </Link>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '8px 14px' }}>
              <div style={{ width: 16, height: 16, background: '#FFB800', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{progress.xp} XP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '8px 14px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#FF6B4A"><path d="M8 1C8 1 5 5 5 9C5 11.5 6.5 13.5 8 13.5C9.5 13.5 11 11.5 11 9C11 7.5 10.3 6.5 9.7 6.5C9.7 8 9 9 8.3 9C9 6.5 8 4.5 8 1Z" /></svg>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{isSi ? `දින ${progress.streakDays} අඛණ්ඩව` : `${progress.streakDays}-day streak`}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '32px 24px 0', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 24, margin: 0 }}>{isSi ? 'ඔබේ මාවත' : 'Your roadmap'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setView((v) => (v === 'list' ? 'map' : 'list'))} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ECE8FB', border: 'none', borderRadius: 999, padding: 6, cursor: 'pointer' }}>
              <span style={{ padding: '5px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12, background: view === 'list' ? 'white' : 'transparent', color: view === 'list' ? '#1E1B2E' : '#6B6580' }}>List</span>
              <span style={{ padding: '5px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12, background: view === 'map' ? 'white' : 'transparent', color: view === 'map' ? '#1E1B2E' : '#6B6580' }}>Map</span>
            </button>
            <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
          </div>
        </div>

        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {stages.map((s) => (
              <div key={s.stage.id} className="bubble-host hover-shrink" onPointerDown={bubble} onClick={() => goToStage(s.stage.id, s.title)} style={{ cursor: 'pointer', background: s.bg, borderRadius: 20, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, border: s.border }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: s.badgeBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.status === 'locked' && <LockIcon />}
                  {s.status === 'completed' && <CheckIcon />}
                  {s.status === 'current' && <span style={{ color: 'white', fontFamily: headFont, fontWeight: 800, fontSize: 18 }}>{s.n}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: headFont, fontWeight: 700, fontSize: 17, color: s.titleColor }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: s.statusColor, fontWeight: 600, marginTop: 2 }}>{s.statusLabel}</div>
                  {s.status === 'current' && (
                    <div style={{ width: '100%', height: 8, borderRadius: 999, background: '#ECE8FB', marginTop: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: '#14D8C4', width: `${progress.currentStagePct}%` }} />
                    </div>
                  )}
                </div>
                {s.status === 'completed' && (
                  <div style={{ width: 22, height: 22, background: '#FFB800', flexShrink: 0, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'map' && (
          <div style={{ background: '#0B0A16', borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
            {STARS.map((star, i) => (
              <div key={i} style={{ position: 'absolute', width: star.size, height: star.size, borderRadius: '50%', background: 'white', opacity: star.opacity, top: `${star.top}%`, left: `${star.left}%`, animation: `twinkle ${star.dur}s ease-in-out infinite` }} />
            ))}
            <div style={{ position: 'absolute', top: -60, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,79,246,0.28), transparent 70%)', filter: 'blur(10px)' }} />
            <div style={{ position: 'absolute', top: '40%', right: -100, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,216,196,0.18), transparent 70%)', filter: 'blur(10px)' }} />
            {/* A warm glow low in the frame, balancing the two cool ones above so
                the space reads as cozy rather than just cold and vast. */}
            <div style={{ position: 'absolute', bottom: -80, left: '30%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,184,0,0.14), transparent 70%)', filter: 'blur(10px)' }} />
            {/* Movement and orientation are two different divs on purpose: an
                animation's `transform` replaces the element's whole computed
                transform at each frame, so a static `rotate` sitting next to
                the animated `translate` was being silently discarded — the
                streak animated diagonally while rendering perfectly upright.
                The rotate now lives on an inner div the animation never touches. */}
            {METEORS.map((m, i) => (
              <div key={i} style={{ position: 'absolute', top: m.top, left: `${m.left}%`, width: 2, height: 46, animation: `meteor ${m.dur}s linear ${m.delay}s infinite` }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, transparent, white)', transform: `rotate(${METEOR_ANGLE}deg)` }} />
              </div>
            ))}

            <div style={{ position: 'relative', padding: '44px 24px 20px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(108,79,246,0.18)', border: '1px solid rgba(108,79,246,0.4)', color: '#B7A6FF', padding: '7px 16px', borderRadius: 999, fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', marginBottom: 20 }}>YOUR LEARNING GALAXY</div>
              <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 30, color: 'white', margin: '0 0 8px' }}>{isSi ? 'ඔබේ මාවත' : 'Your roadmap'}</h1>
              <p style={{ fontSize: 14, color: '#9B94BE', margin: '0 0 20px' }}>
                {isSi
                  ? `ගවේෂණය කිරීමට පාඨමාලා ${totalCourses}ක්.`
                  : `${totalCourses} course${totalCourses === 1 ? '' : 's'} to explore, one planet at a time.`}
              </p>
              {/* The launch entrance lives on this wrapper so it still plays
                  even while the animations folder is empty and the plain
                  image fallback is showing. */}
              <div style={{ width: 64, height: 64, margin: '0 auto', animation: 'rocket-launch 2.4s cubic-bezier(.2,.7,.3,1) both' }}>
                <LottieBox name={ROCKET} size={64} loop fallback={<img src="/assets/rocket_ship.png" alt="" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />} />
              </div>
            </div>

            <div style={{ position: 'relative', height: mapHeight, marginTop: 10 }}>
              <svg style={{ position: 'absolute', top: 0, left: 0 }} width="100%" height={mapHeight} viewBox={`0 0 400 ${mapHeight}`} preserveAspectRatio="none">
                <path d={pathD} stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeDasharray="3 12" strokeLinecap="round" fill="none" />
              </svg>
              {mapStages.map((s) => (
                <div key={s.stage.id}>
                  {s.sectorLabel && (
                    <div style={{ position: 'absolute', top: s.top, left: '50%', transform: 'translate(-50%, -56px)', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(11,10,22,0.7)', borderRadius: 14, padding: '8px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ fontFamily: headFont, fontWeight: 700, fontSize: 12, color: 'white' }}>{s.sectorLabel}</div>
                    </div>
                  )}
                  <div className="hover-target" onClick={() => goToStage(s.stage.id, s.title)} style={{ position: 'absolute', top: s.top, left: `${s.left}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 140, cursor: 'pointer' }}>
                    <div className="hover-shrink" onPointerDown={bubble} style={{ width: 88, height: 88, borderRadius: '50%', background: s.planetGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: s.glow }}>
                      {/* Clips the press bubble to the planet without hiding the orbit ring, which is drawn wider than the planet. */}
                      <span className="bubble-layer" />
                      {s.status === 'current' && <div style={{ position: 'absolute', width: 128, height: 44, border: '2px dashed rgba(255,255,255,0.55)', borderRadius: '50%', top: '50%', left: '50%', animation: 'spin-ring 9s linear infinite' }} />}
                      <div style={{ position: 'absolute', top: 14, left: 18, width: 22, height: 13, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
                      <div style={{ position: 'absolute', bottom: 16, right: 16, width: 11, height: 11, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                      <div style={{ position: 'absolute', bottom: 26, left: 14, width: 7, height: 7, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                      {s.status === 'locked' && <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><rect x="5" y="9" width="10" height="8" rx="2" fill="white" opacity="0.85" /><path d="M7 9V6.5C7 4.5 8.3 3 10 3C11.7 3 13 4.5 13 6.5V9" stroke="white" strokeWidth="1.8" fill="none" opacity="0.85" /></svg>}
                      {s.status === 'completed' && <CheckIcon size={30} />}
                      {s.status === 'current' && <span style={{ color: 'white', fontFamily: headFont, fontWeight: 800, fontSize: 24 }}>{s.n}</span>}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 4 }}>
                      <div style={{ fontFamily: headFont, fontWeight: 700, fontSize: 14, color: 'white' }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: s.statusColor, fontWeight: 700, marginTop: 2 }}>{s.mapStatus}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
      {travelTo && <TravelTransition label={travelTo.label} />}
    </div>
  );
}
