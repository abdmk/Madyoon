import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getRevenuesPage } from '@/features/revenues/api';
import { parseLedgerQuery, type SearchParams } from '@/lib/params';
import { RevenuesView } from '@/features/revenues/components/revenues-view';

export const metadata: Metadata = { title: 'الإيرادات' };

export default async function RevenuesPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const query = parseLedgerQuery(searchParams);
  const page = await getRevenuesPage(profile.id, query);

  return <RevenuesView page={page} query={query} currency={profile.currency} />;
}
