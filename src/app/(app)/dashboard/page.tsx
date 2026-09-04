import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getDashboard, getDashboardPeriodSummary, getAttentionFeed } from '@/features/dashboard/api';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';

export const metadata: Metadata = { title: 'الرئيسية' };

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  // Two aggregation round trips — every dashboard number is computed in
  // Postgres (`dashboard_summary`, `dashboard_period_summary`), not by
  // loading every debt/expense/revenue into the browser and reducing them
  // there. The period defaults to "this month"; switching it on the client
  // re-fetches just the period summary.
  const [data, periodSummary] = await Promise.all([
    getDashboard(profile.id),
    getDashboardPeriodSummary(profile.id, 'month'),
  ]);

  return (
    <DashboardView
      ownerId={profile.id}
      name={profile.name}
      currency={profile.currency}
      data={data}
      initialPeriodSummary={periodSummary}
    />
  );
}
