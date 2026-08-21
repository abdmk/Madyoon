/**
 * The one canonical origin every auth redirect (OAuth `redirectTo`, email
 * confirmation links, the post-login/post-logout landing) is built from.
 *
 * Without this, each of those was built from whatever origin the current
 * request happened to arrive on — the production custom domain, the bare
 * `*.vercel.app` alias, or an ephemeral per-deployment preview URL. A user
 * who started the flow on one and got bounced through Google/Supabase could
 * land back on a different one, sometimes one that no longer exists.
 *
 * Set NEXT_PUBLIC_SITE_URL in Vercel (Production scope) to the app's real
 * production URL, e.g. `https://madyoon.vercel.app`. Local dev and ad-hoc
 * preview testing fall back to whatever origin is actually being used, so
 * nothing breaks before that variable is set.
 */
export function getSiteUrl(fallbackOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return configured ? configured.replace(/\/+$/, '') : fallbackOrigin;
}
