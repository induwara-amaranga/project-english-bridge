import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingHeader } from './OnboardingHeader';

const COPY = {
  en: {
    title: 'It can be difficult to stay focus',
    subtitle: 'Consistency beats intensity. Learning with a streak goal can take you a long way.',
    goals: ['7 Days - Great start!', '14 Days - You’re building a habit!', '30 Days - Incredible consistency!', '60 Days - You’re unstoppable!'],
    continue: 'Continue',
  },
  si: {
    title: 'අවධානය පවත්වා ගැනීම අපහසු විය හැක',
    subtitle: 'අඛණ්ඩතාව තීව්‍රතාවයට වඩා වැදගත්. ලකුණු ඉලක්කයක් සමඟ ඉගෙනීම ඔබව බොහෝ දුරක් ගෙන යා හැක.',
    goals: ['දින 7 - හොඳ ආරම්භයක්!', 'දින 14 - ඔබ පුරුද්දක් ගොඩනඟමින්!', 'දින 30 - විශිෂ්ට අඛණ්ඩතාවක්!', 'දින 60 - ඔබව නවතන්න බැහැ!'],
    continue: 'ඉදිරියට',
  },
};

export function OnboardingStreak() {
  // This screen used to be a single on/off notification toggle; it is now a
  // streak-goal picker, ported as-is from Onboarding Streak.dc.html —
  // `selected` defaults to the first option, unlike Goal which starts empty.
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const isSi = lang === 'si';
  const c = COPY[lang];
  const bodyFont = isSi ? 'var(--font-si-body)' : 'var(--font-body)';
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  return (
    <div style={{ fontFamily: bodyFont, background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <OnboardingHeader step={3} lang={lang} onToggleLang={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>{c.title}</h1>
          <p style={{ fontSize: 15, color: 'var(--c-ink-soft)', fontWeight: 600, margin: '0 0 28px', lineHeight: 1.5 }}>{c.subtitle}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {c.goals.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelected(i)}
                style={{
                  display: 'flex', alignItems: 'center', textAlign: 'left', minHeight: 48,
                  background: selected === i ? 'var(--c-primary-tint)' : 'white',
                  border: `1px solid ${selected === i ? 'var(--c-primary)' : 'var(--c-primary-line)'}`,
                  borderRadius: 20, padding: '0 24px', cursor: 'pointer', fontFamily: bodyFont,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-ink-soft)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '0 24px 32px' }}>
        <button type="button" onClick={() => navigate('/onboarding/walkthrough')} className="btn btn--lg btn--primary" style={{ width: '100%' }}>
          {c.continue}
        </button>
      </div>
    </div>
  );
}
