import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useParentLink } from '../../hooks/useParentLink';
import { useAuth } from '../../hooks/useAuth';
import { BottomNav } from '../../components/BottomNav';
import { isSoundMuted, setSoundMuted } from '../../lib/sounds';
import { errorMessage } from '../../lib/apiClient';

const PARENT_STATUS = {
  none: { en: 'Not connected', si: 'සම්බන්ධ නැත', color: '#6B6580', bg: '#ECE8FB' },
  invited: { en: 'Invited', si: 'ආරාධනා කළා', color: '#B37E00', bg: '#FFF3D6' },
  accepted: { en: 'Connected', si: 'සම්බන්ධයි', color: '#2FAE63', bg: '#E3F9EB' },
};

const COPY = {
  en: {
    title: 'Profile', language: 'Language', parent: 'Parent Dashboard', progress: 'Your Progress', sound: 'Sound effects', logout: 'Log out',
    account: 'Account', name: 'Name', edit: 'Edit', save: 'Save', saving: 'Saving…', cancel: 'Cancel',
    nameEmpty: 'Name cannot be empty.',
    password: 'Password', changePassword: 'Change password',
    currentPassword: 'Current password', newPassword: 'New password', confirmPassword: 'Confirm new password',
    passwordTooShort: 'Password must be at least 8 characters.', passwordMismatch: 'Passwords do not match.',
    passwordUpdated: 'Password updated.',
  },
  si: {
    title: 'පැතිකඩ', language: 'භාෂාව', parent: 'මාපිය පුවරුව', progress: 'ඔබේ ප්‍රගතිය', sound: 'ශබ්ද ප්‍රතිචාර', logout: 'ඉවත් වන්න',
    account: 'ගිණුම', name: 'නම', edit: 'සංස්කරණය', save: 'සුරකින්න', saving: 'සුරකිමින්…', cancel: 'අවලංගු කරන්න',
    nameEmpty: 'නම හිස් විය නොහැක.',
    password: 'මුරපදය', changePassword: 'මුරපදය වෙනස් කරන්න',
    currentPassword: 'වත්මන් මුරපදය', newPassword: 'නව මුරපදය', confirmPassword: 'නව මුරපදය තහවුරු කරන්න',
    passwordTooShort: 'මුරපදයේ අවම වශයෙන් අකුරු 8ක් තිබිය යුතුය.', passwordMismatch: 'මුරපද නොගැලපේ.',
    passwordUpdated: 'මුරපදය යාවත්කාලීන කරන ලදී.',
  },
};

export function Profile() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [muted, setMuted] = useState(isSoundMuted);
  const { link } = useParentLink();
  const { user, signOut, updateName, changePassword } = useAuth();
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

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState('');

  const openNameEdit = () => { setNameDraft(name); setNameError(''); setEditingName(true); };
  const cancelNameEdit = () => { setEditingName(false); setNameError(''); };
  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) { setNameError(c.nameEmpty); return; }
    setNameBusy(true);
    setNameError('');
    try {
      await updateName(trimmed);
      setEditingName(false);
    } catch (err) {
      setNameError(errorMessage(err));
    } finally {
      setNameBusy(false);
    }
  };

  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const openPasswordEdit = () => {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setPasswordError(''); setPasswordSuccess(false); setEditingPassword(true);
  };
  const cancelPasswordEdit = () => { setEditingPassword(false); setPasswordError(''); };
  const savePassword = async () => {
    if (newPassword.length < 8) { setPasswordError(c.passwordTooShort); return; }
    if (newPassword !== confirmPassword) { setPasswordError(c.passwordMismatch); return; }
    setPasswordBusy(true);
    setPasswordError('');
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordSuccess(true);
      setEditingPassword(false);
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setPasswordBusy(false);
    }
  };

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

        <div className="card" style={{ padding: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 16px 4px', fontSize: 12, fontWeight: 700, color: 'var(--c-ink-faint)', letterSpacing: '0.04em' }}>{c.account.toUpperCase()}</div>

          {!editingName ? (
            <button onClick={openNameEdit} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: 16, cursor: 'pointer', textAlign: 'left', fontFamily: bodyFont }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink-soft)' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary)' }}>{c.edit}</span>
              </span>
            </button>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="field"><label className="field__label">{c.name}</label><input className="field__input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} disabled={nameBusy} /></div>
              {nameError && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink-2, #C2354A)' }}>{nameError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={saveName} disabled={nameBusy} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, fontFamily: headFont, cursor: nameBusy ? 'default' : 'pointer', opacity: nameBusy ? 0.7 : 1 }}>{nameBusy ? c.saving : c.save}</button>
                <button onClick={cancelNameEdit} disabled={nameBusy} style={{ background: 'none', border: '2px solid var(--c-primary-line)', color: 'var(--c-ink-soft)', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 14, fontFamily: bodyFont, cursor: nameBusy ? 'default' : 'pointer' }}>{c.cancel}</button>
              </div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--c-line)', margin: '0 16px' }} />

          {!editingPassword ? (
            <button onClick={openPasswordEdit} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: 16, cursor: 'pointer', textAlign: 'left', fontFamily: bodyFont }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{c.password}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {passwordSuccess && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-success-ink)', background: 'var(--c-success-bg)', borderRadius: 999, padding: '4px 10px' }}>{c.passwordUpdated}</span>}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary)' }}>{c.changePassword}</span>
              </span>
            </button>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="field"><label className="field__label">{c.currentPassword}</label><input type="password" className="field__input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={passwordBusy} /></div>
              <div className="field"><label className="field__label">{c.newPassword}</label><input type="password" className="field__input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={passwordBusy} /></div>
              <div className="field"><label className="field__label">{c.confirmPassword}</label><input type="password" className="field__input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={passwordBusy} /></div>
              {passwordError && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger-ink-2, #C2354A)' }}>{passwordError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={savePassword} disabled={passwordBusy} style={{ background: 'var(--c-primary)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, fontFamily: headFont, cursor: passwordBusy ? 'default' : 'pointer', opacity: passwordBusy ? 0.7 : 1 }}>{passwordBusy ? c.saving : c.save}</button>
                <button onClick={cancelPasswordEdit} disabled={passwordBusy} style={{ background: 'none', border: '2px solid var(--c-primary-line)', color: 'var(--c-ink-soft)', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 14, fontFamily: bodyFont, cursor: passwordBusy ? 'default' : 'pointer' }}>{c.cancel}</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 8 }}>
          <button onClick={() => setLang((l) => (l === 'en' ? 'si' : 'en'))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: 16, cursor: 'pointer', textAlign: 'left', fontFamily: bodyFont }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{c.language}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-primary)' }}>{isSi ? 'සිංහල' : 'English'}</span>
          </button>
          <div style={{ height: 1, background: 'var(--c-line)', margin: '0 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{c.sound}</span>
            <label className="switch">
              <input type="checkbox" checked={!muted} onChange={toggleSound} aria-label={c.sound} />
              <span className="switch__track" />
            </label>
          </div>
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

      <BottomNav lang={lang} />
    </div>
  );
}
