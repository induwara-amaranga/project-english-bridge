import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { roleHome, useAuth, type Role } from '../hooks/useAuth';

/** Gates a route to one or more roles. Not signed in -> /signin. Signed in but
 * the wrong role -> that role's own home, not a dead end. */
export function RequireRole({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];

  if (!user) return <Navigate to="/signin" replace />;
  if (!allowed.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}
