import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LangToggle } from '../../components/Primitives';

const STEP_ICONS = ['/assets/lock_unlocked.png', '/assets/book_lesson.png', '/assets/chat_bubble.png', '/assets/celebration_confetti.png'];

const COPY = {
  en: {
    value: 'Learn English on the go — built for Sinhala speakers with step by step guide.',
    cta: 'Check your level', signIn: 'Sign In', alreadyKnow: 'Already know your level? Sign up',
    steps: [
      'Take a 2-minute check to see where you stand',
      'Follow 8 steps, from tenses to formal letters',
      'Practice and get instant feedback',
      'Build a daily streak and watch your progress',
    ],
    why: 'Most English resources for Sinhala speakers are scattered or unstructured\nThis gives you one clear path, with guidance in your own language, from start to finish.',
    textbookHeadline: 'Not a textbook - a guided path.',
    textbookDifferentiator: 'No random chapters to skim. Every lesson builds on the one before it, starting with the mistakes Sinhala speakers make first.',
    textbookOutcome: 'All the way to writing a real formal letter with confidence.',
  },
  si: {
    value: 'ඉංග්‍රීසි ඉගෙන ගන්න, පියවරෙන් පියවර — සිංහල කතා කරන අයට විශේෂයෙන්.',
    cta: 'ඔබේ මට්ටම බලන්න', signIn: 'පිවිසෙන්න', alreadyKnow: 'ඔබේ මට්ටම දැනටමත් දන්නවාද? ලියාපදිංචි වන්න',
    steps: [
      'Take a 2-minute check to see where you stand',
      'Follow 8 steps, from tenses to formal letters',
      'Practice and get instant feedback',
      'Build a daily streak and watch your progress',
    ],
    why: 'Most English resources for Sinhala speakers are scattered or unstructured\nThis gives you one clear path, with guidance in your own language, from start to finish.',
    textbookHeadline: 'Not a textbook - a guided path.',
    textbookDifferentiator: 'No random chapters to skim. Every lesson builds on the one before it, starting with the mistakes Sinhala speakers make first.',
    textbookOutcome: 'All the way to writing a real formal letter with confidence.',
  },
};

export function Home() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';
  const c = COPY[lang];
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', overflowX: 'hidden' }}>
      <nav className="site-nav">
        <Link to="/" className="site-nav__brand">
          <div className="site-nav__mark"><div className="site-nav__mark-dot" /></div>
          <span className="site-nav__wordmark">Englisher</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, height: 50 }}>
          <a href="#how" style={{ fontWeight: 600, fontSize: 15, color: 'var(--c-ink)' }}>How it works</a>
          <a href="#why" style={{ fontWeight: 600, fontSize: 15, color: 'var(--c-ink)' }}>Why us</a>
          <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
          <Link to="/signin" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 38, background: 'var(--c-primary)', color: 'white', borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 15, fontFamily: headFont, boxShadow: '0 6px 0 var(--c-primary-hover)' }}>{c.signIn}</Link>
        </div>
      </nav>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 48px 88px', display: 'flex', gap: 48, alignItems: 'center' }}>
        <div style={{ flex: '1 0 0', minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--c-warning-bg)', color: 'var(--c-warning-ink)', padding: '8px 16px', borderRadius: 999, fontWeight: 700, fontSize: 13, marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-warning)' }} />
            Built for Sinhala speakers
          </div>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 44, lineHeight: 1.2, margin: '0 0 28px', maxWidth: 560 }}>{c.value}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 69 }}>
            <Link to="/placement" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 200, height: 49, background: 'var(--c-primary)', color: 'white', borderRadius: 14, padding: '16px 32px', fontWeight: 800, fontSize: 17, fontFamily: headFont, boxShadow: '0 6px 0 var(--c-primary-hover)' }}>{c.cta}</Link>
            <Link to="/signup" style={{ fontFamily: headFont, fontWeight: 700, fontSize: 15, lineHeight: 1.2, color: 'var(--c-ink-soft)' }}>{c.alreadyKnow}</Link>
          </div>
        </div>
        <div style={{ position: 'relative', flex: '0 0 500px', width: 500, height: 340 }}>
          <div style={{ position: 'absolute', left: 100, top: 20, width: 300, height: 300, borderRadius: '50%', background: 'var(--c-warning-bg)' }} />
          <img src="/assets/mascot_elephant.png" alt="" style={{ position: 'absolute', left: 120, top: 40, width: 260, height: 260, objectFit: 'contain' }} />
        </div>
      </section>

      <section id="how" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 48px 88px' }}>
        <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 30, margin: '0 0 40px', textAlign: 'center' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {c.steps.map((text, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={STEP_ICONS[i]} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              </div>
              <div style={{ fontFamily: headFont, fontWeight: 700, fontSize: 13, color: 'var(--c-ink-soft)' }}>Step {i + 1}</div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="why" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 48px 88px', textAlign: 'center' }}>
        <div style={{ width: 44, height: 6, borderRadius: 4, background: 'var(--c-warning)', margin: '0 auto 28px' }} />
        <p style={{ fontFamily: headFont, fontWeight: 700, fontSize: 24, lineHeight: 1.5, margin: '0 auto', maxWidth: 804, whiteSpace: 'pre-wrap' }}>{c.why}</p>
      </section>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 48px 96px' }}>
        <div style={{ background: 'var(--c-ink)', borderRadius: 28, padding: 56, display: 'flex', gap: 40, alignItems: 'center' }}>
          <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 32, color: 'var(--c-bg)', margin: 0, lineHeight: 1.25, flex: '0 0 464px', maxWidth: 464 }}>{c.textbookHeadline}</h2>
          <div style={{ display: 'flex', flex: '1 0 0', minWidth: 0, flexDirection: 'column', gap: 20 }}>
            <p style={{ margin: 0, color: 'var(--c-bg)', opacity: 0.85, fontSize: 17, lineHeight: 1.6, fontWeight: 500 }}>{c.textbookDifferentiator}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 20px' }}>
              <img src="/assets/envelope_letter.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
              <p style={{ margin: 0, color: 'var(--c-bg)', fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{c.textbookOutcome}</p>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--c-line)' }}>
        <div className="site-nav__brand">
          <div className="site-nav__mark"><div className="site-nav__mark-dot" /></div>
          <span className="site-nav__wordmark">Englisher</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          <a href="#how" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink-soft)' }}>How it works</a>
          <a href="#why" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink-soft)' }}>Why us</a>
          <a href="#" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink-soft)' }}>Contact</a>
        </div>
        <span style={{ fontSize: 13, color: 'var(--c-ink-soft)' }}>© 2026 Englisher</span>
      </footer>
    </div>
  );
}
