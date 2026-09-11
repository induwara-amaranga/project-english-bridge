import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LangToggle, RoleToggle } from '../../components/Primitives';
import { roleHome, useAuth, type Role } from '../../hooks/useAuth';
import { errorMessage } from '../../lib/apiClient';
import { completeLesson, submitPlacement } from '../../domain/progress';
import { clearGuestSession, setGuestStage, takePendingGuestLesson } from '../../domain/guestProgress';

const COPY = {
  en: {
    framing: "Save your progress so it's here next time you come back.",
    accountType: 'I am signing up as a',
    nameLabel: 'Your name', namePlaceholder: 'Your name',
    ageLabel: 'Your age', agePlaceholder: 'Your age',
    emailLabel: 'Email address', emailPlaceholder: 'Email address',
    passwordLabel: 'Create a password', passwordPlaceholder: 'At least 8 characters',
    submit: 'Save and continue', submitting: 'Creating your account…', secondary: 'Continue without an account',
    or: 'OR', google: 'Continue with Google', facebook: 'Continue with Facebook', signIn: 'Sign In',
    oauthUnavailable: 'Social sign-up is not available yet — please fill in the form.',
  },
  si: {
    framing: 'ඔබේ ප්‍රගතිය සුරකින්න, ඊළඟ වතාවේ ආපහු එනකොට තියෙන්න.',
    accountType: 'ගිණුම් වර්ගය',
    nameLabel: 'ඔබේ නම', namePlaceholder: 'ඔබේ නම',
    ageLabel: 'ඔබේ වයස', agePlaceholder: 'ඔබේ වයස',
    emailLabel: 'විද්‍යුත් තැපැල් ලිපිනය', emailPlaceholder: 'විද්‍යුත් තැපැල් ලිපිනය',
    passwordLabel: 'මුරපදයක් සාදන්න', passwordPlaceholder: 'අවම වශයෙන් අකුරු 8ක්',
    submit: 'සුරකින්න, ඉදිරියට යන්න', submitting: 'ගිණුම සාදමින්…', secondary: 'ගිණුමකින් තොරව ඉදිරියට යන්න',
    or: 'හෝ', google: 'Google සමඟ ඉදිරියට යන්න', facebook: 'Facebook සමඟ ඉදිරියට යන්න', signIn: 'පිවිසෙන්න',
    oauthUnavailable: 'සමාජ මාධ්‍ය ලියාපදිංචිය තවම නොමැත — කරුණාකර පෝරමය පුරවන්න.',
  },
};

const GoogleMark = () => <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20.5H24v7h11.3C33.7 31.9 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l5.4-5.4C33.5 7.1 29 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.5-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l5.8 4.2C13.7 15.6 18.5 12.5 24 12.5c2.8 0 5.3 1 7.3 2.7l5.4-5.4C33.5 7.1 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 43c5.2 0 9.9-1.7 13.6-4.6l-6.3-5.3c-2 1.4-4.5 2.2-7.3 2.2-5.3 0-9.7-3.1-11.3-7.5l-5.9 4.5C9.5 38.5 16.2 43 24 43z" /><path fill="#1976D2" d="M43.6 20.5H42V20.5H24v7h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.3 5.3C41.4 35.3 43 30 43 24c0-1.3-.1-2.5-.4-3.5z" /></svg>;
const FacebookMark = () => <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 5.99 4.39 10.96 10.13 11.86v-8.4H7.09v-3.46h3.04V9.41c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.88v2.25h3.32l-.53 3.46h-2.79v8.4C19.61 23.03 24 18.06 24 12.07z" /></svg>;

