// The one seam between the app and the Spring Boot API (see
// SPRINGBOOT-MIGRATION.md section 4). It owns the in-memory access token,
// retries a request exactly once through /api/auth/refresh on a 401, and
// notifies useAuth whenever a refresh (or its failure) changes who is
// signed in — so a tab left open past its access token's 15 minutes keeps
// working silently, and one that outlives the refresh token's 30 days gets
// signed out everywhere at once.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';

export class ApiRequestError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.';
}

let accessToken: string | null = null;
export function getAccessToken(): string | null {
  return accessToken;
}

/** The shape of AuthResponse (auth/AuthDtos.java) — kept generic here so this module has no dependency on useAuth. */
export interface AuthSession {
  accessToken: string;
  expiresInSeconds: number;
  user: { id: string; name: string; email: string; role: string; preferences: unknown };
  home: string;
}

type AuthListener = (session: AuthSession | null) => void;
let authListener: AuthListener | null = null;
/** useAuth calls this once, on mount, to hear about every session change — including a background refresh. */
export function setAuthListener(fn: AuthListener | null): void {
  authListener = fn;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function parseError(res: Response): Promise<ApiRequestError> {
  try {
    const data = await res.json();
    return new ApiRequestError(res.status, data.code || 'unknown', data.message || res.statusText);
  } catch {
    return new ApiRequestError(res.status, 'unknown', res.statusText || 'Request failed.');
  }
}

async function doFetch(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${BASE_URL}${path}`, {
    method: opts.method || 'GET',
    headers,
    credentials: 'include',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

let refreshPromise: Promise<AuthSession | null> | null = null;

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Shared by
 * useAuth's silent session restore on load and apiRequest's own 401 retry, so
 * there is exactly one implementation of "what a refresh does."
 */
export function refreshSession(): Promise<AuthSession | null> {
  if (!refreshPromise) {
    refreshPromise = doFetch('/api/auth/refresh', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          accessToken = null;
          authListener?.(null);
          return null;
        }
        const data = (await res.json()) as AuthSession;
        accessToken = data.accessToken;
        authListener?.(data);
        return data;
      })
      .catch(() => {
        accessToken = null;
        authListener?.(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Endpoints where a 401 is a credentials error, not an expired-token one — retrying via refresh would be wasted work. */
const NO_REFRESH_RETRY = new Set(['/api/auth/signin', '/api/auth/signup', '/api/auth/refresh']);

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await doFetch(path, opts);
  if (res.status === 401 && !NO_REFRESH_RETRY.has(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch(path, opts);
    }
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const apiGet = <T,>(path: string): Promise<T> => apiRequest<T>(path);
export const apiPost = <T,>(path: string, body?: unknown): Promise<T> => apiRequest<T>(path, { method: 'POST', body });
export const apiPut = <T,>(path: string, body?: unknown): Promise<T> => apiRequest<T>(path, { method: 'PUT', body });
export const apiDelete = <T,>(path: string): Promise<T> => apiRequest<T>(path, { method: 'DELETE' });
