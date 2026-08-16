import type { Metadata } from 'next';
import { getProfile } from '@/lib/supabase/server';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata: Metadata = { title: 'الرئيسية' };

export default async function DashboardPage() {
  const profile = await getProfile();
  return <DashboardView name={profile?.name ?? ''} />;
}
