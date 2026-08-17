'use client';

import * as React from 'react';
import type { Profile } from '@/lib/types';

/**
 * The single client-side source of truth for "who is signed in".
 *
 * The profile is resolved once per request on the server and handed down; no
 * component calls `supabase.auth.getUser()` or re-reads `profiles` on mount.
 */
const SessionContext = React.createContext<{
  profile: Profile;
  setProfile: (profile: Profile) => void;
} | null>(null);

export function SessionProvider({
  profile: initialProfile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = React.useState(initialProfile);

  // The server is authoritative: a fresh render (navigation, router.refresh)
  // replaces whatever the last optimistic update left behind.
  React.useEffect(() => setProfile(initialProfile), [initialProfile]);

  const value = React.useMemo(() => ({ profile, setProfile }), [profile]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>');
  return context;
}

/** Convenience for the many places that only need the display currency. */
export function useCurrency() {
  return useSession().profile.currency;
}
