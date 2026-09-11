import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { roleHome, useAuth, type Role } from '../hooks/useAuth';
import { StreakFreezeDialog } from './StreakFreezeDialog';

/**
 * Gates a route to one or more roles. Not signed in -> /signin. Signed in but
 * the wrong role -> that role's own home, not a dead end.
 *
 * `allowGuestPreview` lets a student-only route through for guest mode too —
 * no backend account, so `user` stays null the whole time (see useAuth's
 * `isGuest` / domain/guestProgress.ts). Only the handful of routes a guest
 * actually needs before being funneled to GuestSavePrompt should set this;
 * everything else (parent access, the essay flows, admin, …) still requires
 * a real account.
 */
export function RequireRole({ role, allowGuestPreview, children }: {
  role: Role | Role[]; allowGuestPreview?: boolean; children: ReactNode;
}) {
  const { user, loading, isGuest } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];

  // Wait for the silent session restore (see useAuth's refreshSession call)
  // before deciding — otherwise a page reload always redirects to /signin
  // for the instant before the refresh cookie has been exchanged.
  if (loading) return null;
  if (allowGuestPreview && isGuest && allowed.includes('student')) return <>{children}</>;
  if (!user) return <Navigate to="/signin" replace />;
  if (!allowed.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  // Only a real student account has server-tracked streak/freeze state to
  // warn about — guests never reach here (the branch above returns first)
  // and parents/admins have no streak of their own.
  return <>{user.role === 'student' && <StreakFreezeDialog />}{children}</>;
}
