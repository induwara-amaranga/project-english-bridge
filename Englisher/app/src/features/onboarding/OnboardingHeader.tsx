import { LangToggle } from '../../components/Primitives';

/** The 4-dot progress row shared by every onboarding screen (Goal, Language,
 * Streak, Walkthrough) — ported from the repeated header block in each
 * `Onboarding *.dc.html` prototype page. `step` is 1-based. */
export function OnboardingHeader({
  step,
  lang,
  onToggleLang,
}: {
  step: 1 | 2 | 3 | 4;
  lang: 'en' | 'si';
  onToggleLang: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', maxWidth: 560, margin: '0 auto', width: '100%' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{ flex: 1, height: 8, borderRadius: 999, background: i <= step ? 'var(--c-primary)' : 'var(--c-primary-tint)' }}
        />
      ))}
      <LangToggle lang={lang} onToggle={onToggleLang} />
    </div>
  );
}
