import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { acceptParentLink } from '../../domain/parentLink';
import { ApiRequestError, errorMessage } from '../../lib/apiClient';
import { LangToggle } from '../../components/Primitives';
import { LinkButton } from '../../components/Button';

// The page an emailed parent-invite link actually opens — see
// ParentLinkService.deliver() on the backend. Public: this may be the
// parent's very first visit, so it has to work whether or not anyone is
// signed in, and hands off to sign-in/signup with the token carried along
// when there's no account yet to accept with (see SignIn.tsx/SignUp.tsx's
// own `parentToken` handling).

type Phase = 'working' | 'needsAuth' | 'wrongRole' | 'accepted' | 'error';

const COPY = {
  en: {
    title: 'Parent invitation',
    working: 'Checking your invitation…',
    invitedBy: (name: string) => `${name || 'A learner'} invited you to see their English learning progress on Englisher.`,
    signIn: 'Sign in', signUp: 'Create a parent account',
    wrongRoleTitle: "That's not a parent account",
    wrongRole: 'This invitation has to be accepted from a parent account. Sign out and sign in with the parent account instead.',
    signOutAndSignIn: 'Sign out and sign in',
    acceptedTitle: 'You\'re connected',
    accepted: (name: string) => `You can now see ${name || 'their'} progress.`,
    goToDashboard: 'Go to dashboard',
    badLink: 'This invitation link is missing its token.',
    backHome: 'Back to Englisher',
  },
  si: {
    title: 'මාපිය ආරාධනාව',
    working: 'ඔබේ ආරාධනාව පරීක්ෂා කරමින්…',
    invitedBy: (name: string) => `${name || 'ශිෂ්‍යයෙක්'} ඔවුන්ගේ ඉංග්‍රීසි ඉගෙනුම් ප්‍රගතිය Englisher හි බැලීමට ඔබට ආරාධනා කළේය.`,
    signIn: 'පිවිසෙන්න', signUp: 'මාපිය ගිණුමක් සාදන්න',
    wrongRoleTitle: 'එය මාපිය ගිණුමක් නොවේ',
    wrongRole: 'මෙම ආරාධනාව මාපිය ගිණුමකින් පිළිගත යුතුය. ඉවත් වී මාපිය ගිණුමෙන් පිවිසෙන්න.',
    signOutAndSignIn: 'ඉවත් වී පිවිසෙන්න',
    acceptedTitle: 'ඔබ සම්බන්ධයි',
    accepted: (name: string) => `දැන් ඔබට ${name || 'ඔවුන්ගේ'} ප්‍රගතිය දැකිය හැක.`,
    goToDashboard: 'පුවරුවට යන්න',
    badLink: 'මෙම ආරාධනා සබැඳියේ ටෝකනය අස්ථානගතයි.',
    backHome: 'Englisher වෙත ආපසු',
  },
};

export function ParentAcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, loading, signOut } = useAuth();
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';
  const c = COPY[lang];

  const [phase, setPhase] = useState<Phase>('working');
  const [childName, setChildName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!token) { setPhase('error'); setError(c.badLink); return; }
    let alive = true;
    setPhase('working');
    acceptParentLink(token)
      .then((res) => {
        if (!alive) return;
        setChildName(res.childName);
        setPhase(res.accepted ? 'accepted' : 'needsAuth');
      })
      .catch((err) => {
        if (!alive) return;
        if (err instanceof ApiRequestError && err.code === 'parentLink.notAParent') {
          setPhase('wrongRole');
        } else {
          setPhase('error');
          setError(errorMessage(err));
        }
      });
    return () => { alive = false; };
    // Only token/loading should re-trigger this — re-running on every `c`
    // (a new object each render) would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loading, user]);

  const signOutAndSignIn = async () => { await signOut(); };

  return (
    <div style={{ fontFamily: isSi ? 'var(--font-si-body)' : 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="site-nav">
        <Link to="/" className="site-nav__brand"><div className="site-nav__mark"><div className="site-nav__mark-dot" /></div><span className="site-nav__wordmark">Englisher</span></Link>
        <LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} />
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 64px' }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <h1 style={{ fontFamily: isSi ? 'var(--font-si-display)' : 'var(--font-display)', fontWeight: 800, fontSize: 24, margin: '0 0 20px', textAlign: 'center' }}>{c.title}</h1>

          {(phase === 'working') && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--c-ink-soft)', fontWeight: 600 }}>{c.working}</div>
          )}

          {phase === 'needsAuth' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, fontWeight: 600 }}>{c.invitedBy(childName)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <LinkButton to={`/signup?role=parent&parentToken=${encodeURIComponent(token)}`} variant="primary" size="lg">{c.signUp}</LinkButton>
                <LinkButton to={`/signin?parentToken=${encodeURIComponent(token)}`} variant="secondary" size="lg">{c.signIn}</LinkButton>
              </div>
            </div>
          )}

          {phase === 'wrongRole' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
              <div style={{ fontFamily: isSi ? 'var(--font-si-display)' : 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{c.wrongRoleTitle}</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--c-ink-soft)', fontWeight: 600 }}>{c.wrongRole}</p>
              <button onClick={signOutAndSignIn} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: 15, fontWeight: 700, fontSize: 15, fontFamily: isSi ? 'var(--font-si-display)' : 'var(--font-display)', cursor: 'pointer', boxShadow: '0 5px 0 var(--c-primary-shadow)' }}>{c.signOutAndSignIn}</button>
            </div>
          )}

          {phase === 'accepted' && (
            <div className="card" style={{ border: '2px solid #A8E6C0', background: '#F1FCF5', display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
              <div style={{ fontFamily: isSi ? 'var(--font-si-display)' : 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#1B6B3A' }}>{c.acceptedTitle}</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#1B6B3A', fontWeight: 600 }}>{c.accepted(childName)}</p>
              <LinkButton to="/parent" variant="primary" size="lg">{c.goToDashboard}</LinkButton>
            </div>
          )}

          {phase === 'error' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--c-danger-ink-2, #C2354A)', fontWeight: 600 }}>{error}</p>
              <LinkButton to="/" variant="secondary" size="lg">{c.backHome}</LinkButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
