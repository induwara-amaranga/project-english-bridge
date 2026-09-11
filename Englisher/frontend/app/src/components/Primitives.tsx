import type { CSSProperties, ReactNode } from 'react';
import type { Role } from '../hooks/useAuth';

export function Card({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return <div className={`card ${className}`.trim()} style={style}>{children}</div>;
}

export function Chip({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="chip" style={style}>{children}</div>;
}

export function Tile({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div';
  return <Comp className="tile" style={{ ...(onClick ? { cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' } : {}), ...style }} onClick={onClick}>{children}</Comp>;
}

export function ProgressBar({ pct, thin = false, color }: { pct: number; thin?: boolean; color?: string }) {
  return (
    <div className={`pbar${thin ? ' pbar--thin' : ''}`}>
      <div className="pbar__fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}

export function Si({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <span className={`si ${className}`.trim()} style={style}>{children}</span>;
}

export function LangToggle({ lang, onToggle }: { lang: 'en' | 'si'; onToggle: () => void }) {
  const isSi = lang === 'si';
  return (
    <button className="lang-toggle" onClick={onToggle} type="button">
      <span className={`lang-toggle__opt ${isSi ? 'lang-toggle__opt--inactive' : 'lang-toggle__opt--active'}`}>EN</span>
      <span className={`lang-toggle__opt ${isSi ? 'lang-toggle__opt--active' : 'lang-toggle__opt--inactive'} si`}>සිං</span>
    </button>
  );
}

const ROLE_LABEL: Record<Role, string> = { student: 'Student', parent: 'Parent', admin: 'Admin' };

/**
 * Student or parent only — there is no signup path to an admin account
 * (server/src/main/java/lk/englisher/auth/AuthService.java's signUp rejects
 * role=admin outright). Admins are provisioned by another admin via
 * POST /api/admin/users, not through this public form.
 */
export function RoleToggle({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <div className="role-toggle" role="radiogroup" aria-label="Account type">
      {(['student', 'parent'] as Role[]).map((r) => (
        <button
          key={r} type="button" role="radio" aria-checked={role === r}
          className={`role-toggle__opt ${role === r ? 'role-toggle__opt--active' : ''}`}
          onClick={() => onChange(r)}
        >
          {ROLE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ icon, value, sub }: { icon?: ReactNode; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="stat-tile">
      {icon}
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__sub">{sub}</div>
    </div>
  );
}

export function TextField({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <input className="field__input" {...rest} />
    </div>
  );
}

export function CheckboxRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="check-row__text">{children}</span>
    </label>
  );
}
