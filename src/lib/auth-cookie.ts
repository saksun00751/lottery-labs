/**
 * Readable-by-JS companion to the httpOnly session cookie. Holds no secret —
 * just a "0"/"1" flag — so the client can tell whether a session exists
 * without ever touching the access token itself.
 */
export const AUTH_FLAG_COOKIE = 'll_authed';

export function hasAuthFlagCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split('; ')
    .some((entry) => entry === `${AUTH_FLAG_COOKIE}=1`);
}
