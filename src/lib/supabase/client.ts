'use client';

import { createBrowserClient } from '@supabase/ssr';
import { AUTH_COOKIE_OPTIONS } from './cookie-options';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: AUTH_COOKIE_OPTIONS },
  );
}

/**
 * The browser client holds the realtime socket and auth listeners, so every
 * component must share one instance rather than minting its own.
 */
let browserClient: ReturnType<typeof createClient> | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) browserClient = createClient();
  return browserClient;
}
