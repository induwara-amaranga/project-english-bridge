import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingHeader } from './OnboardingHeader';

const COPY = {
  en: {
    title: 'Why are you learning English?',
    subtitle: "We'll shape your course around this.",
    goals: [
      { emoji: '📝', label: 'Pass an exam' },
      { emoji: '💼', label: 'Get a better job' },
      { emoji: '✈️', label: 'Travel confidently' },
      { emoji: '🌱', label: 'Just for myself' },
    ],
    continue: 'Continue',
  },
  si: {
    title: 'ඔබ ඉංග්‍රීසි ඉගෙන ගන්නේ ඇයි?',
    subtitle: 'මෙයට අනුව අපි ඔබේ පාඩම් සකසන්නෙමු.',
    goals: [
      { emoji: '📝', label: 'විභාගයක් සමත් වීමට' },
      { emoji: '💼', label: 'වඩා හොඳ රැකියාවක් සඳහා' },
      { emoji: '✈️', label: 'විශ්වාසයෙන් සංචාරය කිරීමට' },
      { emoji: '🌱', label: 'මා වෙනුවෙන්ම' },
    ],
    continue: 'ඉදිරියට',
  },
};

export function OnboardingGoal() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [selected, setSelected] = useState<number | null>(null);
  const navigate = useNavigate();
  const isSi = lang === 'si';
  const c = COPY[lang];
  const bodyFont = isSi ? 'var(--font-si-body)' : 'var(--font-body)';
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  return (
    <div style={{ fontFamily: bodyFont, background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <OnboardingHeader step={1} lang={lang} onToggleLang={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎯</div>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>{c.title}</h1>
          <p style={{ fontSize: 15, color: 'var(--c-ink-soft)', fontWeight: 600, margin: '0 0 28px' }}>{c.subtitle}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {c.goals.map((goal, i) => (
              <button
                key={goal.label}
                type="button"
                onClick={() => setSelected(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  background: selected === i ? 'var(--c-primary-tint)' : 'white',
                  border: `2px solid ${selected === i ? 'var(--c-primary)' : 'var(--c-primary-line)'}`,
                  borderRadius: 16, padding: '16px 18px', cursor: 'pointer', fontFamily: bodyFont,
                }}
              >
                <span style={{ fontSize: 24 }}>{goal.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--c-ink)' }}>{goal.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '0 24px 32px' }}>
        <button
          type="button"
          disabled={selected === null}
          onClick={() => navigate('/onboarding/language')}
          className="btn btn--lg btn--primary"
          style={{ width: '100%' }}
        >
          {c.continue}
        </button>
      </div>
    </div>
  );
}
