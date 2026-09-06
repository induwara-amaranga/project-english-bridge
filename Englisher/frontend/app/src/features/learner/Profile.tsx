import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useParentLink } from '../../hooks/useParentLink';
import { useAuth } from '../../hooks/useAuth';
import { BottomNav } from '../../components/BottomNav';

const PARENT_STATUS = {
  none: { en: 'Not connected', si: 'සම්බන්ධ නැත', color: '#6B6580', bg: '#ECE8FB' },
  invited: { en: 'Invited', si: 'ආරාධනා කළා', color: '#B37E00', bg: '#FFF3D6' },
  accepted: { en: 'Connected', si: 'සම්බන්ධයි', color: '#2FAE63', bg: '#E3F9EB' },
};

const COPY = {
  en: { title: 'Profile', language: 'Language', parent: 'Parent Dashboard', progress: 'Your Progress', logout: 'Log out' },
  si: { title: 'පැතිකඩ', language: 'භාෂාව', parent: 'මාපිය පුවරුව', progress: 'ඔබේ ප්‍රගතිය', logout: 'ඉවත් වන්න' },
};

export function Profile() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const { link } = useParentLink();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isSi = lang === 'si';
  const c = COPY[lang];
  const status = PARENT_STATUS[link.status] || PARENT_STATUS.none;
  const bodyFont = isSi ? 'var(--font-si-body)' : 'var(--font-body)';
  const headFont = isSi ? 'var(--font-si-display)' : 'var(--font-display)';
  const name = user?.name || 'Amaya Silva';
  const email = user?.email || 'amaya.silva@example.com';
  const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  const logout = () => { signOut(); navigate('/signin'); };

  return (
    <div className="app-shell app-shell--nav-pad" style={{ fontFamily: bodyFont, background: 'var(--c-bg)', color: 'var(--c-ink)' }}>
      <div style={{ background: 'var(--c-primary)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/learn" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'white', fontFamily: headFont }}>{c.title}</div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--c-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: headFont, fontWeight: 800, fontSize: 22, color: 'var(--c-primary)', flexShrink: 0 }}>{initials}</div>
          <div><div style={{ fontFamily: headFont, fontWeight: 800, fontSize: 18 }}>{name}</div><div style={{ fontSize: 13, color: 'var(--c-ink-soft)', fontWeight: 600, marginTop: 2 }}>{email}</div></div>
        </div>

        <div className="card" style={{ padding: 8 }}>
          <button onClick={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: 16, cursor: 'pointer', textAlign: 'left', fontFamily: bodyFont }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{c.language}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-primary)' }}>{isSi ? 'සිංහල' : 'English'}</span>
          </button>
          <div style={{ height: 1, background: 'var(--c-line)', margin: '0 16px' }} />
          <Link to="/parent/access" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, fontSize: 15, fontWeight: 700, color: 'var(--c-ink)' }}>
            {c.parent}
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: status.color, background: status.bg, borderRadius: 999, padding: '4px 10px' }}>{isSi ? status.si : status.en}</span>
              <span style={{ color: 'var(--c-ink-disabled)' }}>›</span>
            </span>
          </Link>
          <div style={{ height: 1, background: 'var(--c-line)', margin: '0 16px' }} />
          <Link to="/progress" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, fontSize: 15, fontWeight: 700, color: 'var(--c-ink)' }}>
            {c.progress}<span style={{ color: 'var(--c-ink-disabled)' }}>›</span>
          </Link>
        </div>

        <div className="card" style={{ padding: 8 }}>
          <button onClick={logout} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 16, fontSize: 15, fontWeight: 700, color: '#E5484D', background: 'none', border: 'none', cursor: 'pointer', fontFamily: bodyFont }}>{c.logout}</button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
