// Loads the Google Identity Services and Facebook JS SDKs on demand and
// exposes a promise-based "give me a token" call each, so SignIn.tsx and
// SignUp.tsx don't touch either SDK's callback-style API directly. Both
// return an OAuth2 access token (not a Google ID token / JWT) — the backend
// (GoogleTokenVerifier / FacebookTokenVerifier) verifies it against Google's
// or Facebook's own servers, the same trust model both providers use.

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }): { requestAccessToken: () => void };
        };
      };
    };
    FB?: {
      init(config: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void;
      login(
        callback: (resp: { authResponse?: { accessToken: string } }) => void,
        options: { scope: string },
      ): void;
    };
    fbAsyncInit?: () => void;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

let googleReady: Promise<void> | null = null;
function loadGoogle(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!googleReady) googleReady = loadScript('https://accounts.google.com/gsi/client');
  return googleReady;
}

let facebookReady: Promise<void> | null = null;
function loadFacebook(): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (!facebookReady) {
    facebookReady = new Promise<void>((resolve) => {
      window.fbAsyncInit = () => {
        window.FB!.init({ appId: FACEBOOK_APP_ID || '', cookie: false, xfbml: false, version: 'v19.0' });
        resolve();
      };
    }).then(() => loadScript('https://connect.facebook.net/en_US/sdk.js'));
  }
  return facebookReady;
}

/**
 * Fetches both SDK scripts ahead of time (call this from a page's mount
 * effect). Doing this before the click, rather than inside the click
 * handler, keeps the actual `requestAccessToken()` / `FB.login()` call in
 * the same synchronous tick as the user's click — both providers' popups can
 * otherwise be blocked as not originating from a user gesture.
 */
export function preloadOAuthScripts(): void {
  if (GOOGLE_CLIENT_ID) loadGoogle().catch(() => {});
  if (FACEBOOK_APP_ID) loadFacebook().catch(() => {});
}

export async function signInWithGoogle(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not set up yet.');
  await loadGoogle();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (resp) => {
        if (resp.access_token) resolve(resp.access_token);
        else reject(new Error('Google sign-in was cancelled.'));
      },
    });
    client.requestAccessToken();
  });
}

export async function signInWithFacebook(): Promise<string> {
  if (!FACEBOOK_APP_ID) throw new Error('Facebook sign-in is not set up yet.');
  await loadFacebook();
  return new Promise((resolve, reject) => {
    window.FB!.login((resp) => {
      if (resp.authResponse?.accessToken) resolve(resp.authResponse.accessToken);
      else reject(new Error('Facebook sign-in was cancelled.'));
    }, { scope: 'email,public_profile' });
  });
}
