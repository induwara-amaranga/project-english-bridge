import { useState } from 'react';
import { TextField } from '../../components/Primitives';
import { createAdmin } from '../../domain/admin';
import { errorMessage } from '../../lib/apiClient';

/**
 * The only UI path to a new admin account — calls POST /api/admin/users
 * directly (see domain/admin.ts). The inviting admin picks the initial
 * password themselves and passes it to the new admin out of band; nothing
 * here emails it or logs the new account in.
 */
export function InviteAdminDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const account = await createAdmin(name, email, password);
      setCreated(account.email);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,16,40,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {created ? (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, margin: 0 }}>Admin account created</h2>
            <p style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, margin: 0 }}>
              {created} can now sign in with the password you set. Share it with them directly — it isn't stored anywhere you can look up again.
            </p>
            <button onClick={onClose} className="btn btn--primary" style={{ padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>Done</button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, margin: 0 }}>Invite a new admin</h2>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their email" />
            <TextField label="Initial password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            {error && <div style={{ fontSize: 13, color: 'var(--c-danger)', fontWeight: 600 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} disabled={busy} className="btn btn--secondary" style={{ padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>Cancel</button>
              <button type="submit" disabled={busy} className="btn btn--primary" style={{ padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Creating…' : 'Create admin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
