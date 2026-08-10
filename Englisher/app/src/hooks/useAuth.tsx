import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Auth is still fake — there is no backend (see REACT-MIGRATION.md Phase 8) —
// but every page goes through this context rather than writing to storage
// directly, so plugging in real auth later touches one file, not every page.
//
// Role-based access: three account types, each landing on their own home and
// gated out of the other two (see RequireRole.tsx). This is a flat role on
// the account, not to be confused with the child-invites-a-parent flow under
// /parent/access — that stays a `student`-role feature (the child manages
// the invite); only the resulting /parent dashboard is `parent`-role gated.

export type Role = 'student' | 'parent' | 'admin';
export interface AuthUser { name: string; email: string; role: Role }
interface AuthState { user: AuthUser | null }

const KEY = 'englisher.auth';

function load(): AuthState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthState;
      // Guard against pre-role sessions saved by an earlier build.
      if (parsed.user && !parsed.user.role) return { user: null };
      return parsed;
    }
  } catch {
    /* storage blocked */
  }
  return { user: null };
}

export function roleHome(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'parent') return '/parent';
  return '/learn';
}

interface AuthContextValue {
  user: AuthUser | null;
  signIn: (email: string, role: Role) => void;
  signUp: (name: string, email: string, role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => load());

  const persist = useCallback((next: AuthState) => {
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    setState(next);
  }, []);

  const signIn = useCallback((email: string, role: Role) => persist({ user: { name: state.user?.name || 'Learner', email, role } }), [persist, state.user]);
  const signUp = useCallback((name: string, email: string, role: Role) => persist({ user: { name, email, role } }), [persist]);
  const signOut = useCallback(() => persist({ user: null }), [persist]);

  const value = useMemo(() => ({ user: state.user, signIn, signUp, signOut }), [state.user, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
