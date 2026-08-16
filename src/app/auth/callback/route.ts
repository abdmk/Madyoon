import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Exchanges the OAuth code for a session cookie, then lands the user. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const target = next && next.startsWith('/') ? next : '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Behind a proxy (Vercel, Cloud Run) `origin` is the internal host, so
  // prefer the forwarded host when one is present.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const base =
    process.env.NODE_ENV === 'production' && forwardedHost ? `https://${forwardedHost}` : origin;

  return NextResponse.redirect(`${base}${target}`);
}
