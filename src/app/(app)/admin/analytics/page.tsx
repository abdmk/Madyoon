import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AnalyticsView } from '@/components/admin/analytics-view';
import type { AnalyticsPoint } from '@/lib/types';

export const metadata: Metadata = { title: 'التحليلات' };

export default async function AdminAnalyticsPage() {
  const supabase = createClient();
  const { data } = await supabase.rpc('admin_analytics', { months: 12 });

  return <AnalyticsView points={(data as AnalyticsPoint[]) ?? []} />;
}
