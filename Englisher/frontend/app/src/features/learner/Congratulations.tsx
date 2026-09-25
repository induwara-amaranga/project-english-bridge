import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCurriculum } from '../../hooks/useCurriculum';
import { useProgress } from '../../hooks/useProgress';
import { useLessonResults } from '../../hooks/useLessonResults';
import { courseScore } from '../../domain/lessonResults';
import { playableStages } from '../../domain/curriculum';
import { LinkButton } from '../../components/Button';
import { LottieBox } from '../../components/LottieBox';
import { ScoreDial } from '../../components/ScoreDial';
import { CelebrationBadge } from '../../components/CelebrationBadge';
import { LangToggle } from '../../components/Primitives';
import { randomCelebration } from '../../lib/animations';
import { playSound } from '../../lib/sounds';
import { bubble } from '../../lib/bubble';
import { downloadPerformanceReport } from '../../lib/performanceReport';

// The end of the road: shown after the last course on the roadmap, where the
// per-stage completion screen stops and this takes over. The score here spans
// every question the learner has answered, not one stage's worth.

const QUOTES: { en: string; si: string; who: string }[] = [
  { en: 'A different language is a different vision of life.', si: 'වෙනස් භාෂාවක් යනු ජීවිතය පිළිබඳ වෙනස් දැක්මකි.', who: 'Federico Fellini' },
  { en: 'One language sets you in a corridor for life. Two languages open every door along the way.', si: 'එක් භාෂාවක් ඔබව ජීවිතය පුරා කොරිඩෝරයක තබයි. භාෂා දෙකක් මාර්ගය දිගේ සෑම දොරක්ම විවෘත කරයි.', who: 'Frank Smith' },
  { en: 'Language is the road map of a culture. It tells you where its people come from and where they are going.', si: 'භාෂාව යනු සංස්කෘතියක මාර්ග සිතියමයි. එහි ජනයා පැමිණියේ කොහෙන්ද, යන්නේ කොහාටද යන්න එය ඔබට කියයි.', who: 'Rita Mae Brown' },
  { en: 'Learning is a treasure that will follow its owner everywhere.', si: 'ඉගෙනීම යනු එහි හිමිකරු සෑම තැනකම අනුගමනය කරන නිධානයකි.', who: 'Chinese proverb' },
  { en: 'The limits of my language mean the limits of my world.', si: 'මගේ භාෂාවේ සීමාවන් යනු මගේ ලෝකයේ සීමාවන්ය.', who: 'Ludwig Wittgenstein' },
];

const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

