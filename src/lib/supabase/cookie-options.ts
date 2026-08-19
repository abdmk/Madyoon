/**
 * Explicit session-cookie lifetime, shared by the browser, server and
 * middleware Supabase clients. Without this, whether the auth cookie
 * survives a browser restart depends on the library's implicit default —
 * pinning it here makes "stay signed in" a guarantee, not an assumption.
 */
export const AUTH_COOKIE_OPTIONS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year — refreshed on every request anyway.
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};
