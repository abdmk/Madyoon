import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getDueAlerts } from '@/lib/data';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SessionProvider } from '@/components/session-provider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  // The bell needs eight rows and a count — not every debt the account owns.
  const alerts = await getDueAlerts(profile.id);

  return (
    <SessionProvider profile={profile}>
      <div className="min-h-dvh">
        <Sidebar profile={profile} />

        <div className="lg:ps-64">
          <Header profile={profile} alerts={alerts} />
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 lg:pt-8">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </SessionProvider>
  );
}
