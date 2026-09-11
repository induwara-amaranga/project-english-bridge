import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../../hooks/useProgress';
import { LottieBox } from '../../components/LottieBox';
import { CelebrationBadge } from '../../components/CelebrationBadge';
import { randomCelebration } from '../../lib/animations';

// Shown once, right after a guest's one and only lesson completion (see
// Exercise.tsx's showGuestPrompt — a guest never gets a second lesson before
// landing here). There is no backend account behind any of this yet: the XP
// and coins below are a local preview (domain/guestProgress.ts), and the
// lesson's raw answers are what actually get scored, for real, once signup
// replays them through completeLesson() — see SignUp.tsx.
//
// Deliberately no "skip"/"later" way past this screen — signing up here is
// mandatory, not optional, so the only action is Continue.

export function GuestSavePrompt() {
  const { progress } = useProgress();
  const navigate = useNavigate();
  const [celebration] = useState(randomCelebration);

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      <div style={{ background: 'linear-gradient(160deg, var(--c-primary) 0%, var(--c-primary-hover) 60%, #3A2F8F 100%)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <LottieBox name={celebration} size={200} loop fallback={<CelebrationBadge size={130} />} />
          <div className="pop-in" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: '#FFD976' }}>NICE START</div>
          <h1 className="rise-in" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, lineHeight: 1.25, margin: 0, color: 'white' }}>
            Don&apos;t lose this progress
          </h1>
          <p className="rise-in" style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', fontWeight: 600, maxWidth: 400 }}>
            You&apos;re trying Englisher as a guest — this progress isn&apos;t saved to an account yet. Sign up and it&apos;s yours to keep.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card screen-in" style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
          <Stat value={String(progress.xp)} label="XP" />
          <Stat value={String(progress.coins)} label="Coins" />
          <Stat value={String(progress.streakDays)} label="Day streak" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <button
            onClick={() => navigate('/signup?claimGuest=1')}
            className="btn btn--lg btn--primary"
            style={{ width: '100%' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--c-ink-soft)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );
}
