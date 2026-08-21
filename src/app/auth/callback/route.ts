import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/site-url';

/**
 * Exchanges the OAuth/email code for a session cookie, then lands the user.
 *
 * This must run on whatever host actually received the redirect — the PKCE
 * code_verifier cookie is scoped to that exact host, and the fresh session
 * cookie this route sets is too. That host is now always the canonical site
 * (login-card.tsx builds `redirectTo`/`emailRedirectTo` from getSiteUrl, not
 * the origin the user happened to start from), so this no longer needs to
 * guess between `origin` and `x-forwarded-host` — it uses the same canonical
 * URL as the source of truth for every redirect it issues.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const target = next && next.startsWith('/') ? next : '/dashboard';
  const base = getSiteUrl(origin);

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=oauth`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${base}/login?error=oauth`);
  }

  return NextResponse.redirect(`${base}${target}`);
}
