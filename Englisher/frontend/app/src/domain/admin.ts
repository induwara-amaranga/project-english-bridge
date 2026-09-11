import { apiPost } from '../lib/apiClient';
import type { AuthUser } from '../hooks/useAuth';

/**
 * The only way to create a new admin account — an existing admin calls this
 * directly (POST /api/admin/users, hasRole('ADMIN')). There is no signup path
 * to role=admin; see Primitives.tsx's RoleToggle and
 * server/src/main/java/lk/englisher/auth/AuthService.java's signUp.
 *
 * Returns the new account, not a session — the caller stays signed in as
 * themselves. Whoever the account is for signs in separately with the
 * password given here, which this call does not persist or echo back.
 */
export function createAdmin(name: string, email: string, password: string): Promise<AuthUser> {
  return apiPost<AuthUser>('/api/admin/users', { name, email, password });
}
