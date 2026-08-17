import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getDashboard } from '@/lib/data';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata: Metadata = { title: 'الرئيسية' };

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  // One aggregation round trip — every dashboard number is computed in
  // Postgres (`dashboard_summary`), not by loading every debt and expense
  // into the browser and reducing them there.
  const data = await getDashboard(profile.id);

  return <DashboardView name={profile.name} currency={profile.currency} data={data} />;
}
