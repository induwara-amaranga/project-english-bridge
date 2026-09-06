import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 3L5 9L11 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function ScreenHeader({ backHref, eyebrow, title, right, wide = false }: {
  backHref: string; eyebrow?: string; title: ReactNode; right?: ReactNode; wide?: boolean;
}) {
  return (
    <div className="screen-header">
      <div className="screen-header__row" style={wide ? { maxWidth: 940 } : undefined}>
        <Link to={backHref} className="screen-header__back"><BackIcon /></Link>
        <div>
          {eyebrow && <div className="screen-header__eyebrow">{eyebrow}</div>}
          <div className="screen-header__title">{title}</div>
        </div>
        {right && <div style={{ marginLeft: 'auto', flexShrink: 0 }}>{right}</div>}
      </div>
    </div>
  );
}
