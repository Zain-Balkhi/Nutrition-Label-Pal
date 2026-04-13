/**
 * Client-side auth helpers: JWT storage + expiry check.
 *
 * The backend issues JWTs with a 24h `exp` claim. We mirror that TTL on the
 * client so expired tokens don't leave the user stuck on protected pages
 * watching API calls fail — instead we clear the stale session and bounce to
 * /login.
 */

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/** Event name dispatched on window when the stored token is rejected/expired. */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Decode a JWT payload without verifying the signature (that's the backend's
 * job). Returns null if the token is malformed.
 */
function decodePayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // JWT uses base64url; atob needs standard base64, and we pad if needed.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Returns true when the token is missing, malformed, or past its `exp`.
 * Callers should treat a true result as "no valid session".
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodePayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  // `exp` is seconds since epoch; Date.now() is ms.
  return payload.exp * 1000 <= Date.now();
}

/**
 * Drop stored credentials and notify listeners (App.tsx) so they can reset
 * React state and redirect. Safe to call from anywhere — including render-
 * adjacent code paths — because it only touches localStorage and dispatches
 * an event.
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}
