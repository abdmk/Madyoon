import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getDueAlerts } from '@/features/dashboard/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AlertsBellServer } from '@/components/layout/alerts-bell-server';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { QuickAddFab } from '@/components/navigation/quick-add-fab';
import { SessionProvider } from '@/components/session-provider';

// Every page under this layout renders one signed-in account's data. Force
// dynamic rendering (and skip the fetch cache) so nothing here can ever be
// reused across requests — a cached response here would leak one user's
// debts, profile or alerts to whoever loads the page next.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  // Not awaited: the bell renders in its own Suspense boundary (see
  // AlertsBellServer) so this round trip runs in parallel with whatever the
  // page itself fetches, instead of blocking it.
  const alertsPromise = getDueAlerts(profile.id);

  return (
    <SessionProvider profile={profile}>
      <div className="min-h-dvh">
        {/* First thing in the tab order: every page here starts with the same
            sidebar and header, so a keyboard user should be able to jump
            straight past them to the content they came for. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          تخطي إلى المحتوى
        </a>

        <Sidebar profile={profile} />

        <div className="lg:ps-64">
          <Header profile={profile} alertsSlot={<AlertsBellServer promise={alertsPromise} />} />
          {/* Bottom padding clears the tab bar and the floating action, which
              are present below `lg` — the same breakpoint that hides them. */}
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 outline-none sm:px-6 lg:pb-12 lg:pt-8"
          >
            {children}
          </main>
        </div>

        <MobileNav />
        <QuickAddFab />
      </div>
    </SessionProvider>
  );
}
