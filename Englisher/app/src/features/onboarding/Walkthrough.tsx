import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingHeader } from './OnboardingHeader';

const COPY = {
  en: {
    title: 'How Englisher works',
    steps: [
      { emoji: '📖', title: 'Lessons', desc: 'Short explanations with examples in English and Sinhala.' },
      { emoji: '✏️', title: 'Exercises', desc: 'Practice right after each lesson, with instant feedback.' },
      { emoji: '📈', title: 'Progress', desc: 'Track your streak, XP, and course completion as you go.' },
    ],
    start: "Let's check your level",
  },
  si: {
    title: 'Englisher ක්‍රියා කරන ආකාරය',
    steps: [
      { emoji: '📖', title: 'පාඩම්', desc: 'ඉංග්‍රීසි සහ සිංහල උදාහරණ සමඟ කෙටි පැහැදිලි කිරීම්.' },
      { emoji: '✏️', title: 'අභ්‍යාස', desc: 'සෑම පාඩමකින් පසුව ම ක්ෂණික ප්‍රතිචාර සමඟ අභ්‍යාස කරන්න.' },
      { emoji: '📈', title: 'ප්‍රගතිය', desc: 'ඔබේ ලකුණ, XP සහ පාඩම් සම්පූර්ණ වීම නිරීක්ෂණය කරන්න.' },
    ],
    start: 'ඔබේ මට්ටම බලමු',
  },
};

export function OnboardingWalkthrough() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const navigate = useNavigate();
  const isSi = lang === 'si';
  const c = COPY[lang];
  const bodyFont = isSi ? 'var(--font-si-body)' : 'var(--font-body)';
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  return (
    <div style={{ fontFamily: bodyFont, background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <OnboardingHeader step={4} lang={lang} onToggleLang={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 26, margin: '0 0 28px' }}>{c.title}</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {c.steps.map((step) => (
              <div key={step.title} className="card" style={{ display: 'flex', gap: 16, textAlign: 'left', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 30, flexShrink: 0 }}>{step.emoji}</div>
                <div>
                  <div style={{ fontFamily: headFont, fontWeight: 800, fontSize: 16 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '0 24px 32px' }}>
        <button type="button" onClick={() => navigate('/placement')} className="btn btn--lg btn--primary" style={{ width: '100%' }}>
          {c.start}
        </button>
      </div>
    </div>
  );
}
