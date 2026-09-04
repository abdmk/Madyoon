import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getReportsSummary } from '@/features/reports/api';
import { ReportsView } from '@/features/reports/components/reports-view';
import { one, type SearchParams } from '@/lib/params';

export const metadata: Metadata = { title: 'التقارير' };

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  // Only two windows are offered, so anything else falls back to six months
  // rather than being passed through to the RPC.
  const months = one(searchParams, 'months') === '12' ? 12 : 6;
  const data = await getReportsSummary(profile.id, months);

  return <ReportsView data={data} currency={profile.currency} months={months} />;
}
