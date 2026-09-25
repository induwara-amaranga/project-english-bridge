import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { roleHome, useAuth, type Role } from '../hooks/useAuth';
import { hasPlayedGuestLesson } from '../domain/guestProgress';
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
 *
 * `guestOneLessonLimit` additionally cuts a guest off from *entering* a
 * lesson once they've already played one — set only on the actual lesson
 * pages, never on /learn or /learn/:stageId (browsing/reviewing the roadmap
 * must stay open) or on /guest-save itself. Without this, a guest could
 * reach a second lesson via the back button or a stage that's unlocked for
 * review (see domain/progress.ts's 'skipped' status) and bypass the
 * "exactly one lesson before signup" rule GuestSavePrompt otherwise enforces
 * only as a one-way door.
 */
export function RequireRole({ role, allowGuestPreview, guestOneLessonLimit, children }: {
  role: Role | Role[]; allowGuestPreview?: boolean; guestOneLessonLimit?: boolean; children: ReactNode;
}) {
  const { user, loading, isGuest } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];

  // Wait for the silent session restore (see useAuth's refreshSession call)
  // before deciding — otherwise a page reload always redirects to /signin
  // for the instant before the refresh cookie has been exchanged.
  if (loading) return null;
  if (allowGuestPreview && isGuest && allowed.includes('student')) {
    if (guestOneLessonLimit && hasPlayedGuestLesson()) return <Navigate to="/guest-save" replace />;
    return <>{children}</>;
  }
  if (!user) return <Navigate to="/signin" replace />;
  if (!allowed.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  // Only a real student account has server-tracked streak/freeze state to
  // warn about — guests never reach here (the branch above returns first)
  // and parents/admins have no streak of their own.
  return <>{user.role === 'student' && <StreakFreezeDialog />}{children}</>;
}
