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
 * Production is detected via NEXT_PUBLIC_VERCEL_ENV — the client-safe
 * variant of Vercel's own environment classification — deliberately *not*
 * NODE_ENV, because Vercel runs `next build` with NODE_ENV=production for
 * Preview deployments too. Falling back to the current origin there would
 * be harmless for the developer testing a preview, but doing that check
 * with NODE_ENV would also silently allow it in real Production, which is
 * exactly the bug this file exists to close.
 *
 * - Real Production deployment (NEXT_PUBLIC_VERCEL_ENV === 'production'):
 *   NEXT_PUBLIC_SITE_URL is required. No fallback to the request's host —
 *   an unset variable is a deploy-time misconfiguration and fails loudly
 *   instead of silently reintroducing the cross-domain bug.
 * - Everywhere else (local dev, Vercel Preview deployments, tests): falls
 *   back to whatever origin the caller passes in, so nothing there breaks
 *   because this variable happens to be Production-scoped only.
 */

function isProductionDeployment(): boolean {
  return process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
}

export function getSiteUrl(devOrPreviewFallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  if (isProductionDeployment()) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL is not set in Production. Auth redirects must never fall back to ' +
        "the request's own host in Production — set NEXT_PUBLIC_SITE_URL in Vercel " +
        '(Settings → Environment Variables, Production scope) to the app\'s real URL, ' +
        'e.g. https://madyoon.vercel.app, then redeploy.',
    );
  }

  if (!devOrPreviewFallbackOrigin) {
    throw new Error(
      'getSiteUrl() was called without a fallback origin outside of Production. Pass the ' +
        'current request/window origin as the fallback.',
    );
  }

  return devOrPreviewFallbackOrigin;
}
