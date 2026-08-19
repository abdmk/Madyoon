import { cache } from 'react';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_OPTIONS } from './cookie-options';
import type { Profile } from '@/lib/types';

/** The shape `setAll` receives — annotated because the union hides it. */
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * One client per request. `cache()` dedupes it across the layout and the page,
 * which otherwise each built their own and re-parsed the session cookie.
 */
export const createClient = cache(() => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
});

/**
 * The signed-in user. Memoised per request: the layout, the page and any
 * server helper used to trigger a separate `auth.getUser()` round trip each.
 */
export const getUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The signed-in user's profile, or null when signed out. Memoised per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    // Every column is used by the header, settings and currency formatting.
    .select('id,email,name,role,avatar_url,currency,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
});
