import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParentLink } from '../../hooks/useParentLink';
import { parentContactChannel } from '../../domain/parentLink';
import { errorMessage } from '../../lib/apiClient';
import { LangToggle } from '../../components/Primitives';

const STEPS = [
  { en: 'Create an account, or use the one your school gave you.', si: 'ගිණුමක් සාදන්න, නැතහොත් ඔබේ පාසල ලබා දුන් එක භාවිත කරන්න.' },
  { en: "Enter a parent's email address or phone number.", si: 'මාපියගේ විද්‍යුත් තැපැල් ලිපිනය හෝ දුරකථන අංකය ඇතුළත් කරන්න.' },
  { en: 'They receive an invitation.', si: 'ඔවුන්ට ආරාධනාවක් ලැබේ.' },
  { en: 'Once they accept, they can see your progress.', si: 'ඔවුන් එය පිළිගත් පසු, ඔවුන්ට ඔබේ ප්‍රගතිය බැලිය හැක.' },
];

const VISIBILITY = [
  { ok: true, en: 'XP earned, streak, and which stage you are on', si: 'උපයාගත් XP, අඛණ්ඩතාව, සහ ඔබ සිටින අදියර' },
  { ok: true, en: 'How much of the course you have completed', si: 'ඔබ පාඨමාලාවෙන් සම්පූර්ණ කර ඇති ප්‍රමාණය' },
  { ok: false, en: 'Your individual answers or the mistakes you made', si: 'ඔබේ තනි පිළිතුරු හෝ ඔබ කළ වැරදි' },
  { ok: false, en: 'Anything you write in the essay and letter tasks', si: 'රචනා සහ ලිපි කාර්යයන්හි ඔබ ලියන ඕනෑම දෙයක්' },
];

