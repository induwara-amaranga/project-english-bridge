import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiPost, refreshSession, setAuthListener, type AuthSession } from '../lib/apiClient';

// Real auth, against the Spring Boot API (SPRINGBOOT-MIGRATION.md section 4).
// The access token lives only in memory (in apiClient.ts); the refresh token
// is an httpOnly cookie the JavaScript never touches. Every page still goes
// through this context rather than the network directly, so nothing outside
// this file and apiClient.ts knows how a session is actually carried.
//
// Role-based access: three account types, each landing on their own home and
// gated out of the other two (see RequireRole.tsx). This is a flat role on
// the account, not to be confused with the child-invites-a-parent flow under
// /parent/access — that stays a `student`-role feature (the child manages
// the invite); only the resulting /parent dashboard is `parent`-role gated.

export type Role = 'student' | 'parent' | 'admin';
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  preferences: unknown;
}

export function roleHome(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'parent') return '/parent';
  return '/learn';
}

// A single shared guest account, used by "Continue without an account" (Sign
// Up) and "Try a lesson first" (Placement Test) — the real backend has no
// concept of an anonymous session, so both flows sign into (or create) the
// same fixed student account rather than minting a fresh one that would
// collide on email the second time anyone tried it.
const GUEST_NAME = 'Guest';
const GUEST_EMAIL = 'guest@englisher.test';
const GUEST_PASSWORD = 'guest-account-12345';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (name: string, email: string, password: string, role: Role) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: AuthSession | null) => {
    setUser(session ? (session.user as AuthUser) : null);
  }, []);

  useEffect(() => {
    setAuthListener(applySession);
    // Silent session restore on load — relies entirely on the httpOnly
    // refresh cookie, so a page reload does not bounce a signed-in user.
    refreshSession().then(applySession).finally(() => setLoading(false));
    return () => setAuthListener(null);
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await apiPost<AuthSession>('/api/auth/signin', { email, password });
    applySession(session);
    return session.user as AuthUser;
  }, [applySession]);

  const signUp = useCallback(async (name: string, email: string, password: string, role: Role) => {
    const session = await apiPost<AuthSession>('/api/auth/signup', { name, email, password, role });
    applySession(session);
    return session.user as AuthUser;
  }, [applySession]);

  const signOut = useCallback(async () => {
    try {
      await apiPost('/api/auth/signout');
    } catch {
      // Sign-out is best-effort client-side — the user is leaving either way.
    }
    applySession(null);
  }, [applySession]);

  const continueAsGuest = useCallback(async () => {
    try {
      return await signIn(GUEST_EMAIL, GUEST_PASSWORD);
    } catch {
      return await signUp(GUEST_NAME, GUEST_EMAIL, GUEST_PASSWORD, 'student');
    }
  }, [signIn, signUp]);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, continueAsGuest }),
    [user, loading, signIn, signUp, signOut, continueAsGuest],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