export function SignUp() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signUp, enterGuestMode, exitGuestMode } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Set by PlacementTest's "Create account" link so a result taken before
  // signing up is not lost the moment a real account exists to hold it.
  const placementStage = params.get('placementStage');
  // Set by GuestSavePrompt's "Continue" button — this signup is claiming a
  // guest session's progress, not starting fresh.
  const claimGuest = params.get('claimGuest') === '1';
  const c = COPY[lang];
  const isSi = lang === 'si';
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  const applyPlacement = async (userRole: Role) => {
    if (!placementStage || userRole !== 'student') return;
    try { await submitPlacement(placementStage); } catch { /* best-effort — the roadmap still works without it */ }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const user = await signUp(name || 'Learner', email, password, role);
      // The new account is real and signed in at this point — replaying the
      // guest's one lesson through the normal, server-graded completeLesson
      // call is what actually awards it, exactly as if they had done it
      // signed in the whole time. Nothing about the award is trusted from
      // the client's own local preview.
      if (claimGuest && user.role === 'student') {
        const pending = takePendingGuestLesson();
        if (pending) {
          try { await completeLesson(pending.stageId, pending.lessonId, pending.answers); } catch { /* best-effort */ }
        }
      }
      // Both matter: exitGuestMode flips the React state (useProgress reads
      // it immediately, no reload needed), clearGuestSession wipes the data
      // it was reading.
      exitGuestMode();
      clearGuestSession();
      await applyPlacement(user.role);
      navigate(roleHome(user.role));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const oauth = () => setError(c.oauthUnavailable);
  const continueAsGuestClick = () => {
    enterGuestMode();
    if (placementStage) setGuestStage(placementStage);
    navigate('/learn');
  };

  return (
    <div style={{ fontFamily: isSi ? 'var(--font-si-body)' : 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="site-nav">
        <Link to="/" className="site-nav__brand"><div className="site-nav__mark"><div className="site-nav__mark-dot" /></div><span className="site-nav__wordmark">Englisher</span></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
          <Link to="/signin" style={{ background: 'var(--c-primary)', color: 'white', borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', boxShadow: '0 6px 0 var(--c-primary-hover)', display: 'inline-block' }}>{c.signIn}</Link>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 64px' }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 26, margin: '0 0 12px', lineHeight: 1.35, textAlign: 'center' }}>{c.framing}</h1>

          <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28 }}>
            <div className="field"><label className="field__label">{c.accountType}</label><RoleToggle role={role} onChange={setRole} /></div>
            <div className="field"><label className="field__label">{c.nameLabel}</label><input className="field__input" value={name} onChange={(e) => setName(e.target.value)} placeholder={c.namePlaceholder} /></div>
            {role === 'student' && (
              <div className="field"><label className="field__label">{c.ageLabel}</label><input type="number" min={1} className="field__input" value={age} onChange={(e) => setAge(e.target.value)} placeholder={c.agePlaceholder} /></div>
            )}
            <div className="field"><label className="field__label">{c.emailLabel}</label><input type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={c.emailPlaceholder} /></div>
            <div className="field"><label className="field__label">{c.passwordLabel}</label><input type="password" className="field__input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={c.passwordPlaceholder} /></div>
            {error && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink-2, #C2354A)' }}>{error}</div>}
            <button type="submit" disabled={busy} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: 16, fontWeight: 700, fontSize: 16, fontFamily: headFont, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, boxShadow: '0 5px 0 var(--c-primary-shadow)', marginTop: 8 }}>{busy ? c.submitting : c.submit}</button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--c-primary-line)' }} /><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-input-placeholder)' }}>{c.or}</span><div style={{ flex: 1, height: 1, background: 'var(--c-primary-line)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
            <button className="social-btn" onClick={oauth} type="button"><GoogleMark />{c.google}</button>
            <button className="social-btn" onClick={oauth} type="button"><FacebookMark />{c.facebook}</button>
          </div>

          {role === 'student' && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={continueAsGuestClick} disabled={busy} type="button" style={{ fontWeight: 700, fontSize: 15, background: 'none', border: 'none', color: 'var(--c-primary)', cursor: busy ? 'default' : 'pointer' }}>{c.secondary}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