export function ParentAccess() {
  const { link, loading, invite, resend, revoke } = useParentLink();
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [armRevoke, setArmRevoke] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const isSi = lang === 'si';
  const status = link.status;
  const reached = status === 'accepted' ? 4 : status === 'invited' ? 3 : 2;
  const valid = !!parentContactChannel(contact);

  // Once the current link loads, seed the form with whatever contact is on
  // file — matters when re-opening this page mid-invite.
  useEffect(() => { setContact(link.contact || ''); }, [link.contact]);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmed = contact.trim();
    const channel = parentContactChannel(trimmed);
    if (!channel) {
      setError(trimmed
        ? (isSi ? 'එය විද්‍යුත් තැපැල් ලිපිනයක් හෝ දුරකථන අංකයක් ලෙස නොපෙනේ.' : 'That does not look like an email address or phone number.')
        : (isSi ? 'මුලින්ම විද්‍යුත් තැපැල් ලිපිනයක් හෝ දුරකථන අංකයක් ඇතුළත් කරන්න.' : 'Enter an email address or phone number first.'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      await invite(trimmed);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (busy) return;
    setBusy(true);
    try { await resend(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const onCancel = async () => {
    if (busy) return;
    setBusy(true);
    try { await revoke(); setContact(''); setError(''); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const onRevoke = async () => {
    if (!armRevoke) { setArmRevoke(true); return; }
    if (busy) return;
    setBusy(true);
    try {
      await revoke();
      setContact('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setArmRevoke(false);
    }
  };

  const headerSub = loading
    ? (isSi ? 'පූරණය වෙමින්…' : 'Loading…')
    : status === 'accepted' ? (isSi ? `සම්බන්ධයි: ${link.contact}` : 'Connected to ' + link.contact)
    : status === 'invited' ? (isSi ? 'ආරාධනාව යවා ඇත — පිළිගැනීම බලාපොරොත්තුවෙන්' : 'Invitation sent — waiting to be accepted')
    : (isSi ? 'ඔබේ ප්‍රගතිය අනුගමනය කිරීමට මාපියෙකු ආරාධනා කරන්න' : 'Invite a parent to follow your progress');

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--c-primary)', padding: 24 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/profile" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'white' }}>{isSi ? 'මාපිය ප්‍රවේශය' : 'Parent access'}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2 }}>{headerSub}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}><LangToggle lang={lang} onToggle={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} /></div>
        </div>
      </div>

      {!loading && (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 64px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{isSi ? 'මෙය ක්‍රියා කරන ආකාරය' : 'How it works'}</div>
            <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginBottom: 18 }}>{isSi ? 'ඔබ පාලනයේ රැඳී සිටියි — මාපියෙකුට පෙනෙන්නේ ඔබ ඔවුන්ට බැලීමට ආරාධනා කරන දේ පමණි.' : 'You stay in control — a parent only ever sees what you invite them to see.'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {STEPS.map((step, i) => {
                const n = i + 1;
                const done = n <= reached;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? 'var(--c-primary)' : 'var(--c-primary-tint)', color: done ? 'white' : 'var(--c-ink-faint)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, color: done ? 'var(--c-ink)' : 'var(--c-ink-soft)', fontWeight: n === reached ? 700 : 500, paddingTop: 3 }}>{isSi ? step.si : step.en}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {status === 'none' && (
            <div className="card">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{isSi ? 'මාපියෙකු ආරාධනා කරන්න' : 'Invite a parent'}</div>
              <div style={{ fontSize: 13.5, color: 'var(--c-ink-soft)', fontWeight: 600, lineHeight: 1.6, marginBottom: 18 }}>{isSi ? 'ඔවුන්ගේ විද්‍යුත් තැපැල් ලිපිනය හෝ දුරකථන අංකය ඇතුළත් කරන්න. අපි ඔවුන්ට ආරාධනාවක් යවන්නෙමු — ඔවුන් එය පිළිගත් පසුව පමණක් ඔබේ ප්‍රගතිය දැකිය හැක.' : "Enter their email address or phone number. We'll send them an invitation — they can only see your progress after they accept it."}</div>
              <form onSubmit={onInvite} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={contact} onChange={(e) => { setContact(e.target.value); setError(''); }} placeholder="parent@example.com or +94 71 234 5678" style={{ fontSize: 16, padding: '14px 18px', borderRadius: 999, border: `2px solid ${error ? '#F2C9D0' : 'var(--c-primary-line)'}`, outline: 'none' }} />
                {error && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink-2)', paddingLeft: 4 }}>{error}</div>}
                <button type="submit" disabled={busy} style={{ background: valid ? 'var(--c-primary)' : 'var(--c-disabled)', color: 'white', border: 'none', borderRadius: 999, padding: 15, fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)', cursor: valid && !busy ? 'pointer' : 'not-allowed', boxShadow: `0 5px 0 ${valid ? 'var(--c-primary-shadow)' : 'var(--c-disabled-shadow)'}`, marginTop: 4, opacity: busy ? 0.7 : 1 }}>{busy ? (isSi ? 'යවමින්…' : 'Sending…') : (isSi ? 'ආරාධනාව යවන්න' : 'Send invitation')}</button>
              </form>
            </div>
          )}

          {status === 'invited' && (
            <>
              {error && <div className="card" style={{ color: 'var(--c-danger-ink-2)', fontWeight: 600, fontSize: 13.5 }}>{error}</div>}
              <div className="card" style={{ border: '2px solid #FFE1A0', background: '#FFF9EC' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-warning)', color: 'white', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>!</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: '#6B4E00' }}>{isSi ? 'ඔවුන් පිළිගැනීම බලාපොරොත්තුවෙන්' : 'Waiting for them to accept'}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#6B4E00', marginTop: 4 }}>
                      {isSi ? <>අපි <b>{link.contact}</b> වෙත ආරාධනාවක් යැව්වෙමු. ඔවුන් එය පිළිගන්නා තෙක්, කිසිවෙකුට ඔබේ ප්‍රගතිය දැකිය නොහැක.</> : <>We sent an invitation to <b>{link.contact}</b>. Until they accept it, nobody can see your progress.</>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                  <button onClick={onResend} disabled={busy} style={{ background: 'white', border: '1.5px solid var(--c-line)', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: 'var(--c-ink-2)', cursor: busy ? 'default' : 'pointer' }}>{isSi ? 'නැවත ආරාධනා කරන්න' : 'Resend invitation'}</button>
                  <button onClick={onCancel} disabled={busy} style={{ background: 'white', border: '1.5px solid #F2C9D0', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: 'var(--c-danger-ink-2)', cursor: busy ? 'default' : 'pointer' }}>{isSi ? 'ආරාධනාව අවලංගු කරන්න' : 'Cancel invitation'}</button>
                </div>
              </div>
              <div style={{ background: 'var(--c-primary-tint)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink-2)', lineHeight: 1.6 }}>{isSi ? 'ඔවුන්ට විද්‍යුත් තැපෑලෙන් සබැඳියක් ලැබේ. ඔවුන් එය විවෘත කර තමන්ගේම මාපිය ගිණුමෙන් පිළිගත් පසු, මෙම පිටුව ස්වයංක්‍රීයව අගුළු හැරේ — නැවත පූරණය කිරීමට අවශ්‍ය නැත.' : "They'll get an emailed link. Once they open it and accept from their own parent account, this page unlocks automatically — no need to refresh."}</div>
              </div>
            </>
          )}

          {status === 'accepted' && (
            <>
              <div className="card" style={{ border: '2px solid #A8E6C0', background: '#F1FCF5' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-success-ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M5 11.5L9.5 16L17 6" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: '#1B6B3A' }}>{isSi ? 'මාපියා සම්බන්ධයි' : 'Parent connected'}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#1B6B3A', marginTop: 4 }}>
                      {isSi ? <><b>{link.contact}</b> ආරාධනාව පිළිගෙන දැන් ඔබේ ප්‍රගතිය දැකිය හැක.</> : <><b>{link.contact}</b> accepted the invitation and can now see your progress.</>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#1B6B3A', marginTop: 14 }}>{isSi ? 'ඔවුන්ගේම මාපිය ගිණුමෙන් පුරනය වී එය බැලිය හැක.' : 'They can see it by signing in with their own parent account.'}</div>
              </div>
              <div className="card">
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 10 }}>{isSi ? 'ඔවුන්ට පෙනෙන දේ' : 'What they can see'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {VISIBILITY.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, lineHeight: 1.6, color: v.ok ? 'var(--c-ink)' : 'var(--c-ink-soft)' }}>
                      <span style={{ fontWeight: 800, flexShrink: 0 }}>{v.ok ? '✓' : '✕'}</span><span>{isSi ? v.si : v.en}</span>
                    </div>
                  ))}
                </div>
                {error && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink-2)', marginTop: 12 }}>{error}</div>}
                <button onClick={onRevoke} disabled={busy} style={{ background: 'white', border: '1.5px solid #F2C9D0', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: 'var(--c-danger-ink-2)', cursor: busy ? 'default' : 'pointer', marginTop: 16 }}>{armRevoke ? (isSi ? 'ප්‍රවේශය ඉවත් කිරීමට නැවත ක්ලික් කරන්න' : 'Click again to remove access') : (isSi ? 'මාපිය ප්‍රවේශය ඉවත් කරන්න' : 'Remove parent access')}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