export function Congratulations() {
  const { user } = useAuth();
  const { curriculum } = useCurriculum();
  const { progress } = useProgress();
  const { results, loading } = useLessonResults();
  // Both picked once per visit, so neither changes under the reader mid-screen.
  const [celebration] = useState(randomCelebration);
  const [quote] = useState(randomQuote);
  const [building, setBuilding] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';

  // "At the entry of this page" — once per mount, never on a re-render.
  useEffect(() => {
    playSound('courseComplete');
  }, []);

  const score = courseScore(results);
  const courseCount = playableStages(curriculum).length;

  const getReport = async () => {
    setBuilding(true);
    setReportError(null);
    try {
      await downloadPerformanceReport({
        learnerName: user?.name || 'Learner',
        curriculum,
        results,
        xp: progress.xp,
        streakDays: progress.streakDays,
      });
    } catch {
      setReportError(isSi ? 'වාර්තාව සෑදිය නොහැකි විය. නැවත උත්සාහ කරන්න.' : 'The report could not be built. Please try again.');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="app-shell" style={{ fontFamily: 'var(--font-body)', color: 'var(--c-ink)', background: 'var(--c-bg)' }}>
      <div style={{ background: 'linear-gradient(165deg, #2B2140 0%, var(--c-primary-hover) 45%, var(--c-primary) 100%)', padding: '60px 24px 52px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 20, right: 20 }}><LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} /></div>
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <LottieBox name={celebration} size={240} loop fallback={<CelebrationBadge size={150} />} />
          <div className="pop-in" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', color: '#FFD976' }}>{isSi ? 'සෑම පාඨමාලාවක්ම සම්පූර්ණයි' : 'EVERY COURSE COMPLETE'}</div>
          <h1 className="rise-in" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, lineHeight: 1.15, margin: 0, color: 'white' }}>
            {isSi ? `සුබ පැතුම්${user?.name ? `, ${user.name.split(' ')[0]}` : ''}!` : `Congratulations${user?.name ? `, ${user.name.split(' ')[0]}` : ''}!`}
          </h1>
          <p className="rise-in" style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', fontWeight: 600, maxWidth: 440 }}>
            {isSi
              ? `ඔබ මාවතේ ඇති පාඨමාලා ${courseCount}ම නිම කළා — ක්‍රියා කාල පාඩමේ සිට අවසාන පාඩම දක්වා සෑම පාඩමක්ම.`
              : `You have finished all ${courseCount} course${courseCount === 1 ? '' : 's'} on the roadmap — every lesson, from tenses to the last one.`}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 24px 72px', display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
        <div className="card screen-in" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <ScoreDial pct={score.pct} label={isSi ? 'නිවැරදියි' : 'CORRECT'} />
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>
              {isSi ? `${score.total}න් ${score.correct} නිවැරදියි` : `${score.correct} of ${score.total} correct`}
            </div>
            <div style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 6, lineHeight: 1.7 }}>
              {isSi
                ? `ඔබ මුළු මාවත හරහා පිළිතුරු දුන් සියල්ල${score.skipped > 0 ? ` · ${score.skipped}ක් මඟහැරී ඇත` : ''}`
                : `Everything you answered, across the whole roadmap${score.skipped > 0 ? ` · ${score.skipped} skipped` : ''}`}
              <br />
              {isSi ? `XP ${progress.xp} උපයන ලදී · දින ${progress.streakDays} අඛණ්ඩතාව` : `${progress.xp} XP earned · ${progress.streakDays}-day streak`}
            </div>
          </div>
        </div>

        {/* The quote is the point of this screen as much as the score is, so it
            gets its own surface rather than a line of small print. */}
        <blockquote className="rise-in" style={{
          margin: 0, background: 'var(--c-primary-tint)', border: '1px solid var(--c-primary-line)',
          borderRadius: 'var(--r-card)', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <svg width="26" height="20" viewBox="0 0 26 20" fill="none" aria-hidden="true">
            <path d="M0 20V11C0 4.9 3.4 0.9 9.6 0L10.6 3.4C7 4.3 5.4 6.2 5.4 9H10V20H0ZM15.4 20V11C15.4 4.9 18.8 0.9 25 0L26 3.4C22.4 4.3 20.8 6.2 20.8 9H25.4V20H15.4Z" fill="var(--c-primary)" opacity="0.55" />
          </svg>
          <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, lineHeight: 1.5, color: 'var(--c-ink)' }}>
            {isSi ? quote.si : quote.en}
          </p>
          <footer style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary)' }}>— {quote.who}</footer>
        </blockquote>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
          <button
            onClick={getReport} onPointerDown={bubble} disabled={building || loading}
            className="btn btn--lg btn--primary bubble-host" style={{ width: '100%' }}
          >
            {building ? (isSi ? 'ඔබේ වාර්තාව සකසමින්…' : 'Building your report…') : (isSi ? 'ප්‍රතිපෝෂණ PDF ලබාගන්න' : 'Get feedback PDF')}
          </button>
          <LinkButton to="/learn" variant="secondary" size="lg" style={{ width: '100%' }}>{isSi ? 'මාවතට ආපසු' : 'Back to the roadmap'}</LinkButton>
        </div>

        {reportError && (
          <p role="alert" style={{ margin: 0, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink)' }}>{reportError}</p>
        )}

        {!loading && score.total === 0 && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--c-ink-faint)', fontWeight: 600, textAlign: 'center' }}>
            {isSi
              ? 'මෙම ගිණුම සඳහා තවම ප්‍රශ්න-මට්ටමේ ප්‍රතිඵල සුරැකී නැත, එබැවින් වාර්තාවේ පාඨමාලා ලකුණු නොමැතිව පෙන්වනු ඇත.'
              : 'No question-level results are saved for this account yet, so the report will show courses without scores.'}
          </p>
        )}
      </div>
    </div>
  );
}
