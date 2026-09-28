import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LangToggle } from '../../components/Primitives';
import { roleHome, useAuth } from '../../hooks/useAuth';

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
    value: 'යන එන ගමන් ඉංග්‍රීසි ඉගෙන ගන්න - සිංහල කතා කරන අය සඳහාම පියවරෙන් පියවර මඟ පෙන්වීම සමඟ සාදා ඇත.',
    cta: 'ඔබේ මට්ටම බලන්න', signIn: 'පිවිසෙන්න', alreadyKnow: 'ඔබේ මට්ටම දැනටමත් දන්නවාද? ලියාපදිංචි වන්න',
    steps: [
      'ඔබ සිටින තැන බැලීමට විනාඩි 2ක පරීක්ෂණයක් කරන්න',
      'ක්‍රියා කාල භේදයේ සිට විධිමත් ලිපි ලිවීම දක්වා පියවර 8ක් අනුගමනය කරන්න',
      'පුහුණු වී ක්ෂණික ප්‍රතිපෝෂණ ලබා ගන්න',
      'අඛණ්ඩතව දෛනිකව පුහුණු වී ඔබේ ප්‍රගතිය බලන්න',
    ],
    why: 'සිංහල කතා කරන අයට ඇති බොහෝ ඉංග්‍රීසි පොතපත විසිරී ඇත හෝ ව්‍යුහගත නැත\nමෙය ඔබට ආරම්භයේ සිට අවසානය දක්වා, ඔබේම භාෂාවෙන් මගපෙන්වීම සමඟ පැහැදිලි එක් මාර්ගයක් ලබා දෙයි.',
    textbookHeadline: 'පෙළපොතක් නොවේ - මගපෙන්වන ලද මාර්ගයකි.',
    textbookDifferentiator: 'කියවීමට අහඹු පරිච්ඡේද නැත. සිංහල කතා කරන්නන් මුලින්ම කරන වැරදිවලින් ආරම්භ වී, සෑම පාඩමක්ම ඊට පෙර පාඩම මත ගොඩනැගේ.',
    textbookOutcome: 'විශ්වාසයෙන් සැබෑ රාජකාරි ලිපියක් ලිවීම දක්වාම.',
  },
};

