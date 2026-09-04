import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getDebtCurrencies, getDebtsPage } from '@/features/debts/api';
import { parseDebtQuery } from '@/features/debts/params';
import type { SearchParams } from '@/lib/params';
import { DebtsView } from '@/features/debts/components/debts-view';

export const metadata: Metadata = { title: 'الديون' };

export default async function DebtsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const query = parseDebtQuery(searchParams);
  // The page and its filters live in the URL, so this is the only query the
  // route issues — no client-side fetch-everything-then-filter pass follows it.
  const [page, currencies] = await Promise.all([
    getDebtsPage(profile.id, query),
    getDebtCurrencies(profile.id),
  ]);

  return (
    <DebtsView
      page={page}
      query={query}
      currency={profile.currency}
      currencies={currencies}
    />
  );
}
