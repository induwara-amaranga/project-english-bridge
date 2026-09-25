import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiPost, refreshSession, setAuthListener, type AuthSession, type SignInEnvelope } from '../lib/apiClient';
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

/**
 * What every sign-in path can resolve to now — a completed sign-in, or an
 * admin account's pending 2FA challenge that {@code verifyOtp} must resolve
 * before there is a user at all. Password, Google and Facebook can each land
 * on either outcome; the caller (SignIn.tsx) branches on `otpRequired` rather
 * than getting an `AuthUser` back directly.
 */
export type SignInOutcome = { otpRequired: true; challengeId: string } | { otpRequired: false; user: AuthUser };

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
  signIn: (email: string, password: string) => Promise<SignInOutcome>;
  signUp: (name: string, email: string, password: string, role: Role) => Promise<AuthUser>;
  /**
   * `token` is whatever lib/oauth.ts's signInWithGoogle()/signInWithFacebook()
   * resolved with — an OAuth2 access token, not a password. `role` only
   * matters the first time this Google/Facebook identity is seen; an existing
   * account keeps its own role regardless of what is passed (AuthService.oauthSession).
   */
  signInWithGoogle: (token: string, role?: Role) => Promise<SignInOutcome>;
  signInWithFacebook: (token: string, role?: Role) => Promise<SignInOutcome>;
  /** Resolves the challenge a `SignInOutcome`'s `otpRequired: true` handed back. */
  verifyOtp: (challengeId: string, code: string) => Promise<AuthUser>;
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

  /** Shared by all three sign-in paths — sets the session only when there is one, so an OTP challenge never signs anybody in early. */
  const resolveSignIn = useCallback((envelope: SignInEnvelope): SignInOutcome => {
    if (envelope.otpRequired) {
      return { otpRequired: true, challengeId: envelope.challengeId as string };
    }
    applySession(envelope.session);
    return { otpRequired: false, user: (envelope.session as AuthSession).user as AuthUser };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const envelope = await apiPost<SignInEnvelope>('/api/auth/signin', { email, password });
    return resolveSignIn(envelope);
  }, [resolveSignIn]);

  const signUp = useCallback(async (name: string, email: string, password: string, role: Role) => {
    const session = await apiPost<AuthSession>('/api/auth/signup', { name, email, password, role });
    applySession(session);
    return session.user as AuthUser;
  }, [applySession]);

  const signInWithGoogle = useCallback(async (token: string, role?: Role) => {
    const envelope = await apiPost<SignInEnvelope>('/api/auth/google', { token, role });
    return resolveSignIn(envelope);
  }, [resolveSignIn]);

  const signInWithFacebook = useCallback(async (token: string, role?: Role) => {
    const envelope = await apiPost<SignInEnvelope>('/api/auth/facebook', { token, role });
    return resolveSignIn(envelope);
  }, [resolveSignIn]);

  const verifyOtp = useCallback(async (challengeId: string, code: string) => {
    const session = await apiPost<AuthSession>('/api/auth/verify-otp', { challengeId, code });
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
    () => ({
      user, loading, isGuest, signIn, signUp, signInWithGoogle, signInWithFacebook, verifyOtp, signOut,
      enterGuestMode, exitGuestMode,
    }),
    [user, loading, isGuest, signIn, signUp, signInWithGoogle, signInWithFacebook, verifyOtp, signOut,
      enterGuestMode, exitGuestMode],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
