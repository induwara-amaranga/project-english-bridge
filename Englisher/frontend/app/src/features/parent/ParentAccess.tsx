import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useParentLink } from '../../hooks/useParentLink';
import { parentContactChannel, PARENT_LINK_DEFAULT } from '../../domain/parentLink';

const STEPS = [
  'Create an account, or use the one your school gave you.',
  "Enter a parent's email address or phone number.",
  'They receive an invitation.',
  'Once they accept, they can see your progress.',
];

const VISIBILITY = [
  { ok: true, text: 'XP earned, streak, and which stage you are on' },
  { ok: true, text: 'How much of the course you have completed' },
  { ok: false, text: 'Your individual answers or the mistakes you made' },
  { ok: false, text: 'Anything you write in the essay and letter tasks' },
];

export function ParentAccess() {
  const { link, update } = useParentLink();
  const [contact, setContact] = useState(link.contact || '');
  const [error, setError] = useState('');
  const [armRevoke, setArmRevoke] = useState(false);
  const status = link.status;
  const reached = status === 'accepted' ? 4 : status === 'invited' ? 3 : 2;
  const valid = !!parentContactChannel(contact);

  const onInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = contact.trim();
    const channel = parentContactChannel(trimmed);
    if (!channel) {
      setError(trimmed ? 'That does not look like an email address or phone number.' : 'Enter an email address or phone number first.');
      return;
    }
    setError('');
    update({ status: 'invited', contact: trimmed, channel, invitedAt: Date.now(), acceptedAt: null });
  };

  const onResend = () => update({ ...link, invitedAt: Date.now() });
  const onCancel = () => { update(JSON.parse(JSON.stringify(PARENT_LINK_DEFAULT))); setContact(''); setError(''); };
  const onAccept = () => update({ ...link, status: 'accepted', acceptedAt: Date.now() });
  const onRevoke = () => {
    if (!armRevoke) { setArmRevoke(true); return; }
    update(JSON.parse(JSON.stringify(PARENT_LINK_DEFAULT)));
    setContact('');
    setArmRevoke(false);
  };

  const headerSub = status === 'accepted' ? 'Connected to ' + link.contact
    : status === 'invited' ? 'Invitation sent — waiting to be accepted' : 'Invite a parent to follow your progress';

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--c-bg)', color: 'var(--c-ink)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--c-primary)', padding: 24 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/profile" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'white' }}>Parent access</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2 }}>{headerSub}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 64px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>How it works</div>
          <div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginBottom: 18 }}>You stay in control — a parent only ever sees what you invite them to see.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {STEPS.map((text, i) => {
              const n = i + 1;
              const done = n <= reached;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? 'var(--c-primary)' : 'var(--c-primary-tint)', color: done ? 'white' : 'var(--c-ink-faint)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: done ? 'var(--c-ink)' : 'var(--c-ink-soft)', fontWeight: n === reached ? 700 : 500, paddingTop: 3 }}>{text}</div>
                </div>
              );
            })}
          </div>
        </div>

        {status === 'none' && (
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Invite a parent</div>
            <div style={{ fontSize: 13.5, color: 'var(--c-ink-soft)', fontWeight: 600, lineHeight: 1.6, marginBottom: 18 }}>Enter their email address or phone number. We&apos;ll send them an invitation — they can only see your progress after they accept it.</div>
            <form onSubmit={onInvite} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={contact} onChange={(e) => { setContact(e.target.value); setError(''); }} placeholder="parent@example.com or +94 71 234 5678" style={{ fontSize: 16, padding: '14px 18px', borderRadius: 999, border: `2px solid ${error ? '#F2C9D0' : 'var(--c-primary-line)'}`, outline: 'none' }} />
              {error && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink-2)', paddingLeft: 4 }}>{error}</div>}
              <button type="submit" style={{ background: valid ? 'var(--c-primary)' : 'var(--c-disabled)', color: 'white', border: 'none', borderRadius: 999, padding: 15, fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)', cursor: valid ? 'pointer' : 'not-allowed', boxShadow: `0 5px 0 ${valid ? 'var(--c-primary-shadow)' : 'var(--c-disabled-shadow)'}`, marginTop: 4 }}>Send invitation</button>
            </form>
          </div>
        )}

        {status === 'invited' && (
          <>
            <div className="card" style={{ border: '2px solid #FFE1A0', background: '#FFF9EC' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-warning)', color: 'white', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>!</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: '#6B4E00' }}>Waiting for them to accept</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#6B4E00', marginTop: 4 }}>We sent an invitation to <b>{link.contact}</b>. Until they accept it, nobody can see your progress.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <button onClick={onResend} style={{ background: 'white', border: '1.5px solid var(--c-line)', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: 'var(--c-ink-2)', cursor: 'pointer' }}>Resend invitation</button>
                <button onClick={onCancel} style={{ background: 'white', border: '1.5px solid #F2C9D0', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: 'var(--c-danger-ink-2)', cursor: 'pointer' }}>Cancel invitation</button>
              </div>
            </div>
            <div style={{ background: 'var(--c-primary-tint)', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--c-ink-2)', marginBottom: 10 }}>PROTOTYPE ONLY — the real invitation is a signed link sent by email or SMS.</div>
              <button onClick={onAccept} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Simulate the parent accepting</button>
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
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: '#1B6B3A' }}>Parent connected</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#1B6B3A', marginTop: 4 }}><b>{link.contact}</b> accepted the invitation and can now see your progress.</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#1B6B3A', marginTop: 14 }}>They can see it by signing in with their own parent account.</div>
            </div>
            <div className="card">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, marginBottom: 10 }}>What they can see</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {VISIBILITY.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, lineHeight: 1.6, color: v.ok ? 'var(--c-ink)' : 'var(--c-ink-soft)' }}>
                    <span style={{ fontWeight: 800, flexShrink: 0 }}>{v.ok ? '✓' : '✕'}</span><span>{v.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={onRevoke} style={{ background: 'white', border: '1.5px solid #F2C9D0', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: 'var(--c-danger-ink-2)', cursor: 'pointer', marginTop: 16 }}>{armRevoke ? 'Click again to remove access' : 'Remove parent access'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
