import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiPost, refreshSession, setAuthListener, type AuthSession } from '../lib/apiClient';
import { isGuestActive, setGuestActive } from '../lib/guestSession';

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

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /**
   * "Try a lesson first" / "Continue without an account" — a purely local
   * mode with no backend account at all (see lib/guestSession.ts and
   * domain/guestProgress.ts). Nothing is sent to the server until the guest
   * signs up, at which point their one lesson is replayed for real — see
   * SignUp.tsx.
   */
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (name: string, email: string, password: string, role: Role) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(isGuestActive);

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

  const enterGuestMode = useCallback(() => {
    setGuestActive(true);
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    setGuestActive(false);
    setIsGuest(false);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isGuest, signIn, signUp, signOut, enterGuestMode, exitGuestMode }),
    [user, loading, isGuest, signIn, signUp, signOut, enterGuestMode, exitGuestMode],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
