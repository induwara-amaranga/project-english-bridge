import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LangToggle } from '../../components/Primitives';
import { roleHome, useAuth } from '../../hooks/useAuth';
import { errorMessage } from '../../lib/apiClient';
import { preloadOAuthScripts, signInWithFacebook, signInWithGoogle } from '../../lib/oauth';

const COPY = {
  en: {
    framing: 'Welcome back! Pick up right where you left off.',
    emailLabel: 'Email address', emailPlaceholder: 'Email address',
    passwordLabel: 'Password', passwordPlaceholder: 'Password',
    forgot: 'Forgot password?', submit: 'Sign in', submitting: 'Signing in…',
    or: 'OR', google: 'Continue with Google', facebook: 'Continue with Facebook',
    noAccount: "Don't have an account?", signUp: 'Sign up',
    otpFraming: "We emailed a 6-digit code to this account's verification address.",
    otpLabel: 'Verification code', otpPlaceholder: '000000',
    otpSubmit: 'Verify', otpSubmitting: 'Verifying…',
    otpResend: 'Resend code', otpBack: '← Back to sign in',
  },
  si: {
    framing: 'නැවත සාදරයෙන් පිළිගනිමු! ඔබ නැවතුම් තැනින්ම ආරම්භ කරන්න.',
    emailLabel: 'විද්‍යුත් තැපැල් ලිපිනය', emailPlaceholder: 'විද්‍යුත් තැපැල් ලිපිනය',
    passwordLabel: 'මුරපදය', passwordPlaceholder: 'මුරපදය',
    forgot: 'මුරපදය අමතකද?', submit: 'පිවිසෙන්න', submitting: 'පිවිසෙමින්…',
    or: 'හෝ', google: 'Google සමඟ ඉදිරියට යන්න', facebook: 'Facebook සමඟ ඉදිරියට යන්න',
    noAccount: 'ගිණුමක් නැද්ද?', signUp: 'ලියාපදිංචි වන්න',
    otpFraming: 'මෙම ගිණුමේ තහවුරු කිරීමේ ලිපිනයට අංක 6ක කේතයක් විද්‍යුත් තැපෑලෙන් යවා ඇත.',
    otpLabel: 'තහවුරු කිරීමේ කේතය', otpPlaceholder: '000000',
    otpSubmit: 'තහවුරු කරන්න', otpSubmitting: 'තහවුරු කරමින්…',
    otpResend: 'කේතය නැවත එවන්න', otpBack: '← පිවිසීමට ආපසු',
  },
};

const GoogleMark = () => <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20.5H24v7h11.3C33.7 31.9 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l5.4-5.4C33.5 7.1 29 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.5-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l5.8 4.2C13.7 15.6 18.5 12.5 24 12.5c2.8 0 5.3 1 7.3 2.7l5.4-5.4C33.5 7.1 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 43c5.2 0 9.9-1.7 13.6-4.6l-6.3-5.3c-2 1.4-4.5 2.2-7.3 2.2-5.3 0-9.7-3.1-11.3-7.5l-5.9 4.5C9.5 38.5 16.2 43 24 43z" /><path fill="#1976D2" d="M43.6 20.5H42V20.5H24v7h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.3 5.3C41.4 35.3 43 30 43 24c0-1.3-.1-2.5-.4-3.5z" /></svg>;
const FacebookMark = () => <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 5.99 4.39 10.96 10.13 11.86v-8.4H7.09v-3.46h3.04V9.41c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.88v2.25h3.32l-.53 3.46h-2.79v8.4C19.61 23.03 24 18.06 24 12.07z" /></svg>;