export function Home() {
  const { user, loading } = useAuth();
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';
  const c = COPY[lang];
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  // A signed-in user landing on the marketing page (e.g. a bookmark, or the
  // "/" they get bounced to on an unknown route) should go straight to their
  // own home rather than see the pitch again — mirrors RequireRole's own
  // "wait for the silent session restore before deciding" rule.
  if (loading) return null;
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', overflowX: 'hidden' }}>
      <nav className="site-nav">
        <Link to="/" className="site-nav__brand">
          <div className="site-nav__mark"><div className="site-nav__mark-dot" /></div>
          <span className="site-nav__wordmark">Englisher</span>
        </Link>
        <div className="site-nav__links">
          <a href="#how" style={{ fontWeight: 600, fontSize: 15, color: 'var(--c-ink)' }}>{isSi ? 'මෙය ක්‍රියා කරන ආකාරය' : 'How it works'}</a>
          <a href="#why" style={{ fontWeight: 600, fontSize: 15, color: 'var(--c-ink)' }}>{isSi ? 'අප තෝරාගත යුත්තේ ඇයි' : 'Why us'}</a>
          <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
          <Link to="/signin" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 38, background: 'var(--c-primary)', color: 'white', borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 15, fontFamily: headFont, boxShadow: '0 6px 0 var(--c-primary-hover)' }}>{c.signIn}</Link>
        </div>
      </nav>

      <section className="home-shell home-hero" style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 56, paddingBottom: 88 }}>
        <div className="home-hero__copy">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--c-warning-bg)', color: 'var(--c-warning-ink)', padding: '8px 16px', borderRadius: 999, fontWeight: 700, fontSize: 13, marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-warning)' }} />
            {isSi ? 'සිංහල කතා කරන අය සඳහාම සාදා ඇත' : 'Built for Sinhala speakers'}
          </div>
          <h1 className={`home-hero__title${isSi ? ' home-hero__title--si' : ''}`} style={{ fontFamily: headFont, fontWeight: 800, lineHeight: 1.2, marginTop: 0, marginBottom: 28, maxWidth: 560 }}>{c.value}</h1>
          <div className="home-hero__actions">
            <Link to="/onboarding/goal" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 49, background: 'var(--c-primary)', color: 'white', borderRadius: 14, padding: '16px 32px', fontWeight: 800, fontSize: 17, fontFamily: headFont, boxShadow: '0 6px 0 var(--c-primary-hover)' }}>{c.cta}</Link>
            <Link to="/signup" style={{ fontFamily: headFont, fontWeight: 700, fontSize: 15, lineHeight: 1.2, color: 'var(--c-ink-soft)' }}>{c.alreadyKnow}</Link>
          </div>
        </div>
        <div className="home-hero__art">
          <div style={{ position: 'absolute', left: '20%', top: '6%', width: '60%', height: '88%', borderRadius: '50%', background: 'var(--c-warning-bg)' }} />
          <img src="/assets/mascot_elephant.png" alt="" style={{ position: 'absolute', left: '24%', top: '12%', width: '52%', height: '76%', objectFit: 'contain' }} />
        </div>
      </section>

      <section id="how" className="home-shell" style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 40, paddingBottom: 88 }}>
        <h2 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 30, margin: '0 0 40px', textAlign: 'center' }}>{isSi ? 'මෙය ක්‍රියා කරන ආකාරය' : 'How it works'}</h2>
        <div className="home-steps">
          {c.steps.map((text, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={STEP_ICONS[i]} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              </div>
              <div style={{ fontFamily: headFont, fontWeight: 700, fontSize: 13, color: 'var(--c-ink-soft)' }}>{isSi ? `පියවර ${i + 1}` : `Step ${i + 1}`}</div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="why" className="home-shell" style={{ maxWidth: 900, margin: '0 auto', paddingTop: 40, paddingBottom: 88, textAlign: 'center' }}>
        <div style={{ width: 44, height: 6, borderRadius: 4, background: 'var(--c-warning)', margin: '0 auto 28px' }} />
        <p className="home-why__text" style={{ fontFamily: headFont, fontWeight: 700, lineHeight: 1.5, margin: '0 auto', maxWidth: 804, whiteSpace: 'pre-wrap' }}>{c.why}</p>
      </section>

      <section className="home-shell" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 96 }}>
        <div className="home-cta">
          <h2 className="home-cta__heading" style={{ fontFamily: headFont, fontWeight: 800, color: 'var(--c-bg)', margin: 0, lineHeight: 1.25 }}>{c.textbookHeadline}</h2>
          <div style={{ display: 'flex', flex: '1 0 0', minWidth: 0, flexDirection: 'column', gap: 20 }}>
            <p style={{ margin: 0, color: 'var(--c-bg)', opacity: 0.85, fontSize: 17, lineHeight: 1.6, fontWeight: 500 }}>{c.textbookDifferentiator}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 20px', flexWrap: 'wrap' }}>
              <img src="/assets/envelope_letter.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
              <p style={{ margin: 0, color: 'var(--c-bg)', fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{c.textbookOutcome}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-shell home-footer" style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 40, paddingBottom: 40, borderTop: '1px solid var(--c-line)' }}>
        <div className="site-nav__brand">
          <div className="site-nav__mark"><div className="site-nav__mark-dot" /></div>
          <span className="site-nav__wordmark">Englisher</span>
        </div>
        <div className="home-footer__links">
          <a href="#how" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink-soft)' }}>{isSi ? 'මෙය ක්‍රියා කරන ආකාරය' : 'How it works'}</a>
          <a href="#why" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink-soft)' }}>{isSi ? 'අප තෝරාගත යුත්තේ ඇයි' : 'Why us'}</a>
          <a href="#" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink-soft)' }}>{isSi ? 'සම්බන්ධ වන්න' : 'Contact'}</a>
          <Link to="/privacy" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink-soft)' }}>{isSi ? 'රහස්‍යතා ප්‍රතිපත්තිය' : 'Privacy'}</Link>
        </div>
        <span style={{ fontSize: 13, color: 'var(--c-ink-soft)' }}>© 2026 Englisher</span>
      </footer>
    </div>
  );
}
