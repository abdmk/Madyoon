import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { DataSync } from '@/components/data-sync';
import type { Debt, Expense } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();

  // Seed the client store on the server so the first paint already has data.
  const [{ data: debts }, { data: expenses }] = await Promise.all([
    supabase
      .from('debts')
      .select('*')
      .eq('user_id', profile.id)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(500),
  ]);

  return (
    <div className="min-h-dvh">
      <Sidebar profile={profile} />

      <div className="lg:ps-64">
        <Header profile={profile} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10">
          {children}
        </main>
      </div>

      <MobileNav />

      <DataSync
        profile={profile}
        initialDebts={(debts as Debt[]) ?? []}
        initialExpenses={(expenses as Expense[]) ?? []}
      />
    </div>
  );
}
