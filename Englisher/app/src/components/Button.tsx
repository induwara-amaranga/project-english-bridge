import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'pill-outline';
type Size = 'lg' | 'md';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `btn btn--${size} btn--${variant} ${className}`.trim();
  return <button className={cls} {...rest} />;
}

export function LinkButton({ variant = 'primary', size = 'md', className = '', to, ...rest }: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const cls = `btn btn--${size} btn--${variant} ${className}`.trim();
  if (/^https?:|^#/.test(to)) return <a className={cls} href={to} {...rest} />;
  return <Link className={cls} to={to} {...rest} />;
}
