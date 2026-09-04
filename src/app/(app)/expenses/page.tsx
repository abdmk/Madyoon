import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getExpensesPage } from '@/features/expenses/api';
import { parseLedgerQuery, type SearchParams } from '@/lib/params';
import { ExpensesView } from '@/features/expenses/components/expenses-view';

export const metadata: Metadata = { title: 'المصاريف' };

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const query = parseLedgerQuery(searchParams);
  const page = await getExpensesPage(profile.id, query);

  return <ExpensesView page={page} query={query} currency={profile.currency} />;
}