export function SignIn() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Set once a sign-in attempt (password or OAuth) comes back needing a
  // second factor — `resend` remembers how to re-run that exact attempt for
  // a fresh code, since a Google/Facebook token can't just be typed again.
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpResend, setOtpResend] = useState<(() => void) | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const { signIn, signInWithGoogle: signInWithGoogleSession, signInWithFacebook: signInWithFacebookSession, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const c = COPY[lang];
  const isSi = lang === 'si';
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';

  useEffect(() => { preloadOAuthScripts(); }, []);

  const attemptSignIn = async (run: () => ReturnType<typeof signIn>) => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const outcome = await run();
      if (outcome.otpRequired) {
        setOtpChallengeId(outcome.challengeId);
        // A fresh attempt overwrites the server's challenge too (AuthService
        // regenerates on every signin) — clearing stale state here keeps
        // the two in sync instead of the old code silently going stale.
        setOtpCode('');
        setOtpError('');
        setOtpResend(() => () => { void attemptSignIn(run); });
      } else {
        navigate(roleHome(outcome.user.role));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void attemptSignIn(() => signIn(email, password));
  };

  const withOAuth = (getToken: () => Promise<string>, signInSession: (token: string) => ReturnType<typeof signIn>) => () => {
    void attemptSignIn(async () => signInSession(await getToken()));
  };
  const oauthGoogle = withOAuth(signInWithGoogle, signInWithGoogleSession);
  const oauthFacebook = withOAuth(signInWithFacebook, signInWithFacebookSession);

  const backToSignIn = () => {
    setOtpChallengeId(null);
    setOtpResend(null);
    setOtpCode('');
    setOtpError('');
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpBusy || !otpChallengeId) return;
    setOtpError('');
    setOtpBusy(true);
    try {
      const user = await verifyOtp(otpChallengeId, otpCode);
      navigate(roleHome(user.role));
    } catch (err) {
      setOtpError(errorMessage(err));
    } finally {
      setOtpBusy(false);
    }
  };

  return (
    <div style={{ fontFamily: isSi ? 'var(--font-si-body)' : 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="site-nav">
        <Link to="/" className="site-nav__brand"><div className="site-nav__mark"><div className="site-nav__mark-dot" /></div><span className="site-nav__wordmark">Englisher</span></Link>
        <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 64px' }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          {otpChallengeId ? (
            <>
              <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 26, margin: '0 0 12px', lineHeight: 1.35, textAlign: 'center' }}>{c.otpLabel}</h1>
              <p style={{ fontSize: 14, color: 'var(--c-ink-soft)', textAlign: 'center', margin: '0 0 8px' }}>{c.otpFraming}</p>

              <form onSubmit={submitOtp} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 20 }}>
                <div className="field">
                  <label className="field__label">{c.otpLabel}</label>
                  <input
                    type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                    className="field__input" value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={c.otpPlaceholder}
                    style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 20 }}
                  />
                </div>
                {otpError && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink-2, #C2354A)' }}>{otpError}</div>}
                <button type="submit" disabled={otpBusy || otpCode.length !== 6} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: 16, fontWeight: 700, fontSize: 16, fontFamily: headFont, cursor: otpBusy ? 'default' : 'pointer', opacity: otpBusy || otpCode.length !== 6 ? 0.7 : 1, boxShadow: '0 5px 0 var(--c-primary-shadow)', marginTop: 8 }}>{otpBusy ? c.otpSubmitting : c.otpSubmit}</button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button type="button" onClick={backToSignIn} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--c-ink-soft)', cursor: 'pointer' }}>{c.otpBack}</button>
                <button type="button" onClick={() => otpResend?.()} disabled={busy} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: 'var(--c-primary)', cursor: busy ? 'default' : 'pointer' }}>{c.otpResend}</button>
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: headFont, fontWeight: 800, fontSize: 26, margin: '0 0 12px', lineHeight: 1.35, textAlign: 'center' }}>{c.framing}</h1>

              <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28 }}>
                <div className="field"><label className="field__label">{c.emailLabel}</label><input type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={c.emailPlaceholder} /></div>
                <div className="field"><label className="field__label">{c.passwordLabel}</label><input type="password" className="field__input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={c.passwordPlaceholder} /></div>
                {error && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink-2, #C2354A)' }}>{error}</div>}
                <div style={{ textAlign: 'right' }}><a href="#" style={{ fontSize: 13, fontWeight: 600 }}>{c.forgot}</a></div>
                <button type="submit" disabled={busy} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: 16, fontWeight: 700, fontSize: 16, fontFamily: headFont, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, boxShadow: '0 5px 0 var(--c-primary-shadow)', marginTop: 8 }}>{busy ? c.submitting : c.submit}</button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--c-primary-line)' }} /><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-input-placeholder)' }}>{c.or}</span><div style={{ flex: 1, height: 1, background: 'var(--c-primary-line)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                <button className="social-btn" onClick={oauthGoogle} disabled={busy} type="button"><GoogleMark />{c.google}</button>
                <button className="social-btn" onClick={oauthFacebook} disabled={busy} type="button"><FacebookMark />{c.facebook}</button>
              </div>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <span style={{ fontSize: 14, color: 'var(--c-ink-soft)' }}>{c.noAccount}</span>
                <Link to="/signup" style={{ fontWeight: 700, fontSize: 14, marginLeft: 4 }}>{c.signUp}</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
