import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingHeader } from './OnboardingHeader';

const COPY = {
  en: { title: 'Pick your language', subtitle: "We'll use this for explanations and instructions.", switch: 'You can switch language choice anytime.', continue: 'Continue' },
  si: { title: 'ඔබේ භාෂාව තෝරන්න', subtitle: 'පැහැදිලි කිරීම් සහ උපදෙස් සඳහා අපි මෙය භාවිතා කරමු.', switch: 'ඔබට ඕනෑම වේලාවක භාෂා තේරීම වෙනස් කළ හැක.', continue: 'ඉදිරියට' },
};

// Each course-language option is labelled in its own script regardless of the
// UI language, so this is deliberately not part of the `COPY` deck above —
// ported as-is from Onboarding Language.dc.html.
const OPTIONS: { key: 'en' | 'si' | 'both'; label: string; sub: string; font: string }[] = [
  { key: 'en', label: 'English', sub: 'lessons + explanations in English', font: "'Inter', sans-serif" },
  { key: 'si', label: 'සිංහල', sub: 'පැහැදිලි කිරීම් සිංහලෙන්', font: "'Noto Sans Sinhala', sans-serif" },
  { key: 'both', label: 'English+සිංහල', sub: 'සිංහල උපසිරැසි සමඟ ඉංග්‍රීසි', font: "'Inter', 'Noto Sans Sinhala', sans-serif" },
];

export function OnboardingLanguage() {
  // `lang` is the UI language (the toggle in the progress row); `choice` is
  // the course language being picked on this screen — kept separate so
  // choosing Sinhala doesn't retranslate the page mid-decision (see the
  // prototype's own comment on this).
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [choice, setChoice] = useState<'en' | 'si' | 'both'>('en');
  const navigate = useNavigate();
  const isSi = lang === 'si';
  const c = COPY[lang];
  const bodyFont = isSi ? 'var(--font-si-body)' : 'var(--font-body)';
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  return (
    <div style={{ fontFamily: bodyFont, background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <OnboardingHeader step={2} lang={lang} onToggleLang={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🌐</div>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>{c.title}</h1>
          <p style={{ fontSize: 15, color: 'var(--c-ink-soft)', fontWeight: 600, margin: '0 0 28px' }}>{c.subtitle}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setChoice(opt.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  background: choice === opt.key ? 'var(--c-primary-tint)' : 'white',
                  border: `2px solid ${choice === opt.key ? 'var(--c-primary)' : 'var(--c-primary-line)'}`,
                  borderRadius: 16, padding: '18px 20px', cursor: 'pointer', fontFamily: opt.font,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 17 }}>{opt.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600 }}>{opt.sub}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--c-input-placeholder)', fontWeight: 600, marginTop: 18 }}>{c.switch}</p>
        </div>
      </div>

      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '0 24px 32px' }}>
        {/* The prototype's Continue here links to a since-removed "Onboarding
            Reminders" page (a dead link) — the streak-goal screen is next in
            the actual 4-step flow (see the progress dots), so that's where
            this goes. */}
        <button type="button" onClick={() => navigate('/onboarding/streak')} className="btn btn--lg btn--primary" style={{ width: '100%' }}>
          {c.continue}
        </button>
      </div>
    </div>
  );
}
